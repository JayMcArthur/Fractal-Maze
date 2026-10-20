"""Extract native Wolf paths and prepare checked physical PDA recordings."""
AUDIT = r"""async solutions => {
  const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {default:collection}=await import('/Fractal-Maze/src/data/mazes/geometric-collection.json');
  const doc=loadCatalogMaze('draft-maze-images-mark-j-p-wolf-wolfram-2-jpg'),model=doc.definition;
  const nodes=[...new Set(Object.values(maze.nodes))], parent=new Map(nodes.map(node=>[node,node]));
  const find=node=>{while(parent.get(node)!==node)node=parent.get(node);return node;};
  const active=new Set();
  for(const path of [...maze.paths,...maze.specialpaths]){
    active.add(path.start);active.add(path.end);
    parent.set(find(path.end),find(path.start));
  }
  const groups=new Map();
  for(const node of active){const root=find(node);if(!groups.has(root))groups.set(root,{nodes:[],pins:[]});groups.get(root).nodes.push([node.x,node.y]);}
  const clockwise=['N1','N2','N3','N4','E1','E2','E3','E4','S4','S3','S2','S1','W4','W3','W2','W1'];
  for(const copy of ['_','A','B','C'])for(let index=0;index<clockwise.length;index++){
    const node=maze.getNode((copy==='_'?'':copy)+clockwise[index]),group=groups.get(find(node));
    if(group)group.pins.push(`${copy}:${index}`);
  }
  groups.get(find(maze.start)).pins.push('s');groups.get(find(maze.nodes[-2])).pins.push('f');
  const native=collection.find(maze=>maze.uid==='1611104942261:0.9591263235662271');
  const expected=new Map(native.paths.map((path,index)=>[String(index),new Set(path.gates.map(pin=>pin.startsWith('s:')?'s':pin.startsWith('f:')?'f':pin))]));
  for(const edge of model.connections)if(edge.operation==='enter'){
    const index=Number(edge.id.split('-')[1]);
    if(!expected.get(edge.from).has(`${edge.copy}:${index}`)||!expected.get(edge.to).has(`_:${index}`))
      throw Error('Photo PDA changed its native copy partition');
  }
  const signature=pins=>[...pins].sort().join(',');
  const ids=new Map([...expected].map(([id,pins])=>[signature(pins),id]));
  const missing=[],circuits=[];
  const nodePath=new Map();
  for(const [root,group] of groups){
    const id=ids.get(signature(group.pins));
    if(id===undefined)missing.push(group.pins);
    else{circuits.push({id,pins:group.pins.sort(),nodes:group.nodes});nodePath.set(root,id);}
  }
  const actual=new Set([...groups.values()].map(group=>signature(group.pins)));
  const unmatched=[...expected].filter(([,pins])=>!actual.has(signature(pins))).map(([id,pins])=>({id,pins:[...pins]}));
  if(missing.length||unmatched.length)return {matched:false,circuits,missing,unmatched};
  const point=node=>[node.x,node.y],address=()=>{
    const copies=[];for(let level=maze.traversing;level.up;level=level.up)copies.unshift(level.box);return copies;
  };
  const state=(node,copies=address())=>({path:nodePath.get(find(node)),address:copies});
  const original={enter:maze.enter,exit:maze.exit,traverse:maze.traverse};
  let observed;
  const boundaryChecks=[],unboundPorts=[];
  maze.enter=(copy,node)=>{observed={operation:'enter',copy,node};};
  maze.exit=loc=>{observed={operation:'exit',loc};};
  maze.traverse=()=>{throw Error('Expected a boundary callback, found a wire walk');};
  const side={N:'north',S:'south',W:'west',E:'east'},opposite={north:'south',south:'north',west:'east',east:'west'};
  for(const edge of model.connections){
    const [copy,index,operation]=edge.id.split('-'),pin=clockwise[Number(index)];
    const outside=maze.getNode(copy+pin),inside=maze.getNode(pin),node=operation==='enter'?outside:inside;
    observed=null;
    node[operation==='enter'?opposite[side[pin[0]]]:side[pin[0]]]();
    if(observed?.operation!==operation||
      (operation==='enter'&&(observed.copy!==copy||observed.node!==inside))||
      (operation==='exit'&&(observed.loc[0]!==inside.x||observed.loc[1]!==inside.y))||
      nodePath.get(find(node))!==edge.from||nodePath.get(find(operation==='enter'?inside:outside))!==edge.to)
      throw Error('Native boundary callback differs from PDA: '+edge.id);
    boundaryChecks.push(edge.id);
  }
  for(const copy of ['A','B','C'])for(let index=0;index<clockwise.length;index++){
    const node=maze.getNode(copy+clockwise[index]);
    if(groups.has(find(node)))continue;
    const commands=['north','south','west','east'].filter(direction=>typeof node[direction]==='function');
    if(commands.length!==1||model.connections.some(edge=>edge.id===`${copy}-${index}-exit`))
      throw Error('An unbound port has a continuing wire or a declared crossing');
    unboundPorts.push({copy,index,point:[node.x,node.y],onlyReturn:commands[0]});
  }
  Object.assign(maze,original);
  let surfaceBoundaryGuards=0;
  for(const pin of clockwise){
    maze.reset();const node=maze.getNode(pin);maze.node=node;maze.player=point(node);
    maze.exit(point(node),0);
    if(maze.node!==node||maze.traversing.up)throw Error('Native surface exit changed position');
    surfaceBoundaryGuards++;
  }
  let actions=[];
  const crossing=(operation,copy,node)=>{
    const from=state(maze.node),to=state(node,operation==='enter'?[...from.address,copy]:from.address.slice(0,-1));
    const index=clockwise.findIndex(pin=>maze.getNode((operation==='enter'?copy:'')+pin)===maze.node);
    const edge=model.connections.find(edge=>edge.id===`${copy}-${index}-${operation}`);
    if(!edge||edge.from!==from.path||edge.to!==to.path)throw Error('Unmatched native crossing '+JSON.stringify({operation,copy,index,from,to}));
    actions.push({kind:'cross',edge:edge.id,from,to,departure:point(maze.node),arrival:point(node)});
  };
  maze.enter=function(copy,node,dir){crossing('enter',copy,node);return original.enter.call(this,copy,node,dir);};
  maze.exit=function(loc,dir){
    if(this.traversing.up){const copy=this.traversing.box,[x,y]=this.offset(copy);
      crossing('exit',copy,this.nodes[(loc[0]/5+x)+(loc[1]/5+y)*25]);}
    return original.exit.call(this,loc,dir);
  };
  maze.traverse=function(path,dir,reverse){
    if(!(this.traversing.up&&this.specialpaths.includes(path))){
      const target=reverse?path.start:path.end,from=state(maze.node),to=state(target);
      if(from.path!==to.path)throw Error('Native walk changed its connected circuit');
      actions.push({kind:'walk',from,to,points:reverse?[...path.path].reverse():path.path});
    }
    return original.traverse.call(this,path,dir,reverse);
  };
  delete maze.nodes[-2].north;
  const directions={n:'north',s:'south',e:'east',w:'west'},replays=[];
  for(const solution of solutions){
    maze.reset();maze.animate=false;actions=[];
    for(const direction of solution.directions)maze.move(directions[direction]);
    const finish=state(maze.node),finished=maze.node===maze.nodes[-2]&&!maze.traversing.up;
    if(!finished||JSON.stringify(finish)!==JSON.stringify(model.goal))throw Error('Native solution failed '+solution.id);
    replays.push({id:solution.id,title:solution.title,keys:solution.directions.length,actions,
      maxDepth:Math.max(...actions.map(action=>action.to.address.length)),finish});
  }
  Object.assign(maze,original);
  const crossed=replays.flatMap(replay=>replay.actions.filter(action=>action.kind==='cross'));
  return {matched:true,states:circuits.length,pdaStates:model.paths.length,declaredCrossings:model.connections.length,
    boundaryChecks,surfaceBoundaryGuards,unboundPorts,
    checkedReplayCrossings:crossed.length,distinctReplayCrossings:new Set(crossed.map(action=>action.edge)).size,circuits,
    paths:[...maze.paths,...maze.specialpaths].map(path=>({path:nodePath.get(find(path.start)),points:path.path})),
    frames:['A','B','C'].map(id=>{const [x,y]=maze.offset(id);return{id,x,y,width:5,height:5};}),
    start:point(maze.start),goal:point(maze.nodes[-2]),replays};
}"""

PROJECT = r"""async audit => {
  const {loadCatalogMaze}=await import('/Fractal-Maze/src/app/library/catalog.ts');
  const {initialPathSession,walkPathSession,crossPathSession,sessionPathRoute,pathSessionFinished}=await import('/Fractal-Maze/src/core/play/pathSession.ts');
  const {projectPathSession}=await import('/Fractal-Maze/src/core/play/pathLayout.ts');
  const {createBlockArtwork}=await import('/Fractal-Maze/src/core/play/blockArtwork.ts');
  const {sameState}=await import('/Fractal-Maze/src/core/pathMaze/traversal.ts');
  const {buildNativeReplay}=await import('/Fractal-Maze/src/core/replay/nativeReplay.ts');
  const {importReplay}=await import('/Fractal-Maze/src/core/replay/importReplay.ts');
  const {wirePlayDocument}=await import('/Fractal-Maze/src/app/library/wirePlayDocument.ts');
  const doc=wirePlayDocument(loadCatalogMaze('wolf-wire-original')),model=doc.definition;
  const clockwise=[[1,0],[2,0],[3,0],[4,0],[5,1],[5,2],[5,3],[5,4],[4,5],[3,5],[2,5],[1,5],[0,4],[0,3],[0,2],[0,1]];
  const artwork={asset:'',width:25,height:25,bounds:[0,0,25,25],frames:audit.frames,
    traces:audit.paths.map((trace,index)=>({id:'native-'+index,path:trace.path,color:model.paths.find(path=>path.id===trace.path).color,points:trace.points})),
    start:audit.start,goal:audit.goal,gates:model.connections.map(edge=>{
      const [copy,index]=edge.id.split('-'),[x,y]=clockwise[Number(index)],frame=audit.frames.find(frame=>frame.id===copy);
      const outside=[frame.x+x,frame.y+y],inside=[x*5,y*5];
      return {edge:edge.id,from:edge.operation==='enter'?outside:inside,to:edge.operation==='enter'?inside:outside};
    })};
  const rows=[];
  for(const replay of audit.replays){
    try{
      let session=initialPathSession(model,artwork);
      for(const action of replay.actions){
        if(!sameState(session.positions.at(-1).state,action.from))throw Error('Source action has a different starting state');
        session=action.kind==='walk'?walkPathSession(session,action.points):crossPathSession(session,model,artwork,action.edge);
        if(!sameState(session.positions.at(-1).state,action.to))throw Error('Source action has a different destination');
      }
      let imports=0,payload;
      for(const target of [doc.artwork,createBlockArtwork(doc.artwork,model)]){
        const projected=projectPathSession(session,artwork,target,model);
        if(!pathSessionFinished(model,target,projected.positions.at(-1)))throw Error('Projection did not reach the drawn finish');
        const snapshot=buildNativeReplay(doc,{type:model.type,...sessionPathRoute(projected),physical:projected},'solver',true);
        snapshot.playArtwork=target;
        const checked=importReplay(JSON.stringify(snapshot));
        if(target!==doc.artwork)payload=JSON.stringify(checked);
        imports++;
      }
      rows.push({id:replay.id,title:replay.title,sourceMoves:session.moves.length,imports,passed:true,payload});
    }catch(error){rows.push({id:replay.id,passed:false,error:String(error)});}
  }
  return rows;
}"""

