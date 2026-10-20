import json
from pathlib import Path
from PIL import Image
import numpy as np
import networkx as nx
from raster_wire_model import components,nearest,ports
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'src/data/mazes'
CONFIG=[
 ('maze-images-geocaching-easter-13-10-png',[2,2,604,604],{'A':[406,136,84,84],'B':[250,262,84,84],'C':[94,418,84,84]},[174,114],[431,513],None),
 ('maze-images-siggy-skeptic-play-3-alt-png',[1,3,604,604],{'A':[129,155,90,90],'B':[363,155,90,90],'C':[129,383,90,90],'D':[363,383,90,90]},[487,548],[539,477],5),
]
registry=json.loads((DATA/'artwork-registry.json').read_text());out=[]
for reference,bounds,frames,start,goal,fixture in CONFIG:
 row=next(x for x in registry if x['reference']==reference);art=row['artwork'];rgb=np.array(Image.open(ROOT/'public'/art['asset']).convert('RGB'))
 cs=components(rgb,frames.values());print(row['title'],'components',len(cs),'traces',sum(len(c['traces'])for c in cs))
 def at(point):
  matches=[nearest(c,point) for c in cs];i=min(range(len(cs)),key=lambda i:matches[i][1]);return str(i+1),matches[i][0],matches[i][1]
 outer=ports(rgb,bounds,8);print('rootports',len(outer),outer)
 mappings=[at(p) for p in outer];edges=[];gates=[]
 for copy,frame in frames.items():
  child=ports(rgb,frame,3);print(copy,'ports',len(child))
  assert len(child)==len(outer)
  for n,point in enumerate(child):
   parent,a,d=at(point);inside,b,_=mappings[n]
   if d>12:continue
   for operation,from_,to,source,target in [('enter',parent,inside,a,b),('exit',inside,parent,b,a)]:
    id=f'{copy}-{n}-{operation}'
    edges.append({'id':id,'from':from_,'to':to,'operation':operation,'copy':copy,'input':'','evidence':'Source colored stroke and clockwise matching chip pin'})
    gates.append({'edge':id,'from':source,'to':target})
 paths=[{'id':str(i+1),'label':str(i+1),'color':c['color'],'helper':False}for i,c in enumerate(cs)]
 traces=[{'id':f'wire-{i+1}-{j}','path':str(i+1),'color':c['color'],'points':points} for i,c in enumerate(cs) for j,points in enumerate(c['traces'])]
 s,sp,_=at(start);g,gp,_=at(goal)
 owned={str(i+1):set() for i in range(len(cs))}
 for i,(path,_,_) in enumerate(mappings):owned[path].add('_:'+str(i))
 for copy,frame in frames.items():
  for i,point in enumerate(ports(rgb,frame,3)):
   path,_,d=at(point)
   if d<=12:owned[path].add(copy+':'+str(i))
 owned[s].add('s');owned[g].add('f')
 native=json.loads((DATA/'geometric-collection.json').read_text())[7 if 'geocaching' in reference else 5]
 expected={frozenset('s' if p.startswith('s:') else 'f' if p.startswith('f:') else p for p in path['gates'])for path in native['paths']}
 actual={frozenset(p)for p in owned.values()}
 assert actual==expected, ('source/native gate partition differs',actual-expected,expected-actual)
 print('Exact source/native gate partitions verified:',len(expected))
 model={'type':'pathPushdown','paths':paths,'copies':list(frames),'connections':edges,'start':{'path':s,'address':[]},'goal':{'path':g,'address':[]},'allowedRule':'finite','claims':[],'review':'wip','notes':['Source RGB strokes and chip pins form this playable WIP. Check crossings and start/finish against the artwork before marking reviewed.']}
 if fixture:
  guide=next(f for f in json.loads((DATA/'path-fixtures.json').read_text()) if f['fixture']==fixture)
  def graph(paths,edges,start,goal):
   graph=nx.MultiDiGraph()
   for path in paths:graph.add_node(path,terminal='start' if path==start else 'goal' if path==goal else '')
   for edge in edges:graph.add_edge(edge['from'],edge['to'],kind=edge['operation']+edge['copy'])
   return graph
  guide_edges=[]
  for i,(pair,direction) in enumerate(guide['pairs']):
   a,b=pair.split('-');from_,to=(a,b) if direction.startswith('/') else (b,a);copy=direction.replace('/','')
   guide_edges.extend([{'from':from_,'to':to,'operation':'enter','copy':copy},{'from':to,'to':from_,'operation':'exit','copy':copy}])
  matcher=nx.algorithms.isomorphism.MultiDiGraphMatcher(graph([p['id']for p in paths],edges,s,g),graph(guide['paths'],guide_edges,guide['start'],guide['goal']),node_match=nx.algorithms.isomorphism.categorical_node_match('terminal',''),edge_match=nx.algorithms.isomorphism.categorical_multiedge_match('kind',''))
  assert matcher.is_isomorphic(), 'Source graph does not match the guide PDA'
  mapping=matcher.mapping
  for path in paths:path['id']=mapping[path['id']];path['label']=str(ord(path['id'])-48)
  for trace in traces:trace['path']=mapping[trace['path']]
  for edge in edges:
   edge['from']=mapping[edge['from']];edge['to']=mapping[edge['to']];edge['input']=('(' if edge['operation']=='enter' else ')') if edge['from']==edge['to'] else edge['to']
  model['start']['path']=mapping[s];model['goal']['path']=mapping[g];model['providedInput']=guide['providedInput']
  print('Guide PDA matched; its original labels and input retained.')
 art={**art,'traces':traces,'gates':gates,'start':sp,'goal':gp,'bounds':bounds,'frames':[{'id':id,'x':f[0],'y':f[1],'width':f[2],'height':f[3]}for id,f in frames.items()]}
 out.append({'reference':reference,'fixture':fixture,'title':row['title'],'definition':model,'artwork':art})
(DATA/'raster-circuits.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
