"""Convert the original carpet's white passages; its red strokes are walls."""
import json
from pathlib import Path
import networkx as nx
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
from raster_wire_model import nearest, chains

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA / 'artwork-registry.json').read_text())
           if row['reference'] == 'maze-images-siggy-skeptic-play-3-png')
rgb = np.array(Image.open(ROOT / 'public' / row['artwork']['asset']).convert('RGB')).astype(int)
mask = np.zeros(rgb.shape[:2], bool)
mask[45:751, 53:761] = True
red = (rgb[:, :, 0] > rgb[:, :, 1] + 40) & (rgb[:, :, 0] > rgb[:, :, 2] + 40)
# Close antialias gaps at wall corners, smaller than any source corridor.
mask &= ~ndimage.binary_dilation(red)
frames = {'A': [52, 44, 237, 237], 'B': [525, 44, 237, 237],
          'C': [525, 516, 237, 237], 'D': [52, 516, 237, 237]}
for x, y, w, h in frames.values():
    mask[y:y+h, x:x+w] = False
labels, count = ndimage.label(mask)
regions = [i for i in range(1, count + 1) if np.sum(labels == i) > 500]
assert len(regions) == 14
components = [dict(pixels=np.argwhere(skeletonize(labels == i)), color='#26776a') for i in regions]
areas = [dict(pixels=np.argwhere(labels == i)) for i in regions]
def terminals(rect, inset):
    x, y, w, h = rect
    positions = [7/18, 9/18, 11/18]
    return ([[x+w*p, y+inset] for p in positions] +
            [[x+w-inset, y+h*p] for p in positions] +
            [[x+w*p, y+h-inset] for p in positions[::-1]] +
            [[x+inset, y+h*p] for p in positions[::-1]])
def at(point):
    label = labels[round(point[1]), round(point[0])]
    if label not in regions:
        candidates = [nearest(area, point)[1] for area in areas]
        i = int(np.argmin(candidates))
        if candidates[i] > 20:
            return None
    else:
        i = regions.index(label)
    return str(i), nearest(components[i], point)[0]
outer = terminals([52, 44, 710, 708], 15)
ownership = [set() for _ in components]
for prefix, points in [('_', outer)] + [(copy, terminals(frame, -3)) for copy, frame in frames.items()]:
    for n, point in enumerate(points):
        mapped = at(point)
        if mapped:
            ownership[int(mapped[0])].add(f'{prefix}:{n}')
native = json.loads((DATA / 'geometric-collection.json').read_text())[5]
expected = []
for path in native['paths']:
    gates = set()
    for gate in path['gates']:
        if gate.startswith(('s:', 'f:')):
            continue
        # Original carpet labels its lower copies clockwise; the revised chip drawing does not.
        if gate.startswith('C:'):
            gate = 'D:' + gate[2:]
        elif gate.startswith('D:'):
            gate = 'C:' + gate[2:]
        gates.add(gate)
    expected.append(gates)
expected.append({'A:4'})  # The original has an extra blind room omitted from the revised drawing.
assert {frozenset(gates) for gates in ownership} == {frozenset(gates) for gates in expected}, ownership
edges, gates = [], []
for copy, frame in frames.items():
    for n, point in enumerate(terminals(frame, -3)):
        mapped = at(point)
        if not mapped:
            continue
        outside, a = mapped
        inside, b = at(outer[n])
        for operation, from_, to, source, target in [
            ('enter', outside, inside, a, b), ('exit', inside, outside, b, a),
        ]:
            edge_id = f'{copy}-{n}-{operation}'
            edges.append({'id': edge_id, 'from': from_, 'to': to, 'operation': operation,
                          'copy': copy, 'input': '', 'evidence': 'White source passage at matching numbered room boundary'})
            gates.append({'edge': edge_id, 'from': source, 'to': target})
start, sp = at(outer[6])
goal, gp = at(outer[5])
definition = dict(type='pathPushdown',
                  paths=[dict(id=str(i), label=str(i+1), color='#26776a', helper=False)
                         for i in range(14)], copies=list(frames), connections=edges,
                  start=dict(path=start, address=[]), goal=dict(path=goal, address=[]),
                  allowedRule='finite', claims=[], review='wip',
                  notes=['Walk through white passages; red lines are walls. Source pin partition matches the revised chip model after swapping the lower copy names, with the original’s additional A:4 blind room retained. WIP: check wall corners and source gate alignment.'])
# Keep the guide's labels and accepted input on the common topology. The blind
# room is an additional real source state, not a bookkeeping helper.
guide = next(f for f in json.loads((DATA / 'path-fixtures.json').read_text()) if f['fixture'] == 5)
blind = str(ownership.index({'A:4'}))
def graph(nodes, connections, start, goal):
    result = nx.MultiDiGraph()
    for node in nodes:
        result.add_node(node, terminal='start' if node == start else 'goal' if node == goal else '')
    for edge in connections:
        result.add_edge(edge['from'], edge['to'], kind=edge['operation'] + edge['copy'])
    return result
guide_edges = []
for pair, direction in guide['pairs']:
    a, b = pair.split('-')
    source, target = (a, b) if direction.startswith('/') else (b, a)
    copy = direction.replace('/', '')
    copy = {'C': 'D', 'D': 'C'}.get(copy, copy)
    guide_edges += [{'from': source, 'to': target, 'operation': 'enter', 'copy': copy},
                    {'from': target, 'to': source, 'operation': 'exit', 'copy': copy}]
common = [edge for edge in edges if blind not in (edge['from'], edge['to'])]
matcher = nx.algorithms.isomorphism.MultiDiGraphMatcher(
    graph([path['id'] for path in definition['paths'] if path['id'] != blind], common, start, goal),
    graph(guide['paths'], guide_edges, guide['start'], guide['goal']),
    node_match=nx.algorithms.isomorphism.categorical_node_match('terminal', ''),
    edge_match=nx.algorithms.isomorphism.categorical_multiedge_match('kind', ''))
assert matcher.is_isomorphic()
mapping = dict(matcher.mapping, **{blind: 'X'})
for path in definition['paths']:
    path['id'] = mapping[path['id']]
    path['label'] = 'Blind room' if path['id'] == 'X' else str(ord(path['id']) - 48)
for edge in edges:
    edge['from'], edge['to'] = mapping[edge['from']], mapping[edge['to']]
    edge['input'] = ('(' if edge['operation'] == 'enter' else ')') if edge['from'] == edge['to'] else edge['to']
definition['start']['path'] = mapping[start]
definition['goal']['path'] = mapping[goal]
definition['providedInput'] = guide['providedInput']
artwork = dict(row['artwork'], bounds=[45, 35, 725, 725],
               frames=[dict(id=copy, x=f[0], y=f[1], width=f[2], height=f[3]) for copy, f in frames.items()],
               start=sp, goal=gp, gates=gates,
               traces=[dict(id=f'room-{i}-{j}', path=mapping[str(i)], color='#26776a', points=points)
                       for i, component in enumerate(components)
                       for j, points in enumerate(chains(component['pixels']))])
(DATA / 'carpet-artwork.json').write_text(json.dumps([dict(reference=row['reference'], title=row['title'],
                                                        definition=definition, artwork=artwork)],
                                                  separators=(',', ':')) + '\n')
print('Original carpet: fourteen white rooms, all source pins verified')
