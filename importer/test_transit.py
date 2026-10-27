import unittest,tempfile,json,io
from pathlib import Path
from transit_context import build_context,TransportContext,route_mode
from extract import extract,kinds
class TransitTests(unittest.TestCase):
 def test_mode_evidence_not_name_or_light_rail_alone(self):
  self.assertEqual(route_mode({'route':'train','ref':'S1','network':'MVV'}),'suburban_rail')
  self.assertEqual(route_mode({'route':'light_rail','ref':'S1','network':'KVV'}),'light_rail')
  self.assertEqual(route_mode({'route':'train','name':'S-Bahn Berlin S1'}),'suburban_rail')
 def test_groups_routes_and_generic_entrance_have_fixed_geometry(self):
  xml='''<osm version="0.6"><node id="1" version="1" lat="48" lon="11"><tag k="public_transport" v="platform"/><tag k="train" v="yes"/></node><node id="2" version="1" lat="48.001" lon="11"><tag k="entrance" v="main"/></node><relation id="10" version="1"><member type="node" ref="1" role="platform"/><member type="node" ref="2" role="entrance"/><tag k="type" v="public_transport"/><tag k="public_transport" v="stop_area"/><tag k="name" v="Hub"/></relation><relation id="20" version="1"><member type="node" ref="1" role="platform"/><tag k="type" v="route"/><tag k="route" v="train"/><tag k="ref" v="S1"/><tag k="network" v="MVV"/></relation></osm>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'sample.osm';p.write_text(xml);db=Path(d)/'context.sqlite';build_context(str(p),str(db),'fixture');ctx=TransportContext(str(db),'fixture');c=ctx.get('node','2');self.assertEqual(c['groups'][0]['id'],'relation/10');self.assertEqual(c['groups'][0]['routes'][0]['mode'],'suburban_rail');ctx.close()
   out=io.StringIO();extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z',str(db),'fixture');rows=[json.loads(x) for x in out.getvalue().splitlines()];records=[x for x in rows if x.get('kind')=='transit'];self.assertEqual({x['sourceId'] for x in records},{'1','2'});self.assertEqual(rows[-1]['kind'],'complete');self.assertIn('transit',rows[0]['categories'])
 def test_route_paths_are_context_only_and_fingerprint_required(self):
  self.assertNotIn('transit',kinds({'type':'route','route':'train'}))
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'s.osm';p.write_text('<osm version="0.6"/>');db=Path(d)/'c.sqlite';build_context(str(p),str(db),'a')
   with self.assertRaises(ValueError):TransportContext(str(db),'b')
 def test_semicolon_network_evidence_and_regional_sbahn(self):
  self.assertEqual(route_mode({'route':'train','ref':'S1','network':'NRW-Tarif;VRR'}),'suburban_rail')
  self.assertEqual(route_mode({'route':'train','ref':'S2','network':'Regio-Verkehrsverbund Freiburg','network:short':'RVF'}),'suburban_rail')
 def test_missing_passenger_platform_geometry_fails_without_completion(self):
  xml='<osm version="0.6"><relation id="30" version="1"><member type="way" ref="999" role="outer"/><tag k="type" v="multipolygon"/><tag k="public_transport" v="platform"/><tag k="train" v="yes"/></relation></osm>'
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   with self.assertRaisesRegex(ValueError,'Incomplete transit geometries'):extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   self.assertNotIn('"kind": "complete"',out.getvalue())

 def test_tagged_station_groups_and_direction_signs_are_context_not_locations(self):
  xml='''<osm version="0.6"><node id="1" version="1" lat="48" lon="11"><tag k="public_transport" v="platform"/><tag k="train" v="yes"/></node><relation id="10" version="1"><member type="node" ref="1" role="platform"/><tag k="type" v="public_transport"/><tag k="public_transport" v="stop_area"/><tag k="railway" v="station"/><tag k="name" v="Hub"/></relation><relation id="11" version="1"><member type="relation" ref="10" role="stop_area"/><tag k="type" v="public_transport"/><tag k="public_transport" v="stop_area_group"/><tag k="amenity" v="bus_station"/></relation><relation id="12" version="1"><member type="node" ref="1" role="sign"/><tag k="type" v="destination_sign"/><tag k="public_transport" v="station"/></relation></osm>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(x) for x in out.getvalue().splitlines()]
   records=[x for x in rows if x.get('kind')=='transit']
   self.assertEqual([x['sourceId'] for x in records],['1'])
   self.assertEqual(records[0]['transport']['groups'][0]['id'],'relation/10')
   self.assertEqual(rows[-1]['kind'],'complete')
 def test_non_area_passenger_relation_uses_actual_member_geometry(self):
  xml='''<osm version="0.6"><node id="1" version="1" lat="48" lon="11"/><relation id="10" version="1"><member type="node" ref="1" role="platform"/><tag k="type" v="public_transport"/><tag k="public_transport" v="platform"/><tag k="train" v="yes"/></relation></osm>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   rows=[json.loads(x) for x in out.getvalue().splitlines()]
   record=next(x for x in rows if x.get('kind')=='transit')
   self.assertEqual((record['sourceType'],record['sourceId'],record['lat'],record['lon']),('relation','10',48,11))
   self.assertEqual(rows[-1]['kind'],'complete')

 def test_nested_passenger_platform_relations_resolve_member_geometry(self):
  xml='''<osm version="0.6"><node id="1" version="1" lat="48" lon="11"/><node id="2" version="1" lat="48.001" lon="11"/><way id="5" version="1"><nd ref="1"/><nd ref="2"/></way><relation id="20" version="1"><member type="way" ref="5" role="outer"/><tag k="type" v="multilinestring"/></relation><relation id="30" version="1"><member type="relation" ref="20" role="outer"/><tag k="type" v="multipolygon"/><tag k="public_transport" v="platform"/><tag k="train" v="yes"/></relation></osm>'''
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'fixture.osm';p.write_text(xml);out=io.StringIO()
   extract(str(p),{},out,'fixture','2026-10-25T00:00:00Z')
   records=[json.loads(x) for x in out.getvalue().splitlines() if '"kind": "transit"' in x]
   self.assertEqual(len(records),1)
   self.assertEqual(records[0]['sourceId'],'30')
   self.assertAlmostEqual(records[0]['lat'],48.0005)
   self.assertEqual(records[0]['lon'],11)
