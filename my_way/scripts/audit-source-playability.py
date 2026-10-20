"""Check source routes and exercise the actual image players.

Run after npm run build, with dev (5173) and preview (5175) running.
Set PLAYWRIGHT_CHROMIUM_EXECUTABLE when using an existing Chromium installation.
"""
import asyncio
from datetime import datetime, timedelta, timezone
import math
import json
import os
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
DEV = os.environ.get('SOURCE_AUDIT_DEV_URL', 'http://127.0.0.1:5173/Fractal-Maze/')
APP = os.environ.get('SOURCE_AUDIT_APP_URL', 'http://127.0.0.1:5175/Fractal-Maze/')
GALLERY = ROOT / 'docs/screenshots/source-playability'

async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        await page.clock.install()
        await page.goto(DEV + 'library')
        rows = await page.evaluate('''async base => {
          const {pathDocs} = await import(base + 'src/app/library/pathCatalog.ts');
          const {artworkRoute} = await import(base + 'src/core/pathMaze/artworkRoutes.ts');
          const {pathMoveSequence} = await import(base + 'src/core/play/pathMovement.ts');
          const {artworkDisplayGeometry} = await import(base + 'src/core/pathMaze/artworkDisplayGeometry.ts');
          const {availableMoves, reachesGoal} = await import(base + 'src/core/pathMaze/traversal.ts');
          return pathDocs.filter(doc => doc.artwork?.gates?.length).map(doc => {
            const d=doc.definition,a=doc.artwork,broken=[];let pairs=0;
            for (const edge of d.connections) {
              const gate=a.gates.find(g=>g.edge===edge.id);
              const incoming=d.connections.filter(e=>e.to===edge.from).map(e=>a.gates.find(g=>g.edge===e.id).to);
              if(d.start.path===edge.from)incoming.push(a.start);
              for(const point of incoming){pairs++;if(!artworkRoute(a,edge.from,point,gate.from))broken.push({edge:edge.id,from:point,to:gate.from});}
            }
            const finishes=a.finishes??[{state:d.goal,point:a.goal}];
            for(const finish of finishes) for(const edge of d.connections.filter(e=>e.to===finish.state.path)) {
              const point=a.gates.find(g=>g.edge===edge.id).to;pairs++;
              if(!artworkRoute(a,finish.state.path,point,finish.point))broken.push({finish:finish.state,from:point,to:finish.point});
            }
            const first=availableMoves(d,d.start)[0];
            const crossing=first&&pathMoveSequence(d,d.start,first.edge.id),end=crossing?.states.at(-1);
            const last=end&&a.gates.find(g=>g.edge===crossing.edges.at(-1));
            const from=first&&a.gates.find(g=>g.edge===first.edge.id);
            const length=points=>points?.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0)??0;
            const view=path=>a.views?.find(v=>v.paths.includes(path))?.bounds??artworkDisplayGeometry(a).bounds;
            const departure=from?artworkRoute(a,d.start.path,a.start,from.from):null;
            const destination=end&&reachesGoal(d,end)?a.finishes?.find(f=>JSON.stringify(f.state)===JSON.stringify(end))?.point??a.goal:last?.to;
            const arrival=last?artworkRoute(a,end.path,last.arrivalFrom??last.to,destination):null;
            const motionMs=first?length(departure)/view(d.start.path)[2]*2000+length(arrival)/view(end.path)[2]*2000+1000:0;
            return {id:doc.metadata.id,title:doc.metadata.title,asset:a.asset,size:[a.width,a.height],pairs,broken,
              firstMove:first&&first.edge.id,startState:d.start,firstState:end,motionMs,markerBounds:end&&view(end.path),markerTraces:end&&a.traces.filter(t=>t.path===end.path).map(t=>t.points)};
          });
        }''', DEV)
        checks = []
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('dialog', lambda dialog: dialog.accept())
        for row in rows:
            path = ROOT / 'public' / row['asset']
            if path.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.gif'):
                with Image.open(path) as image:
                    row['actualSize'] = list(image.size)
                assert row['actualSize'] == row['size'], row
            assert not row['broken'], row
            await page.clock.resume()
            await page.goto(APP + 'play/' + row['id'], wait_until='domcontentloaded')
            marker = page.get_by_test_id('source-player-marker')
            await marker.wait_for()
            now = await page.evaluate('Date.now()')
            await page.clock.pause_at(datetime.fromtimestamp(now/1000, timezone.utc) + timedelta(seconds=1))
            await page.clock.run_for(32)
            depth = page.locator('.digital-hud__metrics > div').filter(has_text='Depth').locator('dd')
            assert await depth.inner_text() == str(len(row['startState']['address']))
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), row['id']
            await page.evaluate('window.scrollTo(0,0)')
            await page.screenshot(path=str(GALLERY / (row['id'] + '.png')), full_page=True)
            if row['firstMove']:
                await page.locator('.source-gate').first.click()
                await page.clock.run_for(math.ceil(row['motionMs']))
                assert await depth.inner_text() == str(len(row['firstState']['address'])), row['id']
                point = [float(await marker.get_attribute('cx')), float(await marker.get_attribute('cy'))]
                x,y,w,h = row['markerBounds']
                assert x <= point[0] <= x+w and y <= point[1] <= y+h, (row['id'], point)
                distances=[]
                for trace in row['markerTraces']:
                    for a,b in zip(trace,trace[1:]):
                        dx,dy=b[0]-a[0],b[1]-a[1]
                        fraction=max(0,min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy))) if dx or dy else 0
                        distances.append(math.hypot(point[0]-a[0]-fraction*dx,point[1]-a[1]-fraction*dy))
                assert min(distances) < w/1000, (row['id'],point,min(distances))
                row['markerOnActiveTrace'] = True
                undo = page.get_by_role('button', name='Undo move', exact=True)
                await undo.wait_for(state='visible')
                await undo.click()
                await page.clock.run_for(32)
                assert await depth.inner_text() == str(len(row['startState']['address']))
            row['browserMoveAndUndo'] = bool(row['firstMove'])
            row.pop('markerTraces')
            checks.append(row)
            print(row['title'], 'OK', row['pairs'], 'drawn routes', flush=True)
        assert not errors, errors
        result = {'players': len(checks), 'drawnRoutes': sum(row['pairs'] for row in checks), 'pageErrors': errors, 'overflow': 0, 'checks': checks}
        (ROOT / 'docs/SOURCE_PLAYER_CHECKS.json').write_text(json.dumps(result, indent=2) + '\n')
        html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Playable source drawings</title><style>body{font:16px system-ui;margin:32px;background:#f5f1e8}img{max-width:100%;border:1px solid #aaa}figure{margin:32px 0}</style><h1>Playable source drawings</h1><p>Production source players. Each capture is followed by a real gate click and undo. See SOURCE_PLAYER_CHECKS.json for geometry and dimension checks.</p>'
        for row in checks:
            html += f'<figure><figcaption>{row["title"]}</figcaption><a href="{row["id"]}.png"><img src="{row["id"]}.png" alt="{row["title"]}"></a></figure>'
        (GALLERY / 'index.html').write_text(html + '</html>\n')
        await browser.close()

asyncio.run(main())
