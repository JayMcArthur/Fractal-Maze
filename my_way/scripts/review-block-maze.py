"""Check Block Maze's native move correspondence and finite nonreachability certificate.

Requires Vite on port 5174 and Python Playwright. The checked relation is closed
under identity, walk, concatenation and matching copy entry/exit, but excludes
the surface trophy. No infinite-hop rule or source endpoint change is assumed.
"""
import asyncio,json,os
from datetime import datetime,timezone
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'));page=await b.new_page();await page.goto('http://127.0.0.1:5174/Fractal-Maze/library')
  r=await page.evaluate('''async()=>{
   const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
   const {squarePlayPDA}=await import('/Fractal-Maze/src/app/library/playPDA.ts');
   const {advanceSquarePDA}=await import('/Fractal-Maze/src/core/play/squarePDA.ts');
   const {resolveMove}=await import('/Fractal-Maze/src/core/solver/common/movementResolver.ts');
   const {balancedPathSearch}=await import('/Fractal-Maze/src/core/pathMaze/balancedSearch.ts');
   const doc=loadCatalogMaze('block-maze'),def=doc.definition,binding=squarePlayPDA(doc),m=binding.model;
   if(def.links.some(l=>l.blockPath.length!==1))throw new Error('Review assumes single-copy links');
   let movementChecks=0;const failures=[];
   const stacks=[['0'],...def.blocks.map(b=>['0',b.name])];
   for(const stack of stacks)for(let row=0;row<def.grid.rows;row++)for(let col=0;col<def.grid.cols;col++)for(const direction of [1,2,4,8]){
    const move=resolveMove(def,{row,col,blockStack:stack},direction,0);
    if(!move)continue;
    movementChecks++;
    try{advanceSquarePDA(binding,move.action);}catch(e){failures.push({stack,row,col,direction,message:e.message});}
   }
   const ids=m.paths.map(p=>p.id),index=new Map(ids.map((id,i)=>[id,i])),n=ids.length;
   const R=ids.map((_,i)=>ids.map((_,j)=>i===j));
   const add=(a,b)=>{const i=index.get(a),j=index.get(b);if(R[i][j])return false;R[i][j]=true;return true;};
   for(const e of m.connections)if(e.operation==='walk')add(e.from,e.to);
   let changed=true;
   while(changed){
    changed=false;
    for(const a of m.connections.filter(e=>e.operation==='enter'))for(const z of m.connections.filter(e=>e.operation==='exit'))
     if(a.copy===z.copy&&R[index.get(a.to)][index.get(z.from)])changed=add(a.from,z.to)||changed;
    for(let k=0;k<n;k++)for(let i=0;i<n;i++)if(R[i][k])for(let j=0;j<n;j++)if(R[k][j])changed=add(ids[i],ids[j])||changed;
   }
   let closed=true;
   for(let i=0;i<n;i++)for(let k=0;k<n;k++)for(let j=0;j<n;j++)if(R[i][k]&&R[k][j]&&!R[i][j])closed=false;
   for(const a of m.connections.filter(e=>e.operation==='enter'))for(const z of m.connections.filter(e=>e.operation==='exit'))
    if(a.copy===z.copy&&R[index.get(a.to)][index.get(z.from)]&&!R[index.get(a.from)][index.get(z.to)])closed=false;
   const excluded=!R[index.get(m.start.path)][index.get(m.goal.path)];
   return {start:m.start,goal:m.goal,states:n,connections:m.connections.length,copies:m.copies,sourceTrophy:def.trophies,
    singleCopyLinks:true,contexts:stacks.length,movementChecks,failures,closedRelation:closed,goalExcluded:excluded,balancedWitness:balancedPathSearch(m),
    relation:Object.fromEntries(ids.map((id,i)=>[id,ids.filter((_,j)=>R[i][j])])),componentCells:Object.fromEntries(binding.cells)};
  }''')
  await b.close()
 report=dict(executedAt=datetime.now(timezone.utc).isoformat(),**r,scope='Current Block Maze finite-only corridor rules. Native legal moves in root and every child-copy context checked against the PDA; closed balanced relation excludes the surface trophy. Does not assert any additional infinite-hop rule or author intent.')
 Path('docs/BLOCK_MAZE_SOURCE_REVIEW.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k not in ['relation','componentCells']}))
if __name__ == '__main__':
 asyncio.run(main())
