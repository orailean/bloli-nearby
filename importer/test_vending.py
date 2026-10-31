import io
import tempfile
import unittest
from pathlib import Path
from extract import kinds, extract

class VendingTests(unittest.TestCase):
    def test_explicit_machine_includes_unknown_products_and_overlaps_tobacco(self):
        self.assertIn('vending', kinds({'amenity': 'vending_machine'}))
        self.assertEqual(set(kinds({'amenity': 'vending_machine', 'vending': 'cigarettes;drinks'})), {'vending', 'seller'})
        self.assertNotIn('vending', kinds({'shop': 'convenience', 'vending': 'drinks'}))

    def test_missing_geometry_aborts_publication(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm'
            path.write_text('<osm version="0.6"><relation id="1"><member type="way" ref="99" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="vending_machine"/></relation></osm>')
            with self.assertRaisesRegex(ValueError, 'Incomplete vending geometries'):
                extract(str(path), {'type':'Polygon','coordinates':[[[0,0],[20,0],[20,60],[0,60],[0,0]]]}, io.StringIO(), 'sample', '2026-10-30T00:00:00Z')
