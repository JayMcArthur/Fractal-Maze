import json,re,math,pathlib
root=pathlib.Path(__file__).resolve().parents[2];data=root/'my_way/src/data/mazes'
rows=json.load(open(data/'svg-artwork.json'));drafts=json.load(open(data/'artwork-drafts.json'))
def vertices(d):
 toks=re.findall(r'[MmLlHhVv]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',d);out=[];pos=[0,0];command='';i=0
 while i<len(toks):
  if toks[i] in 'MmLlHhVv':command=toks[i];i+=1
  c=command.lower();relative=command.islower()
  if c in ['m','l']:
   x,y=float(toks[i]),float(toks[i+1]);i+=2;pos=[pos[0]+x,pos[1]+y]if relative else[x,y];command='l'if relative else'L'
  elif c=='h':x=float(toks[i]);i+=1;pos=[pos[0]+x if relative else x,pos[1]]
  elif c=='v':y=float(toks[i]);i+=1;pos=[pos[0],pos[1]+y if relative else y]
  else:raise ValueError(command)
  out.append(pos[:])
 return out

def distance(p,a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)))if dx*dx+dy*dy>0 else 0
 return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)

infinite=[]
for filename in ['First_Cantor.svg','Infinite_Descent.svg','Simple_Cantor_Maze.svg']:
 row=next(r for r in rows if r['asset'].endswith(filename));draft=next(d for d in drafts if d['artwork']['asset']==row['asset']);arts=draft['artwork']
 ps=[p for p in row['paths']if p['color']not in ['rgb(255, 255, 255)','rgb(254, 254, 254)','rgb(0, 0, 0)']]
 for p in ps:p['vertices']=vertices(p['d'])
 if filename=='Simple_Cantor_Maze.svg':
  groups=[[p]for p in ps];connections=[['1-1','/A'],['3-2','A/'],['2-1','/B'],['3-3','B/']];start='1';goal='3';copies=['A','B'];allowed='cantorHop'
  # Artwork order is top, bottom, middle.
  mapping={ps[0]['id']:'1',ps[1]['id']:'3',ps[2]['id']:'2'}
  paths=[{'id':str(i),'label':str(i),'color':'#d43b39','helper':False}for i in range(1,4)]
 else:
  if filename=='Infinite_Descent.svg':ps=[p for p in ps if min(pt[1]for pt in p['vertices'])<55 and max(pt[1]for pt in p['vertices'])<60]
  parent=list(range(len(ps)))
  def find(i):
   while parent[i]!=i:i=parent[i]
   return i
  for i,a in enumerate(ps):
   for j,b in enumerate(ps[:i]):
    if a['color']!=b['color']:continue
    if any(distance(pt,x,y)<.12 for pt in [a['vertices'][0],a['vertices'][-1]]for x,y in zip(b['vertices'],b['vertices'][1:]))or any(distance(pt,x,y)<.12 for pt in [b['vertices'][0],b['vertices'][-1]]for x,y in zip(a['vertices'],a['vertices'][1:])):
     parent[find(i)]=find(j)
  if filename=='First_Cantor.svg':
   blue=[i for i,p in enumerate(ps)if p['color']=='rgb(0, 0, 255)']
   for i in blue:parent[find(i)]=find(blue[0])
  groups=[]
  for i,p in enumerate(ps):
   idx=find(i)
   g=next((g for k,g in groups if k==idx),None)
   if g is None:groups.append((idx,[p]))
   else:g.append(p)
  groups=[g for k,g in groups]
  def groupat(point):
   distances=[min(distance(point,a,b)for p in g for a,b in zip(p['vertices'],p['vertices'][1:]))for g in groups]
   n=min(range(len(distances)),key=lambda i:distances[i]);return n if distances[n]<.15 else None
  if filename=='First_Cantor.svg':
   rootgates=[(37.919,17.865),(74.438,17.865),(92.698,36.125),(92.698,72.634),(74.438,90.904),(37.919,90.904),(19.659,72.634),(19.659,36.125)]
   ordered=[]
   for gate in rootgates:
    g=groupat(gate)
    if g is not None and g not in ordered:ordered.append(g)
   ordered +=[i for i in range(len(groups))if i not in ordered]
   copies=['A','B','C'];allowed='cantorHop'
   gateat=lambda f:[(f['x']+f['width']*.25,f['y']),(f['x']+f['width']*.75,f['y']),(f['x']+f['width'],f['y']+f['height']*.25),(f['x']+f['width'],f['y']+f['height']*.75),(f['x']+f['width']*.75,f['y']+f['height']),(f['x']+f['width']*.25,f['y']+f['height']),(f['x'],f['y']+f['height']*.75),(f['x'],f['y']+f['height']*.25)]
   copygates=[(f['id'],gateat(f))for f in arts['frames']]
   goalgroup=next(i for i,g in enumerate(groups)if g[0]['color']=='rgb(0, 0, 255)')
  else:
   rootgates=[(x,22.364)for x in [30.7145,44.4861,58.2577,72.0293,85.8009,99.5724]]
   ordered=[groupat(gate)for gate in rootgates];copies=['A','B','C'];allowed='infiniteHop'
   copygates=[(name,[(x+4.5835*i,59.4157)for i in range(6)])for name,x in [('A',26.1528),('B',53.7015),('C',81.2354)]]
   goalgroup=ordered[-1]
  paths=[{'id':str(i+1),'label':str(i+1),'color':groups[g][0]['color'],'helper':False}for i,g in enumerate(ordered)]
  label={g:str(i+1)for i,g in enumerate(ordered)}
  mapping={p['id']:label[g]for g in ordered for p in groups[g]}
  start=label[groupat(rootgates[5])] if filename=='First_Cantor.svg' else label[ordered[0]]
  goal=label[goalgroup];connections=[]
  for copy,gates in copygates:
   for port,point in enumerate(gates):
    child=groupat(rootgates[port]);outer=groupat(point)
    if child is not None and outer is not None:connections.append([f'{label[outer]}-{label[child]}','/'+copy])
  if filename=='Infinite_Descent.svg':arts['frames']=[{'id':copy,'x':x-2.3,'y':59.4157,'width':27.55,'height':18.36}for copy,x in [('A',26.1528),('B',53.7015),('C',81.2354)]]
 arts['traces']=[{'id':p['id'],'path':mapping[p['id']],'color':p['color'],'points':p['vertices'],'svg':{'d':p['d'],'matrix':p['transform']}}for p in ps if p['id']in mapping]
 infinite.append({'reference':draft['reference'],'title':draft['title'],'artwork':arts,'paths':paths,'copies':copies,'pairs':connections,'start':start,'goal':goal,'allowedRule':allowed})
(data/'infinite-fixtures.json').write_text(json.dumps(infinite,indent=2));print([(f['title'],len(f['paths']),f['pairs'])for f in infinite])
