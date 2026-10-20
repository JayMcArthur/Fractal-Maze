"""Audit finite gate approaches and mixed histories through the actual PDA engine.

Requires the development app on port 5174. Balanced reachability uses an audit-only
accepting suffix to discard an arbitrary remaining stack, not a depth cutoff.
This checks declared models and physical contracts, not source interpretations.
"""
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

AUDIT = r"""async () => {
  const {pathDocs}=await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {balancedPathSearch}=await import('/Fractal-Maze/src/core/pathMaze/balancedSearch.ts');
  const {applyConnection,sameState,availableMoves,stateKey}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
  const {pathMoveSequence}=await import('/Fractal-Maze/src/core/play/pathMovement.ts');
  const {pathMotionRoutes}=await import('/Fractal-Maze/src/core/play/pathGeometry.ts');
  const {initialPathSession,crossPathSession,walkPathSession,sessionPathRoute}=await import('/Fractal-Maze/src/core/play/pathSession.ts');
  const {projectPathSession}=await import('/Fractal-Maze/src/core/play/pathLayout.ts');
  const {createBlockArtwork}=await import('/Fractal-Maze/src/core/play/blockArtwork.ts');
  const {nearestTracePoint,distance}=await import('/Fractal-Maze/src/core/pathMaze/artworkRoutes.ts');
  const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const reports=[];
  function approach(model,edge){
    const prefix=`@gate-audit:${edge.id}:`, drain=prefix+'drain';
    const synthetic=[];
    const connect=(from,to,operation,copy='')=>synthetic.push({id:prefix+synthetic.length,from,to,operation,copy,input:'',evidence:'Audit acceptance suffix'});
    const copies=new Set([...model.copies,...(model.surfaceSymbols??[]),...model.start.address,
      ...model.connections.filter(e=>e.operation!=='walk').map(e=>e.copy)]);
    connect(edge.from,drain,edge.operation==='exit'?'exit':'walk',edge.operation==='exit'?edge.copy:'');
    for(const copy of copies)connect(drain,drain,'exit',copy);
    const query={...model,paths:[...model.paths,{id:drain,label:drain,color:'#000',helper:false}],
      connections:[...model.connections,...synthetic],goal:{path:drain,address:[]},alternateGoals:[]};
    const result=balancedPathSearch(query);
    if(!result)return null;
    const ids=new Set(synthetic.map(e=>e.id)), edges=result.edges.filter(id=>!ids.has(id));
    let state=model.start;
    for(const id of edges){
      state=applyConnection(state,model.connections.find(e=>e.id===id));
      if(!state)throw new Error('Audit suffix leaked into the approach');
    }
    if(!applyConnection(state,edge))throw new Error('Approach does not enable the target gate');
    return [...edges,edge.id];
  }
  function crossings(model,edges){
    let state=model.start;
    const moves=[];
    for(let i=0;i<edges.length;){
      const move=pathMoveSequence(model,state,edges[i]);
      if(!move||move.edges.some((id,j)=>id!==edges[i+j]))return null;
      moves.push(move);state=move.states.at(-1);i+=move.edges.length;
    }
    return moves;
  }
  function helperApproach(model,target){
    const queue=[{state:model.start,edges:[]}],seen=new Set([stateKey(model.start)]);
    for(let i=0;i<queue.length&&queue.length<20000;i++){
      const {state,edges}=queue[i];
      for(const {edge} of availableMoves(model,state)){
        const move=pathMoveSequence(model,state,edge.id),end=move.states.at(-1),witness=[...edges,...move.edges];
        if(move.edges.includes(target))return witness;
        if(end.address.length>16||seen.has(stateKey(end)))continue;
        seen.add(stateKey(end));queue.push({state:end,edges:witness});
      }
    }
    return null;
  }
  function checkReplay(doc,artwork,session){
    const replay=buildNativeReplay(doc,{type:doc.definition.type,...sessionPathRoute(session),physical:session},'human',false);
    replay.playArtwork=artwork;
    const restored=importReplay(JSON.stringify(replay));
    if(JSON.stringify(restored.nativeRoute)!==JSON.stringify(replay.nativeRoute))throw new Error('Replay import changed the physical witness');
  }
  for(const doc of pathDocs.filter(doc=>doc.artwork?.gates?.length)){
    const model=doc.definition,source=doc.artwork,blocks=createBlockArtwork(source,model);
    const row={id:doc.metadata.id,gates:source.gates.length,finiteUnreachable:[],helperApproaches:[],covered:[],failures:[],routes:[],crossings:0,walks:0,projections:0,replayImports:0};
    const covered=new Set();
    for(const gate of source.gates){
      const edge=model.connections.find(e=>e.id===gate.edge);
      try{
        let edges=approach(model,edge);
        if(!edges){row.finiteUnreachable.push(edge.id);continue;}
        if(!crossings(model,edges))edges=helperApproach(model,edge.id);
        const moves=edges&&crossings(model,edges);
        if(!moves){row.helperApproaches.push(edge.id);continue;}
        row.routes.push({gate:edge.id,edges,steps:moves.length});
        for(const initial of [source,blocks]){
          let artwork=initial,session=initialPathSession(model,artwork);
          for(const move of moves){
            const current=session.positions.at(-1);
            if(!sameState(current.state,move.states[0]))throw new Error('Physical state diverged from gate witness');
            const approachMotion=pathMotionRoutes(artwork,model,current,move.states.at(-1),move.edges);
            if(!approachMotion.departure)throw new Error('Gate witness has no connected departure route');
            const first=approachMotion.departure[0],next=approachMotion.departure.find(point=>distance(first,point)>1e-6);
            if(next){
              const middle=[(first[0]+next[0])/2,(first[1]+next[1])/2];
              const walk=distance(current.point,first)>1e-6?[current.point,first,middle]:[current.point,middle];
              session=walkPathSession(session,walk);row.walks++;
            }
            const before=session.positions.at(-1);
            const motion=pathMotionRoutes(artwork,model,before,move.states.at(-1),move.edges);
            if(!motion.departure)throw new Error('No connected departure route');
            session=crossPathSession(session,model,artwork,move.edges[0]);row.crossings++;
            if(!sameState(session.positions.at(-1).state,move.states.at(-1)))throw new Error('Copy transition ended at a different state');
            for(const id of move.edges)covered.add(id);
            const other=artwork===source?blocks:source;
            const witness=sessionPathRoute(session), projected=projectPathSession(session,artwork,other,model);
            if(JSON.stringify(sessionPathRoute(projected))!==JSON.stringify(witness))throw new Error('Layout projection changed PDA history');
            for(const position of projected.positions){
              const hit=nearestTracePoint(other.traces.filter(t=>t.path===position.state.path),position.point);
              if(!hit||hit.distance>other.bounds[2]/400)throw new Error('Projected position left its maze path');
            }
            session=projected;artwork=other;row.projections++;
          }
          checkReplay(doc,artwork,session);row.replayImports++;
          const other=artwork===source?blocks:source;
          const projected=projectPathSession(session,artwork,other,model);
          checkReplay(doc,other,projected);row.replayImports++;row.projections++;
        }
      }catch(error){row.failures.push({gate:edge.id,message:error.message});}
    }
    row.covered=[...covered];row.helperApproaches=row.helperApproaches.filter(id=>!covered.has(id));
    reports.push(row);
    console.log('gate-audit',doc.metadata.id,row.covered.length+'/'+row.gates,'gates',row.failures.length,'failures');
  }
  return reports;
}"""


async def main():
    files = sorted(path for path in (ROOT / 'src').rglob('*') if path.suffix in {'.ts', '.tsx', '.json'})
    def source_hash():
        digest = hashlib.sha256()
        for path in files:
            digest.update(str(path.relative_to(ROOT)).encode())
            digest.update(path.read_bytes())
        return digest.hexdigest()
    before = source_hash()
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        page.on('console', lambda message: print(message.text, flush=True) if message.text.startswith('gate-audit ') else None)
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        checks = await page.evaluate(AUDIT)
        await browser.close()
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(), documents=len(checks),
                  sourceHash=before, sourceChangedDuringAudit=source_hash() != before,
                  gates=sum(row['gates'] for row in checks),
                  covered=sum(len(row['covered']) for row in checks),
                  crossings=sum(row['crossings'] for row in checks),
                  walks=sum(row['walks'] for row in checks),
                  projections=sum(row['projections'] for row in checks),
                  replayImports=sum(row['replayImports'] for row in checks),
                  failures=[dict(id=row['id'], **failure) for row in checks for failure in row['failures']],
                  scope='Declared finite PDA gate approaches, helper grouping, alternating physical layouts and replay import; not source fidelity, proof-enabled reachability or production UI.',
                  checks=checks)
    (ROOT / 'docs/SOURCE_GATE_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'checks'}), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
