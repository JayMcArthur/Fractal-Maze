//entry point--------------------
window.onload = function(){
  map=[
    [1,1,0],
    [0,0,1],
    [1,0,0],
  ];
  map=[
    [1,1,1,0,1],
    [0,0,1,1,0],
    [1,1,0,0,1],
    [0,0,1,1,1],
    [1,1,1,1,0],
  ];
  map=[
    [1,0,1,1],
    [0,1,0,1],
    [1,0,1,1],
    [1,1,0,0]
  ];
  unit            = map.length;
  drawdepth       = 3;
  usersolverdepth = 5;
//  usersolverdepth = 2;
  form0.unit.value        = unit;
  form0.drawdepth.value   = drawdepth;
  form0.usersolverdepth.value = usersolverdepth;
  initSolver(1);
  initDraw();
  initEvent(can);
  window.onresize();
  setInterval(procAll, 1000/framerate); //enter gameloop
}
//game loop ------------------
var framerate  =  3; //[fps]
var solverwait =  2; //[ms]
var trials     = 100;
var lasttimedraw = 0;
var drawelapse   = 0;
var solverelapse = 0;
var solverstarttime = 0;
var solvedelapse    = 0;
var procworking = false;
var procAll=function(){
  if(procworking) return;
  
  procEvent();
  procForm();
  if(!ispaused){
    var e = gettime();
    procSolver();
    solverelapse = gettime()-e;
    trials = [1000,[1,Math.floor(100/(solverelapse/trials))].max()].min();
  }
  if(gettime()-lasttimedraw > 1000/framerate){
    reqdraw = true;
  }
  if(reqdraw){
    var e = gettime();
    procDraw();
    lasttimedraw = gettime();
    drawelapse = lasttimedraw-e; // for debug
    reqdraw = false;
  }
  procworking = false;
}
var gettime = function(){
  return (new Date()).getTime();
}
//form events------------
var loadmap = function(){
}

var ispaused=false;
var onclickpause = function(){
  ispaused=!ispaused;
}
var isreset=true;
var onclickreset = function(){
  isreset = true;
}
var isunitchanged = false;
var onchangeunit = function(x){
  form0.unit.value = [parseInt(form0.unit.value)+x, 0].max();
  isunitchanged = true;
}
var isdrawdepthchanged = false;
var onchangedrawdepth = function(x){
  form0.drawdepth.value = [parseInt(form0.drawdepth.value)+x, 1].max();
  isdrawdepthchanged = true;
}
var isusersolverdepthchanged = false;
var onchangeusersolverdepth = function(x){
  form0.usersolverdepth.value = [parseInt(form0.usersolverdepth.value)+x, 1].max();
  isusersolverdepthchanged = true;
}
/* apply parameter change from form in game loop */
var procForm = function(){
  if(isreset){
    reqinitsolver = true;
    reqdraw = true;
    isreset = false;
  }
  if(isusersolverdepthchanged){
    usersolverdepth = parseInt(form0.usersolverdepth.value);
    reqinitsolver = true;
    reqdraw = true;
    isusersolverdepthchanged = false;
  }
  if(isdrawdepthchanged){
    drawdepth = parseInt(form0.drawdepth.value);
    reqdraw = true;
    isdrawdepthchanged = false;
  }
  if(isunitchanged){
    initMap(parseInt(form0.unit.value));
    reqdraw = true;
    reqinitsolver = true;
    isunitchanged = false;
  }
  switch(solverstt){
    case 0://solving
    form0.solverstt.value = "solving depth "+solver.depth+" for "+Math.floor((gettime()-solverstarttime)/1000)+" sec...";
    break;
    
    case 1:
    if(ispaused){
      form0.solverstt.value = "paused";
    }else{
      form0.solverstt.value = "solved depth "+solver.depth+" in "+Math.floor(solvedelapse/1000)+" sec.";
    }
    break;

    case 2://unsolved
      form0.solverstt.value = "unsolved depth "+solver.depth+" in "+Math.floor(solvedelapse/1000)+" sec.";
    break;
    
    default:
    form0.solverstt.value = "unknown status";
    break;
  }
}
//solver -----------------
var unit;
var drawdepth;
var usersolverdepth;
var direction; // 0=horizontal
var map=[
];
//initMap: make a empty map
var initMap=function(_unit){
  unit = _unit;
  map = new Array(unit);
  for(var y=0;y<unit;y++){
    map[y] = new Array(unit);
    for(var x=0;x<unit;x++){
      map[y][x]=0;
    }
  }
}
var solver;
var world;
var solverstt = 0; /* 0:unknown, 1:solved, 2:unsolved-end */
var reqinitsolver = 0;
//initSolver: renew solver instance for the depth depth
var initSolver = function(depth){
  world  = new World(unit, map);
  solver = new Solver(world, depth, usersolverdepth);
  solverstarttime = gettime();
  solverstt = 0;
}
var procSolver = function(){
  if(reqinitsolver){
    initSolver(1);
    reqinitsolver = 0;
  }

  switch(solverstt){
    case 0:
      for(var i=0;i<trials;i++){
        var result = solver.searchnext();
        switch(result){
          case 2:// unsolved
            if(solver.depth+1 <= usersolverdepth){
              var newdepth = solver.depth+1;
              initSolver(newdepth);
            }else{
              solverstt = 2; // finally unsolved
              solvedelapse = gettime()-solverstarttime;
            }
            break;
          case 1:// solved
            solverstt = 1;
            solvedelapse = gettime()-solverstarttime;
            break;
          default:
            break;
        }
      }
      break;
    default:
      break;
  }//switch stt
}
// debugout ------------------------
var isdebugout = false; // false for release
var debugout = function(str){
  if(isdebugout){
    console.log(str);
  }
}
var debug;
// graphics ------------------------
var ctx;
var can;
var margin = 10;
var maplen;
var reqdraw = true;
//init
var initDraw=function(){
  can = document.getElementById("outcanvas");
  ctx = can.getContext('2d');
}
//proc
var procDraw = function(){

  //background
  ctx.fillStyle  ="white";
  ctx.fillRect  (0,0,can.width, can.height);
  
  if(maplen <= 0) return;
  
  //pattern
  var childlen = maplen/unit;
  for(var x=0;x<unit;x++){
    for(var y=0;y<unit;y++){
      if(map[y][x]){
        ctx.strokeStyle="white";
        ctx.fillStyle  ="black";
        ctx.fillRect  (margin+x*childlen, margin+y*childlen, childlen, childlen);
        ctx.strokeRect(margin+x*childlen, margin+y*childlen, childlen, childlen);
      }else{
        ctx.strokeStyle="black";
        ctx.fillStyle  ="white";
        ctx.fillRect  (margin+x*childlen, margin+y*childlen, childlen, childlen);
        ctx.strokeRect(margin+x*childlen, margin+y*childlen, childlen, childlen);
      }
    }
  }
  
  var x;
  var y;
  if(direction){
    x=margin;
    y=margin+maplen+margin+margin;
  }else{
    x=margin+maplen+margin+margin;
    y=margin;
  }
  //draw fractal
  drawUnit(0, x, y, maplen);
  
  //draw alllist
  for(var i=0;i<solver.alllist.length;i++){
    var body = solver.alllist[i];
    var pos=body.pos;
    var depth=pos.length;
    if(depth>drawdepth) continue;
    var x1=x;
    var y1=y;
    var len=maplen;
    var isdraw = true;
    for(var d=0;d<depth;d++){
      if(d<zoompos.length){
        if(zoompos[d][0]==pos[d][0] && zoompos[d][1]==pos[d][1]){
        }else{
          isdraw = false;
          break;
        }
      }else{
        len=len/unit;
        x1 = x1+pos[d][0]*len;
        y1 = y1+pos[d][1]*len;
      }
    }
    if(isdraw){
      ctx.fillStyle="rgb(255,192,255)";
      ctx.fillRect(x1, y1, len, len);
    }
  }
  if(solverstt==1){
    //draw goalpath
    for(var i=solver.goalpath;i!=null;i=i.parent){
      var pos=i.pos;
      var depth=pos.length;
      if(depth>drawdepth) continue;
      var x1=x;
      var y1=y;
      var len=maplen;
      var isdraw = true;
      for(var d=0;d<depth;d++){
        if(d<zoompos.length){
          if(zoompos[d][0]==pos[d][0] && zoompos[d][1]==pos[d][1]){
          }else{
            isdraw = false;
            break;
          }
        }else{
          len=len/unit;
          x1 = x1+pos[d][0]*len;
          y1 = y1+pos[d][1]*len;
        }
      }
      if(isdraw){
        ctx.fillStyle="rgb(64,64,255)";
        ctx.fillRect(x1, y1, len, len);
      }
    }
  }else{
    //draw openlist
    for(var i=solver.openlist.top;i!=null;i=i.next){
      var pos=i.body.pos;
      var depth=pos.length;
      if(depth>drawdepth) continue;
      var x1=x;
      var y1=y;
      var len=maplen;
      var isdraw = true;
      for(var d=0;d<depth;d++){
        if(d<zoompos.length){
          if(zoompos[d][0]==pos[d][0] && zoompos[d][1]==pos[d][1]){
          }else{
            isdraw = false;
            break;
          }
        }else{
          len=len/unit;
          x1 = x1+pos[d][0]*len;
          y1 = y1+pos[d][1]*len;
        }
      }
      if(isdraw){
        ctx.fillStyle="rgb(255,0,255)";
        ctx.fillRect(x1, y1, len, len);
      }
    }
  }
}
var drawUnit = function(d, x0, y0, len){
  ctx.fillStyle  ="black";
  ctx.StrokeStyle="black";
  var childlen = len/unit;
  for(var x=0;x<unit;x++){
    for(var y=0;y<unit;y++){
      if(map[y][x]){
        if(d<drawdepth-zoompos.length-1){
          //draw inner recursively
          drawUnit(d+1, x0+x*childlen, y0+y*childlen, childlen);
        }else{
          ctx.fillRect  (x0+x*childlen, y0+y*childlen, childlen, childlen);
        }
      }
    }
  }
}
var zoompos=[];
var zoomin = function(x, y){
  zoompos.push([x,y]);
}
var zoomout = function(){
  zoompos.pop();
}
//GUI event---------------------
var lastpos=[-1,-1];
var downpos=[-1,-1];// start of drag
var movpos =[-1,-1];// while drag
var handleMouseDown = function(){
  var childlen = maplen/unit;
  var mx = Math.floor((mouseDownPos[0]-margin)/childlen);
  var my = Math.floor((mouseDownPos[1]-margin)/childlen);

  if(mx<unit&&my<unit&&mx>=0&&my>=0){
    map[my][mx]^=1;
    lastpos[0]=mx;
    lastpos[1]=my;
    reqdraw = true;
    reqinitsolver = true;
  }
  if(direction){//vertical
    mx = Math.floor((mousePos[0]-margin                     )/childlen);
    my = Math.floor((mousePos[1]-margin-maplen-margin-margin)/childlen);
  }else{//horizontal
    mx = Math.floor((mousePos[0]-margin-maplen-margin-margin)/childlen);
    my = Math.floor((mousePos[1]-margin                     )/childlen);
  }
  if(mx<unit&&my<unit&&mx>=0&&my>=0){
    if(mouseButton==0){
      zoomin(mx,my);
    }else{
      zoomout();
    }
  }
}
var handleMouseDragging = function(){
  var childlen = maplen/unit;
  var mx = Math.floor((mousePos[0]-margin)/childlen);
  var my = Math.floor((mousePos[1]-margin)/childlen);

  if(mx<unit&&my<unit&&mx>=0&&my>=0){
    if(!(lastpos[0]==mx && lastpos[1]==my)){
      map[my][mx]^=1;
      lastpos[0]=mx;
      lastpos[1]=my;
      reqdraw = true;
      reqinitsolver = true;
    }
  }
}
var handleMouseUp = function(){
}
var handleMouseWheel = function(){
}
window.onresize = function(){ //browser resize
  var agent = navigator.userAgent;
  var wx=document.documentElement.clientWidth;
  var wy=document.documentElement.clientHeight;
  var cx= [(wx- 10)*0.9, 20].max();
  var cy= [(wy-250)*0.99-140, 20].max();
  direction = wy>=wx;
  if(direction){ //vertical
    document.getElementById("outcanvas").width = [cx,cy/2].min();
    document.getElementById("outcanvas").height= cy;
    maplen = Math.floor([(can.width-margin*2)/1, (can.height-margin*4)/2].min());
  }else{ // horizontal
    document.getElementById("outcanvas").width = [cx,cy*2].min();
    document.getElementById("outcanvas").height= cy;
    maplen = Math.floor([(can.width-margin*4)/2, (can.height-margin*2)/1].min());
  }
  reqdraw = true;
};

