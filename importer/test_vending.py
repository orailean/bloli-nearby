import io
import json
import tempfile
import unittest
from pathlib import Path
from extract import kinds, extract

class VendingTests(unittest.TestCase):
    def test_explicit_machine_includes_unknown_products_and_overlaps_tobacco(self):
        self.assertIn('vending', kinds({'amenity': 'vending_machine'}))
        self.assertEqual(set(kinds({'amenity': 'vending_machine', 'vending': 'cigarettes;drinks'})), {'vending', 'seller'})
        self.assertNotIn('vending', kinds({'shop': 'convenience', 'vending': 'drinks'}))

    def test_node_relation_uses_its_member_node(self):
        # Mappers attach shared features to one point through type=node relations.
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm'
            path.write_text('<osm version="0.6"><node id="5" lat="48.1" lon="11.2"/><relation id="1"><member type="node" ref="5" role=""/><tag k="type" v="node"/><tag k="amenity" v="vending_machine"/><tag k="vending" v="excrement_bags"/></relation></osm>')
            out=io.StringIO()
            extract(str(path), {}, out, 'sample', '2026-10-30T00:00:00Z')
            rows=[json.loads(line) for line in out.getvalue().splitlines()]
            machines=[row for row in rows if row['kind']=='vending']
            self.assertEqual([(row['sourceType'], row['sourceId'], row['lat'], row['lon']) for row in machines], [('relation', '1', 48.1, 11.2)])
            self.assertEqual(rows[-1]['kind'], 'complete')

    def test_missing_geometry_aborts_publication(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm'
            path.write_text('<osm version="0.6"><relation id="1"><member type="way" ref="99" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="vending_machine"/></relation></osm>')
            with self.assertRaisesRegex(ValueError, 'Incomplete vending geometries'):
                extract(str(path), {'type':'Polygon','coordinates':[[[0,0],[20,0],[20,60],[0,60],[0,0]]]}, io.StringIO(), 'sample', '2026-10-30T00:00:00Z')
