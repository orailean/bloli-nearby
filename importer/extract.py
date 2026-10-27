"""Streaming OSM extraction. The caller publishes output only after successful completion."""
import argparse
import json
import sys
import tempfile
from pathlib import Path
import osmium
from transit_context import build_context, TransportContext
from shapely.geometry import shape, Polygon


def poly_geojson(text):
    polygons = []
    lines = iter(text.strip().splitlines()[1:])
    for raw in lines:
        name = raw.strip()
        if name == 'END':
            break
        ring = []
        for line in lines:
            if line.strip() == 'END':
                break
            ring.append([float(n) for n in line.split()])
        if ring and ring[-1] != ring[0]:
            ring.append(ring[0])
        if len(ring) < 4:
            raise ValueError('Invalid coverage ring')
        if name.startswith('!'):
            if not polygons:
                raise ValueError('Coverage hole without exterior')
            polygons[-1].append(ring)
        else:
            polygons.append([ring])
    result = {'type': 'MultiPolygon', 'coordinates': polygons}
    if not polygons or not shape(result).is_valid:
        raise ValueError('Invalid coverage polygon')
    return result


def tokens(value):
    return {token.strip().lower() for token in value.split(';') if token.strip()}


def seller_candidate(tags):
    """Retain evidence and owner-approved shop categories; normalization applies restrictions."""
    if tags.get('amenity') == 'vending_machine' and 'cigarettes' in tokens(tags.get('vending', '')):
        return True
    if tags.get('amenity') == 'fuel':
        return True
    if tags.get('shop') in ('tobacco', 'lottery', 'kiosk', 'convenience', 'supermarket', 'newsagent'):
        return True
    if tags.get('shop') and tags.get('lottery') == 'yes':
        return True
    positive = tags.get('tobacco', '').strip().lower() == 'yes' or bool(
        tokens(tags.get('sells:tobacco', '')) & {'yes', 'tobacco', 'cigarette', 'cigarettes'})
    return positive and (bool(tags.get('shop')) or tags.get('amenity') == 'fuel')


def kebab_candidate(tags):
    """Retain explicit fixed food venues; normalization applies access/lifecycle rules."""
    return tags.get('amenity') in ('restaurant', 'fast_food') and bool(
        tokens(tags.get('cuisine', '')) & {'kebab', 'doner', 'doener', 'döner'})


def water_candidate(tags):
    return tags.get('amenity') == 'drinking_water' or tags.get('drinking_water') == 'yes' or (tags.get('amenity') == 'fountain' and tags.get('fountain') == 'drinking') or tags.get('drinking_water:refill') == 'yes'


def transit_candidate(t):
    return t.get('railway') in ('station','halt','tram_stop','platform','subway_entrance','train_station_entrance') or t.get('highway') in ('bus_stop','platform') or t.get('amenity') in ('bus_station','taxi','ferry_terminal') or t.get('aerialway') == 'station' or t.get('public_transport') in ('station','platform','stop_position','entrance')


def kinds(tags):
    # Routes describe onboard toilets; collections group separate locations.
    if tags.get('type') in ('route', 'route_master', 'collection', 'destination_sign') or tags.get('public_transport') in ('stop_area', 'stop_area_group'):
        return []
    result = []
    if transit_candidate(tags):
        result.append("transit")
    if tags.get('amenity') == 'toilets' or tags.get('toilets') == 'yes':
        result.append('facility')
    if seller_candidate(tags):
        result.append('seller')
    if water_candidate(tags):
        result.append('water')
    if kebab_candidate(tags):
        result.append('kebab')
    if tags.get('place') in ('city', 'town', 'village', 'hamlet', 'suburb', 'borough', 'quarter', 'locality') or tags.get('boundary') == 'postal_code':
        result.append('settlement')
    return result


def _extract(filename, coverage, output, source, dataset_at=None, context_path=None, fingerprint=None):
    if not dataset_at:
        reader = osmium.io.Reader(filename)
        try:
            dataset_at = reader.header().get('osmosis_replication_timestamp')
        finally:
            reader.close()
    if not dataset_at:
        raise ValueError('Missing source dataset timestamp')
    def emit(record):
        output.write(json.dumps(record, ensure_ascii=False) + '\n')
    emit({'kind': 'metadata', 'source': source, 'datasetAt': dataset_at, 'coverage': coverage,
          'categories': ['toilets', 'tobacco', 'kebab', 'water', 'transit'], 'transitContextComplete': True})
    transport_context=TransportContext(context_path,fingerprint)
    def object_kinds(tags,source_type,source_id):
        result=kinds(tags)
        if tags.get('entrance') and tags.get('entrance') != 'no' and 'transit' not in result and transport_context.get(source_type,str(source_id))['groups']:
            result.append('transit')
        return result
    factory = osmium.geom.GeoJSONFactory()
    sites = {}
    member_keys = set()
    building_member_keys = set()
    relation_members = {}
    transit_relations = {}

    class SiteMembers(osmium.SimpleHandler):
        def relation(self, obj):
            tags = dict(obj.tags)
            # Collections and routes supply context, never passenger coordinates.
            if tags.get('type') not in ('route', 'route_master', 'collection', 'destination_sign') and tags.get('public_transport') not in ('stop_area', 'stop_area_group'):
                relation_members[obj.id] = [(m.type, m.ref) for m in obj.members if m.type in ('n', 'w', 'r')]
            if 'transit' in kinds(tags):
                transit_relations[obj.id] = tags
            if tags.get('type') in ('site', 'building') and kinds(tags):
                members = [(m.type, m.ref) for m in obj.members if m.type in ('n', 'w')]
                if tags.get('type') == 'building':
                    outlines = [(m.type, m.ref) for m in obj.members
                                if m.type in ('n', 'w') and m.role == 'outline']
                    members = outlines or [(m.type, m.ref) for m in obj.members
                                           if m.type in ('n', 'w') and m.role == 'part']
                    building_member_keys.update(members)
                sites[obj.id] = (tags, members)
                member_keys.update(members)

    # Relations follow their members in OSM files. Collect only fixed site/building references
    # first, then retain coordinates for those members during the main pass.
    SiteMembers().apply_file(filename)
    # Resolve only dependencies of physical passenger features, not route paths.
    pending = list(transit_relations)
    needed_relations = set()
    while pending:
        source_id = pending.pop()
        if source_id in needed_relations:
            continue
        needed_relations.add(source_id)
        for member_type, member_id in relation_members.get(source_id, []):
            member_keys.add((member_type, member_id))
            if member_type == 'r':
                pending.append(member_id)
    relation_members = {key: value for key, value in relation_members.items() if key in needed_relations}
    member_points = {}

    class Extractor(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.expected = {}
            self.completed = set()
            self.count = 0

        def write(self, source_type, source_id, tags, point):
            for kind in object_kinds(tags, source_type, source_id):
                emit({'kind': kind, 'sourceType': source_type, 'sourceId': str(source_id),
                      'lat': point.y, 'lon': point.x, 'tags': tags, **({'transport':transport_context.get(source_type,str(source_id))} if kind == 'transit' else {})})
                self.count += 1

        def node(self, obj):
            tags = dict(obj.tags)
            if object_kinds(tags,'node',obj.id) or ('n', obj.id) in member_keys:
                point = shape(json.loads(factory.create_point(obj)))
                if ('n', obj.id) in member_keys:
                    member_points[('n', obj.id)] = point
                if object_kinds(tags,'node',obj.id):
                    self.write('node', obj.id, tags, point)

        def way(self, obj):
            tags = dict(obj.tags)
            if ('w', obj.id) in member_keys:
                line = shape(json.loads(factory.create_linestring(obj)))
                if ('w', obj.id) in building_member_keys and obj.is_closed():
                    polygon = Polygon(line.coords)
                    if not polygon.is_valid or polygon.is_empty:
                        raise ValueError(f'Invalid building outline: way/{obj.id}')
                    member_points[('w', obj.id)] = polygon.representative_point()
                else:
                    member_points[('w', obj.id)] = line.interpolate(0.5, normalized=True)
            if not object_kinds(tags,'way',obj.id):
                return
            if obj.is_closed() and tags.get("area") != "no":
                self.expected[('way', obj.id)] = object_kinds(tags,'way',obj.id)
            else:
                line = shape(json.loads(factory.create_linestring(obj)))
                self.write('way', obj.id, tags, line.interpolate(0.5, normalized=True))

        def relation(self, obj):
            if kinds(dict(obj.tags)):
                self.expected[('relation', obj.id)] = kinds(dict(obj.tags))

        def area(self, obj):
            tags = dict(obj.tags)
            source_type = 'way' if obj.from_way() else 'relation'
            member_key = ('w' if obj.from_way() else 'r', obj.orig_id())
            if not kinds(tags) and member_key not in member_keys:
                return
            point = shape(json.loads(factory.create_multipolygon(obj))).representative_point()
            if member_key in member_keys:
                member_points[member_key] = point
            if kinds(tags):
                self.write(source_type, obj.orig_id(), tags, point)
                self.completed.add((source_type, obj.orig_id()))

    handler = Extractor()
    with tempfile.TemporaryDirectory(prefix='loo-locations-') as temporary:
        handler.apply_file(filename, locations=True, idx=f'sparse_file_array,{temporary}/nodes.idx')
    for source_id, (tags, members) in sites.items():
        points = [member_points[key] for key in members if key in member_points]
        if points:
            # Choose an actual member point closest to the site's centre.
            x = sum(p.x for p in points) / len(points)
            y = sum(p.y for p in points) / len(points)
            point = min(points, key=lambda p: (p.x-x)**2 + (p.y-y)**2)
            handler.write('relation', source_id, tags, point)
            handler.completed.add(('relation', source_id))
    def passenger_member_point(source_id, visiting):
        key = ('r', source_id)
        if key in member_points:
            return member_points[key]
        if source_id in visiting:
            return None
        visiting.add(source_id)
        points = []
        for member_type, member_id in relation_members.get(source_id, []):
            point = passenger_member_point(member_id, visiting) if member_type == 'r' else member_points.get((member_type, member_id))
            if point is not None:
                points.append(point)
        visiting.remove(source_id)
        if not points:
            return None
        x = sum(p.x for p in points) / len(points)
        y = sum(p.y for p in points) / len(points)
        # Keep an actual mapped member point, including for non-area relations.
        point = min(points, key=lambda p: (p.x-x)**2 + (p.y-y)**2)
        member_points[key] = point
        return point

    for source_id, tags in transit_relations.items():
        if ('relation', source_id) not in handler.completed:
            point = passenger_member_point(source_id, set())
            if point is not None:
                handler.write('relation', source_id, tags, point)
                handler.completed.add(('relation', source_id))
    missing = set(handler.expected) - handler.completed
    broken_facilities = [key for key in missing if 'facility' in handler.expected[key]]
    if broken_facilities:
        raise ValueError(f'Incomplete toilet geometries: {len(broken_facilities)}; sources: {sorted(broken_facilities)[:30]}')
    broken_sellers = [key for key in missing if 'seller' in handler.expected[key]]
    if broken_sellers:
        raise ValueError(f'Incomplete seller geometries: {len(broken_sellers)}; sources: {sorted(broken_sellers)[:30]}')
    broken_kebabs = [key for key in missing if 'kebab' in handler.expected[key]]
    if broken_kebabs:
        raise ValueError(f'Incomplete kebab geometries: {len(broken_kebabs)}; sources: {sorted(broken_kebabs)[:30]}')
    broken_water = [key for key in missing if 'water' in handler.expected[key]]
    if broken_water:
        raise ValueError(f'Incomplete water geometries: {len(broken_water)}; sources: {sorted(broken_water)[:30]}')
    broken_transit=[key for key in missing if 'transit' in handler.expected[key]]
    if broken_transit:
        raise ValueError(f'Incomplete transit geometries: {len(broken_transit)}; sources: {sorted(broken_transit)[:30]}')
    transport_context.close()
    emit({'kind': 'complete', 'records': handler.count, 'skippedSettlementGeometries': len(missing)})
    return handler.count


def extract(filename, coverage, output, source, dataset_at=None, context_path=None, fingerprint=None):
    with tempfile.TemporaryDirectory(prefix='transit-context-') as temporary:
        if context_path is None:
            context_path=str(Path(temporary)/'context.sqlite')
            build_context(filename,context_path,'fixture')
        return _extract(filename,coverage,output,source,dataset_at,context_path,fingerprint)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pbf')
    parser.add_argument('poly')
    parser.add_argument('--source', default='https://download.geofabrik.de/europe/germany-latest.osm.pbf')
    parser.add_argument('--transport-context')
    parser.add_argument('--context-fingerprint')
    args = parser.parse_args()
    extract(args.pbf, poly_geojson(Path(args.poly).read_text()), sys.stdout, args.source, context_path=args.transport_context, fingerprint=args.context_fingerprint)
