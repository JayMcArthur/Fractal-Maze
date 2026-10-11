"""WIP trace of Snuke 1's parent arrows, excluding the smaller repeated arrows."""
import json
from pathlib import Path
import numpy as np
from scipy.interpolate import CubicSpline
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/data/mazes'
row = next(row for row in json.loads((DATA / 'artwork-registry.json').read_text())
           if row['reference'] == 'maze-images-snuke-snuke-1-jpg')
# Coordinates are measured in a 1000-wide view of the 1410-wide original.
vertices = {'_': [[501,96],[906,390],[751,866],[252,866],[97,390]],
            'A': [[501,306],[704,453],[626,691],[376,691],[299,453]]}
curves = [
    ('_',0,'A',1,True,[[501,96],[550,120],[607,158],[650,207],[686,267],[707,329],[717,388],[712,420],[704,453]]),
    ('A',0,'_',4,False,[[501,306],[452,280],[412,261],[372,251],[326,248],[288,253],[245,271],[202,296],[160,331],[124,369],[97,390]]),
    ('_',4,'A',3,False,[[97,390],[99,445],[117,506],[151,559],[196,604],[246,641],[301,669],[350,686],[376,691]]),
    ('A',4,'_',3,False,[[299,453],[271,482],[239,517],[209,563],[188,611],[177,659],[175,709],[184,760],[207,808],[233,846],[252,866]]),
    ('_',3,'A',1,False,[[252,866],[328,879],[411,887],[499,886],[581,873],[648,842],[696,798],[727,743],[744,680],[750,612],[748,551],[735,496],[716,462],[704,453]]),
    ('_',3,'_',2,False,[[252,866],[345,882],[443,886],[536,886],[630,880],[698,873],[751,866]]),
    ('_',2,'A',3,False,[[751,866],[690,881],[633,884],[577,876],[523,854],[473,820],[431,778],[399,734],[376,691]]),
    ('_',1,'A',2,True,[[906,390],[897,450],[875,505],[842,557],[800,604],[752,642],[700,668],[650,684],[626,691]]),
]
scale = 1.41
vertices = {owner: (np.array(points) * scale).round(2).tolist() for owner, points in vertices.items()}
rgb = np.array(Image.open(ROOT / 'public' / row['artwork']['asset']).convert('RGB'))
black = rgb.mean(2) < 100
# Project measured curve samples onto source stroke centers along their normals.
# Dynamic selection favors a continuous stroke when another arrow crosses it.
def source_centerline(curve):
    normals = np.gradient(curve, axis=0)
    normals = np.column_stack((-normals[:,1], normals[:,0]))
    normals /= np.linalg.norm(normals, axis=1)[:,None]
    candidates = []
    for index, (point, normal) in enumerate(zip(curve,normals)):
        offsets = np.arange(-50,51,dtype=float)
        positions = np.rint(point + offsets[:,None]*normal).astype(int)
        hits = black[positions[:,1],positions[:,0]]
        groups = np.split(np.flatnonzero(hits),np.flatnonzero(np.diff(np.flatnonzero(hits))>1)+1)
        options = [point+normal*offsets[group].mean() for group in groups if len(group)]
        if not options and min(np.linalg.norm(point-curve[0]),np.linalg.norm(point-curve[-1])) < 40:
            options = [point]  # The source leaves a small gap between an arrow tip and its dot.
        assert options, (index,point)
        candidates.append(np.array([point]) if index in (0,len(curve)-1) else np.array(options))
    costs = np.array([0.]); parents = []
    for index in range(1,len(candidates)):
        delta = curve[index]-curve[index-1]
        transition = np.sum((candidates[index][:,None,:]-candidates[index-1][None,:,:]-delta)**2,axis=2)
        scores = transition+costs[None,:]
        chosen = np.argmin(scores,axis=1)
        costs = scores[np.arange(len(chosen)),chosen] + .002*np.sum((candidates[index]-curve[index])**2,axis=1)
        parents.append(chosen)
    selected = int(np.argmin(costs)); points = [candidates[-1][selected]]
    for index in range(len(candidates)-2,-1,-1):
        selected = parents[index][selected]; points.append(candidates[index][selected])
    return np.round(points[::-1],2).tolist()
edges, gates, traces = [], [], []
for i, (source,a,target,b,both,waypoints) in enumerate(curves):
    waypoints = np.array(waypoints, dtype=float) * scale
    lengths = np.r_[0, np.cumsum(np.linalg.norm(np.diff(waypoints,axis=0),axis=1))]
    points = source_centerline(CubicSpline(lengths,waypoints,axis=0)(np.linspace(0,lengths[-1],int(lengths[-1]/5)+1)))
    for reverse in ([False,True] if both else [False]):
        owner0, port0, owner1, port1 = (target,b,source,a) if reverse else (source,a,target,b)
        curve = points[::-1] if reverse else points
        op = 'walk' if owner0 == owner1 else 'enter' if owner0 == '_' else 'exit'
        path = str(port1 if op == 'exit' else port0)
        id = f'arrow-{i}' + ('-reverse' if reverse else '')
        edges.append({'id':id,'from':str(port0),'to':str(port1),'operation':op,
                      'copy':'A' if op != 'walk' else '', 'input':'',
                      'evidence':'WIP parent-arrow transcription; repeated arrows inside A are not additional parent edges'})
        if op == 'enter': gate = dict(edge=id,from_=curve[-1],to=vertices['_'][port1])
        elif op == 'exit': gate = dict(edge=id,from_=vertices['_'][port0],to=curve[-1],arrivalFrom=curve[0])
        else: gate = dict(edge=id,from_=curve[-1],to=curve[-1])
        gate['from'] = gate.pop('from_'); gates.append(gate)
        traces.append(dict(id=id,path=path,color='#353b42',directed=True,points=curve))
definition = dict(type='pathPushdown',paths=[dict(id=str(i),label=f'Port {i}',color='#353b42',helper=False) for i in range(5)],
                  copies=['A'],connections=edges,start=dict(path='0',address=[]),goal=dict(path='3',address=[]),
                  allowedRule='finite',claims=[],review='wip',notes=[
                  'WIP: parent arrowheads are transcribed separately from the smaller repeated arrows inside A. Review both directions on the S–A1 and port 1–A2 arcs.',
                  'Measured curves are projected onto the original black stroke centers; review alignment at arrowheads and close parallel arcs. Interior crossings do not connect.',
                  'The transcription has a finite ten-transition route to G. No unstated limit hops are assumed.'])
artwork = dict(row['artwork'],width=1410,height=1362,bounds=[65,100,1300,1250],
               frames=[dict(id='A',x=405,y=425,width=605,height=605)],
               start=vertices['_'][0],goal=vertices['_'][3],gates=gates,traces=traces)
(DATA / 'snuke-one-artwork.json').write_text(json.dumps([dict(reference=row['reference'],title=row['title'],definition=definition,artwork=artwork)],separators=(',',':'))+'\n')
print('Snuke 1 WIP: five ports, ten parent transitions, eight source arcs')
