"""Trace the source room-substitution templates with explicit left/right white ports."""
import json,math
from pathlib import Path
from balanced_witness import balanced_witness

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/mazes'
row=next(row for row in json.loads((DATA/'artwork-registry.json').read_text())
         if row['reference']=='maze-images-the-inner-frame-pdf')
centers={'P':220.5,'G':309.5,'R':398.5,'Y':488.0}
colors={'P':'#cb87b6','G':'#87c78f','R':'#dc6544','Y':'#e1df59'}
paths={'1':('P','connected'),'2':('G','connected'),'3':('R','right'),
       '4':('Y','left'),'5':('R','left'),'6':('Y','right')}
lines={id:[]for id in paths}
def port(room,side):return [centers[room]+(-25.5 if side=='left' else 25.5),278.0]
def stub(room,side):return [centers[room]+(-38.0 if side=='left' else 38.0),278.0]
def child(room,side):return [centers[room],252.0 if side=='top' else 304.0]
def arc(room,a,b):
 # The source circle has radius 26. The white/colored room disks are traversable nodes.
 return [[round(centers[room]+25.5*math.cos(t),4),round(278+26*math.sin(t),4)]
         for t in [a+(b-a)*i/24 for i in range(25)]]
for id,(room,kind)in paths.items():
 for side in ('left','right')if kind=='connected'else(kind,):
  lines[id].append([stub(room,side),port(room,side)])
 if kind=='connected':lines[id].append([port(room,'left'),port(room,'right')])
lines['1'] += [arc('P',math.pi,math.pi*1.5),arc('P',0,math.pi*.5)]
lines['2'] += [arc('G',0,-math.pi*.5),arc('G',math.pi,math.pi*.5)]
lines['3'] += [arc('R',0,-math.pi*.5),arc('R',0,math.pi*.5)]
lines['4'] += [arc('Y',math.pi,math.pi*1.5),arc('Y',math.pi,math.pi*.5)]
# A means one deeper level. The source's worked example exits Purple III into Yellow II
# after entering it from Green II: this puzzle remembers the level, not a fixed parent color.
entries=[('1','4','P','top','Y','left'),('1','3','P','bottom','R','right'),
         ('2','1','G','top','P','right'),('2','5','G','bottom','R','left'),
         ('3','6','R','top','Y','right'),('3','2','R','bottom','G','right'),
         ('4','1','Y','top','P','left'),('4','2','Y','bottom','G','left')]
edges,gates=[],[]
for n,(outside,inside,parent,place,room,side)in enumerate(entries):
 for op,f,t,a,b in [('enter',outside,inside,child(parent,place),port(room,side)),
                    ('exit',inside,outside,stub(room,side),child(parent,place))]:
  id=f'room-{n}-{op}'
  edges.append({'id':id,'from':f,'to':t,'operation':op,'copy':'A','input':t,
                'evidence':'Source colored substitution room and corresponding left/right white room; one level descent/ascent'})
  gates.append({'edge':id,'from':a,'to':b})
route=balanced_witness(list(paths),edges,'1',['2']);assert route is not None
provided=''.join(next(e['input']for e in edges if e['id']==id)for id in route)
definition=dict(type='pathPushdown',paths=[dict(id=id,label=f'{room} · {kind}',color=colors[room],helper=False)
                                        for id,(room,kind)in paths.items()],copies=['A'],connections=edges,
                start=dict(path='1',address=[]),goal=dict(path='2',address=[]),allowedRule='finite',
                providedInput=provided,claims=[],review='wip',notes=[
                'Start at the left white room in Purple, level I. Finish at the left white room in Green, level I. Level 0 is unavailable.',
                'Each A descends one level; an exit ascends one. The source example allows ascent into another parent color through the matching left/right port. Color is the current maze, not a remembered parent identity.',
                'Six source circuits include the isolated left Red and right Yellow rooms. Their excursions return to their entry rooms; recording removes those detours.',
                'The nondeterministic source model needs no artificial Fix 1 helper. The separate guide PDA preserves Jay’s five-state deterministic conversion and its original eight-token example.',
                'WIP: review white-port orientation and alignment. The player crops to the current source template; the PDF’s expanded board and solution row remain reference illustrations.',
                'Source rules and worked ascent: https://theinnerframe.org/2021/01/29/fractal-maze/'])
artwork=dict(row['artwork'],bounds=[175,239,360,79],start=port('P','left'),goal=port('G','left'),
             frames=[],gates=gates,views=[dict(paths=[id for id,(r,k)in paths.items()if r==room],
                                               bounds=[x-42,239,84,79])for room,x in centers.items()],
             traces=[dict(id=f'room-{id}-{j}',path=id,color='#222222',points=line)
                     for id,curves in lines.items()for j,line in enumerate(curves)])
(DATA/'inner-frame-rooms.json').write_text(json.dumps([dict(reference=row['reference'],
                                                         title='Inner Frame — source rooms',definition=definition,artwork=artwork)],
                                                   separators=(',',':'))+'\n')
print('Inner Frame: six source circuits, four context views, finite input',provided)
