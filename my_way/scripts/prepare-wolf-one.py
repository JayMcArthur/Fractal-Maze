"""Recover Wolf 1 wire circuits and register the annotated solution scan."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/mazes'
sys.path.insert(0,str(ROOT/'scripts'))
from raster_wire_model import chains,nearest
from PIL import Image
import numpy as np
from scipy import ndimage
from skimage.morphology import skeletonize
frames={'A':[253,95,46,46],'B':[361,95,46,46],'C':[187,178,46,46],'D':[377,215,46,46],'E':[105,251,46,46],'F':[277,251,46,46],'G':[97,371,46,46],'H':[213,355,46,46]}
rgb=np.array(Image.open(ROOT/'public/references/Maze_Images/Mark_J_P_Wolf/Wolfram_1.gif').convert('RGB'));mask=rgb.max(2)<100
mask[:40]=0;mask[452:]=0;mask[:,:40]=0;mask[:,451:]=0
for x,y,w,h in frames.values():mask[y:y+h,x:x+w]=0
s=skeletonize(mask);labels,n=ndimage.label(s,np.ones((3,3))); cs=[dict(pixels=np.argwhere(labels==i))for i in range(1,n+1) if np.sum(labels==i)>=2]
parents=list(range(len(cs)))
def root(i):
 while parents[i]!=i:i=parents[i]
 return i
endpoints=[]
for i,c in enumerate(cs):
 pts=set(map(tuple,c['pixels']))
 for p in pts:
  ns=[(p[0]+dy,p[1]+dx)for dy in [-1,0,1]for dx in [-1,0,1]if(dx or dy)and(p[0]+dy,p[1]+dx)in pts]
  if len(ns)==1:
   cur=p;last=None
   for _ in range(4):
    ns=[(cur[0]+dy,cur[1]+dx)for dy in [-1,0,1]for dx in [-1,0,1]if(dx or dy)and(cur[0]+dy,cur[1]+dx)in pts and(cur[0]+dy,cur[1]+dx)!=last]
    if len(ns)!=1:break
    last,cur=cur,ns[0]
   if cur!=p:endpoints.append((i,np.array(p),np.array(p)-cur))
bridges=[]
for a,(i,p,u)in enumerate(endpoints):
 for j,q,v in endpoints[a+1:]:
  delta=q-p;dist=np.linalg.norm(delta)
  if dist<2 or dist>9 or min(abs(delta))>1:continue
  if np.dot(u,delta)<=0 or np.dot(v,delta)>=0:continue
  if np.dot(u,delta)<np.linalg.norm(u)*dist*.55 or -np.dot(v,delta)<np.linalg.norm(v)*dist*.55:continue
  mid=(p+q)/2
  if any(x-1<=mid[1]<=x+w and y-1<=mid[0]<=y+h for x,y,w,h in frames.values()):continue
  parents[root(j)]=root(i);bridges.append((i,[p[::-1].tolist(),q[::-1].tolist()]))
groups={i:[j for j in range(len(cs))if root(j)==i]for i in set(root(j)for j in range(len(cs)))}
cs2=[dict(pixels=np.concatenate([cs[j]['pixels']for j in ids]),traces=[t for j in ids for t in chains(cs[j]['pixels'])]+[t for j,t in bridges if root(j)==i])for i,ids in sorted(groups.items())]
def at(p):
 matches=[nearest(c,p)for c in cs2];i=min(range(len(matches)),key=lambda i:matches[i][1]);return i,matches[i][0],matches[i][1]
def pins(rect,offset,pitch):
 x,y,w,h=rect;xx=[x+offset+pitch*i for i in range(8)];yy=[y+offset+pitch*i for i in range(8)]
 return [[a,y]for a in xx]+[[x+w,b]for b in yy]+[[a,y+h]for a in xx[::-1]]+[[x,b]for b in yy[::-1]]
owned=[set()for c in cs2];bindings={}
for prefix,points in [('_',pins([40,40,411,412],16.5,54))]+[(c,pins(r,8.5,4))for c,r in frames.items()]:
 for n,p in enumerate(points):
  i,q,d=at([442,111.5]if prefix=='_'and n==9 else p)
  if prefix!='_':
   x,y,w,h=frames[prefix];xx,yy=map(round,p);side=n//8
   check=mask[y-3:y, int(p[0]-.5):int(p[0]+1.5)]if side==0 else mask[int(p[1]-.5):int(p[1]+1.5),x+w:x+w+3]if side==1 else mask[y+h:y+h+3,int(p[0]-.5):int(p[0]+1.5)]if side==2 else mask[int(p[1]-.5):int(p[1]+1.5),x-3:x]
   if not np.any(check):continue
  assert d<=5,(prefix,n,p,d)
  owned[i].add(f'{prefix}:{n}');bindings[prefix,n]=(i,p)
minus,sp,_=at([127,102]);plus,fp,_=at([367,383]);owned[minus].add('s');owned[plus].add('f')
native=json.load(open(DATA/'geometric-collection.json'))[11]
expected=[{'s'if g.startswith('f:')else'f'if g.startswith('s:')else g for g in p['gates']}for p in native['paths']]

assert set(map(frozenset,owned))==set(map(frozenset,expected))
from balanced_witness import balanced_witness
ids=[chr(49+expected.index(gates))for gates in owned]
edges,gates=[],[]
for copy in frames:
 for n in range(32):
  if(copy,n)not in bindings:continue
  outer,a=bindings[copy,n];inner,b=bindings['_',n]
  for op,f,t,source,target in [('enter',ids[outer],ids[inner],a,b),('exit',ids[inner],ids[outer],b,a)]:
   edge_id=f'{copy}-{n}-{op}'
   token=('('if op=='enter'else')')if f==t else t
   edges.append({'id':edge_id,'from':f,'to':t,'operation':op,'copy':copy,'input':token,'evidence':'Source wire, separated crossing and corresponding numbered terminal'})
   gates.append({'edge':edge_id,'from':source,'to':target})
for i,p in bindings.values():
 q,d=nearest(cs2[i],p)
 cs2[i]['traces'].append([q,p])
start,goal=ids[minus],ids[plus]
route=balanced_witness(ids,edges,start,[goal]);assert route is not None
provided=''.join(next(e['input']for e in edges if e['id']==id)for id in route)
definition=dict(type='pathPushdown',paths=[dict(id=chr(49+i),label=str(i+1),color='#343434',helper=False)for i in range(39)],copies=list(frames),connections=edges,start=dict(path=start,address=[]),goal=dict(path=goal,address=[]),providedInput=provided,allowedRule='finite',claims=[],review='wip',notes=[
 'Travel from the minus to the plus. The imported native model had these endpoints reversed.',
 'All 39 source circuit partitions match the imported pins, including the C:27–E:8 wire omitted in the old text transcription.',
 'Only opposite collinear stroke ends are joined across drawn crossing gaps; crossings never join different circuits.',
 'WIP: review source anchors and crossing alignment. The bundled route is computed from this conversion.'])
registry=json.loads((DATA/'artwork-registry.json').read_text())
source=next(r for r in registry if r['reference'].endswith('wolfram-1-gif'))
art=dict(source['artwork'],bounds=[40,40,411,412],start=sp,goal=fp,gates=gates,frames=[dict(id=c,x=x,y=y,width=w,height=h)for c,(x,y,w,h)in frames.items()],traces=[dict(id=f'wire-{i}-{j}',path=ids[i],color='#343434',points=t)for i,c in enumerate(cs2)for j,t in enumerate(c['traces'])])
rows=[dict(reference=source['reference'],title=source['title'],definition=definition,artwork=art)]
# Independently register the existing annotated solution scan to the unannotated source.
import cv2,copy
solution=next(r for r in registry if r['reference'].endswith('wolfram-1-solution-jpg'))
target=np.array(Image.open(ROOT/'public'/solution['artwork']['asset']).convert('RGB'))
height,width=target.shape[:2]
resized=cv2.resize(rgb,(width,height));a=cv2.cvtColor(resized,cv2.COLOR_RGB2GRAY).astype(np.float32)/255;b=cv2.cvtColor(target,cv2.COLOR_RGB2GRAY).astype(np.float32)/255
score,warp=cv2.findTransformECC(b,a,np.array([[1.,0,-5],[0,1.,-5]],np.float32),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,100,1e-5),None,5)
assert score>.85
transform=cv2.invertAffineTransform(warp);transform[:,0]*=width/rgb.shape[1];transform[:,1]*=height/rgb.shape[0]
def point(p):return (transform@np.array([*p,1])).round(4).tolist()
other=copy.deepcopy(art);other.update(asset=solution['artwork']['asset'],width=width,height=height,start=point(sp),goal=point(fp))
corners=np.array([point(p)for p in [[40,40],[451,40],[40,452],[451,452]]])
low=corners.min(0);high=corners.max(0)
other['bounds']=[*low.tolist(),*(high-low).tolist()]
for trace in other['traces']:trace['points']=[point(p)for p in trace['points']]
for gate in other['gates']:gate['from']=point(gate['from']);gate['to']=point(gate['to'])
for frame in other['frames']:
 frame['x'],frame['y']=point([frame['x'],frame['y']]);frame['width']*=float(transform[0,0]);frame['height']*=float(transform[1,1])
rows.append(dict(reference=solution['reference'],title=solution['title'],definition=definition,artwork=other))
(DATA/'wolf-one-artwork.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
print('Wolf 1: 39 circuits, two source views, finite input',len(route),'registration',round(score,3))
