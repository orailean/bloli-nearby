"""Three-category streaming contract; access/lifecycle belongs to normalization."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from extract import extract, kinds


FOOD = '<tag k="amenity" v="fast_food"/><tag k="cuisine" v="Pizza; DöNER"/>'
NODES = '''<node id="1" lat="53.070" lon="8.801" version="1"/>
<node id="2" lat="53.071" lon="8.801" version="1"/>
<node id="3" lat="53.071" lon="8.802" version="1"/>
<node id="4" lat="53.070" lon="8.802" version="1"/>'''
OUTLINE = '<way id="10" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/></way>'


class KebabExtractionTests(unittest.TestCase):
    def run_extract(self, objects, output=None):
        output = output if output is not None else io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'kebab.osm'
            source.write_text('<osm version="0.6" generator="test">' + objects + '</osm>')
            extract(str(source), {}, output, 'fixture', '2026-10-25T00:00:00Z')
        return [json.loads(line) for line in output.getvalue().splitlines()]

    def test_exact_fixed_venue_and_semicolon_case_cuisine_policy(self):
        for amenity in ('fast_food', 'restaurant'):
            for cuisine in ('kebab', 'doner', 'doener', 'döner', ' pizza ; DöNeR ; burger '):
                with self.subTest(amenity=amenity, cuisine=cuisine):
                    self.assertIn('kebab', kinds({'amenity': amenity, 'cuisine': cuisine}))
        for tags in (
            {'amenity': 'restaurant', 'cuisine': 'turkish', 'name': 'Döner Kebab'},
            {'amenity': 'fast_food', 'name': 'Döner'},
            {'amenity': 'restaurant', 'cuisine': 'kebab_house'},
            {'amenity': 'cafe', 'cuisine': 'kebab'},
            {'cuisine': 'kebab'},
            {'amenity': 'food_truck', 'cuisine': 'kebab'},
            *({'type': relation_type, 'amenity': 'restaurant', 'cuisine': 'kebab'}
              for relation_type in ('route', 'route_master', 'collection')),
        ):
            with self.subTest(tags=tags):
                self.assertNotIn('kebab', kinds(tags))

    def test_candidate_retains_restriction_evidence_for_downstream_normalizer(self):
        for restrictions in ({'access': 'private'}, {'disused': 'yes'}, {'opening_hours': 'closed'}):
            tags = {'amenity': 'restaurant', 'cuisine': 'kebab', **restrictions}
            self.assertIn('kebab', kinds(tags))
        self.assertNotIn('kebab', kinds({'disused:amenity': 'restaurant', 'cuisine': 'kebab'}))

    def test_node_three_memberships_tags_unknown_hours_and_completion(self):
        rows = self.run_extract('<node id="5" lat="53.07" lon="8.80" version="1">' + FOOD +
                                '<tag k="shop" v="supermarket"/><tag k="toilets" v="yes"/></node>')
        self.assertEqual(rows[0]['categories'], ['toilets', 'tobacco', 'kebab'])
        records = rows[1:-1]
        self.assertEqual({r['kind'] for r in records}, {'facility', 'seller', 'kebab'})
        self.assertEqual(len(records), 3)
        self.assertTrue(all((r['sourceType'], r['sourceId']) == ('node', '5') for r in records))
        self.assertTrue(all(r['tags'] == records[0]['tags'] for r in records))
        self.assertEqual(records[0]['tags']['cuisine'], 'Pizza; DöNER')
        self.assertNotIn('opening_hours', records[0]['tags'])
        self.assertEqual(rows[-1], {'kind': 'complete', 'records': 3, 'skippedSettlementGeometries': 0})

    def test_line_closed_area_and_non_area_way_geometry(self):
        for refs, area in (('<nd ref="1"/><nd ref="2"/>', ''),
                           ('<nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>', ''),
                           ('<nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>', '<tag k="area" v="no"/>')):
            with self.subTest(refs=refs, area=area):
                rows = self.run_extract(NODES + '<way id="11" version="1">' + refs + FOOD + area + '</way>')
                self.assert_food_geometry(rows, 'way', '11')

    def assert_food_geometry(self, rows, source_type, source_id):
        foods = [r for r in rows if r['kind'] == 'kebab']
        self.assertEqual(len(foods), 1)
        food = foods[0]
        self.assertEqual((food['sourceType'], food['sourceId']), (source_type, source_id))
        self.assertTrue(53.070 <= food['lat'] <= 53.071)
        self.assertTrue(8.801 <= food['lon'] <= 8.802)
        self.assertEqual(rows[-1]['records'], len(rows) - 2)

    def test_multipolygon_site_and_building_outline_or_part_relation_geometry(self):
        for relation_type, role in (('multipolygon', 'outer'), ('site', ''),
                                    ('building', 'outline'), ('building', 'part')):
            with self.subTest(relation_type=relation_type, role=role):
                rows = self.run_extract(NODES + OUTLINE + '<relation id="20" version="1">' +
                    f'<member type="way" ref="10" role="{role}"/><tag k="type" v="{relation_type}"/>' + FOOD + '</relation>')
                self.assert_food_geometry(rows, 'relation', '20')
                if relation_type == 'building':
                    self.assertTrue(53.070 < rows[1]['lat'] < 53.071)
                    self.assertTrue(8.801 < rows[1]['lon'] < 8.802)

    def test_missing_fixed_relation_geometry_fails_without_completion(self):
        for relation_type, role in (('multipolygon', 'outer'), ('site', ''), ('building', 'outline')):
            with self.subTest(relation_type=relation_type):
                output = io.StringIO()
                with self.assertRaisesRegex(ValueError, 'Incomplete kebab geometries'):
                    self.run_extract('<relation id="99" version="1">' +
                        f'<member type="way" ref="999" role="{role}"/><tag k="type" v="{relation_type}"/>' + FOOD + '</relation>', output)
                self.assertFalse(any(json.loads(line)['kind'] == 'complete' for line in output.getvalue().splitlines()))

    def test_missing_way_nodes_fail_without_completion(self):
        output = io.StringIO()
        with self.assertRaises(Exception):
            self.run_extract('<way id="99" version="1"><nd ref="998"/><nd ref="999"/>' + FOOD + '</way>', output)
        self.assertFalse(any(json.loads(line)['kind'] == 'complete' for line in output.getvalue().splitlines()))

    def test_empty_extract_declares_all_categories_and_zero_records(self):
        rows = self.run_extract('')
        self.assertEqual(rows[0]['categories'], ['toilets', 'tobacco', 'kebab'])
        self.assertEqual(rows[-1]['records'], 0)


if __name__ == '__main__':
    unittest.main()
