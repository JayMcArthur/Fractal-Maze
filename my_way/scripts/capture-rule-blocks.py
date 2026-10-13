"""Capture the six derived rule-only block layouts for desktop and phone review."""
import asyncio
import html
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/rule-blocks'
BASE = os.environ.get('PLAYWRIGHT_BASE_URL', 'http://127.0.0.1:5174/Fractal-Maze/')
IDS = ['pda-guide-2', 'pda-guide-3', 'pda-guide-4', 'pda-guide-6',
       'simple-infinite-hop', 'simple-nested-infinite-hop']


async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    captures, errors = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page(reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        for width in [1440, 390]:
            await page.set_viewport_size(dict(width=width, height=1000 if width == 1440 else 900))
            for id in IDS:
                await page.goto(BASE + 'play/' + id)
                await page.get_by_test_id('source-player-marker').wait_for()
                await page.get_by_label('Local view', exact=True).uncheck()
                await page.evaluate('document.fonts.ready')
                await page.evaluate('scrollTo(0, 0)')
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), id
                filename = id + ('-phone' if width == 390 else '') + '.png'
                await page.screenshot(path=str(GALLERY / filename), full_page=True)
                captures.append(dict(id=id, file=filename, width=width))
        await browser.close()
    assert not errors, errors
    (GALLERY / 'layout-checks.json').write_text(json.dumps(dict(captures=captures, pageErrors=errors, overflow=0), indent=2) + '\n')
    figures = ''.join(f'<figure><figcaption>{html.escape(c["id"])} · {c["width"]}px</figcaption><a href="{c["file"]}"><img loading="lazy" src="{c["file"]}"></a></figure>' for c in captures)
    (GALLERY / 'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rule-only block layouts</title><style>body{font:16px system-ui;background:#f3f4ee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0}figcaption{margin:12px 0}img{width:100%;border:1px solid #bec9b9}</style><h1>Rule-only block layouts</h1><p>Derived layouts using the unchanged rule models. Original-image mapping remains separately reviewed.</p><main>' + figures + '</main></html>\n')
    print(len(captures), 'captures; no page errors or horizontal overflow')


if __name__ == '__main__':
    asyncio.run(main())
