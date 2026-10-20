"""Compare the actual Wolf wire controller with Wolfram 2's declared PDA.

Requires Vite on port 5174 and Python Playwright. Records actual synchronous
native actions; never infers a turn where drawn wires merely cross.
"""
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
from wolf_wire import AUDIT, PROJECT


async def main():
    sources = [ROOT / 'public/programs/wolf/maze.js', ROOT / 'src/data/mazes/wire-solutions.json', ROOT / 'src/data/mazes/wolf-two-artwork.json', ROOT / 'src/data/mazes/geometric-collection.json']
    source_hash = hashlib.sha256(b''.join(path.read_bytes() for path in sources)).hexdigest()
    solutions = json.loads(sources[1].read_text())
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/programs/wolf/index.html')
        await page.wait_for_function("typeof maze !== 'undefined' && maze.node")
        result = await page.evaluate(AUDIT, solutions)
        if result['matched']:
            projected = await page.evaluate(PROJECT, result)
            result['physicalProjection'] = [{key: value for key, value in row.items() if key != 'payload'} for row in projected]
        await browser.close()
    assert source_hash == hashlib.sha256(b''.join(path.read_bytes() for path in sources)).hexdigest()
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(), sourceHash=source_hash,
                  scope='Actual Wolf circuits, all connected boundary callbacks, surface guards and eleven archived solutions compared with the shared photo PDA. Unbound chip ports have only a return command in the native program; shared Play stops at the colored wire endpoint rather than an empty chip node. Source/block physical projection and replay import are checked separately.', **result)
    (ROOT / 'docs/WOLF_WIRE_MODEL_REVIEW.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key not in ['circuits', 'paths', 'frames', 'replays']}))
    if result['matched']:
        print(len(result['replays']), 'source solutions reach the same surface finish')


if __name__ == '__main__':
    asyncio.run(main())
