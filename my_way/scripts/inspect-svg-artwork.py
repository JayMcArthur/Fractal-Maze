import json,pathlib,os,sys
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parents[2]
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8770'
chromium=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
out=[]
with sync_playwright() as p:
 b=p.chromium.launch(**({'executable_path':chromium}if chromium else {}),headless=True)
 page=b.new_page(viewport={'width':850,'height':850})
 for file in (root/'Maze_Images/Siggy').glob('*.svg'):
  page.goto(base+'/Maze_Images/Siggy/'+file.name)
  page.screenshot(path='/tmp/'+file.stem+'.png')
  data=page.evaluate('''() => { const s=document.querySelector('svg'),vb=s.viewBox.baseVal; const visible=e=>{let a=e;while(a instanceof Element){const c=getComputedStyle(a);if(c.display==='none'||c.visibility==='hidden')return false;a=a.parentElement;}return true;}; const m0=s.getScreenCTM().inverse();return {asset:'references/Maze_Images/Siggy/'+decodeURIComponent(location.pathname.split('/').pop()),width:vb.width,height:vb.height,paths:[...s.querySelectorAll('path')].filter(e=>visible(e)&&getComputedStyle(e).stroke!=='none').map(e=>{let m=m0.multiply(e.getScreenCTM());m.e-=vb.x;m.f-=vb.y;return{id:e.id,d:e.getAttribute('d'),color:getComputedStyle(e).stroke,transform:[m.a,m.b,m.c,m.d,m.e,m.f],points:Array.from({length:3},(_,i)=>{let p=e.getPointAtLength(e.getTotalLength()*i/2).matrixTransform(m);return[p.x,p.y];})}}),labels:[...s.querySelectorAll('text')].filter(visible).map(e=>({text:e.textContent.trim(),x:e.getBBox().x,y:e.getBBox().y}))};}''')
  out.append(data)
 b.close()
(root/'my_way/src/data/mazes/svg-artwork.json').write_text(json.dumps(out,indent=2))
canvas=Image.new('RGB',(1500,1000),'#eeeeee');d=ImageDraw.Draw(canvas)
for i,data in enumerate(out):
 im=Image.open('/tmp/'+pathlib.Path(data['asset']).stem+'.png').convert('RGB');im.thumbnail((480,440));x=(i%3)*500;y=(i//3)*500;canvas.paste(im,(x,y+30));d.text((x+10,y+8),pathlib.Path(data['asset']).name,fill='black')
canvas.save('/tmp/fractal-svg-inspection.png')
print([(a['asset'],len(a['paths']),a['labels']) for a in out])
