"""Recover finite certificates for Siggy's joint Cantor and infinite-hop rules.

Matched-descent search has no period/depth cutoff. These certificate algorithms
are not a decision procedure for every generalized addressed proof. Production
proof/replay checking is required before publication.
"""
import os
import argparse
import asyncio,itertools,json,runpy,sys
from collections import deque
from pathlib import Path
import networkx as nx
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
solver=runpy.run_path(str(ROOT/'scripts/prepare-catalog-solutions.py'))

def words(copies,maximum):
 return [w for n in range(maximum+1)for w in itertools.product(copies,repeat=n)]

def cantor(definition):
 """Recover a joint root-address certificate by refining the presumed path classes.

 This searches surface connections, not every addressed Cantor derivation. Each
 surviving connection still needs a witness checked by the production rules.
 """
 paths=[p['id']for p in definition['paths']];copies=definition['copies']
 groups=[paths];states=[(path,address)for address in words(copies,1)for path in paths]
 while True:
  pairs=[dict(id=f'cantor-{anchor}-{path}',**{'from':dict(path=anchor,address=[])},to=dict(path=path,address=[]))for group in groups for anchor in [definition['start']['path']if definition['start']['path']in group else group[0]]for path in group if path!=anchor]
  graph=nx.DiGraph();graph.add_nodes_from(states)
  for path,address in states:
   for edge in definition['connections']:
    if edge['from']!=path:continue
    if edge['operation']=='exit' and (not address or address[-1]!=edge['copy']):continue
    target=address+(edge['copy'],)if edge['operation']=='enter'else address[:-1]if edge['operation']=='exit'else address
    if len(target)<=1:graph.add_edge((path,address),(edge['to'],target),step=solver['EDGE'](edge['id']))
  for pair in pairs:
   for copy in copies:
    a=(pair['from']['path'],(copy,));b=(pair['to']['path'],(copy,))
    graph.add_edge(a,b,step=dict(kind='hypothesis',reference=pair['id'],reverse=False))
    graph.add_edge(b,a,step=dict(kind='hypothesis',reference=pair['id'],reverse=True))
  roots={(path,())for path in paths}
  components=[sorted(path for path,address in component&roots)for component in nx.strongly_connected_components(graph)]
  refined=sorted(group for group in components if group)
  print('Cantor refinement',refined,flush=True)
  if refined==sorted(groups):break
  groups=refined
 for pair in pairs:
  a=(pair['from']['path'],());b=(pair['to']['path'],())
  trail=nx.shortest_path(graph,a,b)
  pair['witness']=[graph.edges[u,v]['step']for u,v in zip(trail,trail[1:])]
 # Playback may use the proved connections, never the descendant presumptions.
 replay=nx.DiGraph();replay.add_nodes_from(states)
 replay.add_edges_from((a,b,attr)for a,b,attr in graph.edges(data=True)if attr['step']['kind']!='hypothesis')
 for pair in pairs:
  a=(pair['from']['path'],());b=(pair['to']['path'],())
  replay.add_edge(a,b,step=solver['LEMMA'](pair['id']))
  replay.add_edge(b,a,step=solver['LEMMA'](pair['id'],True))
 start=(definition['start']['path'],tuple(definition['start']['address']))
 goal=(definition['goal']['path'],tuple(definition['goal']['address']))
 if not nx.has_path(replay,start,goal):return None
 trail=nx.shortest_path(replay,start,goal)
 steps=[replay.edges[u,v]['step']for u,v in zip(trail,trail[1:])]
 # Keep only the obligations the solution and their witnesses actually use.
 needed={step['reference']for step in steps if step['kind']=='lemma'}
 by_id={pair['id']:pair for pair in pairs};pending=list(needed)
 while pending:
  for step in by_id[pending.pop()]['witness']:
   if step['kind']=='hypothesis' and step['reference']not in needed:
    needed.add(step['reference']);pending.append(step['reference'])
 obligations=[pair for pair in pairs if pair['id']in needed]
 if not obligations:return [],steps
 primary=next((pair for pair in obligations if pair['from']==definition['start']and pair['to']==definition['goal']),obligations[0])
 claim=dict(id=primary['id'],rule='cantorHop',**{'from':primary['from']},to=primary['to'],first=primary['witness'],second=[],period=[],scope=[],companions=[pair for pair in obligations if pair is not primary])
 return [claim],steps

def infinite(definition):
 """Match two finite setups and a productive shared-copy cycle.

 Balanced excursions and previously checked lemmas are finite edge programs.
 The ordered pair graph has finitely many path pairs, so a twelve-copy period
 needs no twelve-level maze expansion. This searches matched descents, not all
 possible generalized addressed or nested proofs.
 """
 paths=[p['id']for p in definition['paths']];edges=definition['connections']
 lemmas={(e['from'],e['to']):[e['_step']]for e in edges if '_step'in e}
 balanced=solver['closure'](paths,[e for e in edges if '_step'not in e],lemmas)
 descents={path:{}for path in paths}
 for path in paths:
  for edge in edges:
   before=balanced.get((path,edge['from']))
   if edge['operation']!='enter' or before is None:continue
   for target in paths:
    after=balanced.get((edge['to'],target))
    if after is not None:descents[path].setdefault(edge['copy'],[]).append((target,before+[solver['EDGE'](edge['id'])]+after))
 graph=nx.DiGraph();graph.add_nodes_from(itertools.product(paths,repeat=2))
 for a,b in graph.nodes:
  for copy in sorted(descents[a].keys()&descents[b].keys()):
   for left,right in itertools.product(descents[a][copy],descents[b][copy]):
    target=(left[0],right[0])
    if not graph.has_edge((a,b),target):graph.add_edge((a,b),target,copy=copy,first=left[1],second=right[1])
 start=(definition['start']['path'],definition['goal']['path'])
 queue=deque([(start,[],[],[])]);seen={start}
 while queue:
  pair,word,left,right=queue.popleft()
  for next_pair in graph.successors(pair):
   if not nx.has_path(graph,next_pair,pair):continue
   cycle=[pair]+nx.shortest_path(graph,next_pair,pair)
   moves=[graph.edges[a,b]for a,b in zip(cycle,cycle[1:])]
   claim=dict(id='general-infinite',rule='infiniteHop',**{'from':definition['start']},to=definition['goal'],scope=definition['start']['address']+word,
    period=[move['copy']for move in moves],setup=dict(first=left,second=right),
    first=[step for move in moves for step in move['first']],second=[step for move in moves for step in move['second']])
   return [claim],[solver['LEMMA'](claim['id'])]
  for target in graph.successors(pair):
   if target in seen:continue
   seen.add(target);move=graph.edges[pair,target]
   queue.append((target,word+[move['copy']],left+move['first'],right+move['second']))
 return None

def nested_infinite(definition):
 direct=infinite(definition)
 if direct:return direct
 paths=[p['id']for p in definition['paths']];claims=[];links={};original=definition['connections']
 for iteration in range(len(paths)):
  added=False
  for a,b in itertools.combinations(paths,2):
   if (a,b)in links:continue
   result=infinite({**definition,'start':dict(path=a,address=[]),'goal':dict(path=b,address=[]),'connections':original+list(links.values())})
   if not result:continue
   claim=result[0][0];claim['id']=f'general-infinite-{a}-{b}';claims.append(claim)
   for x,y,reverse in [(a,b,False),(b,a,True)]:
    links[x,y]=dict(id=claim['id'],**{'from':x},to=y,operation='walk',copy='',_step=solver['LEMMA'](claim['id'],reverse))
   added=True;print('Infinite lemma',a,b,claim['scope'],claim['period'],flush=True)
  # Proved root connections join with finite balanced paths, at every level.
  routes=solver['closure'](paths,original,{pair:[e['_step']]for pair,e in links.items()})
  pair=(definition['start']['path'],definition['goal']['path'])
  if pair in routes:return claims,routes[pair]
  if not added:return None
 return None

async def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--maze',choices=['proof-maze-images-siggy-first-cantor-svg','proof-maze-images-siggy-infinite-descent-svg'])
 selected=parser.parse_args().maze
 fixtures=json.loads((ROOT/'src/data/mazes/catalog-solutions.json').read_text());coverage=json.loads((ROOT/'src/data/manifests/solution-coverage.json').read_text())
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),headless=True);page=await b.new_page();await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
  rows=await page.evaluate('''async()=>{const c=await import('/Fractal-Maze/src/app/library/catalog.ts');return c.catalog.map(row=>({id:row.id,definition:c.loadCatalogMaze(row.id).definition}));}''')
  for id in ([selected]if selected else ['proof-maze-images-siggy-first-cantor-svg','proof-maze-images-siggy-infinite-descent-svg']):
   d=next(row['definition']for row in rows if row['id']==id)
   result=cantor(d)if d['allowedRule']=='cantorHop'else nested_infinite(d)
   if not result:print(id,'no certificate from these searches',flush=True);continue
   claims,steps=result
   fixture=await page.evaluate('''async ({id,claims,steps})=>{
    const c=await import('/Fractal-Maze/src/app/library/catalog.ts');const p=await import('/Fractal-Maze/src/core/pathMaze/proofs.ts');
    const r=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
    const doc=structuredClone(c.loadCatalogMaze(id));doc.definition.claims=claims;const accepted=p.checkedClaims(doc.definition);
    if(accepted.length!==claims.length)throw Error(p.checkClaim(doc.definition,claims[0]).message);
    const claim={id:'solution-route',rule:'connection',from:doc.definition.start,to:doc.definition.goal,first:steps,second:[],scope:[],period:[]};
    const check=p.checkClaim(doc.definition,claim,accepted);if(!check.valid)throw Error(check.message);
    const replay=r.buildNativeReplay(doc,{type:'infiniteRule',states:check.first,edges:steps.map(s=>s.reference),proofSteps:steps},'solver',true);
    importReplay(JSON.stringify(replay));return{mazeId:id,route:replay.nativeRoute,claims};
   }''',dict(id=id,claims=claims,steps=steps))
   fixtures=[f for f in fixtures if f['mazeId']!=id];fixtures.append(fixture)
   record=next(r for r in coverage if r['id']==id);record.update(status='proof-solution',replays=['bundled-'+id],detail='Joint Cantor certificate from permitted surface gate 6, checked by the production rules.'if d['allowedRule']=='cantorHop'else'Matched setup trails and shared repeating word checked by the production infinite-hop rules.')
   print(id,'verified proof',len(claims),len(steps),flush=True)
   (ROOT/'src/data/mazes/catalog-solutions.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n');(ROOT/'src/data/manifests/solution-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
  await b.close()
asyncio.run(main())
