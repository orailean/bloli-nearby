import io,json,tempfile,unittest
from pathlib import Path
from extract import kinds,extract
class WaterTests(unittest.TestCase):
 def test_explicit_candidates_and_no_unqualified_sources(self):
  for tags in [{'amenity':'drinking_water'},{'drinking_water':'yes'},{'amenity':'fountain','fountain':'drinking'},{'shop':'bakery','drinking_water:refill':'yes'}]: self.assertIn('water',kinds(tags))
  for tags in [{'amenity':'fountain'},{'natural':'spring'},{'man_made':'water_tap'}]:self.assertNotIn('water',kinds(tags))
 def test_geometry_and_four_category_metadata(self):
  xml='<osm version="0.6"><node id="1" lat="48" lon="11" version="1"><tag k="amenity" v="drinking_water"/></node><node id="2" lat="48.001" lon="11.001" version="1"/><way id="3" version="1"><nd ref="1"/><nd ref="2"/><tag k="drinking_water:refill" v="yes"/></way></osm>'
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z');rows=[json.loads(x) for x in out.getvalue().splitlines()]
   self.assertIn('water',rows[0]['categories']);self.assertEqual({r['sourceType'] for r in rows if r['kind']=='water'},{'node','way'});self.assertEqual(rows[-1]['kind'],'complete')
 def test_missing_water_relation_geometry_fails_before_completion(self):
  xml='<osm version="0.6"><relation id="99" version="1"><member type="way" ref="999" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="drinking_water"/></relation></osm>'
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   with self.assertRaisesRegex(ValueError,'Incomplete water geometries'):extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   self.assertNotIn('"kind": "complete"',out.getvalue())
