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
