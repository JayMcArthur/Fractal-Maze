"""Bind Wolf 2's alternate drawings to the exact eighteen source circuits."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
from raster_wire_model import nearest, chains

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
registry = json.loads((DATA / 'artwork-registry.json').read_text())
native = json.loads((DATA / 'geometric-collection.json').read_text())[3]
expected = [set('s' if p.startswith('s:') else 'f' if p.startswith('f:') else p for p in path['gates']) for path in native['paths']]
output = []
for variant in ['wires-png']:
    row = next(row for row in registry if row['reference'] == f'maze-images-mark-j-p-wolf-wolfram-2-{variant}')
    frames = {'A': [121, 135, 110, 110], 'B': [313, 135, 110, 110], 'C': [314, 320, 111, 111]}
    bounds = [0, 0, 552, 558]
    start, goal = [145, 314], [178, 432]
    rgb = np.array(Image.open(ROOT / 'public' / row['artwork']['asset']).convert('RGB'))
    channels = rgb.astype(int)
    conditions = [
        (channels[:, :, 0] > channels[:, :, 1] + 40) & (channels[:, :, 0] > channels[:, :, 2] + 40),
        (channels[:, :, 2] > channels[:, :, 0] + 35) & (channels[:, :, 2] > channels[:, :, 1] + 35),
        (channels[:, :, 1] > channels[:, :, 0] + 35) & (channels[:, :, 1] > channels[:, :, 2] + 35),
    ]
    components = []
    for condition, color in zip(conditions, ['#e52323', '#2424d9', '#159329']):
        mask = condition.copy()
        x, y, w, h = bounds
        mask[:y] = False; mask[y+h:] = False; mask[:, :x] = False; mask[:, x+w:] = False
        for x, y, w, h in frames.values():
            mask[y:y+h+1, x:x+w+1] = False
        for axis in [0, 1]:
            work = mask if axis == 0 else mask.T
            source = rgb if axis == 0 else rgb.transpose(1, 0, 2)
            for row_index, line in enumerate(work):
                labels, count = ndimage.label(line)
                runs = [sl[0] for sl in ndimage.find_objects(labels)]
                for a, b in zip(runs, runs[1:]):
                    gap = b.start - a.stop
                    if 0 < gap <= 20 and a.stop-a.start >= 4 and b.stop-b.start >= 4:
                        pixels = source[row_index, a.stop:b.start].astype(int)
                        foreground = (np.ptp(pixels, axis=1) > 20) | (pixels.max(1) < 170)
                        if foreground.mean() > .6:
                            line[a.stop:b.start] = True
        for x, y, w, h in frames.values():
            mask[y:y+h+1, x:x+w+1] = False
        labels, count = ndimage.label(mask, np.ones((3, 3)))
        for i in range(1, count + 1):
            if np.sum(labels == i) > 80:
                components.append(dict(pixels=np.argwhere(skeletonize(labels == i)), color=color))
    def chip_pins(frame):
        x, y, w, h = frame
        offsets = [23.5, 44.5, 65.5, 86.5]
        sx, sy = w/110, h/110
        return ([[x+p*sx, y] for p in offsets] + [[x+w, y+p*sy] for p in offsets] +
                [[x+p*sx, y+h] for p in offsets[::-1]] + [[x, y+p*sy] for p in offsets[::-1]])
    outer = ([[x, 30] for x in [137, 230, 322, 415]] +
             [[526, y] for y in [145, 234, 326, 418]] +
             [[x, 526] for x in [415, 322, 230, 137]] +
             [[29, y] for y in [418, 326, 234, 145]])
    def at(point):
        candidates = [nearest(component, point) for component in components]
        i = min(range(len(candidates)), key=lambda i: candidates[i][1])
        return i, candidates[i][0], candidates[i][1]
    ownership = [set() for _ in components]
    for prefix, points in [('_', outer)] + [(copy, chip_pins(frame)) for copy, frame in frames.items()]:
        for n, point in enumerate(points):
            i, _, d = at(point)
            if d < (35 if prefix == '_' else 13):
                ownership[i].add(f'{prefix}:{n}')
    for terminal, point in [('s', start), ('f', goal)]:
        ownership[at(point)[0]].add(terminal)
    active = [i for i, gates in enumerate(ownership) if gates]
    actual = {frozenset(ownership[i]) for i in active}
    assert actual == {frozenset(gates) for gates in expected}, (variant, actual - {frozenset(g) for g in expected}, {frozenset(g) for g in expected} - actual)
    ids = {i: str(expected.index(ownership[i])) for i in active}
    edges, gates = [], []
    for copy, frame in frames.items():
        for n, point in enumerate(chip_pins(frame)):
            outside, a, d = at(point)
            if d >= 13:
                continue
            inside, b, _ = at(outer[n])
            for operation, from_, to, source, target in [('enter', ids[outside], ids[inside], a, b), ('exit', ids[inside], ids[outside], b, a)]:
                edge_id = f'{copy}-{n}-{operation}'
                edges.append({'id': edge_id, 'from': from_, 'to': to, 'operation': operation,
                              'copy': copy, 'input': '', 'evidence': 'Source stroke; native eighteen-circuit pin partition'})
                gates.append({'edge': edge_id, 'from': source, 'to': target})
    printed = [18, 12, 14, 5, 4, 2, 1, 10, 17, 16, 15, 7, 13, 8, 11, 9, 6, 3]
    definition = dict(type='pathPushdown',
                      paths=[dict(id=ids[i], label=str(printed[int(ids[i])]), color=components[i]['color'], helper=False) for i in active],
                      copies=list(frames), connections=edges,
                      start=dict(path=ids[at(start)[0]], address=[]), goal=dict(path=ids[at(goal)[0]], address=[]),
                      allowedRule='finite', claims=[], review='wip',
                      notes=['All source circuits reproduce the eighteen-path native model. Includes the disputed guide edge; no artificial nineteenth path. Colors do not allow turns at unmarked crossings. WIP: check source alignment.'])
    artwork = dict(row['artwork'], bounds=bounds, gates=gates, start=at(start)[1], goal=at(goal)[1],
                   frames=[dict(id=copy, x=f[0], y=f[1], width=f[2], height=f[3]) for copy, f in frames.items()],
                   traces=[dict(id=f'wire-{i}-{j}', path=ids[i], color=components[i]['color'], points=points)
                           for i in active for j, points in enumerate(chains(components[i]['pixels']))])
    output.append(dict(reference=row['reference'], title=row['title'], definition=definition, artwork=artwork))
    print(variant, 'all eighteen source circuits verified')
base = output[0]
def transform_artwork(art, transform):
    for trace in art['traces']:
        trace['points'] = [transform(point) for point in trace['points']]
    for gate in art['gates']:
        gate['from'], gate['to'] = transform(gate['from']), transform(gate['to'])
    for frame in art['frames']:
        a = transform([frame['x'], frame['y']])
        b = transform([frame['x']+frame['width'], frame['y']+frame['height']])
        frame.update(x=a[0], y=a[1], width=b[0]-a[0], height=b[1]-a[1])
    art['start'], art['goal'] = transform(art['start']), transform(art['goal'])

for variant in ['nested-png', 'jpg']:
    row = next(row for row in registry if row['reference'] == f'maze-images-mark-j-p-wolf-wolfram-2-{variant}')
    converted = json.loads(json.dumps(base))
    converted['reference'], converted['title'] = row['reference'], row['title']
    art = converted['artwork']
    art['asset'] = row['artwork']['asset']
    if variant == 'jpg':
        # Source road landmarks account for the original's unequal chip spacing.
        source_x = [0, 63, 121, 165, 231, 263, 279, 314, 378, 425, 484, 552]
        image_x = [94, 160, 224, 269, 334, 371, 386, 424, 488, 534, 607, 671]
        source_y = [0, 64, 105, 112, 135, 159, 199, 221, 244, 279, 294, 320, 364, 405, 430, 456, 472, 503, 558]
        image_y = [192, 262, 307, 314, 333, 354, 396, 426, 446, 480, 498, 525, 572, 612, 635, 663, 679, 713, 770]
        def transform(point):
            return [round(float(np.interp(point[0], source_x, image_x)), 3),
                    round(float(np.interp(point[1], source_y, image_y)), 3)]
        transform_artwork(art, transform)
        art.update(width=1280, height=960, bounds=[85, 180, 600, 600])
        converted['definition']['notes'].append('WIP original photograph alignment: the verified wired circuits are mapped through source road landmarks. Review its vertex disks and slightly different chip positions.')
    else:
        # C is enlarged in this drawing. Preserve the road landmarks while moving
        # its frame edges and adjacent parent strokes; A and B remain unchanged.
        def transform(point):
            x, y = point
            wx = float(np.interp(y, [0,280,320,431,470,558], [0,0,1,1,0,0]))
            wy = float(np.interp(x, [0,280,314,425,460,552], [0,0,1,1,0,0]))
            tx = float(np.interp(x, [0,280,314,337.5,400.5,425,460,552], [0,280,306,337.5,400.5,429,460,552]))
            ty = float(np.interp(y, [0,280,320,343.5,406.5,431,470,558], [0,280,313,343.5,406.5,438,470,558]))
            return [round(x+(tx-x)*wx,3),round(y+(ty-y)*wy,3)]
        transform_artwork(art, transform)
        converted['definition']['notes'].append('WIP annotated view: the enlarged C frame is registered to its actual boundary with the adjacent parent roads. Movement keeps the verified primary eighteen-circuit topology; colored annotation disks and internal descendants are not extra junctions. Review the warped road geometry against the image.')
    output.append(converted)
(DATA / 'wolf-two-artwork.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')
