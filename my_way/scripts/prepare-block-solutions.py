"""Recover the inactive Koteitan patterns' finite witnesses, then check exact replays.

Run with Vite at localhost:5174. This offline search allows widths up to 3125;
the browser's finite solver/rendering limits are unchanged.
"""
import asyncio
import json
import os
from collections import deque
from pathlib import Path

import numpy as np
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
IDS = ('koteitan-block-3', 'koteitan-block-5')


def witness(definition):
    unit = definition['unit']
    pattern = np.array(definition['pattern'], dtype=np.uint8).reshape(unit, unit)
    walls = pattern
    depth = 1
    while len(walls) <= 3125:
        width = len(walls)
        scale = width // unit
        endpoint = lambda cell: (cell[1] * scale + scale // 2) * width + cell[0] * scale + scale // 2
        start, goal = endpoint(definition['start']), endpoint(definition['goal'])
        parents = np.full(walls.size, -1, dtype=np.int32)
        parents[start] = start
        queue = deque([start])
        cells = walls.ravel()
        while queue:
            cell = queue.popleft()
            if cell == goal:
                path = [goal]
                while path[-1] != start:
                    path.append(int(parents[path[-1]]))
                return dict(depth=depth, states=path[::-1])
            row, col = divmod(cell, width)
            neighbors = [cell - width if row else -1, cell + 1 if col + 1 < width else -1,
                         cell + width if row + 1 < width else -1, cell - 1 if col else -1]
            for neighbor in neighbors:
                if neighbor >= 0 and not cells[neighbor] and parents[neighbor] < 0:
                    parents[neighbor] = cell
                    queue.append(neighbor)
        if width * unit > 3125:
            break
        walls = np.kron(walls, pattern)
        depth += 1
    return None


async def main():
    fixtures_path = ROOT / 'src/data/mazes/catalog-solutions.json'
    coverage_path = ROOT / 'src/data/manifests/solution-coverage.json'
    fixtures = json.loads(fixtures_path.read_text())
    coverage = json.loads(coverage_path.read_text())
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        for maze_id in IDS:
            definition = await page.evaluate('''async id => {
              const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
              return loadCatalogMaze(id).definition;
            }''', maze_id)
            route = witness(definition)
            if not route:
                raise RuntimeError(f'No finite witness through width 3125 for {maze_id}')
            fixture = await page.evaluate('''async ({id,route}) => {
              const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
              const {gridBlockPosition}=await import('/Fractal-Maze/src/core/blockMaze/recursivePosition.ts');
              const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
              const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
              const maze=loadCatalogMaze(id);
              const states=route.states.map(cell=>gridBlockPosition(maze.definition.unit,cell,route.depth));
              const replay=buildNativeReplay(maze,{type:'fractalBlock',states,details:states.slice(1).map(()=>route.depth)},'solver',true);
              const checked=importReplay(JSON.stringify(replay));
              if(checked.status!=='complete')throw Error('Incomplete generated replay');
              return {mazeId:id,route:checked.nativeRoute};
            }''', dict(id=maze_id, route=route))
            fixtures = [row for row in fixtures if row['mazeId'] != maze_id] + [fixture]
            record = next(row for row in coverage if row['id'] == maze_id)
            record.update(status='solution', detail=f'Permitted bottom/top white base cells; finite detail-{route["depth"]} witness checked through exact recursive movement and replay import.',
                          replays=[f'bundled-{maze_id}'])
            print(maze_id, 'verified', len(fixture['route']['states']) - 1, 'moves', 'detail', route['depth'], flush=True)
        await browser.close()
    fixtures_path.write_text(json.dumps(fixtures, separators=(',', ':')) + '\n')
    coverage_path.write_text(json.dumps(coverage, indent=2) + '\n')


if __name__ == '__main__':
    asyncio.run(main())
