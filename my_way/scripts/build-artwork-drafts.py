"""Create reviewable source-coordinate traces. Raster connectivity remains WIP.
Run from repository root with Python, Pillow, numpy, scipy and scikit-image.
SVG geometry is captured by inspect-svg-artwork.py with Chromium.
"""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'my_way/src/data/mazes'
refs = json.loads((ROOT/'my_way/src/data/manifests/references.json').read_text())
svg = {row['asset']: row for row in json.loads((DATA/'svg-artwork.json').read_text())}
# Frames are tentative image-relative measurements; original pixels are never moved.
FRAMES = {
 'Alice_and_the_Hedge_Maze.png':[(.22,.22,.17,.17),(.61,.22,.17,.17),(.22,.61,.17,.17),(.61,.61,.17,.17)],
 'Daedalus_1.gif':[(.19,.19,.14,.14),(.43,.19,.14,.14),(.67,.19,.14,.14),(.19,.43,.14,.14),(.43,.43,.14,.14),(.67,.43,.14,.14),(.19,.67,.14,.14),(.43,.67,.14,.14),(.67,.67,.14,.14)],
 'Daedalus_3.gif':[(.19,.19,.14,.14),(.43,.19,.14,.14),(.67,.19,.14,.14),(.19,.43,.14,.14),(.43,.43,.14,.14),(.67,.43,.14,.14),(.19,.67,.14,.14),(.43,.67,.14,.14),(.67,.67,.14,.14)],
 'Wolfram_0.jpg':[(.35,.36,.30,.30)],
 'Wolfram_1.gif':[(.18,.13,.18,.15),(.40,.13,.18,.15),(.63,.13,.18,.15),(.18,.40,.18,.15),(.63,.40,.18,.15),(.18,.67,.18,.15),(.40,.67,.18,.15),(.63,.67,.18,.15)],
 'Wolfram_1_-_Solution.jpg':[(.18,.13,.18,.15),(.40,.13,.18,.15),(.63,.13,.18,.15),(.18,.40,.18,.15),(.63,.40,.18,.15),(.18,.67,.18,.15),(.40,.67,.18,.15),(.63,.67,.18,.15)],
 'Wolfram_2.jpg':[(.20,.35,.15,.15),(.50,.15,.15,.15),(.65,.62,.15,.15)],
 'Wolfram_2_-_Wires.png':[(.18,.32,.18,.18),(.47,.11,.18,.18),(.63,.59,.18,.18)],
 'Skeptic_Play_1.jpg':[(.17,.35,.27,.27),(.56,.35,.27,.27)],
 'Skeptic_Play_3_Alt.png':[(.15,.15,.25,.25),(.60,.15,.25,.25),(.60,.60,.25,.25),(.15,.60,.25,.25)],
 'Skeptic_Play_3.png':[(.15,.15,.25,.25),(.60,.15,.25,.25),(.60,.60,.25,.25),(.15,.60,.25,.25)],
 'Berkly.jpg':[(.18,.32,.22,.22),(.61,.32,.22,.22)],
 'Geocaching_Easter_13-10.png':[(.65,.07,.25,.25),(.35,.37,.25,.25),(.05,.67,.25,.25)],
 'Jay_McArthur_-_A_Long_Path_v6.png':[(.405,.165,.17,.18),(.595,.277,.17,.18),(.595,.50,.17,.18),(.405,.615,.17,.18),(.215,.50,.17,.18),(.215,.277,.17,.18)],
 'Luegarua.webp':[(.32,.30,.34,.38)],
 'Daedalus_2.jpg':[(.18,.16,.22,.22),(.61,.16,.22,.22),(.18,.62,.22,.22)],
 'Snuke_1.jpg':[(.34,.32,.34,.36)],
 'Snuke_2.jpg':[(.18,.38,.18,.20),(.43,.17,.18,.20),(.64,.53,.18,.20)],
 'Windischer.gif':[(.35,.34,.31,.31)],
 'Windischer.png':[(.35,.34,.31,.31)],
 'Windischer_Recursion.jpg':[(.35,.34,.31,.31)],
}
PALETTE = ['#d43b39','#d48518','#ac9c20','#58a12c','#20a08b','#1a9fbe','#3561c0','#733fc1','#ad3eb0']

def paths_from_mask(mask, color, first, max_radius=8):
    labels, count = ndimage.label(mask, structure=np.ones((3,3)))
    traces, paths = [], []
    minimum = max(25, mask.shape[0]//9)
    for component in range(1,count+1):
        region = labels == component
        if region.sum() < minimum: continue
        if color != '#303e4a' and ndimage.distance_transform_edt(region).max() > max_radius: continue
        skeleton = skeletonize(region)
        ys,xs = np.nonzero(skeleton)
        if len(xs) < minimum or max(xs.max()-xs.min(),ys.max()-ys.min()) < minimum//2: continue
        path = str(first+len(paths))
        paths.append({'id':path,'label':path,'color':color,'helper':False})
        # Emit chains between endpoints/junctions, all assigned to the same connected path.
        pixels=set(zip(xs.tolist(),ys.tolist()))
        def neighbors(p):
            x,y=p
            return [q for q in ((x+i,y+j)for i in (-1,0,1)for j in (-1,0,1)if i or j)if q in pixels]
        used=set()
        starts=sorted(pixels,key=lambda p:(len(neighbors(p))==2,p[1],p[0]))
        for start in starts:
            for nxt in neighbors(start):
                edge=tuple(sorted((start,nxt)))
                if edge in used:continue
                chain=[start];prev,current=start,nxt;used.add(edge)
                while True:
                    chain.append(current)
                    ns=[q for q in neighbors(current)if q!=prev and tuple(sorted((current,q)))not in used]
                    if len(ns)!=1:break
                    nxt=ns[0];used.add(tuple(sorted((current,nxt))));prev,current=current,nxt
                if len(chain)<5:continue
                # Keep bends and endpoints, avoiding thousands of collinear handles.
                points=[chain[0]]
                for i in range(1,len(chain)-1):
                    a,b,c=chain[i-1:i+2]
                    if (b[0]-a[0],b[1]-a[1])!=(c[0]-b[0],c[1]-b[1]):points.append(b)
                points.append(chain[-1])
                traces.append({'id':f'trace-{len(traces)}-{path}','path':path,'color':color,'points':points})
    return traces,paths

def raster(asset):
    im=Image.open(ROOT/'my_way/public'/asset).convert('RGB')
    # Trace at source resolution; bound very large images without changing coordinate alignment.
    if max(im.size)>1200:im.thumbnail((1200,1200))
    w,h=im.size;rgb=np.asarray(im)/255;hi=rgb.max(2);lo=rgb.min(2)
    frames=[{'id':chr(65+i),'x':x*w,'y':y*h,'width':fw*w,'height':fh*h}for i,(x,y,fw,fh)in enumerate(FRAMES.get(Path(asset).name,[]))]
    valid=np.ones((h,w),dtype=bool)
    for f in frames:
        x,y,fw,fh=[round(f[k]) for k in ('x','y','width','height')]
        valid[max(0,y):y+fh,max(0,x):x+fw]=False
    if Path(asset).name == 'Alice_and_the_Hedge_Maze.png':
        # Thick ochre corridors are deliberate here; exclude the green hedge and room fills.
        mask=(np.linalg.norm(rgb-np.array([175,127,70])/255,axis=2)<.04)&valid
        ts,ps=paths_from_mask(mask,'#af7f46',1,max_radius=40)
        return {'asset':asset,'width':w,'height':h,'bounds':[0,0,w,h],'traces':ts,'frames':frames},ps
    # HSV-like hue binning separates different-color crossings; grayscale crossings need review.
    from skimage.color import rgb2hsv
    hsv=rgb2hsv(rgb);saturated=(hi-lo>.25)&(lo<.65)&valid
    traces=[];paths=[]
    if saturated.sum()>100:
        buckets=np.floor((hsv[:,:,0]*9+.5)%9).astype(int)
        for i,color in enumerate(PALETTE):
            mask=saturated&(buckets==i)
            mask=ndimage.binary_closing(mask,structure=np.ones((2,2)))&valid
            ts,ps=paths_from_mask(mask,color,len(paths)+1);traces+=ts;paths+=ps
    if not paths:
        black=(hi<.40)
        bulk=ndimage.binary_dilation(ndimage.distance_transform_edt(black)>5,iterations=4)
        mask=black & ~bulk & valid
        ts,ps=paths_from_mask(mask,'#303e4a',1);traces+=ts;paths+=ps
    return {'asset':asset,'width':w,'height':h,'bounds':[0,0,w,h],'traces':traces,'frames':frames},paths

results=[]
for entry in refs:
    if entry['kind']!='Maze artwork':continue
    asset=entry['asset']
    if asset.endswith('.pdf'):continue
    if asset in svg:
        row=svg[asset];traces=[];paths=[]
        for p in row['paths']:
            if p['color'] in ['rgb(255, 255, 255)','rgb(254, 254, 254)','rgb(0, 0, 0)']:continue
            label=str(len(paths)+1)
            paths.append({'id':label,'label':label,'color':p['color'],'helper':False})
            traces.append({'id':p['id'],'path':label,'color':p['color'],'points':p['points'],'svg':{'d':p['d'],'matrix':p['transform']}})
        bounds={'First_Cantor.svg':[12,8,88,94],'Simple_Cantor_Maze.svg':[42,15,65,95],'Infinite_Descent.svg':[22,9,85,74],'Skeptic_Play_1.svg':[25,6,132,136],'Skeptic_Play_1_Steps.svg':[25,6,132,136]}[Path(asset).name]
        frames=[]
        if asset.endswith('First_Cantor.svg'):frames=[{'id':i,'x':x,'y':y,'width':14.207692,'height':14.207692} for i,x,y in [('A',34.338219,32.585522),('B',63.750648,32.585522),('C',49.074478,61.968552)]]
        if asset.endswith('Simple_Cantor_Maze.svg'):frames=[{'id':'A','x':64,'y':38,'width':19,'height':20},{'id':'B','x':64,'y':67.2,'width':19,'height':21.56}]
        if asset.endswith('Infinite_Descent.svg'):frames=[{'id':i,'x':x,'y':59.4,'width':24,'height':18}for i,x in [('A',25),('B',52.5),('C',80)]]
        artwork={'asset':asset,'width':row['width'],'height':row['height'],'bounds':bounds,'traces':traces,'frames':frames}
    else:artwork,paths=raster(asset)
    results.append({'reference':entry['id'],'title':entry['title'],'author':entry['author'],'artwork':artwork,'paths':paths})
(DATA/'artwork-drafts.json').write_text(json.dumps(results,separators=(',',':')))
print([(r['title'],len(r['paths']),len(r['artwork']['traces']))for r in results])
