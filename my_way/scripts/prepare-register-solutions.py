"""Recover source computations, check every physical move in production, publish compact fixtures.

Uses the actual shipped inputs and the newer atomic converter's origin endpoints.
Requires Vite on port 5174 and Python Playwright. No bounded prefix is a solution.
"""
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'upstream_sources/koteitan-repeated-maze'
FIXTURES = ROOT / 'src/data/mazes/register-solutions.json'
spec = spec_from_file_location('register_review', ROOT / 'scripts/review-register-sources.py')
review = module_from_spec(spec)
spec.loader.exec_module(review)


def compact(states):
    deltas = [(b[0]-a[0], b[1]-a[1], b[2]+str(b[3])) for a, b in zip(states, states[1:])]
    runs, index = [], 0
    while index < len(deltas):
        repeat = None
        for length in range(1, min(128, (len(deltas)-index)//2)+1):
            if deltas[index] != deltas[index+length]:
                continue
            pattern = deltas[index:index+length]
            if pattern != deltas[index+length:index+2*length]:
                continue
            count = 2
            while pattern == deltas[index+count*length:index+(count+1)*length]:
                count += 1
            repeat = length, count, pattern
            break
        if repeat:
            length, count, pattern = repeat
            runs.append(dict(count=count, steps=pattern))
            index += length*count
        else:
            if runs and runs[-1]['count'] == 1:
                runs[-1]['steps'].append(deltas[index])
            else:
                runs.append(dict(count=1, steps=[deltas[index]]))
            index += 1
    return dict(type='repeatedDirected', start=dict(x=states[0][0], y=states[0][1],
                terminal=states[0][2]+str(states[0][3])), runs=runs)


CHECK = r"""async fixture => {
  const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {repeatedNeighbors,repeatedStateKey}=await import('/Fractal-Maze/src/core/model/repeatedDirected.ts');
  const {indexRepeatedRoute}=await import('/Fractal-Maze/src/core/replay/repeatedReplay.ts');
  const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const maze=loadCatalogMaze(fixture.mazeId), def=maze.definition;
  const raw=await(await fetch('/Fractal-Maze/__register_candidate__')).json();
  const point=s=>({x:s[0],y:s[1],terminal:s[2]+s[3]});
  const index=indexRepeatedRoute(fixture.route), first=point(raw[0]);
  if(repeatedStateKey(first)!==repeatedStateKey(def.start))throw Error('Source start mismatch');
  if(index.count!==raw.length-1)throw Error('Compact count mismatch');
  let current=first;
  for(let step=0;step<raw.length;step++){
    const next=point(raw[step]);
    if(repeatedStateKey(index.stateAt(step))!==repeatedStateKey(next))throw Error('Compact state mismatch '+step);
    if(step&&!repeatedNeighbors(def,current).some(s=>repeatedStateKey(s)===repeatedStateKey(next)))
      throw Error('Illegal production move '+step);
    current=next;
  }
  if(repeatedStateKey(current)!==repeatedStateKey(def.goal))throw Error('Source finish mismatch');
  const began=performance.now();
  const replay=importReplay(JSON.stringify(buildNativeReplay(maze,fixture.route,'solver',true)));
  const importMs=performance.now()-began;
  if(replay.metrics.totalMoves!==index.count)throw Error('Import count mismatch');
  return {mazeId:fixture.mazeId,moves:index.count,finish:current,runs:fixture.route.runs.length,
    storedMoves:fixture.route.runs.reduce((n,r)=>n+r.steps.length,0),
    replayBytes:new TextEncoder().encode(JSON.stringify(replay)).length,importMs,passed:true};
}"""


async def main():
    rows = json.loads((ROOT / 'src/data/mazes/upstream-repeated.json').read_text())
    fixtures, checks = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        for id in ['cp3-3', 'cp-n3-godel']:
            row = next(row for row in rows if row['id'] == id)
            source = SOURCE / ('maze/counter-pump-3/cp3-3-2d.hs' if id == 'cp3-3'
                               else 'tools/nd-to-2d/examples/cp_n3.hs')
            source_text = source.read_text() if id == 'cp3-3' else subprocess.check_output(
                [sys.executable, str(SOURCE / 'tools/nd-to-2d/nd-to-2d.py'), str(source)], text=True)
            with tempfile.TemporaryDirectory() as temporary:
                candidate = Path(temporary) / 'route.json'
                result = review.review(row, source_text, str(source.relative_to(ROOT.parent)),
                                       700000, (0, 0), candidate)
                assert result['result'] == 'halt', result
                states = json.loads(candidate.read_text())
                route = compact(states)
                del states
                result.pop('candidate')
                result['inputHash'] = hashlib.sha256(source.read_bytes()).hexdigest()
                fixture = dict(mazeId='repeated-atomic-'+id, route=route, evidence=result)
                async def provide(request):
                    await request.fulfill(path=candidate, content_type='application/json')
                await page.route('**/__register_candidate__', provide)
                checked = await page.evaluate(CHECK, fixture)
                await page.unroute('**/__register_candidate__')
                fixtures.append(fixture)
                checks.append(dict(**checked, evidence=result))
                print(json.dumps(checked), flush=True)
        await browser.close()
    FIXTURES.write_text(json.dumps(fixtures, separators=(',', ':'))+'\n')
    report = dict(scope='Every recovered physical move and compact state checked against production. Complete snapshot imports use symbolic boundary validation, with exact canonical-state intersection checks.', checks=checks)
    (ROOT / 'docs/REGISTER_SOLUTION_CHECKS.json').write_text(json.dumps(report, indent=2)+'\n')


if __name__ == '__main__':
    asyncio.run(main())
