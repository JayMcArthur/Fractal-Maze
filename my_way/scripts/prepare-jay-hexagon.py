"""Bind the known six-copy recurrence to Jay's compressed hexagon drawing.

The solid black center represents overlapping connections. Each PDA path
retains its own channel there; it is not a junction between all seven paths.
Arrival anchors are path representatives because the image omits numbered pins.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(r for r in json.loads((DATA / 'artwork-registry.json').read_text())
           if r['reference'] == 'maze-images-jay-mcarthur-a-long-path-v6-png')
fixture = next(r for r in json.loads((DATA / 'path-fixtures.json').read_text()) if r['fixture'] == 6)
# Counterclockwise from the top: green, yellow, orange, red, purple, blue.
curves = {
    '1': [[442, 36], [442, 102], [534, 102], [534, 196], [473, 256], [473, 238]],
    '2': [[442, 118], [362, 118], [362, 224], [399, 288], [386, 276], [357, 243]],
    '3': [[298, 194], [218, 194], [218, 326], [331, 326], [370, 351], [386, 346], [353, 380]],
    '4': [[298, 350], [222, 350], [222, 483], [336, 483], [412, 407], [412, 442]],
    '5': [[442, 442], [442, 418], [502, 418], [502, 400], [515, 407], [525, 416]],
    '6': [[586, 356], [586, 346], [534, 346], [534, 323], [510, 338], [499, 323], [523, 299], [535, 310]],
    '7': [[586, 204], [586, 182], [656, 182], [744, 344], [600, 602], [442, 602], [442, 636]],
}
frames = [('A', 376, 124), ('B', 232, 200), ('C', 232, 356),
          ('D', 376, 436), ('E', 520, 360), ('F', 520, 204)]
parent = {
    ('A', '1'): curves['1'][-1], ('A', '2'): curves['2'][0],
    ('B', '2'): curves['2'][-1], ('B', '3'): curves['3'][0],
    ('C', '3'): curves['3'][-1], ('C', '4'): curves['4'][0],
    ('D', '4'): curves['4'][-1], ('D', '5'): curves['5'][0],
    ('E', '5'): curves['5'][-1], ('E', '6'): curves['6'][0],
    ('F', '6'): curves['6'][-1], ('F', '7'): curves['7'][0],
}
edges, gates = [], []
for n, (pair, operation) in enumerate(fixture['pairs']):
    inside, outside = pair.split('-')  # A/ exits inside -> outside; its inverse enters.
    copy = operation[0]
    departure = parent[copy, outside]
    arrival = curves[inside][0]
    for op, f, t, a, b in [('enter', outside, inside, departure, arrival),
                          ('exit', inside, outside, arrival, departure)]:
        id = f'edge-{n}-{"in" if op == "enter" else "out"}'
        edges.append(dict(id=id, operation=op, copy=copy, **{'from': f, 'to': t},
                          input=('(' if op == 'enter' else ')') if f == t else t,
                          evidence='Known v6 recurrence; WIP source channels and representative arrival anchors'))
        gates.append(dict(edge=id, **{'from': a, 'to': b}))
definition = dict(type='pathPushdown', paths=[dict(id=str(i), label=str(i), color='#222222', helper=False)
                                           for i in range(1, 8)],
                  copies=fixture['copies'], connections=edges,
                  start=dict(path='1', address=[]), goal=dict(path='7', address=[]),
                  providedInput=fixture['providedInput'], allowedRule='finite', claims=[], review='wip',
                  notes=[
                      'Author clarification: follow the black routes, start at the top and exit at the bottom. The solution uses the same recurrence as v4/v8.',
                      'A–F run counterclockwise from the top: green, yellow, orange, red, purple, blue. WIP: confirm this placement against the intended drawing.',
                      'The compressed black center is mapped into separate PDA channels. Overlapping traces there do not permit switching paths.',
                      'The image omits numbered outer pins for the internal paths. Copy arrivals use labeled path representatives; review these and the center bends before marking the conversion reviewed.',
                  ])
artwork = dict(row['artwork'], bounds=[40, 24, 780, 624], frames=[dict(id=c, x=x, y=y, width=132, height=120)
                                                                             for c, x, y in frames],
               traces=[dict(id=f'channel-{id}', path=id, color='#222222', points=points)
                       for id, points in curves.items()],
               gates=gates, start=curves['1'][0], goal=curves['7'][-1])
(DATA / 'jay-hexagon.json').write_text(json.dumps([dict(reference=row['reference'], title=row['title'],
                                                      definition=definition, artwork=artwork)], separators=(',', ':')) + '\n')
print('Jay v6: seven recurrence paths, six colored copies, WIP source channel mapping')
