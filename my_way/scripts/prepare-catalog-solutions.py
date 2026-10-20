"""Recover shared solutions from the actual catalog, then validate them in the app.

Run with the Vite dev server at localhost:5174. Generated routes are fixtures;
bounded failures remain coverage records, never empty solution replays.
"""
import os
import argparse
import asyncio
import itertools
import json
from collections import deque
from pathlib import Path
from playwright.async_api import async_playwright
from balanced_witness import balanced_witness

ROOT = Path(__file__).resolve().parents[1]
EDGE = lambda reference: dict(kind='edge', reference=reference, reverse=False)
LEMMA = lambda reference, reverse=False: dict(kind='lemma', reference=reference, reverse=reverse)

def closure(paths, edges, base=None):
    routes = {(p, p): [] for p in paths}
    for e in edges:
        if e['operation'] == 'walk': routes[e['from'], e['to']] = [EDGE(e['id'])]
    routes.update(base or {})
    changed = True
    while changed:
        changed = False
        additions = []
        for a in edges:
            if a['operation'] != 'enter': continue
            for b in edges:
                child = routes.get((a['to'], b['from']))
                if b['operation'] == 'exit' and a['copy'] == b['copy'] and child is not None:
                    additions.append(((a['from'], b['to']), [EDGE(a['id']), *child, EDGE(b['id'])]))
        for a, b, c in itertools.product(paths, repeat=3):
            if (a, b) in routes and (b, c) in routes:
                additions.append(((a, c), routes[a, b] + routes[b, c]))
        for pair, route in additions:
            if pair not in routes or len(route) < len(routes[pair]):
                routes[pair] = route; changed = True
    return routes

def root_routes(paths, edges, child):
    walks = [dict(e) for e in edges if e['operation'] == 'walk']
    base = {}
    for a in edges:
        if a['operation'] != 'enter': continue
        for b in edges:
            route = child.get((a['to'], b['from']))
            if b['operation'] == 'exit' and a['copy'] == b['copy'] and route is not None:
                pair = (a['from'], b['to'])
                witness = [EDGE(a['id']), *route, EDGE(b['id'])]
                if pair not in base or len(witness) < len(base[pair]): base[pair] = witness
    return closure(paths, walks, base)

def proof_claim(id, rule, a, b, first, second=None, period=None):
    return dict(id=id, rule=rule, from_=dict(path=a, address=[]), to=dict(path=b, address=[]),
                first=first, second=second or [], scope=[], period=period or [])

def normalized_claim(row):
    row['from'] = row.pop('from_')
    return row

def cantor_solution(definition):
    paths = [p['id'] for p in definition['paths']]
    edges = definition['connections']
    pairs = list(itertools.combinations(paths, 2))
    while pairs:
        base = {}
        for i, (a, b) in enumerate(pairs):
            ref = 'cantor-all' if i == 0 else f'cantor-related-{a}-{b}'
            base[a, b] = [dict(kind='hypothesis', reference=ref, reverse=False)]
            base[b, a] = [dict(kind='hypothesis', reference=ref, reverse=True)]
        root = root_routes(paths, edges, closure(paths, edges, base))
        remaining = [pair for pair in pairs if pair in root]
        if remaining == pairs: break
        pairs = remaining
    if not pairs: return None
    a, b = pairs[0]
    claim = normalized_claim(proof_claim('cantor-all', 'cantorHop', a, b, root[a, b]))
    claim['companions'] = [dict(id=f'cantor-related-{a}-{b}', **{'from':dict(path=a,address=[])}, to=dict(path=b,address=[]), witness=root[a,b]) for a,b in pairs[1:]]
    start, goal = definition['start']['path'], definition['goal']['path']
    pair = (start, goal) if (start, goal) in pairs else (goal, start)
    if pair not in pairs: return None
    index = pairs.index(pair)
    ref = claim['id'] if index == 0 else claim['companions'][index-1]['id']
    return [claim], [LEMMA(ref, pair[0] != start)]

def infinite_solution(definition):
    paths = [p['id'] for p in definition['paths']]
    claims, links = [], {}
    for _ in range(len(paths)**2):
        cycles = {}
        for start in paths:
            queue = deque([(start, (), [])]); seen = {(start, ())}
            while queue and len(seen) < 80000:
                path, address, steps = queue.popleft()
                if path == start and address and address not in cycles.setdefault(start, {}):
                    cycles[start][address] = steps
                moves = []
                for e in definition['connections']:
                    if e['from'] != path: continue
                    if e['operation'] == 'exit' and (not address or address[-1] != e['copy']): continue
                    word = address + (e['copy'],) if e['operation'] == 'enter' else address[:-1] if e['operation'] == 'exit' else address
                    moves.append((e['to'], word, EDGE(e['id'])))
                for (a,b), step in links.items():
                    if a == path: moves.append((b, address, step))
                for target, word, step in moves:
                    state = (target, word)
                    if len(word) <= 6 and state not in seen:
                        seen.add(state); queue.append((target, word, steps + [step]))
        added = False
        for a,b in itertools.combinations(paths,2):
            if (a,b) in links: continue
            words = set(cycles.get(a, {})) & set(cycles.get(b, {}))
            if not words: continue
            word = min(words, key=lambda w:(len(w), len(cycles[a][w])+len(cycles[b][w]), w))
            id = f'infinite-{a}-{b}'
            claims.append(normalized_claim(proof_claim(id,'infiniteHop',a,b,cycles[a][word],cycles[b][word],list(word))))
            links[a,b] = LEMMA(id); links[b,a] = LEMMA(id,True); added = True
        routes = closure(paths, definition['connections'], {pair:[step] for pair,step in links.items()})
        pair = definition['start']['path'], definition['goal']['path']
        if pair in routes: return claims, routes[pair]
        if not added: return None
    return None

async def main(selected_type=None, selected_maze=None):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'), headless=True)
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        generated_ids = [row['mazeId'] for row in json.loads((ROOT/'src/data/mazes/catalog-solutions.json').read_text())]
        rows = await page.evaluate('''async generatedIds => {
          const c=await import('/Fractal-Maze/src/app/library/catalog.ts');
          const {runPathInput}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
          const {default:wire}=await import('/Fractal-Maze/src/data/mazes/wire-solutions.json');
          const {default:register}=await import('/Fractal-Maze/src/data/mazes/register-solutions.json');
          return c.catalog.map(e=>{
            const d=c.loadCatalogMaze(e.id).definition;
            const provided=((d.type==='blockRecursive'||d.type==='recursivePorts'||d.type==='repeatedDirected')&&d.providedRoute)||
              (d.type==='recursiveTour'&&d.providedMoves)||
              ((d.type==='pathPushdown'||d.type==='infiniteRule')&&d.providedInput&&runPathInput(d,d.providedInput).accepted)||
              register.some(fixture=>fixture.mazeId===e.id);
            const existing=generatedIds.includes(e.id)?[]:d.type==='legacyWire'?wire.map(row=>'bundled-wire-'+row.id):provided?['bundled-'+e.id]:[];
            return {id:e.id,title:e.title,definition:d,existing};
          });
        }''', generated_ids)
        if selected_type:
            rows = [row for row in rows if row['definition']['type'] == selected_type]
        if selected_maze:
            rows = [row for row in rows if row['id'] == selected_maze]
            if not rows:
                raise ValueError('Maze is not in the catalog: ' + selected_maze)
        selected_ids = {row['id'] for row in rows}
        fixtures = [row for row in json.loads((ROOT/'src/data/mazes/catalog-solutions.json').read_text())
                    if row['mazeId'] not in selected_ids]
        coverage = [row for row in json.loads((ROOT/'src/data/manifests/solution-coverage.json').read_text())
                    if row['id'] not in selected_ids]
        for row in rows:
            d = row['definition']; result = None
            record = dict(id=row['id'], title=row['title'], type=d['type'])
            if row['existing']:
                record.update(status='solution', replays=row['existing']); coverage.append(record); continue
            if d['type'] in ('pathPushdown','infiniteRule'):
                if not d['start'] or not d['goal']:
                    record.update(status='unbound', detail='Source endpoints and recursive gate topology are not yet bound.'); coverage.append(record); continue
                paths = [p['id'] for p in d['paths']]
                route = balanced_witness(paths, d['connections'], d['start']['path'], [g['path'] for g in [d['goal'], *d.get('alternateGoals', [])] if not g['address']])
                if route is not None:
                    result = dict(edges=route)
                elif d['allowedRule'] != 'finite':
                    proof = cantor_solution(d) if d['allowedRule'] == 'cantorHop' else infinite_solution(d)
                    if proof: result = dict(claims=proof[0], steps=proof[1])
                if not result:
                    if d['allowedRule'] == 'finite':
                        surface = not d['start']['address'] and not d['goal']['address'] and all(not goal['address'] for goal in d.get('alternateGoals', []))
                        record.update(status='no-finite-route' if surface else 'no-finite-witness', detail='Closed balanced PDA relation excludes the surface finish under the current WIP transcription.' if surface else 'Balanced surface search found no witness; addressed endpoints need separate checking.')
                    else: record.update(status='proof-search-limited', detail='No checked certificate found by bounded proof search; this is not a source-maze impossibility result.')
            else:
                result = await page.evaluate('''async row => {
                  const d=row.definition;
                  if(d.type==='squareRecursive') {
                    const {bfsSolve}=await import('/Fractal-Maze/src/core/solver/traversal/TraversalSolver.ts');
                    let last; for await(const event of bfsSolve(d,{maxDepth:16,maxNodes:500000,timeoutMs:45000,strategy:'bfs'})) last=event;
                    return last.type==='solved'?{actions:last.path}:{status:'bounded',detail:last.message,visited:last.nodesExplored};
                  }
                  if(d.type==='recursivePorts') {
                    const {solvePorts}=await import('/Fractal-Maze/src/core/solver/traversal/portSolver.ts');
                    const s=solvePorts(d,24,500000); return s.status==='solved'?{route:{type:d.type,states:s.path}}:{status:'bounded',detail:'Port BFS: depth 24, 500000 states.',visited:s.visited};
                  }
                  if(d.type==='repeatedDirected') {
                    const {solveRepeated}=await import('/Fractal-Maze/src/core/solver/traversal/repeatedSolver.ts');
                    const s=solveRepeated(d,65536,1500000); return s.status==='solved'?{route:{type:d.type,states:s.path}}:{status:'bounded',detail:'Repeated BFS: coordinate 65536, 1500000 states.',visited:s.visited};
                  }
                  if(d.type==='blockRecursive') {
                    if(!d.start || !d.goal) return {status:'missing-endpoints',detail:'Pattern template has no declared start or goal; no solution search is possible yet.'};
                    const g=await import('/Fractal-Maze/src/core/blockMaze/grid.ts');
                    for(let depth=1;depth<=g.blockDepthLimit(d.unit);depth++) {
                      const s=g.searchBlock(g.expandBlock(d,depth)); if(s.status==='solved') return {route:{type:d.type,depth,states:s.path}};
                    } return {status:'bounded',detail:'Every supported finite depth checked; grid width at most 2048.'};
                  }
                  if(d.type==='graphLabeled') {
                    const {graphChoices}=await import('/Fractal-Maze/src/core/solver/common/graphTraversal.ts');
                    const queue=[[d.entryPortal]],seen=new Set([d.entryPortal]);
                    for(let i=0;i<queue.length;i++){const path=queue[i],current=path.at(-1);if(current===d.exitPortal)return{route:{type:d.type,states:path}};
                      for(const next of graphChoices(d,current))if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}
                    return {status:'exhausted',detail:'Finite portal graph exhausted.'};
                  }
                  return null;
                }''',row)
                if result and 'status' in result: record.update(result); result = None
            if d['type'] == 'geometricRecursive':
                result = await page.evaluate('''async row => {
                  const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
                  const {compilePlayDocument}=await import('/Fractal-Maze/src/app/library/compilePlayDocument.ts');
                  const {balancedPathSearch}=await import('/Fractal-Maze/src/core/pathMaze/balancedSearch.ts');
                  const {geometricStart,geometricMove}=await import('/Fractal-Maze/src/core/solver/common/geometricMovement.ts');
                  const {geometricPathState}=await import('/Fractal-Maze/src/core/play/geometricPDA.ts');
                  const {sameState}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
                  const original=loadCatalogMaze(row.id),model=compilePlayDocument(original).definition;
                  const witness=balancedPathSearch(model);
                  if(!witness)return {status:'no-finite-route',detail:'No finite route under the current geometric corridor and surface-finish rules. Production PDA closure uses no recursion-depth cutoff; original source intent remains subject to review.'};
                  const maze=original.definition.maze,states=[geometricStart(maze)],gates=[];
                  for(let i=0;i<witness.edges.length;i++){
                    const id=witness.edges[i],edge=model.connections.find(edge=>edge.id===id);
                    const boundary=id.slice(id.indexOf(':')+1);
                    const gate=edge.operation==='exit'&&!id.startsWith('finish:')?'_:'+boundary.slice(boundary.lastIndexOf(':')+1):boundary;
                    const next=geometricMove(maze,states.at(-1),gate);
                    if(!sameState(geometricPathState(maze,next),witness.states[i+1]))throw Error('Canonical witness does not match the archived native contract '+row.id);
                    states.push(next);gates.push(gate);
                  }
                  return {route:{type:'geometricRecursive',states,gates}};
                }''',row)
                if 'status' in result: record.update(result); result = None
            if result:
                built = await page.evaluate('''async ({id,result})=>{
                  const c=await import('/Fractal-Maze/src/app/library/catalog.ts');
                  const t=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
                  const p=await import('/Fractal-Maze/src/core/pathMaze/proofs.ts');
                  const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
                  const {buildReplay}=await import('/Fractal-Maze/src/core/replay/replayWriter.ts');
                  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
                  const doc=structuredClone(c.loadCatalogMaze(id)),d=doc.definition;
                  if(result.claims)d.claims=result.claims;
                  if(result.claims&&p.checkedClaims(d).length!==result.claims.length)throw Error('Unchecked proof '+id);
                  let route=result.route;
                  if(result.edges||result.steps){const states=[d.start],edges=result.edges??result.steps.map(s=>s.reference);
                    const claim={id:'solution-route',rule:'connection',from:d.start,to:d.goal,scope:[],period:[],first:result.steps??[],second:[]};
                    for(let i=0;i<edges.length;i++){const next=result.steps?p.applyProofStep(d,states.at(-1),result.steps[i],claim,p.checkedClaims(d)):t.applyConnection(states.at(-1),d.connections.find(e=>e.id===edges[i]));
                      if(!next)throw Error('Illegal generated edge '+id);states.push(next);}
                    route={type:d.type,states,edges,...(result.steps?{proofSteps:result.steps}:{})};}
                  const replay=result.actions?buildReplay(doc,result.actions,'complete',new Date().toISOString(),'solver'):buildNativeReplay(doc,route,'solver',true);
                  importReplay(JSON.stringify(replay));
                  return {mazeId:id,...(result.actions?{actions:replay.actions}:{route:replay.nativeRoute}),...(result.claims?{claims:result.claims}:{})};
                }''',dict(id=row['id'],result=result))
                fixtures.append(built); record.update(status='proof-solution' if result.get('claims') else 'solution', replays=['bundled-'+row['id']])
            coverage.append(record)
            print(row['id'],record.get('status'),flush=True)
        (ROOT/'src/data/mazes/catalog-solutions.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
        (ROOT/'src/data/manifests/solution-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
        await browser.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--type', choices=['geometricRecursive'], help='Regenerate only this model type; preserve all other fixtures and coverage.')
    parser.add_argument('--maze', help='Regenerate only this catalog ID; preserve all other fixtures and coverage.')
    args = parser.parse_args()
    asyncio.run(main(args.type, args.maze))
