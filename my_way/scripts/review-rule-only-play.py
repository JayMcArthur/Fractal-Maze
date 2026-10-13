"""Inventory known path models still missing complete physical trace/gate bindings.

Requires Vite on port 5174. This does not infer an original image interpretation.
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
CHECK = r"""async () => {
  const {catalog,loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {hydrateArtwork}=await import('/Fractal-Maze/src/app/library/pathCatalog.ts');
  const {rulePlayDocument}=await import('/Fractal-Maze/src/app/library/rulePlayDocument.ts');
  const rows=[];
  for(const entry of catalog){
    const doc=await hydrateArtwork(loadCatalogMaze(entry.id)),m=doc.definition;
    if(m.type!=='pathPushdown'&&m.type!=='infiniteRule')continue;
    const paths=new Set(m.paths.map(p=>p.id));
    const traces=doc.artwork?.traces.filter(t=>paths.has(t.path))??[];
    const bound=m.connections.every(e=>doc.artwork?.gates?.some(g=>g.edge===e.id));
    const play=rulePlayDocument(doc);
    if(m.start&&m.goal&&(!traces.length||!bound))rows.push({
      id:entry.id,title:entry.title,paths:m.paths.length,copies:m.copies.length,
      edges:m.connections.length,traceBindings:traces.length,gateBindings:doc.artwork?.gates?.length??0,
      artwork:doc.artwork?.asset??null,rule:m.allowedRule,
      helpers:m.paths.filter(p=>p.helper).map(p=>p.id),walks:m.connections.filter(e=>e.operation==='walk').length,
      blockPlay: Boolean(play?.artwork?.blockSize &&
        m.connections.every(e=>play.artwork.gates?.some(g=>g.edge===e.id)) &&
        m.paths.every(p=>play.artwork.traces.some(t=>t.path===p.id))),
      blockTraceBindings:play?.artwork?.traces.length??0,
      blockGateBindings:play?.artwork?.gates?.length??0
    });
  }
  return rows;
}"""


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library', wait_until='networkidle')
        models = await page.evaluate(CHECK)
        await browser.close()
    report = dict(scope='Original rule-only documents and their derived physical block bindings. Block play does not establish original-image fidelity.',
                  models=models, missingBlockPlay=[model['id'] for model in models if not model['blockPlay']])
    (ROOT / 'docs/RULE_ONLY_PLAY_REVIEW.json').write_text(json.dumps(report, indent=2)+'\n')
    print(len(models), 'rule-only originals;', len(report['missingBlockPlay']), 'missing block bindings')


if __name__ == '__main__':
    asyncio.run(main())
