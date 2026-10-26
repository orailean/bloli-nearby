"""Contract tests for the combined WC/tobacco streaming source."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from extract import extract, kinds


class SellerExtractionTests(unittest.TestCase):
    def extract_rows(self, objects):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'sellers.osm'
            source.write_text('<osm version="0.6" generator="test">' + objects + '</osm>')
            output = io.StringIO()
            extract(str(source), {}, output, 'fixture', '2026-10-25T00:00:00Z')
            return [json.loads(line) for line in output.getvalue().splitlines()]

    def test_evidence_tokens_and_zero_assumptions(self):
        for tags in [
            {'amenity': 'vending_machine', 'vending': ' drinks ; cigarettes ; sweets'},
            {'shop': 'tobacco'},
            {'shop': 'kiosk', 'tobacco': 'yes'},
            {'shop': 'convenience', 'sells:tobacco': 'yes'},
            {'shop': 'convenience', 'sells:tobacco': 'cigarette'},
            {'amenity': 'fuel', 'sells:tobacco': 'cigarettes;tobacco'},
        ]:
            with self.subTest(tags=tags):
                self.assertIn('seller', kinds(tags))
        for tags in [
            {'amenity': 'fuel'}, {'shop': 'kiosk'},
            {'shop': 'supermarket', 'name': 'Tobacco Cigarettes'},
            {'amenity': 'vending_machine', 'vending': 'e-cigarettes'},
            {'shop': 'convenience', 'sells:tobacco': 'unknown'},
            {'tobacco': 'yes'}, {'shop': 'kiosk', 'tobacco': 'no'},
            {'type': 'route', 'shop': 'tobacco'},
            {'type': 'collection', 'shop': 'tobacco'},
        ]:
            with self.subTest(tags=tags):
                self.assertNotIn('seller', kinds(tags))

    def test_nodes_lines_areas_sites_and_dual_membership(self):
        rows = self.extract_rows('''
<node id="1" lat="53.070" lon="8.801" version="1"><tag k="amenity" v="fuel"/><tag k="toilets" v="yes"/><tag k="tobacco" v="yes"/></node>
<node id="2" lat="53.071" lon="8.801" version="1"><tag k="amenity" v="vending_machine"/><tag k="vending" v="drinks; cigarettes"/></node>
<node id="3" lat="53.071" lon="8.802" version="1"/>
<node id="4" lat="53.070" lon="8.802" version="1"/>
<way id="10" version="1"><nd ref="1"/><nd ref="2"/><tag k="shop" v="tobacco"/></way>
<way id="11" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="shop" v="tobacco"/></way>
<way id="12" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/></way>
<relation id="20" version="1"><member type="way" ref="12" role="outer"/><tag k="type" v="multipolygon"/><tag k="shop" v="tobacco"/></relation>
<relation id="21" version="1"><member type="node" ref="2" role=""/><member type="way" ref="10" role=""/><tag k="type" v="site"/><tag k="shop" v="tobacco"/></relation>
''')
        sellers = [r for r in rows if r['kind'] == 'seller']
        self.assertEqual({r['sourceType'] + '/' + r['sourceId'] for r in sellers},
                         {'node/1', 'node/2', 'way/10', 'way/11', 'relation/20', 'relation/21'})
        self.assertEqual(rows[0]['categories'], ['toilets', 'tobacco'])
        dual = [r for r in rows if r.get('sourceType') == 'node' and r.get('sourceId') == '1']
        self.assertEqual({r['kind'] for r in dual}, {'facility', 'seller'})
        self.assertEqual(dual[0]['tags'], dual[1]['tags'])
        self.assertTrue(all(53.070 <= r['lat'] <= 53.071 for r in sellers))
        site = next(r for r in sellers if r['sourceId'] == '21')
        members = [r for r in sellers if r['sourceId'] in ('2', '10')]
        self.assertIn((site['lat'], site['lon']), [(r['lat'], r['lon']) for r in members])
        self.assertEqual(rows[-1]['records'], 7)
        self.assertEqual(rows[-1]['records'], len(rows) - 2)

    def test_empty_seller_extract_still_declares_category_for_count_validation(self):
        rows = self.extract_rows('<node id="1" lat="53.07" lon="8.80" version="1"><tag k="amenity" v="fuel"/></node>')
        self.assertEqual(rows[0]['categories'], ['toilets', 'tobacco'])
        self.assertEqual(rows[-1]['records'], 0)

    def test_missing_seller_geometry_fails_instead_of_completing(self):
        for geometry in [
            '<relation id="99" version="1"><member type="way" ref="999" role="outer"/><tag k="type" v="multipolygon"/><tag k="shop" v="tobacco"/></relation>',
            '<relation id="99" version="1"><member type="node" ref="999" role=""/><tag k="type" v="site"/><tag k="shop" v="tobacco"/></relation>',
            '<way id="99" version="1"><nd ref="999"/><nd ref="998"/><tag k="shop" v="tobacco"/></way>',
        ]:
            with self.subTest(geometry=geometry), self.assertRaises(Exception):
                self.extract_rows(geometry)


if __name__ == '__main__':
    unittest.main()
