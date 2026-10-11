"""Check the current Berkly transcription, without assuming new crossing rules.

Requires Vite on port 5174 and Python Playwright. This certifies the declared
finite wire model; it does not establish the original author's interpretation.
"""
import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/data/mazes/berkly-artwork.json'


def on_segment(point, first, last):
    dx, dy = last[0] - first[0], last[1] - first[1]
    px, py = point[0] - first[0], point[1] - first[1]
    return abs(dx * py - dy * px) < 1e-6 and min(first[0], last[0]) <= point[0] <= max(first[0], last[0]) and min(first[1], last[1]) <= point[1] <= max(first[1], last[1])


def check_candidate(row):
    model, artwork = row['definition'], row['artwork']
    paths = [path['id'] for path in model['paths']]
    enters = [edge for edge in model['connections'] if edge['operation'] == 'enter']
    exits = [edge for edge in model['connections'] if edge['operation'] == 'exit']
    relation = {(path, path) for path in paths}
    relation.update((edge['from'], edge['to']) for edge in model['connections'] if edge['operation'] == 'walk')
    while True:
        expanded = relation | {(a, c) for a, b in relation for other, c in relation if b == other}
        expanded.update((entry['from'], exit['to']) for entry in enters for exit in exits if entry['copy'] == exit['copy'] and (entry['to'], exit['from']) in relation)
        if expanded == relation:
            break
        relation = expanded
    assert all((a, c) in relation for a, b in relation for other, c in relation if b == other)
    assert all((entry['from'], exit['to']) in relation for entry in enters for exit in exits if entry['copy'] == exit['copy'] and (entry['to'], exit['from']) in relation)
    assert model['start']['address'] == model['goal']['address'] == []
    assert (model['start']['path'], model['goal']['path']) not in relation
    anchors = []
    for gate in artwork['gates']:
        edge = next(edge for edge in model['connections'] if edge['id'] == gate['edge'])
        for side in ['from', 'to']:
            traces = [trace for trace in artwork['traces'] if trace['path'] == edge[side]]
            assert any(on_segment(gate[side], a, b) for trace in traces for a, b in zip(trace['points'], trace['points'][1:])), (gate['edge'], side)
            anchors.append(dict(edge=gate['edge'], side=side, path=edge[side], point=gate[side]))
    return dict(paths=paths, copies=model['copies'], start=model['start'], goal=model['goal'],
                connections=len(model['connections']), gateAnchors=anchors,
                closedRelation={path: sorted(end for begin, end in relation if begin == path) for path in paths},
                surfaceGoalExcluded=True)


async def main():
    before = SOURCE.read_bytes()
    result = check_candidate(json.loads(before)[0])
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
        production = await page.evaluate('''async () => {
          const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
          const {balancedPathSearch}=await import('/Fractal-Maze/src/core/pathMaze/balancedSearch.ts');
          const {validateMaze}=await import('/Fractal-Maze/src/core/validate/validateMaze.ts');
          const doc=loadCatalogMaze('draft-maze-images-mike-earnest-berkly-jpg');
          return {valid:validateMaze(doc).valid,definition:doc.definition,witness:balancedPathSearch(doc.definition)};
        }''')
        await browser.close()
    assert SOURCE.read_bytes() == before
    assert production['valid'] and production['witness'] is None
    assert production['definition'] == json.loads(before)[0]['definition']
    report = dict(executedAt=datetime.now(timezone.utc).isoformat(),
                  sourceHash=hashlib.sha256(before).hexdigest(), **result,
                  productionValid=True, productionBalancedWitness=None,
                  interpretation='Colored and black wires are followed; interior crossings retain their declared wire. Eight clockwise pins for each unrotated copy.',
                  scope='Independent closed balanced relation excludes the finish for the current surface-to-surface finite-only transcription. All 64 declared gate anchors lie on their named traces. No original-author impossibility claim, cross-wire junction or infinite center rule is inferred.')
    (ROOT / 'docs/BERKLY_MODEL_REVIEW.json').write_text(json.dumps(report, indent=2) + '\n')
    print(len(result['paths']), 'wire states;', len(result['gateAnchors']), 'checked gate anchors; no finite route under the current transcription')


if __name__ == '__main__':
    asyncio.run(main())
