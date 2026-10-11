"""Publish Library card metadata and covers without shipping every movement model.

Requires Vite on port 5174. Original source images remain covers; models without
an image use a static capture of their existing renderer. Saved projects still
render their actual document in the app.
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'src/data/manifests/library-index.json'

PREPARE = r"""async () => {
  const {catalog,loadCatalogMaze} = await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {fixtureReferences} = await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {default:references} = await import('/Fractal-Maze/src/data/manifests/references.json');
  const entries = catalog.map(entry => {
    const doc = loadCatalogMaze(entry.id), model = doc.definition;
    const path = model.type === 'pathPushdown' || model.type === 'infiniteRule';
    return {...entry, preview: {
      definitionType: model.type,
      playable: !path || Boolean(model.start && model.goal),
      review: path || model.type === 'recursiveTour' ? model.review : null,
      asset: doc.artwork?.asset || (model.type === 'legacyWire'
        ? 'references/Maze_Images/Mark_J_P_Wolf/Wolfram_2.jpg' : '')
    }};
  });
  const conversions = references.map(reference => {
    const draft = `draft-${reference.id}`, proof = `proof-${reference.id}`;
    const fixture = Object.entries(fixtureReferences).find(([,id]) => id === reference.id);
    const draftId = entries.some(entry => entry.id === draft) ? draft
      : fixture ? `pda-guide-${fixture[0]}`
      : entries.some(entry => entry.id === proof) ? proof : null;
    const doc = draftId && loadCatalogMaze(draftId), model = doc?.definition;
    const playableId = model?.start && model.goal && model.connections.length &&
      doc.artwork?.gates?.length === model.connections.length ? draftId : null;
    return {id: reference.id, draftId, playableId};
  });
  const {default:ReactDOM} = await import('/Fractal-Maze/node_modules/.vite/deps/react-dom_client.js');
  const {default:React} = await import('/Fractal-Maze/node_modules/.vite/deps/react.js');
  const {MazeCanvas} = await import('/Fractal-Maze/src/ui/components/MazeCanvas.tsx');
  const container = document.createElement('div');
  container.id = 'library-cover-capture';
  container.className = 'library-card__preview';
  Object.assign(container.style, {position:'fixed',left:'0',top:'0',width:'360px',height:'225px',zIndex:'1000'});
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  globalThis.renderLibraryCover = async id => {
    const doc = loadCatalogMaze(id), square = doc.definition.type === 'squareRecursive' ? doc.definition : null;
    root.render(React.createElement(MazeCanvas, {doc,
      playerPos: square ? {blockStack:['0'],row:square.player.row,col:square.player.col} : undefined,
      maxDepth:1,showBlockLabels:false,showBreadcrumbs:false,maxDisplayWidth:360}));
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };
  return {entries,references:conversions};
}"""


async def main():
    previous = json.loads(INDEX.read_text()) if INDEX.exists() else {'entries': []}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page(viewport=dict(width=1440, height=1000), device_scale_factor=2)
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        index = await page.evaluate(PREPARE)
        for entry in index['entries']:
            if not entry['preview']['asset']:
                await page.evaluate('id => renderLibraryCover(id)', entry['id'])
                capture = await page.locator('#library-cover-capture').screenshot()
                asset = f'library-covers/{hashlib.sha256(capture).hexdigest()[:24]}.png'
                path = ROOT / 'public' / asset
                path.parent.mkdir(exist_ok=True)
                path.write_bytes(capture)
                entry['preview']['asset'] = asset
            assert (ROOT / 'public' / entry['preview']['asset']).is_file(), entry['id']
        await browser.close()
    assert len({entry['id'] for entry in index['entries']}) == len(index['entries'])
    INDEX.write_text(json.dumps(index, indent=2) + '\n')
    current_assets = {entry['preview']['asset'] for entry in index['entries']}
    for entry in previous['entries']:
        asset = entry['preview']['asset']
        if asset.startswith('library-covers/') and asset not in current_assets:
            (ROOT / 'public' / asset).unlink(missing_ok=True)
    print(len(index['entries']), 'indexed variants;', len(index['references']), 'reference bindings;',
          sum(entry['preview']['asset'].startswith('library-covers/') for entry in index['entries']), 'renderer covers')


if __name__ == '__main__':
    asyncio.run(main())
