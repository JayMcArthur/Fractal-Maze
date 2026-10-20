"""Bind primary source strokes and gate coordinates; never redraw the SVG."""
import asyncio,json,math
import xml.etree.ElementTree as ET
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data/mazes'

async def sampled(browser,traces,width):
 page=await browser.new_page()
 await page.set_content('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
 result=await page.evaluate('''({traces,width})=>traces.map(trace=>{
 const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',trace.svg.d);document.querySelector('svg').append(p);
 const m=new DOMMatrix(trace.svg.matrix), length=p.getTotalLength();
 const count=Math.max(2,Math.ceil(length*Math.hypot(m.a,m.b)/(width/1000)));
 trace.points=Array.from({length:count+1},(_,i)=>{const q=p.getPointAtLength(length*i/count);const t=new DOMPoint(q.x,q.y).matrixTransform(m);return [Number(t.x.toFixed(4)),Number(t.y.toFixed(4))]});p.remove();return trace;
 })''',{'traces':traces,'width':width})
 await page.close();return result

def nearest(points,point):
 return min(points,key=lambda p:math.dist(p,point))

def bind_gates(model,art,ports,transforms):
 gates=[];used=set()
 for edge in model['connections']:
  if edge['operation']!='enter':continue
  points=[p for t in art['traces'] if t['path']==edge['from'] for p in t['points']]
  candidates=[]
  for path,point in ports:
   if path!=edge['to'] or (edge['copy'],tuple(point)) in used:continue
   x,y,s=transforms[edge['copy']]
   child=[x+s*point[0],y+s*point[1]]
   matched=nearest(points,child)
   candidates.append((math.dist(matched,child),matched,point))
  if not candidates:raise ValueError(edge)
  d,source,target=min(candidates)
  used.add((edge['copy'],tuple(target)))
  if d>art['bounds'][2]/150:raise ValueError(('unmatched gate',edge,d))
  gates.append({'edge':edge['id'],'from':source,'to':target})
  reverse=next(e for e in model['connections'] if e['id']==edge['id'].replace('-in','-out'))
  gates.append({'edge':reverse['id'],'from':target,'to':source})
 art['gates']=gates

async def main():
 svg=json.loads((DATA/'svg-artwork.json').read_text());fixtures=json.loads((DATA/'path-fixtures.json').read_text())
 # The guide pairs retain their original source direction conventions.
 def connections(pairs):
  rows=[]
  for i,(pair,direction) in enumerate(pairs):
   a,b=pair.split('-');from_,to=(a,b) if direction.startswith('/') else (b,a);copy=direction.replace('/','')
   rows.extend([{'id':f'edge-{i}-in','from':from_,'to':to,'copy':copy,'operation':'enter'}, {'id':f'edge-{i}-out','from':to,'to':from_,'copy':copy,'operation':'exit'}])
  return rows
 source=next(x for x in svg if x['asset'].endswith('/Skeptic_Play_1.svg'))
 ids={'path2191-2':'2','path11030-5-9':'5','path15254-2':'1','path10741-1-3':'1','path1999-9':'2','path5822-4':'2','path10741-7':'1','path15254-0-0':'4','path18157-6':'6','path16283-3-7':'6','path16283-8':'3','path11030-5-7-3':'4'}
 traces=[{'id':p['id'],'path':ids[p['id']],'color':p['color'],'points':p['points'],'svg':{'d':p['d'],'matrix':p['transform']}} for p in source['paths'] if p['id'] in ids]
 ports=[('2',[90.3137,16.7776]),('2',[131.4576,33.82]),('4',[148.5,74.9639]),('6',[131.4576,116.1079]),('1',[90.3137,133.3351]),('3',[49.1698,116.1079]),('5',[32.13,74.9625]),('2',[49.1698,33.82])]
 transforms={'A':(61.22317-.25*90.3137,74.96394-.25*74.96394,.25),'B':(119.40685-.25*90.3137,74.96252-.25*74.96394,.25)}
 art={'asset':source['asset'],'width':source['width'],'height':source['height'],'bounds':[25,10,131,132],'traces':traces,'frames':[{'id':c,'x':x+.25*32.13,'y':y+.25*16.7776,'width':29.0925,'height':29.1394} for c,(x,y,s) in transforms.items()],'start':[90.3137,133.3351],'goal':[90.3137,16.7776]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/home/jay/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',headless=True)
  art['traces']=await sampled(browser,traces,art['bounds'][2])
  art['traces'].append({'id':'checkpoint-1','path':'1','color':'rgb(0, 193, 193)','points':[[90.3137,109.0908],[90.3137,104.0571]]})
  bind_gates({'connections':connections(fixtures[0]['pairs'])},art,ports,transforms)
  docs=[{'reference':'maze-images-siggy-skeptic-play-1-svg','fixture':1,'artwork':art}]
  # Steps is an annotated view of this exact layout. Movement uses the underlying full SVG routes.
  steps=json.loads(json.dumps(art));steps['asset']='references/Maze_Images/Siggy/Skeptic_Play_1_Steps.svg'
  docs.append({'reference':'maze-images-siggy-skeptic-play-1-steps-svg','fixture':1,'artwork':steps})
  # The photograph has the same six circuits, with different colors and an affine layout.
  photo=json.loads(json.dumps(art));photo['asset']='references/Maze_Images/Siggy/Skeptic_Play_1.jpg'
  photo['width']=867;photo['height']=1003;photo['bounds']=[10,78,845,845]
  sx,sy,tx,ty=7.11,7.10,433-7.11*90.3137,502-7.10*74.96394
  def transform(point):return [round(point[0]*sx+tx,4),round(point[1]*sy+ty,4)]
  colors={'1':'#0b5b00','2':'#e90000','3':'#aa38c4','4':'#009ada','5':'#842dbd','6':'#f0c400'}
  for trace in photo['traces']:
   trace.pop('svg',None);trace['points']=[transform(p)for p in trace['points']];trace['color']=colors[trace['path']]
  for gate in photo['gates']:
   gate['from']=transform(gate['from']);gate['to']=transform(gate['to'])
  for frame in photo['frames']:
   frame['x'],frame['y']=transform([frame['x'],frame['y']]);frame['width']*=sx;frame['height']*=sy
  photo['start']=transform(photo['start']);photo['goal']=transform(photo['goal'])
  docs.append({'reference':'maze-images-siggy-skeptic-play-1-jpg','fixture':1,'artwork':photo})
  infinite=json.loads((DATA/'infinite-fixtures.json').read_text())
  for f in infinite:
   a=f['artwork'];a['traces']=await sampled(browser,[t for t in a['traces'] if t['id']!='finish-junction'],a['bounds'][2])
   if f['title']=='First Cantor':
    coordinates=[(37.919,17.865),(74.438,17.865),(92.698,36.125),(92.698,72.634),(74.438,90.904),(37.919,90.904),(19.659,72.634),(19.659,36.125)]
    ports=[]
    for point in coordinates:
     trace=min(a['traces'],key=lambda t:math.dist(nearest(t['points'],point),point));ports.append((trace['path'],point))
    transforms={r['id']:(r['x']-19.659*r['width']/73.039,r['y']-17.865*r['width']/73.039,r['width']/73.039) for r in a['frames']}
    junction=ET.parse(ROOT/'public'/a['asset']).find(".//*[@id='rect50864']")
    x,y,w,h=[float(junction.get(key)) for key in ('x','y','width','height')]
    center=[x+w/2,y+h/2]
    a['traces'].append({'id':'finish-junction','path':f['goal'],'color':'rgb(0, 0, 255)','points':[[x,center[1]],center,[x+w,center[1]]]})
    a['start']=list(coordinates[5]);a['goal']=center
    bind_gates({'connections':connections(f['pairs'])},a,ports,transforms)
   elif f['title']=='Infinite Descent':
    ports=[(str(i+1),[x,22.364]) for i,x in enumerate([30.7145,44.4861,58.2577,72.0293,85.8009,99.5724])]
    transforms={c:(x-30.7145/3,59.4157-22.364/3,1/3) for c,x in [('A',26.1528),('B',53.7015),('C',81.2354)]}
    a['start']=ports[0][1];a['goal']=ports[-1][1]
    bind_gates({'connections':connections(f['pairs'])},a,ports,transforms)
   else:
    bypath={t['path']:t for t in a['traces']}
    top=bypath['1']['points'][0];bottom=bypath['3']['points'][-1]
    a['start']=top;a['goal']=bottom;a['gates']=[]
    locations=[(bypath['1']['points'][-1],top),(bypath['2']['points'][-1],bottom),(bypath['2']['points'][0],top),(bypath['3']['points'][0],bottom)]
    for i,(source,target) in enumerate(locations):
     a['gates'].extend([{'edge':f'edge-{i}-in','from':source,'to':target},{'edge':f'edge-{i}-out','from':target,'to':source}])
  await browser.close()
 (DATA/'playable-artwork.json').write_text(json.dumps(docs,separators=(',',':'))+'\n')
 (DATA/'infinite-fixtures.json').write_text(json.dumps(infinite,separators=(',',':'))+'\n')
 print('Source-bound SP1 views:',len(docs),'gates:',len(art['gates']))

asyncio.run(main())
