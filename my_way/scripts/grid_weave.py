"""Read a weave's lattice half-edges, preserving its two crossing layers."""
from collections import defaultdict
import numpy as np

DIRECTIONS = [(0,-1),(1,0),(0,1),(-1,0)]

def weave_graph(mask, bounds, step, holes):
    left,top,right,bottom = bounds
    vertices,neighbors,ports = {},defaultdict(set),{}
    def filled(x,y):
        return 0<=y<mask.shape[0] and 0<=x<mask.shape[1] and bool(mask[y,x])
    for y in range(top,bottom+1,step):
        for x in range(left,right+1,step):
            if any(a<=x<=a+w and b<=y<=b+h for a,b,w,h in holes):
                continue
            half = {i for i,(dx,dy) in enumerate(DIRECTIONS) if filled(x+dx*step//2,y+dy*step//2)}
            quarter = {i for i,(dx,dy) in enumerate(DIRECTIONS) if i in half and filled(x+dx*step//4,y+dy*step//4)}
            # At a weave crossing the unbroken quarter-edges meet above;
            # the remaining half-edges meet separately below that crossing.
            for layer,group in enumerate([quarter,half-quarter]):
                if not group:continue
                key=(x,y,layer);vertices[key]=[float(x),float(y)]
                for direction in group:ports[x,y,direction]=key
    for (x,y,direction),vertex in ports.items():
        dx,dy=DIRECTIONS[direction]
        other=ports.get((x+dx*step,y+dy*step,(direction+2)%4))
        if other is not None:
            neighbors[vertex].add(other);neighbors[other].add(vertex)
    components=[];owner={}
    for vertex in vertices:
        if vertex in owner:continue
        index=len(components);queue=[vertex];owner[vertex]=index
        for current in queue:
            for other in neighbors[current]:
                if other not in owner:owner[other]=index;queue.append(other)
        if not any(neighbors[key]for key in queue):continue
        components.append(queue)
    # Drop isolated half-edge artifacts without assigning them a path.
    owner={key:i for i,component in enumerate(components)for key in component}
    traces=[[]for _ in components];visited=set()
    for i,component in enumerate(components):
        ordered=sorted(component,key=lambda key:len(neighbors[key])==2)
        for start in ordered:
            for next_ in sorted(neighbors[start]):
                if frozenset((start,next_))in visited:continue
                path=[start];previous,current=start,next_
                while True:
                    visited.add(frozenset((previous,current)));path.append(current)
                    if len(neighbors[current])!=2:break
                    options=[key for key in neighbors[current]if key!=previous and frozenset((current,key))not in visited]
                    if not options:break
                    previous,current=current,options[0]
                traces[i].append([vertices[key]for key in path])
    return components,owner,traces,ports,vertices


def weave_pins(rect, nx, ny, pitch):
    x, y, width, height = rect
    return ([(x+pitch*i, y, 2) for i in range(1, nx+1)]
            + [(x+width, y+pitch*i, 3) for i in range(1, ny+1)]
            + [(x+pitch*i, y+height, 0) for i in range(nx, 0, -1)]
            + [(x, y+pitch*i, 1) for i in range(ny, 0, -1)])
