import io
import json
import tempfile
import unittest
from pathlib import Path
from extract import extract, kinds

class TourismTests(unittest.TestCase):
    def test_explicit_candidates_and_dual_categories(self):
        self.assertIn('view', kinds({'tourism': 'viewpoint'}))
        self.assertIn('view', kinds({'man_made': 'tower', 'tower:type': 'observation'}))
        self.assertNotIn('view', kinds({'man_made': 'tower', 'tower:type': 'communication'}))
        self.assertNotIn('view', kinds({'natural': 'peak'}))
        self.assertIn('sights', kinds({'historic': 'ruins'}))
        self.assertIn('sights', kinds({'tourism': 'museum'}))
        self.assertEqual(set(kinds({'historic': 'castle', 'tourism': 'viewpoint'})), {'view', 'sights'})
        self.assertEqual(kinds({'type': 'route', 'tourism': 'viewpoint'}), [])

    def test_node_and_area_geometry_with_complete_output(self):
        xml = '''<osm version="0.6"><node id="1" version="1" lat="48.1" lon="11.1"><tag k="tourism" v="viewpoint"/><tag k="ele" v="1200"/></node><node id="2" lat="48.11" lon="11.1"/><node id="3" lat="48.12" lon="11.11"/><node id="4" lat="48.11" lon="11.12"/><way id="5" version="2"><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="2"/><tag k="historic" v="castle"/><tag k="name:hu" v="Vár"/></way></osm>'''
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'sample.osm'; source.write_text(xml)
            out = io.StringIO()
            extract(str(source), {}, out, 'fixture', '2026-10-30T00:00:00Z')
            rows = [json.loads(line) for line in out.getvalue().splitlines()]
            self.assertEqual(len(rows[0]['categories']), 11)
            self.assertEqual({row['kind'] for row in rows[1:-1]}, {'view', 'sights'})
            self.assertEqual(rows[-1]['records'], 2)
            self.assertEqual(next(row for row in rows if row['kind'] == 'sights')['tags']['name:hu'], 'Vár')

    def test_missing_geometries_abort_completion_for_both_categories(self):
        for tag, kind in [('tourism" v="viewpoint', 'view'), ('historic" v="castle', 'sights')]:
            xml = '<osm version="0.6"><relation id="9" version="1"><member type="way" ref="99" role="outer"/><tag k="type" v="multipolygon"/><tag k="' + tag + '"/></relation></osm>'
            with tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / 'sample.osm'; source.write_text(xml)
                out = io.StringIO()
                with self.assertRaisesRegex(ValueError, 'Incomplete ' + kind + ' geometries'):
                    extract(str(source), {}, out, 'fixture', '2026-10-30T00:00:00Z')
                self.assertNotIn('"kind": "complete"', out.getvalue())

class TourismRelationTests(unittest.TestCase):
    def test_nonphysical_collections_are_not_destinations(self):
        for relation_type in ['network', 'person', 'historic:waterway', 'water']:
            self.assertNotIn('sights', kinds({'type': relation_type, 'tourism': 'attraction', 'historic': 'memorial'}))

    def test_building_parts_nested_sites_and_bridge_outline_have_fixed_geometry(self):
        xml = '''<osm version="0.6">
        <node id="1" lat="48.1" lon="11.1"/><node id="2" lat="48.11" lon="11.1"/><node id="3" lat="48.11" lon="11.11"/>
        <node id="4" lat="49" lon="12"/><node id="5" lat="49.01" lon="12.01"/>
        <way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/></way>
        <way id="11"><nd ref="4"/><nd ref="5"/></way>
        <relation id="20"><member type="way" ref="10" role=""/><tag k="type" v="building"/><tag k="tourism" v="attraction"/></relation>
        <relation id="21"><member type="way" ref="10" role="outer"/><tag k="type" v="multipolygon"/></relation>
        <relation id="22"><member type="relation" ref="21" role=""/><tag k="type" v="site"/><tag k="historic" v="castle"/></relation>
        <relation id="23"><member type="way" ref="10" role="outline"/><member type="way" ref="11" role="under"/><tag k="type" v="bridge"/><tag k="tourism" v="attraction"/></relation>
        </osm>'''
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'sample.osm';source.write_text(xml);out=io.StringIO()
            extract(str(source),{},out,'fixture','2026-10-30T00:00:00Z')
            rows=[json.loads(line) for line in out.getvalue().splitlines()]
            places=[row for row in rows if row['kind']=='sights']
            self.assertEqual({row['sourceId'] for row in places},{'20','22','23'})
            for row in places:
                self.assertGreaterEqual(row['lat'],48.1);self.assertLessEqual(row['lat'],48.11)
                self.assertGreaterEqual(row['lon'],11.1);self.assertLessEqual(row['lon'],11.11)
            self.assertEqual(rows[-1]['kind'],'complete')
