"""Bind Snuke's primary arrow geometry to the bundled exact C++ port rules."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
registry = json.loads((DATA / 'artwork-registry.json').read_text())
ports = json.loads((DATA / 'recursive-ports.json').read_text())
output = []
for number, width, height, xs, offsets in [
    (3, 1300, 1300, [250, 650, 1050], [25, 625]),
    (4, 1500, 1300, [225, 575, 925, 1275], [25, 725]),
]:
    reference = f'maze-images-snuke-snuke-{number}-png'
    row = next(row for row in registry if row['reference'] == reference)
    native = next(row for row in ports if row['id'] == f'ports-snuke_no{number}')
    root = [[x, 60] for x in xs]
    child = {copy: [[x * .5 + offset, 655] for x in xs]
             for copy, offset in zip(['L', 'R'], offsets)}
    edges, gates, traces = [], [], []
    seen = set()
    for from_block, from_port, change, to_block, to_port in native['rules']:
        copy = native['blocks'][to_block if change == 1 else from_block]
        key = (from_port, change, copy, to_port)
        if key in seen:
            continue
        seen.add(key)
        operation = 'enter' if change == 1 else 'exit'
        edge_id = f'{copy}-{from_port}-{operation}-{to_port}'
        edges.append(dict(id=edge_id, from_=str(from_port), to=str(to_port),
                          operation=operation, copy=copy, input='', evidence=native['source']))
        edges[-1]['from'] = edges[-1].pop('from_')
        if change == 1:
            points = [root[from_port], child[copy][to_port]]
            path = str(from_port)
            gate = dict(edge=edge_id, from_=points[-1], to=root[to_port])
        else:
            points = [child[copy][from_port], root[to_port]]
            path = str(to_port)
            gate = dict(edge=edge_id, from_=root[from_port], to=root[to_port],
                        arrivalFrom=points[0])
        gate['from'] = gate.pop('from_')
        gates.append(gate)
        traces.append(dict(id=edge_id, path=path, color='#353b42', directed=True, points=points))
    definition = dict(
        type='pathPushdown',
        paths=[dict(id=str(i), label=f'Port {i}', color='#353b42', helper=False)
               for i in range(len(xs))],
        copies=['L', 'R'], connections=edges,
        start=dict(path='0', address=[]), goal=dict(path=str(native['goalPort']), address=[]),
        allowedRule='finite', claims=[], review='wip',
        notes=['Movement matches the source C++ port rules. Arrows are directed; interior crossings are not junctions. WIP: check source alignment.'])
    artwork = dict(asset=row['artwork']['asset'], width=width, height=height,
                   bounds=[0, 0, width, height], traces=traces, gates=gates,
                   frames=[dict(id=copy, x=offset, y=625, width=width / 2, height=height / 2)
                           for copy, offset in zip(['L', 'R'], offsets)],
                   start=root[0], goal=root[native['goalPort']])
    output.append(dict(reference=reference, title=row['title'], definition=definition, artwork=artwork))
    print(row['title'], len(edges), 'directed gates')
(DATA / 'snuke-artwork.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')
