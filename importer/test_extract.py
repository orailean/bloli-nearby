import io, json, tempfile, unittest
from pathlib import Path
from extract import extract, poly_geojson

XML='''<osm version="0.6" generator="test">
<node id="1" lat="53.07" lon="8.80" version="1"><tag k="amenity" v="toilets"/><tag k="fee" v="no"/></node>
<node id="2" lat="53.070" lon="8.801" version="1"/>
<node id="3" lat="53.071" lon="8.801" version="1"/>
<node id="4" lat="53.071" lon="8.802" version="1"/>
<node id="5" lat="53.070" lon="8.802" version="1"/>
<node id="6" lat="53.075" lon="8.805" version="1"><tag k="place" v="city"/><tag k="name" v="Bremen"/></node>
<way id="10" version="1"><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="5"/><nd ref="2"/><tag k="amenity" v="toilets"/></way>
<way id="11" version="1"><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="5"/><nd ref="2"/></way>
<relation id="20" version="1"><member type="way" ref="11" role="outer"/><tag k="type" v="multipolygon"/><tag k="amenity" v="toilets"/></relation></osm>'''
class ExtractTests(unittest.TestCase):
 def test_nodes_ways_relations_and_settlements_have_source_identity_and_points(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML)
   out=io.StringIO();extract(str(p), {'type':'MultiPolygon','coordinates':[[[[5,47],[16,47],[16,56],[5,56],[5,47]]]]},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(line) for line in out.getvalue().splitlines()]
   records=[r for r in rows if r.get('kind')=='facility']
   self.assertEqual({r['sourceType']+'/'+r['sourceId'] for r in records},{'node/1','way/10','relation/20'})
   self.assertTrue(all(53.07<=r['lat']<=53.071 for r in records))
   self.assertEqual(rows[-1]['kind'],'complete')
   self.assertEqual(len([r for r in rows if r.get('kind')=='settlement']),1)
 def test_incomplete_geometry_fails_instead_of_publishing_partial_data(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('<nd ref="4"/>','<nd ref="999"/>'))
   with self.assertRaises(Exception):extract(str(p),{},io.StringIO(),'fixture','2026-10-25T00:00:00Z')
 def test_clipped_postcode_boundary_is_reported_without_discarding_valid_facilities(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('</osm>', '<relation id="99" version="1"><member type="way" ref="999" role="outer"/><tag k="type" v="boundary"/><tag k="boundary" v="postal_code"/><tag k="postal_code" v="99999"/></relation></osm>'))
   out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   last=json.loads(out.getvalue().splitlines()[-1])
   self.assertEqual(last['skippedSettlementGeometries'],1)
 def test_poly_parser_preserves_exterior_and_holes(self):
  poly='germany\n1\n 5 47\n 16 47\n 16 56\n 5 56\n 5 47\nEND\n!1\n 6 48\n 7 48\n 7 49\n 6 48\nEND\nEND\n'
  self.assertEqual(len(poly_geojson(poly)['coordinates'][0]),2)
if __name__=='__main__':unittest.main()
