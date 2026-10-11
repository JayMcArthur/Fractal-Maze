"""Publish validated shared solutions as a metadata index and selected-only assets.

Requires Vite on localhost:5174 and the configured Python Playwright browser.
Regenerate after changing catalog definitions or solution fixtures.
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright
from wolf_wire import AUDIT, PROJECT

ROOT = Path(__file__).resolve().parents[1]

PREPARE = r"""async () => {
  const {catalog,loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {hydrateArtwork}=await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {playTourMoves}=await import('/Fractal-Maze/src/core/recursiveTour/movement.ts');
  const {runPathInput}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
  const {buildNativeReplay,trimNativeRoute}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {buildReplay}=await import('/Fractal-Maze/src/core/replay/replayWriter.ts');
  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const {default:generated}=await import('/Fractal-Maze/src/data/mazes/catalog-solutions.json');
  const {default:register}=await import('/Fractal-Maze/src/data/mazes/register-solutions.json');
  const rows=[];
  for(const entry of catalog){
    const maze=await hydrateArtwork(structuredClone(loadCatalogMaze(entry.id)));
    const model=maze.definition,fixture=generated.find(fixture=>fixture.mazeId===entry.id)??register.find(fixture=>fixture.mazeId===entry.id);
    let route=fixture?.route,actions=fixture?.actions,complete=true;
    if(fixture?.claims&&(model.type==='infiniteRule'||model.type==='pathPushdown'))model.claims=fixture.claims;
    if(!fixture){
      if(model.type==='blockRecursive'&&model.providedRoute)route={type:model.type,...model.providedRoute};
      else if(model.type==='recursiveTour'&&model.providedMoves)route={type:model.type,states:playTourMoves(model,model.providedMoves)};
      else if((model.type==='pathPushdown'||model.type==='infiniteRule')&&model.providedInput){
        const result=runPathInput(model,model.providedInput);
        complete=result.accepted;
        if(result.route)route={type:model.type,...result.route};
      }else if((model.type==='recursivePorts'||model.type==='repeatedDirected')&&model.providedRoute)
        route={type:model.type,states:model.providedRoute};
    }
    if(!route&&!actions)continue;
    if(!complete)throw Error('A shared solution must be complete: '+entry.id);
    const snapshot=actions
      ?buildReplay(maze,actions,'complete',new Date().toISOString(),'solver')
      :buildNativeReplay(maze,trimNativeRoute(route),'solver',true);
    const replay=importReplay(JSON.stringify(snapshot));
    if(replay.status!=='complete')throw Error('Unchecked shared solution: '+entry.id);
    rows.push({id:'bundled-'+entry.id,title:entry.title,mazeId:entry.id,
      moves:replay.metrics.totalMoves,complete:true,
      format:replay.nativeRoute?.type??maze.definition.type,
      proofAssisted:!!fixture?.claims?.length,payload:JSON.stringify(replay)});
  }
  if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Duplicate shared solution ID');
  return rows;
}"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        rows = await page.evaluate(PREPARE)
        native = await browser.new_page()
        await native.goto('http://127.0.0.1:5174/Fractal-Maze/programs/wolf/index.html')
        await native.wait_for_function("typeof maze !== 'undefined' && maze.node")
        solutions = json.loads((ROOT / 'src/data/mazes/wire-solutions.json').read_text())
        audit = await native.evaluate(AUDIT, solutions)
        assert audit['matched'], audit
        physical = await page.evaluate(PROJECT, audit)
        for row in physical:
            assert row['passed'] and row['imports'] == 2, row
            replay = json.loads(row['payload'])
            rows.append(dict(id='bundled-wire-' + row['id'], title='Wolf wire maze — ' + row['title'],
                             mazeId='wolf-wire-original', moves=replay['metrics']['totalMoves'],
                             complete=True, format='pathPushdown', proofAssisted=False, payload=row['payload']))
        assert len({row['id'] for row in rows}) == len(rows)
        await browser.close()
    manifest = ROOT / 'src/data/manifests/shared-replays.json'
    previous = json.loads(manifest.read_text()) if manifest.exists() else []
    directory = ROOT / 'public/solutions'
    directory.mkdir(exist_ok=True)
    index = []
    for row in rows:
        payload = row.pop('payload')
        name = hashlib.sha256((row['id'] + '\n' + payload).encode()).hexdigest() + '.json'
        row['asset'] = 'solutions/' + name
        (directory / name).write_text(payload + '\n')
        index.append(row)
    assets = {row['asset'] for row in index}
    for row in previous:
        if row['asset'] not in assets:
            (ROOT / 'public' / row['asset']).unlink()
    manifest.write_text(json.dumps(index, indent=2) + '\n')
    print(len(index), 'validated shared assets;', len({row['mazeId'] for row in index}), 'variants')


if __name__ == '__main__':
    asyncio.run(main())
