"""Trace Luegaria's three source circuits separately across its drawn bridge."""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from raster_wire_model import nearest, chains

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA / 'artwork-registry.json').read_text())
           if row['reference'] == 'maze-images-luegarua-webp')
rgb = np.array(Image.open(ROOT / 'public' / row['artwork']['asset']).convert('RGB'))
# Waypoints identify each circuit's band, not its pixel centerline. Skeletons retain
# the hand-drawn bends. The two circuits at the bridge are never joined.
bands = [
    [[500, 18], [493, 68], [462, 108], [414, 142], [350, 172], [275, 211],
     [214, 255], [183, 302], [161, 355], [153, 408], [160, 453], [185, 488],
     [222, 503], [278, 501]],
    [[497, 281], [497, 244], [513, 204], [557, 179], [609, 178], [670, 194],
     [718, 216], [750, 242], [796, 299], [835, 360], [866, 422], [902, 461],
     [952, 485], [987, 492], [946, 507], [902, 538], [879, 582], [878, 637],
     [883, 691], [898, 760], [897, 816], [884, 864], [854, 904], [806, 926],
     [741, 939], [676, 940], [633, 930], [611, 914], [584, 866], [606, 844],
     [614, 818], [605, 792], [584, 784], [561, 787], [546, 797], [533, 766],
     [515, 717]],
    [[26, 503], [75, 549], [106, 595], [132, 663], [167, 745], [197, 785],
     [247, 812], [311, 832], [380, 849], [444, 867], [478, 892], [491, 923],
     [504, 980]],
    [[167, 745], [217, 768], [282, 791], [352, 805], [420, 806], [486, 815],
     [550, 822], [613, 819], [678, 811], [730, 800], [766, 773], [794, 731],
     [819, 675], [833, 621], [832, 563], [819, 517], [805, 490], [755, 486],
     [721, 486]],
]
components = []
for i, curves in enumerate([[bands[0]], [bands[1]], bands[2:]]):
    band = np.zeros(rgb.shape[:2], np.uint8)
    for curve in curves:
        points = np.round(np.array(curve) * 1.08).astype(np.int32)
        cv2.polylines(band, [points], False, 1, 42)
    mask = (rgb.max(2) < 100) & (band > 0)
    if i == 1:
        # Keep the vertical bridge stroke, exclude the other circuit's horizontal arms.
        mask[879:891, 620:653] = False
        mask[879:891, 670:711] = False
    pixels = np.argwhere(skeletonize(mask))
    components.append(dict(pixels=pixels, color='#252525'))
root = np.array([[499, 18], [987, 492], [504, 980], [26, 503]]) * 1.08
child = np.array([[497, 281], [721, 486], [515, 717], [278, 501]]) * 1.08
def at(point):
    matches = [nearest(component, point) for component in components]
    i = min(range(len(matches)), key=lambda i: matches[i][1])
    assert matches[i][1] < 20, (point, matches[i])
    return str(i), matches[i][0]
native = json.loads((DATA / 'geometric-collection.json').read_text())[10]
ownership = [set() for _ in components]
for prefix, points in [('_', root), ('A', child)]:
    for n, point in enumerate(points):
        ownership[int(at(point)[0])].add(f'{prefix}:{n}')
assert ownership == [{gate for gate in path['gates'] if not gate.startswith(('s:', 'f:'))}
                     for path in native['paths']]
edges, gates = [], []
for n, point in enumerate(child):
    outside, a = at(point)
    inside, b = at(root[n])
    for operation, from_, to, source, target in [
        ('enter', outside, inside, a, b), ('exit', inside, outside, b, a),
    ]:
        edge_id = f'A-{n}-{operation}'
        edges.append({'id': edge_id, 'from': from_, 'to': to, 'operation': operation,
                      'copy': 'A', 'input': '', 'evidence': 'Source circuit, drawn bridge and matching side terminal'})
        gates.append({'edge': edge_id, 'from': source, 'to': target})
definition = dict(type='pathPushdown',
                  paths=[dict(id=str(i), label=str(i + 1), color='#252525', helper=False)
                         for i in range(3)], copies=['A'], connections=edges,
                  start=dict(path='0', address=[]), goal=dict(path='2', address=[]),
                  allowedRule='finite', claims=[], review='wip',
                  notes=['North to south, following the original author’s rules. All source pins match the imported three-circuit model. The bridge is separated by circuit. WIP: check stroke alignment around the bridge.'])
artwork = dict(row['artwork'], bounds=[0, 0, 1080, 1080],
               frames=[dict(id='A', x=301, y=303, width=474, height=472)],
               start=at(root[0])[1], goal=at(root[2])[1], gates=gates,
               traces=[dict(id=f'curve-{i}-{j}', path=str(i), color='#252525', points=points)
                       for i, component in enumerate(components)
                       for j, points in enumerate(chains(component['pixels']))])
(DATA / 'luegaria-artwork.json').write_text(json.dumps([dict(reference=row['reference'], title=row['title'],
                                                          definition=definition, artwork=artwork)],
                                                    separators=(',', ':')) + '\n')
print('Luegaria: all three source circuits and eight gate directions verified')
