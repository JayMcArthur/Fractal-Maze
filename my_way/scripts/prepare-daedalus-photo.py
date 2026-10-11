"""Read the photographed Numb3rs weave itself; it differs from the author's demo."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from grid_weave import weave_graph, weave_pins, DIRECTIONS
from balanced_witness import balanced_witness

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA/'artwork-registry.json').read_text())
           if row['reference'] == 'maze-images-ed-pegg-jr-daedalus-2-jpg')
rgb = np.array(Image.open(ROOT/'public'/row['artwork']['asset']).convert('RGB'))
gray = rgb.max(2)

def point(p):
    return [round(p[0]*6.15+31, 3), round(p[1]*6.15+37.5, 3)]


def photo_edges(threshold):
    def ink(x, y, dx, dy):
        values = []
        for normal in range(-3, 4):
            xx, yy = round(x-dy*normal), round(y+dx*normal)
            if 0 <= yy < gray.shape[0] and 0 <= xx < gray.shape[1]:
                values.append(gray[yy, xx])
        return min(values, default=255) < threshold
    mask = np.zeros((145, 145), bool)
    for y in range(0, 141, 4):
        for x in range(0, 141, 4):
            px, py = point([x, y])
            for dx, dy in DIRECTIONS:
                hx, hy = x+dx*2, y+dy*2
                qx, qy = x+dx, y+dy
                if not (0 <= hy < 145 and 0 <= hx < 145):
                    continue
                half = ink(px+dx*12.3, py+dy*12.3, dx, dy)
                mask[hy, hx] = half
                if 0 <= qy < 145 and 0 <= qx < 145:
                    # A continuous stroke joins above the crossing; a gap stays below.
                    mask[qy, qx] = half and all(
                        ink(px+dx*k, py+dy*k, dx, dy) for k in range(2, 13))
    return mask

rects = [(20,20,20,20), (100,20,20,20), (60,60,20,20),
         (20,100,20,20), (100,100,20,20)]
mask = photo_edges(145)
# This range excludes photograph noise while preserving every continuous/gapped edge.
assert np.array_equal(mask, photo_edges(135))
assert np.array_equal(mask, photo_edges(155))
components, owner, traces, ports, vertices = weave_graph(mask, (0,0,140,140), 4, rects)
assert len(components) == 15
owners = {'_':(0,0,140,140), 's':rects[0], 'A':rects[1],
          'B':rects[2], 'C':rects[3], 'f':rects[4]}
bindings, owned = {}, [set() for _ in components]
for name, rect in owners.items():
    for n, (x,y,direction) in enumerate(weave_pins(rect,4,4,28 if name=='_' else 4)):
        gate = [float(x),float(y)]
        if name != '_':
            dx,dy = DIRECTIONS[(direction+2)%4]
            x += dx*4
            y += dy*4
        key = ports.get((x,y,direction))
        if key not in owner:
            continue
        i = owner[key]
        bindings[name,n] = (i,gate)
        owned[i].add(name if name in ('s','f') else f'{name}:{n}')
        if name != '_':
            traces[i].append([vertices[key],gate])
assert all(('_',n) in bindings for n in range(16))
# Physical source terminals: the actual photo has fifteen groups, not the demo's thirteen.
expected = [
 ['A:5','_:0'], ['A:10','A:11','_:1'], ['A:1','_:2'], ['B:11','C:5','_:3'],
 ['A:2','C:14','_:10'], ['C:12','C:13','C:3','s'], ['A:15','B:7','_:11'],
 ['A:4','_:7'], ['A:6','_:15','_:4'], ['A:13','C:15','C:4','f'],
 ['A:7','B:1','_:9'], ['B:0','B:2','B:6','_:6'], ['A:8','B:9','_:12','_:13'],
 ['B:3','_:14'], ['B:13','_:5','_:8']]
assert set(map(frozenset,owned)) == set(map(frozenset,expected))
ids = [chr(49+i) for i in range(15)]
edges, gates = [], []
for copy in 'ABC':
    for n in range(16):
        if (copy,n) not in bindings:
            continue
        outside,a = bindings[copy,n]
        inside,b = bindings['_',n]
        for op,f,t,source,target in [('enter',ids[outside],ids[inside],a,b),
                                     ('exit',ids[inside],ids[outside],b,a)]:
            id = f'{copy}-{n}-{op}'
            edges.append({'id':id,'from':f,'to':t,'copy':copy,'operation':op,
                          'input':('(' if op=='enter' else ')') if f==t else t,
                          'evidence':'Photographed continuous/gapped lattice edge and corresponding chip pin'})
            gates.append({'edge':id,'from':point(source),'to':point(target)})
endpoints = [[value for key,value in bindings.items() if key[0]==name] for name in ('s','f')]
assert all(len(values)==1 for values in endpoints)
(start,sp),(goal,gp) = [values[0] for values in endpoints]
route = balanced_witness(ids,edges,ids[start],[ids[goal]])
assert route is not None
provided = ''.join(next(edge['input'] for edge in edges if edge['id']==id) for id in route)
definition = dict(type='pathPushdown',paths=[dict(id=id,label=str(i+1),color='#333333',helper=False)
                                           for i,id in enumerate(ids)],
                  copies=list('ABC'),connections=edges,start=dict(path=ids[start],address=[]),
                  goal=dict(path=ids[goal],address=[]),allowedRule='finite',providedInput=provided,
                  claims=[],review='wip',notes=[
                  'WIP: read directly from the photograph’s fifteen wire circuits. This is a different maze from the thirteen-circuit author demo/native model.',
                  'Start at the minus and finish at the plus at the surface. Copy 1=A, 2=B, 3=C.',
                  'Continuous strokes and gapped underpasses stay separate. Extraction is stable across thresholds 135–155; review blur and chip anchors.',
                  'The bundled finite route is generated from this photo conversion, not an author recording.'])
artwork = dict(row['artwork'],bounds=[31,37.5,861,861],start=point(sp),goal=point(gp),gates=gates,
               frames=[dict(id=c,x=point(owners[c][:2])[0],y=point(owners[c][:2])[1],width=123,height=123)
                       for c in 'ABC'],
               traces=[dict(id=f'wire-{i}-{j}',path=ids[i],color='#333333',points=[point(p) for p in trace])
                       for i,curves in enumerate(traces) for j,trace in enumerate(curves)])
(DATA/'daedalus-photo.json').write_text(json.dumps([dict(reference=row['reference'],title=row['title'],
                                                      definition=definition,artwork=artwork)],separators=(',',':'))+'\n')
print('Daedalus 2 photo: fifteen source circuits, finite input',len(route))
