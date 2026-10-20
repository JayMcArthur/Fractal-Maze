"""Extract circuit strokes by their source RGB, retaining bridge breaks between colors."""
from collections import Counter
import math
import cv2
import numpy as np
from scipy import ndimage
from skimage.morphology import skeletonize


def components(rgb,frames):
 work=rgb.copy()
 for frame in frames:
  x,y,w,h=map(round,frame);work[y:y+h,x:x+w]=255
 palette=[color for color,n in Counter(map(tuple,work.reshape(-1,3))).most_common() if n>=500 and max(color)-min(color)>20]
 output=[]
 for color in palette:
  mask=np.all(work==color,axis=2)
  for axis in [0,1]:
   oriented=mask if axis==0 else mask.T
   source=work if axis==0 else work.transpose(1,0,2)
   for row,line in enumerate(oriented):
    labels,n=ndimage.label(line)
    runs=[sl[0] for sl in ndimage.find_objects(labels)]
    for left,right in zip(runs,runs[1:]):
     gap=right.start-left.stop
     if 0<gap<=8 and left.stop-left.start>=3 and right.stop-right.start>=3 and np.all(np.ptp(source[row,left.stop:right.start].astype(int),axis=1)>20):
      line[left.stop:right.start]=True
  skel=skeletonize(mask)
  labels,n=ndimage.label(skel,np.ones((3,3)))
  for i in range(1,n+1):
   pixel=np.argwhere(labels==i)
   if len(pixel)<12:continue
   output.append({'color':'#%02x%02x%02x'%color,'pixels':pixel,'traces':chains(pixel)})
 return output


def chains(pixel):
 points={tuple(p) for p in pixel};neighbors={p:[(p[0]+dy,p[1]+dx) for dy in [-1,0,1] for dx in [-1,0,1] if (dy or dx) and (p[0]+dy,p[1]+dx) in points] for p in points}
 visited=set();out=[]
 def edge(a,b):return tuple(sorted((a,b)))
 for start in sorted(points,key=lambda p:len(neighbors[p])==2):
  for nxt in neighbors[start]:
   if edge(start,nxt) in visited:continue
   path=[start];last=start;current=nxt
   while True:
    visited.add(edge(last,current));path.append(current)
    if len(neighbors[current])!=2:break
    candidates=[p for p in neighbors[current] if p!=last and edge(current,p) not in visited]
    if not candidates:break
    last,current=current,candidates[0]
   if len(path)>1:
    xy=np.array([[x,y]for y,x in path],np.float32)
    simplified=cv2.approxPolyDP(xy.reshape(-1,1,2),.4,False).reshape(-1,2).tolist()
    if len(simplified)>=2:out.append(simplified)
 return out


def nearest(component,point):
 pixel=component['pixels'];i=np.argmin(np.sum((pixel-np.array([point[1],point[0]]))**2,axis=1));y,x=pixel[i]
 return [float(x),float(y)],float(np.linalg.norm(pixel[i]-[point[1],point[0]]))


def ports(rgb,rect,inset):
 x,y,w,h=map(round,rect);black=(rgb.max(2)<50)|((rgb[:,:,0]>200)&(rgb[:,:,1]>120)&(rgb[:,:,2]<100));result=[]
 lines=[(black[y+inset,x+inset:x+w-inset],x+inset,y),(black[y+inset:y+h-inset,x+w-1-inset],x+w-1,y+inset),(black[y+h-1-inset,x+inset:x+w-inset][::-1],x+w-1-inset,y+h-1),(black[y+inset:y+h-inset,x+inset][::-1],x,y+h-1-inset)]
 for side,(line,a,b) in enumerate(lines):
  labels,n=ndimage.label(line)
  for sl in ndimage.find_objects(labels):
   length=sl[0].stop-sl[0].start
   if length<2:continue
   mid=(sl[0].start+sl[0].stop-1)/2
   result.append([a+mid,b] if side==0 else [a,b+mid] if side==1 else [a-mid,b] if side==2 else [a,b-mid])
 return result
