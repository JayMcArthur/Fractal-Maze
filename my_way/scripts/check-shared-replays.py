"""Validate every native shared snapshot through production replay import.

Run with Vite at localhost:5174. Named wire solutions use the same physical PDA recordings.
"""
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        result = await page.evaluate('''async () => {
          const {bundledReplays,loadBundledReplay}=await import('/Fractal-Maze/src/app/library/bundledReplays.ts');
          const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
          const failures=[];let validated=0;
          for(const bundle of bundledReplays){
            try{
              const replay=await loadBundledReplay(bundle);
              if(importReplay(JSON.stringify(replay)).status!=='complete')throw Error('Incomplete imported replay');
              validated++;
            }catch(error){failures.push({id:bundle.id,error:String(error)});}
          }
          return {bundles:bundledReplays.length,variants:new Set(bundledReplays.map(b=>b.mazeId)).size,
            uniqueIds:new Set(bundledReplays.map(b=>b.id)).size,validated,
            namedWireSolutions:bundledReplays.filter(b=>b.id.startsWith('bundled-wire-')).length,
            partial:bundledReplays.filter(b=>!b.complete).map(b=>b.id),failures};
        }''')
        await browser.close()
    assert result['bundles'] == result['uniqueIds'] and not result['partial'] and not result['failures'], result
    (ROOT / 'docs/SHARED_REPLAY_CHECKS.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    asyncio.run(main())
