"""Extract Backlot's grid and enumerate legal local tours before composing recursion.

Read the original MIT grid from public/references/source-assets/backlot-grid.png.
Enumeration is independent of the published solution; the resulting gate-pair
counts must agree with that source. This takes roughly three minutes.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from collections import deque
from itertools import combinations
import json,time
ROOT=Path(__file__).resolve().parents[1]
im=np.array(Image.open(ROOT/'public/references/source-assets/backlot-grid.png').convert('RGB'))
rows=cols=9
bounds=[7,15,759,714]
center=lambda x,y:(round(7+(x+.5)*759/9),round(15+(y+.5)*714/9))
adj=[[] for _ in range(81)]
for y in range(9):
 for x in range(9):
  i=y*9+x
  for dx,dy in [(1,0),(0,1)]:
   xx,yy=x+dx,y+dy
   if xx>=9 or yy>=9:continue
   a=center(x,y);b=center(xx,yy);mx,my=round((a[0]+b[0])/2),round((a[1]+b[1])/2)
   if im[my,mx].max()>50:
    j=yy*9+xx;adj[i].append(j);adj[j].append(i)
rc=[5,7,8,None,None,None,6,6,5];cc=[6,6,6,None,None,None,7,7,6]
dots=[14,25,38,41,48,57,63,69,70,78,79]
gates={'N':4,'E':44,'S':76,'W':36}
d={'size':9,'cells':adj,'rowCounts':rc,'columnCounts':cc,'dots':dots,'copies':[{'id':'A','cell':49},{'id':'B','cell':59}],'gates':gates,'entry':'N','requireRootCopy':True,'exitMarks':{'N':[5,19,20,27,28],'E':[4,6,8,16,18,27,29],'W':[4,8,10,15,24,29],'S':[4,8,9,20,36]},'finalMarks':[28,31,50]}
d.update(type='recursiveTour',review='wip')
print('edges',sum(map(len,adj))//2,'copycolors',im[center(4,5)[1],center(4,5)[0]],im[center(5,6)[1],center(5,6)[0]],flush=True)
allsolutions={};nodes=0;t0=time.time()
for startname,endname in combinations(gates,2):
 start,end=gates[startname],gates[endname];solutions=[];path=[start];vis=1<<start;nr=[0]*9;nc=[0]*9;nr[start//9]=nc[start%9]=1
 def dfs(cell,vis):
  global nodes
  nodes+=1
  if cell==end:
   if all(a is None or a==b for a,b in zip(rc,nr)) and all(a is None or a==b for a,b in zip(cc,nc)) and all(vis>>i&1 for i in dots):solutions.append(path[:])
   return
  # All required cells and row/column deficits must remain reachable.
  reachable=1<<cell;stack=[cell];rr=[0]*9;cr=[0]*9
  while stack:
   p=stack.pop()
   for q in adj[p]:
    if not ((vis|reachable)>>q&1):
     reachable|=1<<q;stack.append(q);rr[q//9]+=1;cr[q%9]+=1
  if not reachable>>end&1 or any(not (vis|reachable)>>i&1 for i in dots):return
  if any(a is not None and b+c<a for a,b,c in zip(rc,nr,rr)) or any(a is not None and b+c<a for a,b,c in zip(cc,nc,cr)):return
  for q in adj[cell]:
   if vis>>q&1:continue
   y,x=divmod(q,9)
   if rc[y] is not None and nr[y]>=rc[y] or cc[x] is not None and nc[x]>=cc[x]:continue
   nr[y]+=1;nc[x]+=1;path.append(q);dfs(q,vis|1<<q);path.pop();nr[y]-=1;nc[x]-=1
 dfs(start,vis)
 allsolutions[startname+endname]=solutions
 print(startname+endname,len(solutions),[len(p) for p in solutions],nodes,round(time.time()-t0,2),flush=True)
assert {key:len(paths) for key,paths in allsolutions.items()}=={'NE':3,'NS':0,'NW':1,'ES':1,'EW':0,'SW':1}
# A finite local route is usable once all of its studio gate pairs are usable.
def gate(c,n):return 'N' if n==c-9 else 'S' if n==c+9 else 'W' if n==c-1 else 'E'
valid={key:paths[0] for key,paths in allsolutions.items() if paths and all(c not in [49,59] for c in paths[0])}
while True:
 added=False
 for key,paths in allsolutions.items():
  if key in valid:continue
  for path in paths:
   required=[frozenset([gate(c,path[i-1]),gate(c,path[i+1])]) for i,c in enumerate(path) if c in [49,59]]
   if all(any(frozenset(k)==pair for k in valid) for pair in required):valid[key]=path;added=True;break
 if not added:break
assert set(valid)=={'NE','NW','ES','SW'}
def compile_tour(entry,exit):
 key=next(k for k in valid if set(k)=={entry,exit})
 path=valid[key]
 if path[0]!=d['gates'][entry]:path=list(reversed(path))
 moves=[];i=1
 while i<len(path):
  moves.append(gate(path[i-1],path[i]))
  if path[i] in [49,59]:
   c=path[i];moves+=compile_tour(gate(c,path[i-1]),gate(c,path[i+1]));i+=1
  i+=1
 return moves+[exit]
d['providedMoves']=compile_tour('N','E')
assert len(d['providedMoves'])==337
artwork=dict(asset='references/source-assets/backlot-grid.png',width=im.shape[1],height=im.shape[0],bounds=bounds,traces=[],
 frames=[dict(id=copy['id'],x=7+copy['cell']%9*759/9,y=15+copy['cell']//9*714/9,width=759/9,height=714/9) for copy in d['copies']])
(ROOT/'src/data/mazes/backlot.json').write_text(json.dumps(dict(definition=d,artwork=artwork),separators=(',',':'))+'\n')
(ROOT/'docs/BACKLOT_LOCAL_ROUTES.json').write_text(json.dumps(allsolutions,indent=2)+'\n')
print('Backlot: 337 moves, six complete rooms, maximum depth three')
