"""Check every bound source's default block view and nested source switching.

Use Vite on port 5174 for catalog/rule enumeration and the production preview
on port 5176 for actual play. Source fidelity and every-gate reachability are
separate checks; the recorded states here follow the declared models.
"""
import asyncio
import html
import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/block-defaults'


async def settle_clock(page):
    for duration in [60000, 60000, 100]:
        await page.clock.fast_forward(duration)


async def marker_frame(page):
    await settle_clock(page)
    return await page.locator('.source-artwork').first.evaluate('''svg=>{
      const dot=svg.querySelector('[data-testid="source-player-marker"]'),box=svg.viewBox.baseVal;
      const x=Number(dot.getAttribute('cx')),y=Number(dot.getAttribute('cy'));
      return {point:[x,y],viewBox:[box.x,box.y,box.width,box.height],
        visible:Number.isFinite(x)&&Number.isFinite(y)&&x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height};
    }''')


async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        source = await browser.new_page()
        await source.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        entries = await source.evaluate('''async()=>{
          const {pathDocs}=await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
          const {availableMoves}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
          const {pathMoveSequence,pathMoveDescription}=await import('/Fractal-Maze/src/core/play/pathMovement.ts');
          const {copyAddress}=await import('/Fractal-Maze/src/core/pathMaze/copyAddress.ts');
          return pathDocs.filter(doc=>doc.artwork?.gates?.length).map(doc=>{
            const model=doc.definition,moves=[];let current=model.start,previous;
            const display=state=>({state,depth:copyAddress(model,state).length,path:model.paths.find(path=>path.id===state.path).label});
            for(let step=0;step<4;step++){
              const options=availableMoves(model,current);
              const move=options.find(move=>move.edge.operation==='enter')??
                options.find(move=>move.edge.id!==previous)??options[0];
              if(!move)break;
              const route=pathMoveSequence(model,current,move.edge.id);
              const {action,path}=pathMoveDescription(model,current,move.edge);
              current=route.states.at(-1);previous=move.edge.id;
              moves.push({button:`${action} → path ${path}`,...display(current)});
            }
            return {id:doc.metadata.id,title:doc.metadata.title,asset:doc.artwork.asset,start:display(model.start),moves};
          });
        }''')
        await source.close()
        for width in [390, 1440]:
            page = await browser.new_page(viewport=dict(width=width, height=900), reduced_motion='reduce')
            await page.clock.install()
            page.on('dialog', lambda dialog: dialog.accept())
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for entry in entries:
                errors.clear()
                await page.goto(f'http://127.0.0.1:5176/Fractal-Maze/play/{entry["id"]}')
                board = page.locator('.source-artwork').first
                style = page.get_by_label('Display style', exact=True)
                await style.wait_for()
                await expect(style).to_have_value('corridors')
                await expect(board.locator('.block-maze-artwork').first).to_be_visible()
                await expect(board.locator('image')).to_have_count(0)
                row = dict(id=entry['id'], width=width, moves=[], clicks=[])
                start = await marker_frame(page)
                assert start['visible'], (entry['id'], start)
                for move in entry['moves']:
                    await page.locator('.witness-choices').get_by_role('button', name=move['button'], exact=True).first.click()
                    frame = await marker_frame(page)
                    await expect(page.locator('.digital-hud__metrics > div').filter(has_text='Depth').locator('dd')).to_have_text(str(move['depth']))
                    await expect(page.locator('.digital-hud__metrics > div').filter(has_text='Path').locator('dd')).to_have_text(move['path'])
                    assert frame['visible'], (entry['id'], move, frame)
                    row['moves'].append(dict(**move, **frame))
                await board.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}-block.png'))
                await style.select_option('source')
                source_frame = await marker_frame(page)
                assert source_frame['visible'], (entry['id'], source_frame)
                await expect(board.locator('image')).to_have_count(1)
                await board.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}-source.png'))
                before = await page.locator('.digital-hud').inner_text()
                for x, y, label in [(.5, .5, 'center'), (.025, .025, 'corner-X-area')]:
                    box = await board.bounding_box()
                    await board.click(position=dict(x=box['width'] * x, y=box['height'] * y))
                    frame = await marker_frame(page)
                    assert frame['visible'], (entry['id'], label, frame)
                    row['clicks'].append(dict(click=label, **frame))
                row['sourceStateBeforeClicks'] = before
                await style.select_option('corridors')
                block_frame = await marker_frame(page)
                assert block_frame['visible'], (entry['id'], block_frame)
                row['switchedBack'] = block_frame
                row['errors'] = list(errors)
                assert not errors, (entry['id'], errors)
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), entry['id']
                checks.append(row)
                print(width, entry['id'], len(row['moves']), 'crossings OK', flush=True)
            await page.close()
        await browser.close()
    report = dict(documents=len(entries), widths=[390, 1440], cases=len(checks),
                  crossings=sum(len(row['moves']) for row in checks),
                  pointerClicks=sum(len(row['clicks']) for row in checks), failures=[],
                  scope='Default block view, up to four legal compound crossings, source switch, center/corner clicks, switch back.', checks=checks)
    (ROOT / 'docs/BLOCK_DEFAULT_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    figures = [f'<figure><figcaption>{html.escape(entry["title"])} — {width}px — {view}</figcaption>'
               f'<a href="{entry["id"]}-{width}-{view}.png"><img loading="lazy" src="{entry["id"]}-{width}-{view}.png"></a></figure>'
               for width in [390, 1440] for entry in entries for view in ['block', 'source']]
    (GALLERY / 'index.html').write_text('<!doctype html><meta name="viewport" content="width=device-width"><title>Block and source views</title>'
        '<style>body{font:16px system-ui;margin:24px;background:#f5f5ef}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0}img{width:100%}</style>'
        '<h1>Bound source mazes — block and original drawing</h1><main>' + ''.join(figures) + '</main>')
    for width in [390, 1440]:
        images = [(entry, view) for entry in entries for view in ['block', 'source']]
        for offset in range(0, len(images), 8):
            sheet = Image.new('RGB', (1360, 800), '#f5f5ef')
            draw = ImageDraw.Draw(sheet)
            for index, (entry, view) in enumerate(images[offset:offset + 8]):
                x, y = index % 4 * 340, index // 4 * 400
                with Image.open(GALLERY / f'{entry["id"]}-{width}-{view}.png') as screenshot:
                    thumbnail = ImageOps.contain(screenshot.convert('RGB'), (330, 340))
                sheet.paste(thumbnail, (x + (340 - thumbnail.width) // 2, y + 50))
                draw.text((x + 6, y + 4), entry['title'][:48], fill='#111')
                draw.text((x + 6, y + 20), view, fill='#566')
            sheet.save(GALLERY / f'sheet-{width}-{offset // 8 + 1}.png')
    print(json.dumps({key: report[key] for key in ['documents', 'cases', 'crossings', 'pointerClicks', 'failures']}))


if __name__ == '__main__':
    asyncio.run(main())
