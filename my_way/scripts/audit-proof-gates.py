"""Exercise the 32 Cantor gates outside finite reachability using checked claims.

Requires Vite on port 5174 and Python Playwright. The audit loads the bundled
certificates explicitly; normal Play and the notebook do not insert these claims.
"""
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

AUDIT = r"""async (targets) => {
  const {pathDocs} = await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {bundledReplays,loadBundledReplay} = await import('/Fractal-Maze/src/app/library/bundledReplays.ts');
  const {checkedClaims,declaredConnections} = await import('/Fractal-Maze/src/core/pathMaze/proofs.ts');
  const {balancedPathSearch} = await import('/Fractal-Maze/src/core/pathMaze/balancedSearch.ts');
  const {initialPathSession,crossPathSession,crossProofSession,walkPathSession,sessionPathRoute} = await import('/Fractal-Maze/src/core/play/pathSession.ts');
  const {pathMoveSequence} = await import('/Fractal-Maze/src/core/play/pathMovement.ts');
  const {proofCrossing} = await import('/Fractal-Maze/src/core/play/proofMovement.ts');
  const {pathMotionRoutes} = await import('/Fractal-Maze/src/core/play/pathGeometry.ts');
  const {projectPathSession} = await import('/Fractal-Maze/src/core/play/pathLayout.ts');
  const {createBlockArtwork} = await import('/Fractal-Maze/src/core/play/blockArtwork.ts');
  const {distance,nearestTracePoint} = await import('/Fractal-Maze/src/core/pathMaze/artworkRoutes.ts');
  const {sameState} = await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
  const {buildNativeReplay} = await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {importReplay} = await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const rows = [];
  for (const target of targets) {
    const sourceDoc = pathDocs.find(doc => doc.metadata.id === target.id);
    const bundle = bundledReplays.find(bundle => bundle.mazeId === target.id && bundle.proofAssisted);
    const loaded = await loadBundledReplay(bundle);
    const stored = loaded.maze.definition.claims;
    const doc = {...sourceDoc,definition:{...sourceDoc.definition,claims:stored}};
    const model = doc.definition, source = doc.artwork, blocks = createBlockArtwork(source,model);
    const claims = checkedClaims(model), proofs = new Map(), connections = [...model.connections];
    if (claims.length !== stored.length) throw new Error('Bundled claim failed checking');
    for (const claim of claims) for (const pair of declaredConnections(claim)) {
      if (pair.from.address.length || pair.to.address.length)
        throw new Error('This gate audit requires surface-to-surface Cantor declarations');
      for (const reverse of [false,true]) {
        const id = `@proof-audit:${pair.id}:${reverse}`, [from,to] = reverse ? [pair.to,pair.from] : [pair.from,pair.to];
        proofs.set(id,{kind:'lemma',reference:pair.id,reverse});
        connections.push({id,from:from.path,to:to.path,operation:'walk',copy:'',input:'',evidence:'Explicit checked certificate'});
      }
    }
    const row = {id:target.id,claims:claims.length,gates:target.gates.length,covered:[],failures:[],walks:0,crossings:0,proofActions:0,projections:0,replayImports:0};
    for (const gate of target.gates) {
      try {
        const edge = model.connections.find(edge => edge.id === gate), drain = '@proof-audit:drain';
        const suffix = [{id:'@drain:entry',from:edge.from,to:drain,
          operation:edge.operation === 'exit' ? 'exit' : 'walk',copy:edge.operation === 'exit' ? edge.copy : '',input:'',evidence:'Audit accepting suffix'},
          ...model.copies.map(copy => ({id:`@drain:${copy}`,from:drain,to:drain,operation:'exit',copy,input:'',evidence:'Audit accepting suffix'}))];
        const query = {...model,paths:[...model.paths,{id:drain,label:drain,color:'#000',helper:false}],
          connections:[...connections,...suffix],goal:{path:drain,address:[]},alternateGoals:[]};
        const approach = balancedPathSearch(query);
        if (!approach) throw new Error('No proof-assisted approach to gate');
        const witness = [...approach.edges.filter(id => !id.startsWith('@drain:')),gate];
        for (const initial of [source,blocks]) {
          let artwork = initial, session = initialPathSession(model,artwork);
          for (let index = 0; index < witness.length;) {
            let current = session.positions.at(-1);
            const step = proofs.get(witness[index]);
            const ordinary = step ? null : pathMoveSequence(model,current.state,witness[index]);
            const motion = step ? proofCrossing(model,artwork,current,step)?.motion
              : ordinary && pathMotionRoutes(artwork,model,current,ordinary.states.at(-1),ordinary.edges);
            if (!motion?.departure) throw new Error('No connected approach to action');
            const first = motion.departure[0], next = motion.departure.find(point => distance(first,point) > 1e-6);
            if (next) {
              const middle = [(first[0]+next[0])/2,(first[1]+next[1])/2];
              session = walkPathSession(session,distance(current.point,first) > 1e-6 ? [current.point,first,middle] : [current.point,middle]);
              row.walks++;
            }
            current = session.positions.at(-1);
            const advanced = step ? crossProofSession(session,model,artwork,step)
              : crossPathSession(session,model,artwork,witness[index]);
            if (advanced === session) throw new Error('Action rejected in physical Play');
            session = advanced;
            if (step) { row.proofActions++; index++; }
            else {
              if (!sameState(session.positions.at(-1).state,ordinary.states.at(-1))) throw new Error('Ordinary state diverged');
              row.crossings++; index += ordinary.edges.length;
            }
            const other = artwork === source ? blocks : source;
            const before = sessionPathRoute(session), projected = projectPathSession(session,artwork,other,model);
            if (JSON.stringify(sessionPathRoute(projected)) !== JSON.stringify(before)) throw new Error('Projection changed proof witness');
            for (const position of projected.positions) {
              const hit = nearestTracePoint(other.traces.filter(trace => trace.path === position.state.path),position.point);
              if (!hit || hit.distance > other.bounds[2]/400) throw new Error('Projected marker left its path');
            }
            session = projected; artwork = other; row.projections++;
          }
          for (const layout of [artwork,artwork === source ? blocks : source]) {
            const physical = layout === artwork ? session : projectPathSession(session,artwork,layout,model);
            const replay = buildNativeReplay(doc,{type:model.type,...sessionPathRoute(physical),physical},'human',false);
            replay.playArtwork = layout;
            const imported = importReplay(JSON.stringify(replay));
            if (JSON.stringify(imported.nativeRoute) !== JSON.stringify(replay.nativeRoute)) throw new Error('Replay lost proof or physical history');
            row.replayImports++;
          }
        }
        row.covered.push(gate);
      } catch (error) { row.failures.push({gate,message:error.message}); }
    }
    rows.push(row);
  }
  return rows;
}"""


def source_hash():
    digest = hashlib.sha256()
    for path in sorted((ROOT / 'src').rglob('*')):
        if path.suffix in {'.ts', '.tsx', '.json'}:
            digest.update(str(path.relative_to(ROOT)).encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


async def main():
    finite = json.loads((ROOT / 'docs/SOURCE_GATE_CHECKS.json').read_text())
    targets = [dict(id=row['id'], gates=row['finiteUnreachable'])
               for row in finite['checks'] if row['finiteUnreachable']]
    before = source_hash()
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        rows = await page.evaluate(AUDIT, targets)
        await browser.close()
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(), sourceHash=before,
                  sourceChangedDuringAudit=source_hash() != before, documents=len(rows), checks=rows,
                  scope='The 32 previously finite-unreachable Cantor gates, with explicitly loaded checked bundled certificates. Exact logical approaches, physical source/block actions and replay import. Not automatic claim insertion, original source fidelity or every arbitrary proof.')
    for key in ['gates', 'walks', 'crossings', 'proofActions', 'projections', 'replayImports']:
        report[key] = sum(row[key] for row in rows)
    report['covered'] = sum(len(row['covered']) for row in rows)
    report['failures'] = [dict(id=row['id'], **failure) for row in rows for failure in row['failures']]
    (ROOT / 'docs/PROOF_GATE_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'checks'}))
    if report['failures'] or report['sourceChangedDuringAudit']:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
