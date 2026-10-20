"""Publish canonical, hydrated maze documents for selected-only static-host loading.

The authoring catalog remains the source. Runtime downloads one immutable maze
document; square/source PDA matching uses a separate small model-only index.
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'src/data/manifests/maze-assets.json'

PREPARE = r"""async () => {
  const {catalog,loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {hydrateArtwork}=await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {viewsForMaze}=await import('/Fractal-Maze/src/app/library/mazeViews.ts');
  const {validateMaze}=await import('/Fractal-Maze/src/core/validate/validateMaze.ts');
  const rows=[], squareSources={};
  for(const entry of catalog){
    const doc=await hydrateArtwork(loadCatalogMaze(entry.id));
    const errors=validateMaze(doc).issues.filter(issue=>issue.severity==='error');
    if(errors.length)throw Error(entry.id+': '+JSON.stringify(errors));
    rows.push({id:entry.id,payload:JSON.stringify(doc)});
    if(doc.definition.type==='squareRecursive')for(const view of viewsForMaze(entry.id)){
      const source=loadCatalogMaze(view.id).definition;
      if(source.type==='pathPushdown')squareSources[view.id]=source;
    }
  }
  return {rows,squareSources};
}"""


async def main():
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        result = await page.evaluate(PREPARE)
        await browser.close()
    directory = ROOT / 'public/mazes'
    directory.mkdir(exist_ok=True)
    entries = []
    for row in result['rows']:
        payload = row['payload'].encode()
        asset = 'mazes/' + hashlib.sha256(payload).hexdigest() + '.json'
        (ROOT / 'public' / asset).write_bytes(payload)
        entries.append(dict(id=row['id'], asset=asset, bytes=len(payload)))
    MANIFEST.write_text(json.dumps(entries, indent=2) + '\n')
    (ROOT / 'src/data/manifests/square-source-models.json').write_text(json.dumps(result['squareSources'], separators=(',', ':')) + '\n')
    current = {entry['asset'] for entry in entries}
    for entry in previous:
        if entry['asset'] not in current:
            (ROOT / 'public' / entry['asset']).unlink(missing_ok=True)
    print(len(entries), 'selected maze documents;', len(result['squareSources']), 'source PDA models;',
          sum(entry['bytes'] for entry in entries), 'document bytes')


if __name__ == '__main__':
    asyncio.run(main())
