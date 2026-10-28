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
   self.assertEqual({r['version'] for r in records},{1})
   self.assertTrue(all(53.07<=r['lat']<=53.071 for r in records))
   self.assertEqual(rows[-1]['kind'],'complete')
   self.assertEqual(len([r for r in rows if r.get('kind')=='settlement']),1)
 def test_metadata_retains_the_exact_coverage_boundary_provenance(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML)
   out=io.StringIO();extract(str(p), {'type':'MultiPolygon','coordinates':[[[[5,47],[16,47],[16,56],[5,56],[5,47]]]]},out,'fixture','2026-10-25T00:00:00Z',boundary_source='https://download.geofabrik.de/europe/romania.poly',boundary_checksum='a'*64,country_code='ro',source_checksum='b'*32)
   metadata=json.loads(out.getvalue().splitlines()[0])
   self.assertEqual(metadata['coverageSource'],'https://download.geofabrik.de/europe/romania.poly')
   self.assertEqual(metadata['coverageChecksum'],'a'*64)
   self.assertEqual(metadata['countryCode'],'ro')
   self.assertEqual(metadata['sourceChecksum'],'b'*32)
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
 def test_closed_non_area_way_retains_a_valid_representative_point(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('<tag k="amenity" v="toilets"/></way>','<tag k="amenity" v="toilets"/><tag k="area" v="no"/></way>'))
   out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   ways=[json.loads(line) for line in out.getvalue().splitlines() if '"sourceType": "way"' in line]
   self.assertEqual(len(ways),1)
   self.assertTrue(53.07<=ways[0]['lat']<=53.071)
 def test_malformed_closed_facility_area_falls_back_to_its_mapped_line(self):
  extra='''<node id="7" lat="53.072" lon="8.803"/><node id="8" lat="53.073" lon="8.804"/><node id="9" lat="53.073" lon="8.803"/><node id="10" lat="53.072" lon="8.804"/>
  <way id="12" version="1"><nd ref="7"/><nd ref="8"/><nd ref="9"/><nd ref="10"/><nd ref="7"/><tag k="amenity" v="toilets"/></way>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('</osm>',extra+'</osm>'))
   out=io.StringIO();extract(str(p), {'type':'MultiPolygon','coordinates':[[[[5,47],[16,47],[16,56],[5,56],[5,47]]]]},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(line) for line in out.getvalue().splitlines()]
   malformed=[r for r in rows if r.get('sourceId')=='12']
   self.assertEqual(len(malformed),1)
   self.assertEqual(malformed[0]['kind'],'facility')
   self.assertEqual(rows[-1]['kind'],'complete')
 def test_train_route_with_onboard_toilets_is_not_a_fixed_facility(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('</osm>', '<relation id="98" version="1"><member type="way" ref="11" role=""/><tag k="type" v="route"/><tag k="route" v="train"/><tag k="toilets" v="yes"/></relation></osm>'))
   out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(line) for line in out.getvalue().splitlines()]
   self.assertFalse(any(r.get('sourceId')=='98' for r in rows))
   self.assertEqual(rows[-1]['kind'],'complete')
 def test_site_relation_uses_member_geometry_and_collection_is_not_a_location(self):
  with tempfile.TemporaryDirectory() as d:
   extra='<relation id="90" version="1"><member type="way" ref="11" role="toilets"/><tag k="type" v="site"/><tag k="amenity" v="toilets"/></relation><relation id="91" version="1"><member type="node" ref="1" role=""/><tag k="type" v="collection"/><tag k="amenity" v="toilets"/></relation>'
   p=Path(d)/'fixture.osm';p.write_text(XML.replace('</osm>',extra+'</osm>'))
   out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(line) for line in out.getvalue().splitlines()]
   site=next(r for r in rows if r.get('sourceId')=='90')
   self.assertTrue(53.07<=site['lat']<=53.071)
   self.assertFalse(any(r.get('sourceId')=='91' for r in rows))
   self.assertEqual(rows[-1]['kind'],'complete')
 def test_poly_parser_preserves_exterior_and_holes(self):
  poly='germany\n1\n 5 47\n 16 47\n 16 56\n 5 56\n 5 47\nEND\n!1\n 6 48\n 7 48\n 7 49\n 6 48\nEND\nEND\n'
  self.assertEqual(len(poly_geojson(poly)['coordinates'][0]),2)
if __name__=='__main__':unittest.main()
