"""Generate corridor fixtures with the production PDA and native replay validator.

Run with the development server on port 5174. Existing fixtures are preserved;
new witnesses are published only after complete native move validation.
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:5174/Fractal-Maze/'

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto(BASE + 'solver')
        await page.get_by_role('heading', name='Solve & analyze', exact=True).wait_for()
        results = await page.evaluate('''async base => {
          const {catalog,loadCatalogMaze}=await import(base+'src/app/library/catalog.ts');
          const {squarePlayPDA}=await import(base+'src/app/library/playPDA.ts');
          const {balancedPathSearch}=await import(base+'src/core/pathMaze/balancedSearch.ts');
          const {squareActionsFromPDA}=await import(base+'src/core/play/squarePDA.ts');
          const {validateSquareReplay}=await import(base+'src/core/replay/nativeRouteValidation.ts');
          return catalog.filter(entry=>entry.representationType==='squareRecursive').map(entry=>{
            const doc=loadCatalogMaze(entry.id),binding=squarePlayPDA(doc);
            const route=balancedPathSearch(binding.model);
            if(!route)return {mazeId:entry.id,actions:null,
              detail:`No finite balanced route under the current corridor rules (${binding.model.paths.length} PDA states, ${binding.model.connections.length} connections). No recursion-depth cutoff was used.`};
            const actions=squareActionsFromPDA(doc.definition,binding,route);
            validateSquareReplay(doc.definition,actions,true);
            return {mazeId:entry.id,actions,transitions:route.edges.length};
          });
        }''', BASE)
        await browser.close()
    fixture_path = ROOT / 'src/data/mazes/catalog-solutions.json'
    coverage_path = ROOT / 'src/data/manifests/solution-coverage.json'
    fixtures = json.loads(fixture_path.read_text())
    coverage = json.loads(coverage_path.read_text())
    existing = {fixture['mazeId'] for fixture in fixtures}
    added = False
    coverage_changed = False
    for result in results:
        actions = result['actions']
        if actions is None:
            print(result['mazeId'], 'no finite balanced witness', flush=True)
            row = next(row for row in coverage if row['id'] == result['mazeId'])
            before = dict(row)
            row.update(status='no-finite-route', detail=result['detail'])
            row.pop('visited', None)
            coverage_changed = coverage_changed or row != before
            continue
        print(result['mazeId'], result['transitions'], 'PDA transitions,', len(actions), 'validated moves', flush=True)
        if result['mazeId'] in existing:
            continue
        fixtures.append({'mazeId': result['mazeId'], 'actions': actions})
        row = next(row for row in coverage if row['id'] == result['mazeId'])
        row.update(status='solution', replays=['bundled-' + result['mazeId']], moves=len(actions),
                   detail='Production balanced PDA search; expanded route passes native replay validation.')
        row.pop('visited', None)
        added = True
    if added:
        fixture_path.write_text(json.dumps(fixtures, separators=(',', ':')) + '\n')
    if added or coverage_changed:
        coverage_path.write_text(json.dumps(coverage, indent=2) + '\n')

asyncio.run(main())
