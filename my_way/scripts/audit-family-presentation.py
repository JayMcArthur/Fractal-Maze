"""Capture every Library family on desktop and phone from the production build.

Vite must also be running at localhost:5174 to enumerate canonical catalog entries.
This checks initial presentation; it does not certify every move or alternate view.
"""
import asyncio
import html
import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/all-families'


async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        catalog_page = await browser.new_page()
        await catalog_page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        families = await catalog_page.evaluate('''async () => {
          const {mazeCatalog,mazeEntry}=await import('/Fractal-Maze/src/app/library/mazeViews.ts');
          const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
          return mazeCatalog.map(entry=>({...entry,...mazeEntry(entry.id,loadCatalogMaze(entry.id))}));
        }''')
        await catalog_page.close()
        for width in [1440, 390]:
            page = await browser.new_page(viewport=dict(width=width, height=1000 if width == 1440 else 844), reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('dialog', lambda dialog: dialog.accept())
            for entry in families:
                errors.clear()
                row = dict(id=entry['id'], title=entry['title'], author=entry['author'], width=width,
                           route=entry['to'], playable=entry['playable'])
                try:
                    await page.goto('http://127.0.0.1:5176/Fractal-Maze' + entry['to'])
                    if entry['playable']:
                        await page.get_by_label('Maze replay', exact=True).wait_for()
                    else:
                        await page.get_by_role('tab', name='Trace & PDA', exact=True).wait_for()
                    await page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                    await page.evaluate('() => scrollTo(0,0)')
                    await page.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}.png'), full_page=True)
                    board = page.locator('.player-field, .format-field, .maze-field-feedback, .trace-editor svg').first
                    if await board.count():
                        await board.screenshot(path=str(GALLERY / f'{entry["id"]}-{width}-board.png'))
                    row['horizontalOverflow'] = await page.evaluate('() => document.documentElement.scrollWidth > innerWidth')
                    row['pageErrors'] = list(errors)
                except Exception as error:
                    row['failure'] = str(error)
                checks.append(row)
                print(width, entry['title'], 'FAIL' if row.get('failure') or row.get('pageErrors') or row.get('horizontalOverflow') else 'OK', flush=True)
            await page.close()
        await browser.close()
    (GALLERY / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
    figures = []
    for row in checks:
        name = f'{row["id"]}-{row["width"]}'
        title = html.escape(f'{row["author"]} / {row["title"]} — {row["width"]}px')
        figures.append(f'<figure><figcaption>{title}</figcaption><a href="{name}.png"><img loading="lazy" src="{name}.png" alt="{title}"></a></figure>')
    (GALLERY / 'index.html').write_text('<!doctype html><meta name="viewport" content="width=device-width"><title>Every maze family</title><style>body{font:16px system-ui;margin:24px;background:#f5f5ef}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}img{width:100%;border:1px solid #bdc9b9}figure{margin:0}</style><h1>Every maze family — desktop and phone</h1><p>Initial default Play views; unfinished sources open their conversion workspace. Alternate views and full route behavior have separate checks.</p><main>' + ''.join(figures) + '</main>')
    for width in [1440, 390]:
        rows = [row for row in checks if row['width'] == width]
        for offset in range(0, len(rows), 8):
            sheet = Image.new('RGB', (1360, 800), '#f5f5ef')
            draw = ImageDraw.Draw(sheet)
            for index, row in enumerate(rows[offset:offset + 8]):
                x, y = index % 4 * 340, index // 4 * 400
                name = f'{row["id"]}-{width}'
                path = GALLERY / f'{name}-board.png'
                if not path.exists():
                    path = GALLERY / f'{name}.png'
                if path.exists():
                    with Image.open(path) as screenshot:
                        thumbnail = ImageOps.contain(screenshot.convert('RGB'), (330, 340))
                    sheet.paste(thumbnail, (x + (340 - thumbnail.width) // 2, y + 50))
                draw.text((x + 6, y + 4), row['title'][:48], fill='#111')
                draw.text((x + 6, y + 20), row['author'][:48], fill='#566')
            sheet.save(GALLERY / f'sheet-{width}-{offset // 8 + 1}.png')
    print(json.dumps(dict(families=len(families), captures=len(checks),
                          failures=sum(bool(row.get('failure') or row.get('pageErrors') or row.get('horizontalOverflow')) for row in checks))))


if __name__ == '__main__':
    asyncio.run(main())
