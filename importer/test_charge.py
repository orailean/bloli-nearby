import io,json,tempfile,unittest
from pathlib import Path
from extract import extract

XML='''<osm version="0.6"><node id="1" lat="48" lon="11" version="1"><tag k="amenity" v="charging_station"/></node><node id="2" lat="48" lon="11.001" version="1"/><node id="3" lat="48.001" lon="11.001" version="1"/><node id="4" lat="48.001" lon="11" version="1"/><way id="10" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="amenity" v="charging_station"/></way><way id="11" version="1"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/></way><relation id="20" version="1"><member type="way" ref="11" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="charging_station"/></relation><node id="30" lat="48" lon="11" version="1"><tag k="man_made" v="charge_point"/><tag k="socket:type2" v="2"/></node></osm>'''
class ChargeTests(unittest.TestCase):
 def run_extract(self,xml,geometry_only=False):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   if geometry_only:count=extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z',geometry_only=True)
   else:count=extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   return count,[json.loads(x) for x in out.getvalue().splitlines()]
 def test_station_nodes_ways_relations_without_dispenser_duplicates(self):
  count,rows=self.run_extract(XML)
  self.assertEqual({r['sourceType']+'/'+r['sourceId'] for r in rows if r.get('kind')=='charge'},{'node/1','way/10','relation/20'})
  self.assertIn('charge',rows[0]['categories']);self.assertEqual(count,3);self.assertEqual(rows[-1]['kind'],'complete')
 def test_missing_charging_geometry_fails_before_completion(self):
  xml='<osm version="0.6"><relation id="99" version="1"><member type="way" ref="999" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="charging_station"/></relation></osm>'
  with self.assertRaisesRegex(ValueError,'Incomplete charge geometries'):self.run_extract(xml)
  with self.assertRaisesRegex(ValueError,'Incomplete charge geometries'):self.run_extract(xml,True)
 def test_geometry_preflight_counts_same_features_without_serializing_records(self):
  count,rows=self.run_extract(XML,True)
  self.assertEqual(count,3);self.assertEqual(rows,[{'kind':'geometryComplete','records':3}])
