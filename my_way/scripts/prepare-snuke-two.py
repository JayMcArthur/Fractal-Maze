"""WIP arrow transcription of Snuke 2, including arrows between sibling copies."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA / 'artwork-registry.json').read_text()) if row['reference'] == 'maze-images-snuke-snuke-2-jpg')
vertices = {'_': [[800, 50], [1550, 800], [800, 1550], [50, 800]],
            'L': [[450, 150], [750, 450], [450, 750], [150, 450]],
            'R': [[1150, 850], [1450, 1150], [1150, 1450], [850, 1150]]}
# Crossings in the interiors of these segments have no vertex.
arrows = [('_', 0, 'L', 0), ('_', 0, 'L', 1), ('L', 1, '_', 0),
          ('_', 1, 'L', 1), ('_', 1, 'R', 1), ('_', 3, 'L', 3),
          ('_', 3, 'L', 2), ('L', 2, '_', 3), ('_', 2, 'L', 2),
          ('L', 2, '_', 2), ('R', 3, '_', 2),
          ('L', 2, 'R', 0), ('R', 0, 'L', 2)]
paths = [dict(id=str(i), label=f'Port {i}', color='#353b42', helper=False) for i in range(4)]
edges, gates, traces = [], [], []
def edge(id, from_, to, operation, copy, a, b, arrival=None):
    edges.append({'id': id, 'from': from_, 'to': to, 'operation': operation, 'copy': copy,
                  'input': '', 'evidence': 'WIP source arrow transcription; crossing interiors have no junction'})
    gate = {'edge': id, 'from': a, 'to': b}
    if arrival is not None: gate['arrivalFrom'] = arrival
    gates.append(gate)
for i, (source, a, target, b) in enumerate(arrows):
    points = [vertices[source][a], vertices[target][b]]
    if source == '_':
        path = str(a)
        edge(f'arrow-{i}', str(a), str(b), 'enter', target, points[1], vertices['_'][b])
    elif target == '_':
        path = str(b)
        edge(f'arrow-{i}', str(a), str(b), 'exit', source, vertices['_'][a], points[1], points[0])
    else:
        path = f'sibling-{i}'
        paths.append(dict(id=path, label=f'{source}{a} → {target}{b}', color='#353b42', helper=False))
        edge(f'arrow-{i}-leave', str(a), path, 'exit', source, vertices['_'][a], points[0], points[0])
        edge(f'arrow-{i}-enter', path, str(b), 'enter', target, points[1], vertices['_'][b])
    traces.append(dict(id=f'arrow-{i}', path=path, color='#353b42', directed=True, points=points))
definition = dict(type='pathPushdown', paths=paths, copies=['L', 'R'], connections=edges,
                  start=dict(path='0', address=[]), goal=dict(path='2', address=[]),
                  allowedRule='finite', claims=[], review='wip',
                  notes=['WIP: arrows are transcribed from the image; review the paired arrowheads and sibling-copy segments.',
                         'A finite eight-transition route reaches G using the sibling-copy wire. The image supplies no written limit-hop rules, so infinite hops are not assumed.'])
artwork = dict(row['artwork'], width=1600, height=1600, bounds=[20, 10, 1560, 1580],
               start=vertices['_'][0], goal=vertices['_'][2], gates=gates, traces=traces,
               frames=[dict(id='L', x=150, y=150, width=600, height=600),
                       dict(id='R', x=850, y=850, width=600, height=600)])
(DATA / 'snuke-two-artwork.json').write_text(json.dumps([dict(reference=row['reference'], title=row['title'], definition=definition, artwork=artwork)], separators=(',', ':')) + '\n')
print('Snuke 2 WIP: thirteen directed source segments, fifteen copy transitions')
