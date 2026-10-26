"""Streaming OSM extraction. The caller publishes output only after successful completion."""
import argparse
import json
import sys
import tempfile
from pathlib import Path
import osmium
from shapely.geometry import shape


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


def kinds(tags):
    # Route toilets are onboard vehicles, not a fixed public facility.
    if tags.get('type') in ('route', 'route_master'):
        return []
    result = []
    if tags.get('amenity') == 'toilets' or tags.get('toilets') == 'yes':
        result.append('facility')
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
    emit({'kind': 'metadata', 'source': source, 'datasetAt': dataset_at, 'coverage': coverage})
    factory = osmium.geom.GeoJSONFactory()

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
            if kinds(tags):
                self.write('node', obj.id, tags, shape(json.loads(factory.create_point(obj))))

        def way(self, obj):
            tags = dict(obj.tags)
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
    missing = set(handler.expected) - handler.completed
    broken_facilities = [key for key in missing if 'facility' in handler.expected[key]]
    if broken_facilities:
        raise ValueError(f'Incomplete toilet geometries: {len(broken_facilities)}; sources: {sorted(broken_facilities)[:30]}')
    emit({'kind': 'complete', 'records': handler.count, 'skippedSettlementGeometries': len(missing)})
    return handler.count


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pbf')
    parser.add_argument('poly')
    parser.add_argument('--source', default='https://download.geofabrik.de/europe/germany-latest.osm.pbf')
    args = parser.parse_args()
    extract(args.pbf, poly_geojson(Path(args.poly).read_text()), sys.stdout, args.source)
