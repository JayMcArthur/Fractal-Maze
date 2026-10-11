import json,math,pathlib
root=pathlib.Path(__file__).resolve().parents[2];data=root/'my_way/src/data/mazes'
references={row['id']:row for row in json.load(open(root/'my_way/src/data/manifests/references.json'))}
rows=[row for row in json.load(open(data/'artwork-drafts.json')) if row['reference']!='maze-images-the-inner-frame-pdf'];registry=[]
# Border matching creates candidate PDA connections only when a copy gate has a nearby surface counterpart.
# Absence of a match stays unresolved rather than inventing an edge.
for row in rows:
 row['author']=references[row['reference']]['author']
 art=row['artwork'];w,h=art['width'],art['height'];pairs=[];notes=[]
 if not art['asset'].endswith('.svg'):
  endpoints=[(t['path'],p)for t in art['traces']for p in [t['points'][0],t['points'][-1]]]
  border=[(path,(x/w,y/h))for path,(x,y)in endpoints if min(x/w,y/h,1-x/w,1-y/h)<.08]
  for frame in art['frames']:
   for path,(x,y) in endpoints:
    rx=(x-frame['x'])/frame['width'];ry=(y-frame['y'])/frame['height']
    if not(-.12<=rx<=1.12 and -.12<=ry<=1.12):continue
    if min(abs(rx),abs(ry),abs(1-rx),abs(1-ry))>.12:continue
    if not border:continue
    child,coord=min(border,key=lambda p:math.dist(p[1],(rx,ry)))
    if math.dist(coord,(rx,ry))>.10:continue
    pair=[path+'-'+child,'/'+frame['id']]
    if pair not in pairs:pairs.append(pair)
  if art['asset'].endswith('Alice_and_the_Hedge_Maze.png'):
   # The numbered surface gates lie on the hedge frame, inside the raster border.
   surface=[(.255,.073),(.5,.073),(.745,.073),(.927,.255),(.927,.5),(.927,.745),(.745,.927),(.5,.927),(.255,.927),(.073,.745),(.073,.5),(.073,.255)]
   ports=[(.2,0),(.5,0),(.8,0),(1,.2),(1,.5),(1,.8),(.8,1),(.5,1),(.2,1),(0,.8),(0,.5),(0,.2)]
   points=[(t['path'],p)for t in art['traces']for p in t['points']]
   def near(point):
    path,p=min(points,key=lambda item:math.dist(item[1],point))
    return path if math.dist(p,point)<w*.02 else None
   roots=[near((x*w,y*h))for x,y in surface]
   for frame in art['frames']:
    for index,(x,y)in enumerate(ports):
     outer=near((frame['x']+x*frame['width'],frame['y']+y*frame['height']))
     if outer and roots[index]:
      pair=[outer+'-'+roots[index],'/'+frame['id']]
      if pair not in pairs:pairs.append(pair)
   notes.append('Ochre corridors and four room frames are traced. Gate candidates match the twelve numbered room gates to their surface positions. Blank gates have no inferred edge. The bridge near B/D must be reviewed: a crossing is not necessarily a junction.')

  notes.append('Raster skeleton fragments can split a path at a crossing or printed label. Merge fragments by assigning the same path label. Frame positions and boundary matches are tentative.')
  if not pairs:notes.append('Copy-gate correspondence remains unresolved; no recursion connections have been invented. Use the connection table to finish the PDA.')
  if not art['traces']:notes.append('No reliable trace was extracted. Draw the visible directed corridors and preserve their arrows before adding connections.')
 registry.append({**row,'artwork':{**art,'traces':[]},'pairs':pairs,'notes':notes})
# Include a raster rendering of the user-provided Inner Frame PDF, for editable source coordinates.
from PIL import Image
asset='references/Maze_Images/The_Inner_Frame.png';w,h=Image.open(root/'my_way/public'/asset).size
inner={'reference':'maze-images-the-inner-frame-pdf','title':'Inner Frame','author':'Matthias Weber','paths':[],'pairs':[],'notes':[],'artwork':{'asset':asset,'width':w,'height':h,'bounds':[170,770,330,90],'frames':[],'traces':[]}}
registry.append(inner);rows.append(inner)
(data/'artwork-registry.json').write_text(json.dumps(registry,indent=2))
(data/'artwork-drafts.json').write_text(json.dumps(rows,separators=(',',':')))
print('Registry',len(registry),'candidate connections',sum(len(r['pairs'])for r in registry),'size', (data/'artwork-drafts.json').stat().st_size)
