"""Streaming OSM extraction. The caller publishes output only after successful completion."""
import argparse
import json
import sys
import tempfile
from pathlib import Path
import osmium
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


def kinds(tags):
    # Routes describe onboard toilets; collections group separate locations.
    if tags.get('type') in ('route', 'route_master', 'collection'):
        return []
    result = []
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


def extract(filename, coverage, output, source, dataset_at=None):
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
          'categories': ['toilets', 'tobacco', 'kebab', 'water']})
    factory = osmium.geom.GeoJSONFactory()
    sites = {}
    member_keys = set()
    building_member_keys = set()

    class SiteMembers(osmium.SimpleHandler):
        def relation(self, obj):
            tags = dict(obj.tags)
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
    member_points = {}

    class Extractor(osmium.SimpleHandler):
        def __init__(self):
            super().__init__()
            self.expected = {}
            self.completed = set()
            self.count = 0

        def write(self, source_type, source_id, tags, point):
            for kind in kinds(tags):
                emit({'kind': kind, 'sourceType': source_type, 'sourceId': str(source_id),
                      'lat': point.y, 'lon': point.x, 'tags': tags})
                self.count += 1

        def node(self, obj):
            tags = dict(obj.tags)
            if kinds(tags) or ('n', obj.id) in member_keys:
                point = shape(json.loads(factory.create_point(obj)))
                if ('n', obj.id) in member_keys:
                    member_points[('n', obj.id)] = point
                if kinds(tags):
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
            if not kinds(tags):
                return
            if obj.is_closed() and tags.get("area") != "no":
                self.expected[('way', obj.id)] = kinds(tags)
            else:
                line = shape(json.loads(factory.create_linestring(obj)))
                self.write('way', obj.id, tags, line.interpolate(0.5, normalized=True))

        def relation(self, obj):
            if kinds(dict(obj.tags)):
                self.expected[('relation', obj.id)] = kinds(dict(obj.tags))

        def area(self, obj):
            tags = dict(obj.tags)
            if not kinds(tags):
                return
            source_type = 'way' if obj.from_way() else 'relation'
            point = shape(json.loads(factory.create_multipolygon(obj))).representative_point()
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
    emit({'kind': 'complete', 'records': handler.count, 'skippedSettlementGeometries': len(missing)})
    return handler.count


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pbf')
    parser.add_argument('poly')
    parser.add_argument('--source', default='https://download.geofabrik.de/europe/germany-latest.osm.pbf')
    args = parser.parse_args()
    extract(args.pbf, poly_geojson(Path(args.poly).read_text()), sys.stdout, args.source)
