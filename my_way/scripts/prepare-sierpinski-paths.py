"""Bind the source Sierpinski squares, compiling compound copy boundaries as PDA helpers."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from balanced_witness import balanced_witness

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/'src/data/mazes'
row = next(r for r in json.loads((DATA/'artwork-registry.json').read_text())
           if r['reference'] == 'maze-images-siggy-skeptic-play-2-jpg')
# Original sharp diagram from the author's post. The repository JPEG is an enlarged screenshot.
# https://skepticsplay.blogspot.com/2014/02/fractal-maze-2-sierpinski-paths.html
rgb = np.array(Image.open(ROOT/'scripts/source-assets/sierpinski-paths.png').convert('RGB'))
curves = {
 '1': [[[50,300],[50,400],[150,400],[150,550],[300,550]],
       [[0,350],[50,350]], [[0,400],[50,400]], [[100,600],[100,550],[150,550]]],
 '2': [[[100,300],[100,450],[250,450],[250,525],[300,525]], [[0,450],[100,450]]],
 '3': [[[200,350],[200,300]]],
 '4': [[[275,400],[275,500]], [[0,500],[300,500]], [[275,437.5],[300,437.5]]],
 '5': [[[0,550],[50,550],[50,525],[200,525],[200,475],[300,475]], [[200,525],[200,600]]],
 '6': [[[400,600],[400,600]]],
 '7': [[[0,275],[0,275]]],
}
colors = {'1':'#0000aa','2':'#00ffff','3':'#007100','4':'#00ff00','5':'#007100',
          '6':'#007100','7':'#007100'}
# Independently check each main polyline against the original exact RGB. Only differently
# colored crossing pixels, source boundary pixels and start/finish disks may interrupt it.
for path, lines in curves.items():
 if path in ('6','7'):continue
 color=np.array([int(colors[path][i:i+2],16)for i in (1,3,5)])
 for line in lines:
  for a,b in zip(line,line[1:]):
   points=np.linspace(a,b,max(2,int(np.linalg.norm(np.array(b)-a))+1))
   hits=0
   for x,y in points:
    x,y=round(x),round(y)
    pixels=rgb[max(0,y-2):min(602,y+3),max(0,x-2):min(602,x+3)]
    hits+=int(np.any(np.all(pixels==color,axis=2)))
   assert hits/len(points)>.9,(path,a,b,hits,len(points))

def point(p):
 return [round(13+p[0]*464/300,4),round(8+p[1]*464/300,4)]
# A and B name the upper-left and lower-right recursive triangles. The playable square
# is the lower-left part of each triangle. Passing directly into AB or BA uses a point
# helper at that copy boundary, rather than pretending it is a single stack operation.
pairs = [
 ('1','1','A',[50,300],[100,600]), ('2','5','A',[100,300],[200,600]),
 ('3','6','A',[200,300],[400,600]), ('6','5','B',[400,600],[200,600]),
 ('1','4','B',[300,550],[0,500]), ('2','2','B',[300,525],[0,450]),
 ('4','1','B',[300,500],[0,400]), ('5','1','B',[300,475],[0,350]),
 ('4','7','B',[300,437.5],[0,275]), ('7','5','A',[0,275],[0,550]),
]
edges,gates=[],[]
for n,(outside,inside,copy,a,b) in enumerate(pairs):
 for op,f,t,source,target in [('enter',outside,inside,a,b),('exit',inside,outside,b,a)]:
  id=f'boundary-{n}-{op}'
  edges.append({'id':id,'from':f,'to':t,'copy':copy,'operation':op,
                'input':('(' if op=='enter' else ')') if f==t else t,
                'evidence':'Original colored square boundary; compound AB/BA crossing split by an explicit point helper'})
  gates.append({'edge':id,'from':point(source),'to':point(target)})
route=balanced_witness(list(curves),edges,'4',['3'])
assert route is not None
provided=''.join(next(e['input'] for e in edges if e['id']==id) for id in route)
definition=dict(type='pathPushdown',paths=[dict(id=id,label=id,color=colors[id],helper=id in ('6','7'))
                                        for id in curves],copies=list('AB'),connections=edges,
                start=dict(path='4',address=[]),goal=dict(path='3',address=[]),allowedRule='finite',
                providedInput=provided,claims=[],review='wip',notes=[
                'Follow colored wires from the hollow light-green circle to the filled dark-green circle. Black lines are square boundaries, not corridors. Finite solutions only.',
                'Five connected source wires and two point helpers. Helpers 6 and 7 split direct AB/BA boundary crossings; they add no corridor and preserve the full copy address.',
                'A is the upper-left recursive triangle; B is the lower-right triangle. Each playable square is the lower-left part of its triangle.',
                'WIP: review screenshot alignment and the compound boundary interpretation against the source. The original sharp diagram resolves faded crossings; its topology differs from the seven-circuit native redraw.',
                'Source rules and sharp diagram: https://skepticsplay.blogspot.com/2014/02/fractal-maze-2-sierpinski-paths.html'])
artwork=dict(row['artwork'],bounds=[13,8,928,928],start=point([275,400]),goal=point([200,350]),
             frames=[dict(id='A',x=13,y=8,width=464,height=464),
                     dict(id='B',x=477,y=472,width=464,height=464)],gates=gates,
             traces=[dict(id=f'wire-{id}-{n}',path=id,color=colors[id],points=[point(p) for p in line])
                     for id,lines in curves.items()for n,line in enumerate(lines)])
(DATA/'sierpinski-paths.json').write_text(json.dumps([dict(reference=row['reference'],title=row['title'],
                                                        definition=definition,artwork=artwork)],separators=(',',':'))+'\n')
print('Sierpinski Paths: five source wires, two explicit helpers, finite input',len(route))
