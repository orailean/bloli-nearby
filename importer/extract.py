"""Streaming OSM extraction. The caller publishes output only after successful completion."""
import argparse
import json
import re
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
    if tags.get('amenity') == 'atm' or tags.get('atm') == 'yes':
        result.append('atm')
    if tags.get('tourism') in ('hotel','motel','guest_house','hostel','apartment','chalet','camp_site','caravan_site'):
        result.append('accommodation')
    if tags.get('amenity') == 'charging_station':
        result.append('charge')
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


def _extract(filename, coverage, output, source, dataset_at=None, context_path=None, fingerprint=None, geometry_only=False, boundary_source=None, boundary_checksum=None, country_code=None, source_checksum=None):
    if not dataset_at:
        reader = osmium.io.Reader(filename)
        try:
            dataset_at = reader.header().get('osmosis_replication_timestamp')
        finally:
            reader.close()
    if not dataset_at:
        raise ValueError('Missing source dataset timestamp')
    def emit(record):
        if not geometry_only:
            output.write(json.dumps(record, ensure_ascii=False) + '\n')
    if bool(boundary_source) != bool(boundary_checksum) or (boundary_checksum and not re.fullmatch(r'[0-9a-fA-F]{64}', boundary_checksum)):
        raise ValueError('Invalid coverage boundary provenance')
    if country_code and country_code not in ('de', 'ro', 'at', 'hu'):
        raise ValueError('Unsupported country code')
    if source_checksum and not re.fullmatch(r'[0-9a-fA-F]{32}', source_checksum):
        raise ValueError('Invalid source checksum')
    emit({'kind': 'metadata', 'source': source, 'datasetAt': dataset_at, 'coverage': coverage,
          **({'coverageSource': boundary_source, 'coverageChecksum': boundary_checksum} if boundary_source else {}),
          **({'countryCode': country_code} if country_code else {}),
          **({'sourceChecksum': source_checksum} if source_checksum else {}),
          'categories': ['toilets', 'tobacco', 'kebab', 'water', 'transit', 'charge', 'atm', 'accommodation'], 'transitContextComplete': True})
    transport_context=TransportContext(context_path,fingerprint)
    def object_kinds(tags,source_type,source_id):
        result=kinds(tags)
        if tags.get('entrance') and tags.get('entrance') != 'no' and 'transit' not in result and transport_context.has_group(source_type,str(source_id)):
            result.append('transit')
        return result
    factory = osmium.geom.GeoJSONFactory()
    sites = {}
    source_versions = {}
    member_keys = set()
    building_member_keys = set()
    relation_members = {}
    area_relation_members = {}
    area_relation_tags = {}
    transit_relations = {}
    area_categories = {'facility', 'seller', 'kebab', 'water', 'transit', 'charge', 'atm', 'accommodation'}

    class SiteMembers(osmium.SimpleHandler):
        def relation(self, obj):
            tags = dict(obj.tags)
            source_versions[('relation', obj.id)] = obj.version
            # Collections and routes supply context, never passenger coordinates.
            if tags.get('type') not in ('route', 'route_master', 'collection', 'destination_sign') and tags.get('public_transport') not in ('stop_area', 'stop_area_group'):
                relation_members[obj.id] = [(m.type, m.ref) for m in obj.members if m.type in ('n', 'w', 'r')]
            if tags.get('type') in ('multipolygon', 'boundary') and area_categories.intersection(kinds(tags)):
                area_relation_members[obj.id] = relation_members.get(obj.id, [])
                area_relation_tags[obj.id] = tags
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
    for members in area_relation_members.values():
        member_keys.update(members)
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

    def representative_member_point(points):
        if not points:
            return None
        x = sum(point.x for point in points) / len(points)
        y = sum(point.y for point in points) / len(points)
        return min(points, key=lambda point: (point.x-x)**2 + (point.y-y)**2)

    class Extractor(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.expected = {}
            self.completed = set()
            self.area_fallback_points = {}
            self.count = 0

        def write(self, source_type, source_id, tags, point, version=None):
            for kind in object_kinds(tags, source_type, source_id):
                if not geometry_only:
                    emit({'kind': kind, 'sourceType': source_type, 'sourceId': str(source_id),
                          'version': version if version is not None else source_versions.get((source_type, source_id)),
                          'lat': point.y, 'lon': point.x, 'tags': tags, **({'transport':transport_context.get(source_type,str(source_id))} if kind == 'transit' else {})})
                self.count += 1

        def node(self, obj):
            tags = dict(obj.tags)
            source_versions[('node', obj.id)] = obj.version
            if object_kinds(tags,'node',obj.id) or ('n', obj.id) in member_keys:
                point = shape(json.loads(factory.create_point(obj)))
                if ('n', obj.id) in member_keys:
                    member_points[('n', obj.id)] = point
                if object_kinds(tags,'node',obj.id):
                    self.write('node', obj.id, tags, point, obj.version)

        def way(self, obj):
            tags = dict(obj.tags)
            source_versions[('way', obj.id)] = obj.version
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
                key = ('way', obj.id)
                member_key = ('w', obj.id)
                kinds_for_way = object_kinds(tags,'way',obj.id)
                self.expected[key] = kinds_for_way
                line = shape(json.loads(factory.create_linestring(obj)))
                point = line.interpolate(0.5, normalized=True)
                self.area_fallback_points[member_key] = point
                try:
                    polygon = Polygon(line.coords)
                    malformed = not polygon.is_valid or polygon.is_empty
                except ValueError:
                    malformed = True
                if malformed:
                    self.write('way', obj.id, tags, point, obj.version)
                    self.completed.add(key)
            else:
                line = shape(json.loads(factory.create_linestring(obj)))
                self.write('way', obj.id, tags, line.interpolate(0.5, normalized=True), obj.version)

        def relation(self, obj):
            source_versions[('relation', obj.id)] = obj.version
            if kinds(dict(obj.tags)):
                self.expected[('relation', obj.id)] = kinds(dict(obj.tags))

        def area(self, obj):
            tags = dict(obj.tags)
            source_type = 'way' if obj.from_way() else 'relation'
            member_key = ('w' if obj.from_way() else 'r', obj.orig_id())
            area_kinds = object_kinds(tags, source_type, obj.orig_id())
            if not area_kinds and member_key not in member_keys:
                return
            if source_type == 'way' and (source_type, obj.orig_id()) in self.completed:
                return
            try:
                point = shape(json.loads(factory.create_multipolygon(obj))).representative_point()
            except RuntimeError:
                point = self.area_fallback_points.get(member_key)
                if point is None:
                    point = member_points.get(member_key)
                if point is None and source_type == 'relation':
                    point = representative_member_point([
                        member_points[key] for key in area_relation_members.get(obj.orig_id(), [])
                        if key in member_points
                    ])
                if point is None:
                    raise
                print(f'[geometry] Invalid {source_type}/{obj.orig_id()} polygon; using its mapped line geometry', file=sys.stderr)
            if member_key in member_keys:
                member_points[member_key] = point
            if area_kinds:
                self.write(source_type, obj.orig_id(), tags, point, source_versions.get((source_type, obj.orig_id())))
                self.completed.add((source_type, obj.orig_id()))

    handler = Extractor()
    with tempfile.TemporaryDirectory(prefix='loo-locations-') as temporary:
        handler.apply_file(filename, locations=True, idx=f'sparse_file_array,{temporary}/nodes.idx')
    for source_id, members in area_relation_members.items():
        key = ('relation', source_id)
        if key not in handler.expected or key in handler.completed:
            continue
        point = representative_member_point([
            member_points[member] for member in members if member in member_points
        ])
        if point is not None:
            handler.write('relation', source_id, area_relation_tags[source_id], point,
                          source_versions.get(key))
            handler.completed.add(key)
            print(f'[geometry] Missing {key[0]}/{key[1]} polygon; using its mapped member geometry', file=sys.stderr)
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
    broken_charge=[key for key in missing if 'charge' in handler.expected[key]]
    if broken_charge:
        raise ValueError(f'Incomplete charge geometries: {len(broken_charge)}; sources: {sorted(broken_charge)[:30]}')
    for kind in ('atm', 'accommodation'):
        broken=[key for key in missing if kind in handler.expected[key]]
        if broken:
            raise ValueError(f'Incomplete {kind} geometries: {len(broken)}; sources: {sorted(broken)[:30]}')
    transport_context.close()
    if geometry_only:
        output.write(json.dumps({'kind':'geometryComplete','records':handler.count})+'\n')
    emit({'kind': 'complete', 'records': handler.count, 'skippedSettlementGeometries': len(missing)})
    return handler.count


def extract(filename, coverage, output, source, dataset_at=None, context_path=None, fingerprint=None, geometry_only=False, boundary_source=None, boundary_checksum=None, country_code=None, source_checksum=None):
    with tempfile.TemporaryDirectory(prefix='transit-context-') as temporary:
        if context_path is None:
            context_path=str(Path(temporary)/'context.sqlite')
            build_context(filename,context_path,'fixture')
        return _extract(filename,coverage,output,source,dataset_at,context_path,fingerprint,geometry_only,boundary_source,boundary_checksum,country_code,source_checksum)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pbf')
    parser.add_argument('poly')
    parser.add_argument('--source', default='https://download.geofabrik.de/europe/germany-latest.osm.pbf')
    parser.add_argument('--transport-context')
    parser.add_argument('--context-fingerprint')
    parser.add_argument('--boundary-source')
    parser.add_argument('--boundary-checksum')
    parser.add_argument('--country-code', choices=('de', 'ro', 'at', 'hu'))
    parser.add_argument('--source-checksum')
    parser.add_argument('--geometry-only', action='store_true')
    args = parser.parse_args()
    extract(args.pbf, poly_geojson(Path(args.poly).read_text()), sys.stdout, args.source, context_path=args.transport_context, fingerprint=args.context_fingerprint, geometry_only=args.geometry_only, boundary_source=args.boundary_source, boundary_checksum=args.boundary_checksum, country_code=args.country_code, source_checksum=args.source_checksum)
