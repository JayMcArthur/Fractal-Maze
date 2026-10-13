"""Recover supplied register inputs with bounded tracing memory and check every move.

Requires the app's Vite server and Python Playwright. Fixtures and evidence for
unselected mazes are retained; a bounded prefix is never published as a solution.
"""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from importlib.util import module_from_spec, spec_from_file_location

from playwright.async_api import async_playwright
from register_route import RegisterRoute

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'upstream_sources/koteitan-repeated-maze'
FIXTURES = ROOT / 'src/data/mazes/register-solutions.json'
REPORT = ROOT / 'docs/REGISTER_SOLUTION_CHECKS.json'
SOURCES = {
    'cp3-3': 'maze/counter-pump-3/cp3-3-2d.hs',
    'cp3-4': 'maze/counter-pump-3/cp3-4-2d.hs',
    'cp-n3-godel': 'tools/nd-to-2d/examples/cp_n3.hs',
}
spec = spec_from_file_location('register_review', ROOT / 'scripts/review-register-sources.py')
review = module_from_spec(spec)
spec.loader.exec_module(review)

CHECK = r"""async fixture => {
  const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {repeatedNeighbors,repeatedStateKey}=await import('/Fractal-Maze/src/core/model/repeatedDirected.ts');
  const {indexRepeatedRoute}=await import('/Fractal-Maze/src/core/replay/repeatedReplay.ts');
  const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const maze=loadCatalogMaze(fixture.mazeId), def=maze.definition;
  const index=indexRepeatedRoute(fixture.route);
  let current=index.stateAt(0), moves=0;
  if(repeatedStateKey(current)!==repeatedStateKey(def.start))throw Error('Source start mismatch');
  if(index.count!==fixture.evidence.trimmedMoves)throw Error('Compact count mismatch');
  const began=performance.now();
  for(const run of fixture.route.runs)for(let repeat=0;repeat<run.count;repeat++)for(const delta of run.steps){
    const next={x:current.x+delta[0],y:current.y+delta[1],terminal:delta[2]};
    if(!repeatedNeighbors(def,current).some(s=>repeatedStateKey(s)===repeatedStateKey(next)))
      throw Error('Illegal production move '+moves);
    current=next;moves++;
  }
  if(moves!==index.count||repeatedStateKey(index.stateAt(moves))!==repeatedStateKey(current))
    throw Error('Compact finish mismatch');
  if(repeatedStateKey(current)!==repeatedStateKey(def.goal))throw Error('Source finish mismatch');
  const expandedCheckMs=performance.now()-began, importBegan=performance.now();
  const replay=importReplay(JSON.stringify(buildNativeReplay(maze,fixture.route,'solver',true)));
  const importMs=performance.now()-importBegan;
  if(replay.metrics.totalMoves!==moves)throw Error('Import count mismatch');
  return {mazeId:fixture.mazeId,moves,finish:current,runs:fixture.route.runs.length,
    storedMoves:fixture.route.runs.reduce((n,r)=>n+r.steps.length,0),
    replayBytes:new TextEncoder().encode(JSON.stringify(replay)).length,
    expandedCheckMs,importMs,passed:true};
}"""


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--maze', action='append', choices=SOURCES)
    parser.add_argument('--max-steps', type=int, default=21000000)
    args = parser.parse_args()
    rows = json.loads((ROOT / 'src/data/mazes/upstream-repeated.json').read_text())
    fixtures = json.loads(FIXTURES.read_text())
    report = json.loads(REPORT.read_text())
    checks = report['checks']
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        for id in args.maze or SOURCES:
            row = next(row for row in rows if row['id'] == id)
            source = SOURCE / SOURCES[id]
            source_text = source.read_text() if id != 'cp-n3-godel' else subprocess.check_output(
                [sys.executable, str(SOURCE / 'tools/nd-to-2d/nd-to-2d.py'), str(source)], text=True)
            trace = RegisterRoute()
            result = review.review(row, source_text, str(source.relative_to(ROOT.parent)),
                                   args.max_steps, (0, 0), trace=trace.push)
            if result['result'] != 'halt':
                raise RuntimeError(f'No complete source solution: {result}')
            route = trace.finish()
            result.update(trimmedMoves=trace.trimmed_moves,
                          inputHash=hashlib.sha256(source.read_text().encode()).hexdigest(),
                          inputNewlines='LF')
            fixture = dict(mazeId='repeated-atomic-' + id, route=route, evidence=result)
            checked = await page.evaluate(CHECK, fixture)
            fixtures = [old for old in fixtures if old['mazeId'] != fixture['mazeId']] + [fixture]
            checks = [old for old in checks if old['mazeId'] != fixture['mazeId']] + [dict(**checked, evidence=result)]
            print(json.dumps(checked), flush=True)
        await browser.close()
    FIXTURES.write_text(json.dumps(fixtures, separators=(',', ':')) + '\n')
    report.update(checks=checks)
    REPORT.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    asyncio.run(main())
