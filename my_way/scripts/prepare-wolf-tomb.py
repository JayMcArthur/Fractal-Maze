"""Extract the seven source curves of Wolf's Fractal Tomb; verify every numbered pin."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
from raster_wire_model import nearest, chains

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA / 'artwork-registry.json').read_text())
           if row['reference'] == 'maze-images-mark-j-p-wolf-wolfram-0-jpg')
native = json.loads((DATA / 'geometric-collection.json').read_text())[4]
artwork = row['artwork']
rgb = np.array(Image.open(ROOT / 'public' / artwork['asset']).convert('RGB'))
mask = rgb.mean(2) < 130
# Exclude the photographed frame, its blank interior and the screenshot's header.
mask[:105] = False
mask[980:] = False
mask[:, :28] = False
mask[:, 906:] = False
mask[302:779, 229:705] = False
labels, count = ndimage.label(mask, np.ones((3, 3)))
components = [dict(pixels=np.argwhere(skeletonize(labels == i)), color='#383838')
              for i in range(1, count + 1) if np.sum(labels == i) > 500]
assert len(components) == 7
root = [[242, 90], [694, 90], [918, 314], [918, 766],
        [694, 990], [242, 990], [17, 766], [17, 314]]
child = [[354, 314], [580, 314], [694, 427], [694, 652],
         [580, 766], [354, 766], [242, 652], [242, 427]]
def at(point):
    matches = [nearest(component, point) for component in components]
    i = min(range(len(matches)), key=lambda i: matches[i][1])
    assert matches[i][1] < 30, (point, matches[i])
    return i, matches[i][0]
ownership = [set() for _ in components]
for prefix, points in [('_', root), ('A', child)]:
    for n, point in enumerate(points):
        ownership[at(point)[0]].add(f'{prefix}:{n}')
expected = [{gate for gate in path['gates'] if not gate.startswith(('s:', 'f:'))}
            for path in native['paths']]
assert {frozenset(gates) for gates in ownership} == {frozenset(gates) for gates in expected}
ids = [str(expected.index(gates)) for gates in ownership]
edges, gates = [], []
for n, point in enumerate(child):
    outside, a = at(point)
    inside, b = at(root[n])
    for operation, from_, to, source, target in [
        ('enter', ids[outside], ids[inside], a, b),
        ('exit', ids[inside], ids[outside], b, a),
    ]:
        edge_id = f'A-{n}-{operation}'
        edges.append(dict(id=edge_id, from_=from_, to=to, operation=operation, copy='A',
                          input='', evidence='Photographed curve and source numbered gate'))
        edges[-1]['from'] = edges[-1].pop('from_')
        gates.append(dict(edge=edge_id, from_=source, to=target))
        gates[-1]['from'] = gates[-1].pop('from_')
definition = dict(type='pathPushdown',
                  paths=[dict(id=str(i), label=str(i + 1), color='#383838', helper=False)
                         for i in range(7)], copies=['A'], connections=edges,
                  start=dict(path=ids[at(root[0])[0]], address=[]),
                  goal=dict(path=ids[at(root[1])[0]], address=[]),
                  allowedRule='finite', claims=[], review='wip',
                  notes=['All seven photographed curves reproduce the imported source pin partition. WIP: check the blurred curve alignment.'])
artwork = dict(artwork, bounds=[10, 80, 920, 920],
               frames=[dict(id='A', x=242, y=314, width=452, height=452)],
               start=at(root[0])[1], goal=at(root[1])[1], gates=gates,
               traces=[dict(id=f'curve-{i}-{j}', path=ids[i], color='#383838', points=points)
                       for i, component in enumerate(components)
                       for j, points in enumerate(chains(component['pixels']))])
(DATA / 'wolf-tomb.json').write_text(json.dumps([dict(reference=row['reference'], title=row['title'],
                                                   definition=definition, artwork=artwork)],
                                             separators=(',', ':')) + '\n')
print('Fractal Tomb: all seven source circuits and sixteen directed gates verified')
