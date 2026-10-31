import io,json,tempfile,unittest
from pathlib import Path
from extract import extract,kinds

class AtmStayTests(unittest.TestCase):
 def test_candidates_require_explicit_tags(self):
  self.assertIn('atm',kinds({'amenity':'atm'}))
  self.assertIn('atm',kinds({'shop':'supermarket','atm':'yes'}))
  self.assertNotIn('atm',kinds({'amenity':'bank'}))
  self.assertNotIn('atm',kinds({'amenity':'bank','atm':'separate'}))
  for value in ['hotel','motel','guest_house','hostel','apartment','chalet','camp_site','caravan_site']:
   self.assertIn('accommodation',kinds({'tourism':value}))
  self.assertNotIn('accommodation',kinds({'tourism':'camp_pitch'}))
 def test_nodes_and_accommodation_areas_keep_geometry_tags_and_complete_categories(self):
  xml='''<osm version="0.6"><node id="1" version="1" lat="48.1" lon="11.1"><tag k="amenity" v="atm"/><tag k="currency" v="EUR"/></node><node id="2" lat="48.11" lon="11.1"/><node id="3" lat="48.12" lon="11.11"/><node id="4" lat="48.11" lon="11.12"/><way id="5" version="2"><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="2"/><tag k="tourism" v="hotel"/><tag k="name:hu" v="Szálloda"/></way></osm>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'sample.osm';p.write_text(xml);out=io.StringIO()
   extract(str(p),{},out,'fixture','2026-10-27T00:00:00Z')
   rows=[json.loads(line) for line in out.getvalue().splitlines()]
   self.assertEqual(len(rows[0]['categories']),11)
   self.assertEqual({row['kind'] for row in rows[1:-1]},{'atm','accommodation'})
   self.assertEqual(rows[-1]['records'],2)
   self.assertEqual(next(r for r in rows if r['kind']=='accommodation')['tags']['name:hu'],'Szálloda')
 def test_broken_accommodation_geometry_blocks_completion(self):
  xml='<osm version="0.6"><relation id="9" version="1"><member type="way" ref="99" role="outer"/><tag k="type" v="multipolygon"/><tag k="tourism" v="hotel"/></relation></osm>'
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'sample.osm';p.write_text(xml)
   with self.assertRaisesRegex(ValueError,'Incomplete accommodation geometries'):
    extract(str(p),{},io.StringIO(),'fixture','2026-10-27T00:00:00Z')
