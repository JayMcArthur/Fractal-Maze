"""Check every default Library cover on the production build, desktop and phone."""
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'docs/screenshots/library-index'


async def main():
    GALLERY.mkdir(parents=True, exist_ok=True)
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        for width in [1440, 390]:
            page = await browser.new_page(viewport=dict(width=width, height=1000), reduced_motion='reduce')
            errors, failed_resources = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: failed_resources.append(response.url) if response.status >= 400 else None)
            await page.goto('http://127.0.0.1:5176/Fractal-Maze/library')
            cards = page.locator('.library-card')
            await expect(cards).to_have_count(49)
            for index in range(await cards.count()):
                card = cards.nth(index)
                image = card.locator('.library-card__preview > img')
                await image.scroll_into_view_if_needed()
                await expect(image).to_be_visible()
                await expect(image).to_have_js_property('complete', True)
                size = await image.evaluate('img => [img.naturalWidth,img.naturalHeight]')
                assert min(size) > 0, (index, size)
                checks.append(dict(width=width, title=await card.locator('h2').inner_text(),
                                   source=await image.get_attribute('src'), naturalSize=size))
            await page.evaluate('window.scrollTo(0,0)')
            await page.screenshot(path=str(GALLERY / f'library-{width}.png'))
            await page.get_by_placeholder('Title, author, or tag').fill('Alice')
            await expect(cards).to_have_count(1)
            await page.screenshot(path=str(GALLERY / f'alice-{width}.png'))
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors and not failed_resources, (errors, failed_resources)
            await page.close()
        await browser.close()
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(), checkedCovers=len(checks),
                  scope='All 49 default families, decoded covers and viewport fit at desktop/phone widths. Saved-project rendering is covered by the browser workflows.',
                  checks=checks, failures=[])
    (ROOT / 'docs/LIBRARY_COVER_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(len(checks), 'Library covers decoded on desktop/phone; no page errors, failed resources or overflow')


if __name__ == '__main__':
    asyncio.run(main())
