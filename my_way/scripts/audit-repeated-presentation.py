"""Check live register frames and shared replay samples on desktop and phone.

Enumerate catalog documents from Vite on port 5174; inspect the production
preview on port 5176. This is a presentation check, not an unbounded solver.
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/repeated-camera'


async def measure(drawing):
    await drawing.page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    return await drawing.evaluate('''svg => {
      const box=svg.getBoundingClientRect(),dot=svg.querySelector('.repeated-player').getBoundingClientRect();
      const edges=svg.querySelector('.repeated-connections'),bounds=edges.getBBox(),matrix=edges.getScreenCTM();
      const a=new DOMPoint(bounds.x,bounds.y).matrixTransform(matrix);
      const b=new DOMPoint(bounds.x+bounds.width,bounds.y+bounds.height).matrixTransform(matrix);
      const copy=svg.querySelector('.repeated-current-copy');
      return {
        viewBox: [...['x','y','width','height']].map(key=>svg.viewBox.baseVal[key]),
        player: [(dot.x+dot.width/2-box.x)/box.width,(dot.y+dot.height/2-box.y)/box.height],
        edgesVisible: Math.min(a.x,b.x)>=box.left && Math.max(a.x,b.x)<=box.right &&
          Math.min(a.y,b.y)>=box.top && Math.max(a.y,b.y)<=box.bottom,
        owner: [Number(copy.getAttribute('x'))+1,Number(copy.getAttribute('y'))+1],
        labels: [...svg.querySelectorAll('.repeated-copy-label')].map(label=>label.textContent),
        markerDiameter: dot.width,
      };
    }''')


async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        catalog_page = await browser.new_page()
        await catalog_page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        entries = await catalog_page.evaluate('''async () => {
          const {catalog,loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
          const {bundledReplays,loadBundledReplay}=await import('/Fractal-Maze/src/app/library/bundledReplays.ts');
          const {repeatedPosition}=await import('/Fractal-Maze/src/core/model/repeatedDirected.ts');
          const {indexRepeatedRoute}=await import('/Fractal-Maze/src/core/replay/repeatedReplay.ts');
          const entries=[];
          for(const entry of catalog){
            const def=loadCatalogMaze(entry.id).definition;
            if(def.type!=='repeatedDirected')continue;
            const replay=bundledReplays.find(replay=>replay.mazeId===entry.id);
            const loaded=replay?await loadBundledReplay(replay):null;
            const route=loaded?.nativeRoute;
            const index=route?.type==='repeatedDirected'?indexRepeatedRoute(route):null;
            const candidates=new Set();
            if(route?.type==='repeatedDirected'){
              if('states' in route)route.states.forEach((_,step)=>candidates.add(step));
              else {let begin=0;for(const run of route.runs){
                for(let offset=1;offset<=run.steps.length;offset++){
                  candidates.add(begin+offset);candidates.add(begin+(run.count-1)*run.steps.length+offset);
                }begin+=run.count*run.steps.length;}}
            }
            const samples=new Set(index?[0,index.count]:[]);
            if(index){
              const steps=[...candidates];
              for(const axis of ['x','y'])samples.add(steps.reduce((best,step)=>index.stateAt(step)[axis]>index.stateAt(best)[axis]?step:best,0));
              for(const side of ['W','E','N','S','C'])samples.add(steps.find(step=>index.stateAt(step).terminal.startsWith(side)));
              for(let step=0;step<=index.count;step+=Math.max(1,Math.floor(index.count/8)))samples.add(step);
            }
            entries.push({id:entry.id,start:repeatedPosition(def,def.start),replayId:replay?.id,
              samples:[...samples].filter(step=>step>=0&&step<=index.count).sort((a,b)=>a-b)
                .map(step=>({step,state:index.stateAt(step)}))});
          }
          return entries;
        }''')
        await catalog_page.close()
        for width in [390, 1440]:
            page = await browser.new_page(viewport=dict(width=width, height=900), reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for entry in entries:
                errors.clear()
                await page.goto(f'http://127.0.0.1:5176/Fractal-Maze/play/{entry["id"]}')
                drawing = page.get_by_role('img', name='Directed repeated blocks around the current terminal')
                await expect(drawing).to_contain_text('available connections')
                frames = [('live', entry['start'])]
                for mode, state in frames:
                    result = await measure(drawing)
                    checks.append(dict(id=entry['id'], width=width, mode=mode, state=state, **result))
                    await drawing.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}.png'))
                if entry.get('replayId'):
                    await page.goto(f'http://127.0.0.1:5176/Fractal-Maze/play/{entry["id"]}?replay={entry["replayId"]}')
                    slider = page.get_by_label('Replay position')
                    await expect(slider).to_have_value('0')
                    for sample in entry['samples']:
                        await slider.fill(str(sample['step']))
                        state = sample['state']
                        await expect(drawing).to_contain_text(f'{state["x"]},{state["y"]},{state["terminal"]} · available connections')
                        result = await measure(drawing)
                        checks.append(dict(id=entry['id'], width=width, mode='replay', **sample, **result))
                    await drawing.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}-replay.png'))
                assert not errors, (entry['id'], errors)
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), entry['id']
                print(width, entry['id'], 'OK', flush=True)
            await page.close()
        await browser.close()
    failures = [row for row in checks if not row['edgesVisible'] or
                not all(.10 < fraction < .90 for fraction in row['player']) or
                row['owner'] != [row['state']['x'], row['state']['y']] or not row['labels']]
    report = dict(documents=len(entries), frames=len(checks), widths=[390, 1440], failures=failures,
                  scope='Every register document at start; shared replays sampled at extrema, terminal types and regular steps.', checks=checks)
    (ROOT / 'docs/REPEATED_CAMERA_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(dict(documents=len(entries), frames=len(checks), failures=len(failures))))
    assert not failures, failures


if __name__ == '__main__':
    asyncio.run(main())
