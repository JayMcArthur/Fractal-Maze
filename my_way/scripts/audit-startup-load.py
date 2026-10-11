"""Measure cold production resource loads before interaction, without simulating a user network."""
import asyncio
import json
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]


async def main():
    base = os.environ.get('PLAYWRIGHT_BASE_URL', 'http://127.0.0.1:5176/Fractal-Maze/')
    routes = ['', 'library', 'play/alice-in-wonderland', 'play/1695993784968:0.6965701909885131']
    checks = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        for route in routes:
            context = await browser.new_context(viewport=dict(width=1440, height=1000), reduced_motion='reduce')
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(base + route, wait_until='networkidle')
            await page.get_by_role('navigation', name='Main navigation').wait_for()
            resources = await page.evaluate('''() => performance.getEntriesByType('resource').map(entry => ({
              resource: new URL(entry.name).pathname,
              initiator: entry.initiatorType,
              transferBytes: entry.transferSize,
              encodedBytes: entry.encodedBodySize,
              decodedBytes: entry.decodedBodySize,
              durationMs: entry.duration
            }))''')
            scripts = [entry for entry in resources if entry['resource'].endswith('.js')]
            checks.append(dict(route=route, pageErrors=list(errors),
                               scriptCount=len(scripts),
                               scriptDecodedBytes=sum(entry['decodedBytes'] for entry in scripts),
                               scriptTransferBytes=sum(entry['transferBytes'] for entry in scripts),
                               resources=resources))
            if not route:
                preview = await page.locator('.home-maze-preview canvas').evaluate('canvas => canvas.toDataURL()')
                checks[-1]['previewHash'] = hashlib.sha256(preview.encode()).hexdigest()
            assert not errors, (route, errors)
            await context.close()
        await browser.close()
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(), base=base,
                  scope='Fresh browser context per route; production preview with no user interaction. '
                        'Resource Timing body sizes include module preloads. Local preview transfer and '
                        'duration do not represent compressed hosting or real user-network performance.',
                  checks=checks)
    (ROOT / 'docs/STARTUP_LOAD_CHECKS.json').write_text(json.dumps(report, indent=2) + '\n')
    for check in checks:
        print(check['route'] or 'Home', check['scriptCount'], 'scripts,', check['scriptDecodedBytes'], 'decoded bytes')


if __name__ == '__main__':
    asyncio.run(main())
