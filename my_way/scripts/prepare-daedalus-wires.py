"""Read Daedalus lattice crossings, then bind each real pin to its matching copy."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from grid_weave import weave_graph, weave_pins, DIRECTIONS
from balanced_witness import balanced_witness

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/mazes'
REGISTRY=json.loads((DATA/'artwork-registry.json').read_text())


def prepare(reference,nx,ny,offset):
    row=next(row for row in REGISTRY if row['reference']==reference)
    rgb=np.array(Image.open(ROOT/'public'/row['artwork']['asset']).convert('RGB'))
    mask=np.ptp(rgb.astype(int),axis=2)>100;step=8
    dx=(nx+1)*step;dy=(ny+1)*step;left=int(step*1.25+offset)
    rects=[(left+dx*(2*x+1),left+dy*(2*y+1),dx,dy)for y in range(3)for x in range(3)]
    copies={str(i):i for i in range(1,8)}
    owners={'_':(left,left,7*dx,7*dy),'s':rects[0],'f':rects[8],**{copy:rects[i]for copy,i in copies.items()}}
    components,owner,traces,ports,vertices=weave_graph(mask,(left,left,left+7*dx,left+7*dy),step,[rects[0],rects[8],*[rects[i]for i in copies.values()]])
    bindings={};owned=[set()for _ in components]
    for name,rect in owners.items():
        for n,(x,y,direction)in enumerate(weave_pins(rect,nx,ny,7*step if name=='_'else step)):
            gate=[float(x),float(y)]
            if name!='_':
                ax,ay=DIRECTIONS[(direction+2)%4];x+=ax*step;y+=ay*step
            key=ports.get((x,y,direction))
            if key not in owner:continue
            index=owner[key]
            bindings[name,n]=(index,gate)
            owned[index].add(f'{name}:{n}'if name not in ('s','f')else name)
            if name!='_':traces[index].append([vertices[key],gate])
    count=2*(nx+ny)
    assert all(('_',n)in bindings for n in range(count))
    endpoints=[[v for k,v in bindings.items()if k[0]==name]for name in ('s','f')]
    assert all(len(points)==1 for points in endpoints)
    labels=list(range(len(components)))
    aliases={i:chr(49+labels[i])for i in range(len(components))}
    edges,gates=[],[]
    for copy in copies:
        for n in range(count):
            if(copy,n)not in bindings:continue
            parent,a=bindings[copy,n];inside,b=bindings['_',n]
            for op,from_,to,source,target in [('enter',aliases[parent],aliases[inside],a,b),('exit',aliases[inside],aliases[parent],b,a)]:
                id=f'{copy}-{n}-{op}'
                edges.append({'id':id,'from':from_,'to':to,'operation':op,'copy':copy,
                              'input':('('if op=='enter'else')')if from_==to else to,
                              'evidence':'Source lattice half-edges and numbered chip pin; overpass and underpass remain separate'})
                gates.append({'edge':id,'from':source,'to':target})
    start,sp=endpoints[0][0];goal,gp=endpoints[1][0]
    route=balanced_witness(list(aliases.values()),edges,aliases[start],[aliases[goal]])
    assert route is not None, 'Lattice interpretation has no balanced finite solution'
    provided=''.join(next(edge['input']for edge in edges if edge['id']==id)for id in route)
    colors=[]
    for component in components:
        values=[rgb[int(y),int(x)]for x,y,_ in component if mask[int(y),int(x)]]
        color=np.median(values,axis=0).astype(int)if values else [40,40,40]
        colors.append('#%02x%02x%02x'%tuple(color))
    definition=dict(type='pathPushdown',paths=[dict(id=aliases[i],label=str(labels[i]+1),color=colors[i],helper=False)for i in range(len(components))],
                    copies=list(copies),connections=edges,start=dict(path=aliases[start],address=[]),goal=dict(path=aliases[goal],address=[]),
                    allowedRule='finite',providedInput=provided,claims=[],review='wip',notes=[
                    'WIP: source lattice corridors and weave layers are bound to the real copy pins. Unconnected pins do not create transitions. Review hidden corner crossings.',
                    'Start at the minus box and finish at the plus box at the surface. The bundled finite input is generated from this topology, not an original author recording.'])
    artwork=dict(row['artwork'],start=sp,goal=gp,gates=gates,
                 frames=[dict(id=copy,x=rects[i][0],y=rects[i][1],width=dx,height=dy)for copy,i in copies.items()],
                 traces=[dict(id=f'wire-{i}-{j}',path=aliases[i],color=colors[i],points=t)for i,curves in enumerate(traces)for j,t in enumerate(curves)])
    print(row['title'],len(components),'circuits',len(edges),'transitions',len(route),'finite steps')
    return dict(reference=reference,title=row['title'],definition=definition,artwork=artwork)


if __name__=='__main__':
    rows=[prepare('maze-images-daedalus-1-gif',7,7,0),
          prepare('maze-images-ed-pegg-jr-daedalus-3-gif',10,4,2)]
    (DATA/'daedalus-wires.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
