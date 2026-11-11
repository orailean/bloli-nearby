import io
import json
import tempfile
import unittest
from pathlib import Path
from extract import kinds, extract

class ParkingTests(unittest.TestCase):
    def test_explicit_parking_only(self):
        self.assertIn('parking', kinds({'amenity':'parking'}))
        for tags in ({'amenity':'parking_entrance'}, {'amenity':'parking_space'}, {'parking':'surface'}):
            self.assertNotIn('parking', kinds(tags))

    def test_site_uses_only_explicit_vehicle_entrance(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm'
            path.write_text('''<osm version="0.6"><node id="5" lat="48.1" lon="11.2"><tag k="amenity" v="parking_entrance"/><tag k="maxheight" v="2.1"/></node><node id="6" lat="48.2" lon="11.3"><tag k="amenity" v="parking_entrance"/><tag k="entrance" v="exit"/></node><relation id="1"><member type="node" ref="5" role="entrance"/><member type="node" ref="6" role="entrance"/><tag k="type" v="site"/><tag k="amenity" v="parking"/></relation></osm>''')
            out=io.StringIO(); extract(str(path),{},out,'sample','2026-10-30T00:00:00Z')
            rows=[json.loads(line) for line in out.getvalue().splitlines()]
            parking=[row for row in rows if row['kind']=='parking']
            self.assertEqual(len(parking),1)
            self.assertEqual(parking[0]['parkingEntrance'], {'lat':48.1,'lon':11.2,'sourceType':'node','sourceId':'5','maxheight':'2.1'})
            self.assertIn('parking',rows[0]['categories'])

    def test_missing_geometry_aborts_publication(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm'
            path.write_text('<osm version="0.6"><relation id="1"><member type="way" ref="99" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="parking"/></relation></osm>')
            with self.assertRaisesRegex(ValueError,'Incomplete parking geometries'):
                extract(str(path),{},io.StringIO(),'sample','2026-10-30T00:00:00Z')

    def test_nested_sites_and_nonstandard_parking_relation_types(self):
        xml='''<osm version="0.6"><node id="1" lat="40.6" lon="16.6"/><node id="2" lat="40.601" lon="16.601"/><node id="3" lat="40.6" lon="16.602"/><way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/></way><relation id="20"><member type="way" ref="10" role="outer"/><tag k="type" v="multipolygon"/></relation><relation id="1908251"><member type="relation" ref="20" role=""/><tag k="type" v="site"/><tag k="amenity" v="parking"/></relation><relation id="14252380"><member type="way" ref="10" role="outer"/><tag k="type" v="Parcheggio"/><tag k="amenity" v="parking"/></relation></osm>'''
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm';path.write_text(xml);out=io.StringIO()
            extract(str(path),{},out,'sample','2026-11-08T00:00:00Z')
            rows=[json.loads(line) for line in out.getvalue().splitlines()]
            self.assertEqual({r['sourceId'] for r in rows if r.get('kind')=='parking'}, {'1908251','14252380'})
            self.assertEqual(rows[-1]['kind'],'complete')

    def test_polygon_output_preserves_original_relation_type(self):
        xml='''<osm version="0.6"><node id="1" lat="45" lon="11"/><node id="2" lat="45.01" lon="11.01"/><node id="3" lat="45" lon="11.02"/><way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/></way><relation id="20" version="11"><member type="way" ref="10" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="parking"/></relation></osm>'''
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'sample.osm';path.write_text(xml);out=io.StringIO()
            extract(str(path),{},out,'sample','2026-11-08T00:00:00Z')
            row=next(json.loads(line) for line in out.getvalue().splitlines() if json.loads(line).get('kind')=='parking')
            self.assertEqual(row['tags']['type'],'multipolygon')
