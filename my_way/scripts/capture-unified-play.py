"""Capture the unified Home/Play/Solve UI from a built production preview."""
import asyncio
import html
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/unified-play'
BASE = os.environ.get('PLAYWRIGHT_BASE_URL', 'http://127.0.0.1:5175/Fractal-Maze/')
ROUTES = [
    ('', 'home', 'Home'),
    ('play/alice-in-wonderland', 'alice-block', 'Alice block view'),
    ('play/draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png', 'alice-source', 'Alice source view'),
    ('solver?id=alice-in-wonderland', 'solver', 'Simplified PDA solver'),
    ('play/alice-in-wonderland?replay=bundled-alice-in-wonderland', 'alice-replay', 'Maze-local solution playback'),
    ('workbench/simple-infinite-hop?tab=proof', 'proof', 'Empty manual proof notebook'),
]

async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    captures = []
    errors = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page(reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width in [1440, 390]:
            await page.set_viewport_size({'width': width, 'height': 1000 if width == 1440 else 900})
            for route, name, title in ROUTES:
                await page.goto(BASE + route)
                if '?replay=' in route:
                    await page.get_by_role('button', name='Play replay', exact=True).wait_for()
                elif route.startswith('play/'):
                    await page.get_by_label('Maze replay', exact=True).wait_for()
                elif route.startswith('solver'):
                    await page.get_by_role('button', name='Find finite route', exact=True).wait_for()
                elif route.startswith('workbench'):
                    await page.get_by_role('heading', name='Your proof notebook', exact=True).wait_for()
                else:
                    await page.get_by_role('heading', name='Find your way through infinity.', exact=True).wait_for()
                await page.wait_for_timeout(200)
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), route
                filename = name + ('-phone' if width == 390 else '') + '.png'
                await page.screenshot(path=str(GALLERY / filename), full_page=True)
                captures.append({'file': filename, 'title': title, 'width': width, 'route': route})
        await browser.close()
    assert not errors, errors
    (GALLERY / 'layout-checks.json').write_text(json.dumps({'captures': captures, 'pageErrors': errors, 'overflow': 0}, indent=2) + '\n')
    figures = ''.join(f'<figure><figcaption>{html.escape(c["title"])} · {c["width"]}px</figcaption><a href="{c["file"]}"><img loading="lazy" src="{c["file"]}"></a></figure>' for c in captures)
    (GALLERY / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unified Play review</title><style>body{font:16px system-ui;background:#f3f4ee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0}figcaption{margin:12px 0}img{width:100%;border:1px solid #bec9b9}</style><h1>Unified Play</h1><p>Production desktop and phone captures. No page errors or horizontal overflow.</p><main>' + figures + '</main></html>\n')
    print(len(captures), 'production captures passed')

asyncio.run(main())
