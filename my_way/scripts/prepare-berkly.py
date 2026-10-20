"""Transcribe Berkly's black and colored wires; keep crossings on separate channels."""
import json
from pathlib import Path
from balanced_witness import balanced_witness
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/mazes'
row=next(r for r in json.loads((DATA/'artwork-registry.json').read_text()) if r['reference']=='maze-images-mike-earnest-berkly-jpg')
# Clockwise pins: north left/right, east top/bottom, south right/left, west bottom/top.
root=[[198,64],[708,64],[843,210],[843,715],[699,848],[188,848],[48,707],[48,199]]
parent={'A':[[201,348],[321,348],[373,397],[373,518],[319,567],[197,567],[147,516],[147,397]],
        'B':[[556,352],[679,352],[729,400],[729,521],[674,570],[555,570],[507,518],[507,398]]}
partition=[0,1,9,8,2,0,10,6]
attached={'A':[4,3,1,5,9,8,7,10], 'B':[6,1,10,8,2,2,5,4]}
curves={
 0:[[[198,64],[198,297],[77,297],[77,691],[188,691],[188,848]]],
 1:[[[708,64],[708,193],[577,193],[577,287],[474,287],[474,340],[399,340],[399,397],[373,397]],[[679,352],[679,193],[577,193]]],
 2:[[[699,848],[699,637],[555,637],[555,570]],[[674,570],[674,637],[699,637]]],
 3:[[[336,223],[336,269],[321,269],[321,348]]],
 4:[[[201,348],[201,316],[263,316],[263,108],[529,108],[529,255],[444,255],[444,398],[507,398]]],
 5:[[[373,518],[507,518]]],
 6:[[[48,199],[156,199],[156,280],[413,280],[413,316],[556,316],[556,352]]],
 7:[[[147,516],[98,516],[98,677],[375,677]]],
 8:[[[197,567],[197,601],[256,601],[256,618],[533,618],[533,715],[843,715]],[[729,521],[758,521],[758,618],[843,618],[843,715]]],
 9:[[[319,567],[319,759],[817,759],[817,484],[845,484],[845,210],[843,210]]],
 10:[[[48,707],[49,397],[147,397]],[[48,707],[224,707],[224,792],[599,792],[599,680],[799,680],[799,454],[758,454],[758,400],[729,400]]],
}
name=lambda p:'123456789AB'[p]
colors=['#222222']*11
for p,c in [(4,'#cf2929'),(6,'#287d29'),(7,'#287d29'),(8,'#526be0'),(9,'#94396e'),(10,'#cf2929')]:colors[p]=c
edges=[];gates=[]
for copy,pins in attached.items():
 for i,outside in enumerate(pins):
  inside=partition[i];a=parent[copy][i];b=root[i]
  for op,f,t,source,target in [('enter',outside,inside,a,b),('exit',inside,outside,b,a)]:
   id=f'{copy}-{i}-{op}'
   edges.append(dict(id=id,operation=op,copy=copy,**{'from':name(f),'to':name(t)},input=('(' if op=='enter' else ')') if f==t else name(t),evidence='WIP: clockwise boundary correspondence; crossings retain their wire'))
   gates.append(dict(edge=id,**{'from':source,'to':target}))
route=balanced_witness(list(map(name,curves)),edges,name(3),[name(7)])
notes=['Author clarification: colored lines are wires to follow, alongside the black wires. Start is above copy 1; Finish is below it.',
       'WIP crossing interpretation: stay on the same wire at interior crossings. Branches on one wire connect. Confirm whether any differently colored crossing permits a turn.',
       'Copies A and B are source blocks 1 and 2. Pins match clockwise around each block to the outer boundary.',
       'This candidate has no finite balanced start-to-finish route. This is a finding about the candidate transcription, not a proof about the source maze. Review crossings and boundary pairing before relying on it.']
definition=dict(type='pathPushdown',paths=[dict(id=name(p),label=name(p),color=colors[p],helper=False)for p in curves],copies=['A','B'],connections=edges,start=dict(path=name(3),address=[]),goal=dict(path=name(7),address=[]),allowedRule='finite',claims=[],review='wip',notes=notes)
if route is not None:definition['providedInput']=''.join(next(e['input']for e in edges if e['id']==id)for id in route)
artwork=dict(row['artwork'],bounds=[0,0,915,915],frames=[dict(id='A',x=147,y=350,width=226,height=217),dict(id='B',x=507,y=352,width=222,height=218)],traces=[dict(id=f'wire-{name(p)}-{i}',path=name(p),color=colors[p],points=line)for p,lines in curves.items()for i,line in enumerate(lines)],gates=gates,start=curves[3][0][0],goal=curves[7][0][-1])
(DATA/'berkly-artwork.json').write_text(json.dumps([dict(reference=row['reference'],title=row['title'],definition=definition,artwork=artwork)],separators=(',',':'))+'\n')
print('Berkly: 11 source channels, 32 gate directions; crossing interpretation WIP; finite witness:',route)
