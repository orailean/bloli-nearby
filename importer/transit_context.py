"""Bounded relation context: member references and service metadata, never route paths."""
import argparse,json,os,re,sqlite3
from pathlib import Path
import osmium
MODES={'train':'train','subway':'subway','tram':'tram','light_rail':'light_rail','bus':'bus','trolleybus':'trolleybus','ferry':'ferry','funicular':'funicular','monorail':'other_rail','aerialway':'cable'}
NETWORKS={'MVV','VBB','HVV','VVS','VRR','RMV','VRN','VGN','MDV','VVO','VMS','GVH','AVV','NVV','DING','VRS','NAH.SH','RVF','VSB','VVW'}
def route_mode(tags):
 route=tags.get('route','');mode=MODES.get(route)
 if not mode:return None
 if route in ('train','light_rail'):
  evidence=' '.join(tags.get(k,'') for k in ('network','operator','brand','name'))
  aliases={'Verkehrsverbund Warnow':'VVW','Münchner Verkehrs- und Tarifverbund':'MVV','Hamburger Verkehrsverbund':'HVV','Verkehrsverbund Berlin-Brandenburg':'VBB','Regio-Verkehrsverbund Freiburg':'RVF'}
  networks={aliases.get(x.strip(),x.strip()) for x in (tags.get('network:short','')+';'+tags.get('network','')).split(';')}
  if re.search(r'\bS[ -]?Bahn\b',evidence,re.I) or re.fullmatch(r'S\s*\d+[A-Za-z]?',tags.get('ref','')) and bool(networks & NETWORKS): return 'suburban_rail'
 return mode

def build_context(source,destination,fingerprint):
 temp=destination+'.part'
 if os.path.exists(temp):os.remove(temp)
 db=sqlite3.connect(temp)
 db.executescript('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE groups(id TEXT PRIMARY KEY,tags TEXT); CREATE TABLE group_members(member TEXT,group_id TEXT); CREATE TABLE routes(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE route_members(member TEXT,route_id TEXT);')
 class Relations(osmium.SimpleHandler):
  def relation(self,obj):
   tags=dict(obj.tags);key=f'relation/{obj.id}'
   if tags.get('type')=='public_transport' and tags.get('public_transport')=='stop_area':
    db.execute('INSERT INTO groups VALUES(?,?)',(key,json.dumps(tags,ensure_ascii=False)))
    db.executemany('INSERT INTO group_members VALUES(?,?)',[(f'{dict(n="node",w="way",r="relation")[m.type]}/{m.ref}',key) for m in obj.members if m.type in 'nwr'])
   elif tags.get('type')=='route' and not any(tags.get(k)=='yes' or tags.get(f'{k}:route') for k in ['disused','abandoned','construction','removed']):
    mode=route_mode(tags)
    if mode:
     data={'id':key,'mode':mode,'ref':tags.get('ref',''),'network':tags.get('network',''),'evidence':';'.join(f'{k}={tags[k]}' for k in ['route','ref','network','network:short','operator','brand','name'] if k in tags)}
     db.execute('INSERT INTO routes VALUES(?,?)',(key,json.dumps(data,ensure_ascii=False)))
     db.executemany('INSERT INTO route_members VALUES(?,?)',[(f'{dict(n="node",w="way",r="relation")[m.type]}/{m.ref}',key) for m in obj.members if m.type in 'nwr' and (m.role.startswith(('stop','platform')) or m.type=='n')])
 Relations().apply_file(source)
 db.executescript('CREATE INDEX gm_member ON group_members(member); CREATE INDEX gm_group ON group_members(group_id); CREATE INDEX rm_member ON route_members(member); CREATE TABLE group_routes AS SELECT DISTINCT g.group_id,r.route_id FROM group_members g JOIN route_members r USING(member); CREATE INDEX gr_group ON group_routes(group_id);')
 db.execute('INSERT INTO meta VALUES(?,?)',('fingerprint',fingerprint));db.execute('INSERT INTO meta VALUES(?,?)',('complete','1'));db.commit();db.close();os.replace(temp,destination)

class TransportContext:
 def __init__(self,path,fingerprint=None):
  self.db=sqlite3.connect(f'file:{Path(path).resolve()}?mode=ro',uri=True)
  meta=dict(self.db.execute('SELECT key,value FROM meta'))
  if meta.get('complete')!='1' or fingerprint is not None and meta.get('fingerprint')!=fingerprint:self.db.close();raise ValueError('INVALID_TRANSIT_CONTEXT')
 def get(self,source_type,source_id):
  key=f'{source_type}/{source_id}'
  groups=[]
  for gid,tags in self.db.execute('SELECT DISTINCT g.id,g.tags FROM groups g JOIN group_members m ON m.group_id=g.id WHERE m.member=?',(key,)):
   routes=[json.loads(row[0]) for row in self.db.execute('SELECT r.data FROM routes r JOIN group_routes m ON m.route_id=r.id WHERE m.group_id=? ORDER BY r.id',(gid,))]
   groups.append({'id':gid,'tags':json.loads(tags),'routes':routes})
  routes=[json.loads(row[0]) for row in self.db.execute('SELECT DISTINCT r.data FROM routes r JOIN route_members m ON m.route_id=r.id WHERE m.member=? ORDER BY r.id',(key,))]
  return {'groups':groups,'routes':routes}
 def close(self):self.db.close()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('destination');p.add_argument('--fingerprint',required=True);a=p.parse_args();build_context(a.source,a.destination,a.fingerprint);print('[transit-context] Complete source-bound relation context',flush=True)
