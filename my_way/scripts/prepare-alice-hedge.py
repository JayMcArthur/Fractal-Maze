"""Extract Alice's fourteen corridors; keep the orange bridge overpass separate."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
from raster_wire_model import nearest, chains
from balanced_witness import balanced_witness

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA/'artwork-registry.json').read_text()) if 'alice-and' in row['reference'])
rgb = np.array(Image.open(ROOT/'public'/row['artwork']['asset']).convert('RGB')).astype(int)
height,width=rgb.shape[:2]
mask = np.linalg.norm(rgb-[175,127,70],axis=2)<32
frames = {'A':[318,318,249,249], 'B':[885,318,249,249], 'C':[318,885,249,249], 'D':[885,885,249,249]}
for x,y,w,h in frames.values(): mask[y:y+h,x:x+w] = False
# Text is a label rather than a wall in the start disk.
y,x = np.indices(mask.shape)
mask[(x-265)**2+(y-265)**2<48**2] = True
mask[703:739,955:1065] = False
labels,count = ndimage.label(mask,np.ones((3,3)))
components = [dict(pixels=np.argwhere(skeletonize(labels==i)),color='#af7f46') for i in range(1,count+1) if np.sum(labels==i)>200]
assert len(components)==16

def at(point):
    matches=[nearest(c,point)for c in components]
    index=min(range(len(matches)),key=lambda i:matches[i][1])
    return index,matches[index][0],matches[index][1]

parent=list(range(16))
def root(i):
    while parent[i]!=i:i=parent[i]
    return i
bridges=[]
for start,end,middle in [([955,725],[1065,725],[[982,719],[1009,715],[1036,719]]),
                         ([1009,700],[1009,742],[])]:
    a,pa,_=at(start);b,pb,_=at(end)
    assert root(a)!=root(b)
    parent[root(b)]=root(a)
    bridges.append((a,[pa,start,*middle,end,pb]))
groups={i:[j for j in range(16)if root(j)==i]for i in {root(j)for j in range(16)}}
assert len(groups)==14
cs=[dict(pixels=np.concatenate([components[j]['pixels']for j in ids]),
         traces=[t for j in ids for t in chains(components[j]['pixels'])]+[t for j,t in bridges if root(j)==i])for i,ids in sorted(groups.items())]

def at(point):
    matches=[nearest(c,point)for c in cs];i=min(range(len(matches)),key=lambda i:matches[i][1])
    return i,matches[i][0],matches[i][1]

def pins(rect,pitch):
    x,y,w,h=rect; points=[x+55+pitch*i for i in (0,1,2)]; ys=[y+55+pitch*i for i in (0,1,2)]
    return [[a,y]for a in points]+[[x+w,b]for b in ys]+[[a,y+h]for a in points[::-1]]+[[x,b]for b in ys[::-1]]
root_pins=[[373,104],[726,104],[1081,104],[1348,373],[1348,726],[1348,1081],
           [1081,1348],[726,1348],[373,1348],[104,1081],[104,726],[104,373]]
owned=[set()for c in cs]; bindings={}
for owner,points in [('_',root_pins)]+[(copy,pins(frame,70.5))for copy,frame in frames.items()]:
    for n,point in enumerate(points):
        i,nearest_point,d=at(point)
        if d>25:continue
        owned[i].add(f'{owner}:{n}')
        bindings[owner,n]=(i,point)
        cs[i]['traces'].append([nearest_point,point])
start,sp,_=at([265,265]);owned[start].add('s')
native=json.loads((DATA/'geometric-collection.json').read_text())[1]
expected=[{'s'if gate.startswith('s:')else gate for gate in path['gates']}for path in native['paths']]
assert set(map(frozenset,owned))==set(map(frozenset,expected)), ('Source/native corridor partitions differ',owned,expected)
ids=[str(expected.index(gates))for gates in owned]
edges,gates=[],[]
for copy in frames:
    for n in range(12):
        if(copy,n)not in bindings:continue
        outer,a=bindings[copy,n];inner,b=bindings['_',n]
        for op,from_,to,source,target in [('enter',ids[outer],ids[inner],a,b),('exit',ids[inner],ids[outer],b,a)]:
            id=f'{copy}-{n}-{op}'
            edges.append(dict(id=id,from_=from_,to=to,operation=op,copy=copy,input=to,evidence='Source corridor, numbered terminal and separate drawn bridge'))
            edges[-1]['from']=edges[-1].pop('from_')
            gates.append(dict(edge=id,from_=source,to=target));gates[-1]['from']=gates[-1].pop('from_')
goals=list(dict.fromkeys(ids[bindings['_',n][0]]for n in range(12)))
aliases={str(i):chr(49+i)for i in range(14)}
for edge in edges:
    same=edge['from']==edge['to'];edge['from']=aliases[edge['from']];edge['to']=aliases[edge['to']]
    edge['input']=('('if edge['operation']=='enter'else')')if same else edge['to']
start=aliases[ids[start]];goals=[aliases[goal]for goal in goals]
route=balanced_witness(list(aliases.values()),edges,start,goals)
assert route is not None
provided=''.join(next(edge['input']for edge in edges if edge['id']==id)for id in route)
finishes=[dict(state=dict(path=aliases[ids[bindings['_',n][0]]],address=[]),point=root_pins[n])for n in range(12)]
definition=dict(type='pathPushdown',paths=[dict(id=aliases[str(i)],label=str(i+1),color='#af7f46',helper=False)for i in range(14)],
                copies=list(frames),connections=edges,start=dict(path=start,address=[]),goal=dict(path=goals[0],address=[]),
                alternateGoals=[dict(path=goal,address=[])for goal in goals[1:]],allowedRule='finite',providedInput=provided,claims=[],review='wip',notes=[
                'Escape through any of the twelve surface exits. The same path inside a smaller copy is not a finish.',
                'All fourteen source corridor partitions match the imported native pins. The horizontal bridge and vertical underpass are separated.',
                'WIP: review gate positions and bridge alignment. The bundled input is generated from this topology, not an original author recording.'])
artwork=dict(row['artwork'],width=width,height=height,bounds=[0,0,width,height],start=sp,goal=finishes[0]['point'],finishes=finishes,gates=gates,
             frames=[dict(id=copy,x=f[0],y=f[1],width=f[2],height=f[3])for copy,f in frames.items()],
             traces=[dict(id=f'corridor-{i}-{j}',path=aliases[ids[i]],color='#af7f46',points=t)for i,c in enumerate(cs)for j,t in enumerate(c['traces'])])
(DATA/'alice-hedge.json').write_text(json.dumps([dict(reference=row['reference'],title=row['title'],definition=definition,artwork=artwork)],separators=(',',':'))+'\n')
print('Alice: fourteen source corridors, all twelve valid outer exits, finite input',len(route))
