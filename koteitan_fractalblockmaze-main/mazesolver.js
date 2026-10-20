var World = function(unit, map){
  this.unit  = unit;
  this.map   = map.clone();
}
var Node=function(pos, parent){
  this.pos    = pos.clone();
  this.parent = parent;
  this.cost   = 0;
}
Node.prototype.toString=function(){
  return "<"+this.pos.toString()+","+this.cost+">";
}
var List=function(body, next){
  this.body  = body;
  this.next  = next;
}
var Solver = function(world, depth){
  this.depth = depth;
  this.world = world;
  this.alllist  = [];
  this.openlist = function(){};
  this.openlist.top   = null;
  this.goalpath = null;
  //initialize openlist
  var unit=world.unit;
  var map=world.map;
  rectry(this, [], null, +1/* y */, -1 /* enter from bottom side */);
}
Solver.prototype.addopenlist=function(body){
  //check alllist
  if(this.ismemberalllist(body)){ //is member of alllist
    return; // nop and return
  }
//  console.log("try add "+body.toString());
  //add into alllist
  this.addalllist(body);
//  debugout("success to add:"+body.pos.toString());
  
  if(this.openlist.top==null){ // first add
    var item = new List(body, null);
    this.openlist.top = item;
  }else{ // after second
    var cost=body.cost;
    var parent = null;
    var isadded = false;
    for(var i=this.openlist.top;i!=null;i=i.next){
      if(cost <= i.body.cost){
        if(i==this.openlist.top){//i==top
          var item = new List(body, i);
          this.openlist.top = item;
          isadded = true;
          break;
        }else{
          var item = new List(body, i);
          parent.next = item;
          isadded = true;
          break;
        }
      }
      parent = i;
    }//for i
    if(!isadded){// highest cost
      var item = new List(body, null);
      parent.next = item;
    }
  }
//  console.log("openlist after = "+this.printopenlist());
}
Solver.prototype.delopenlist = function(node){
  var parent = null;
  if(this.openlist.top==null) return;
  for(var i=this.openlist.top;i!=null;i=i.next){
    if(i.body==node){
      if(parent==null){
        this.openlist.top = i.next;
      }else{
        parent.next = i.next;
      }
      return;
    }
    parent = i;
  }
}
Solver.prototype.printopenlist = function(){
  if(this.openlist.top==null) return;
  for(var i=this.openlist.top;i!=null;i=i.next){
    debugout("pos="+i.body.pos.toString()+", cost="+i.body.cost);
  }
}

var movelist=[//movelist[dim][amount]
  [0,-1],//-x
  [0,+1],//+x
  [1,-1],//-y
  [1,+1],//+y
];

/* ret=searchnext()
 * ret = judge ={0:unknown yet, 1:found, 2:unsolved}
 * */
Solver.prototype.searchnext=function(){
  if(this.openlist.top==null) return 2; //unsolved
  var world = this.world;
  var map   = world.map;
  var unit  = world.unit;

  var parent = this.openlist.top.body; //parent = lowest cost
  var pos   = parent.pos;
  var depth = pos.length;
  var pos1;
//  debugout(this.printopenlist());
//  debugout("top pos="+pos.toString());
  if(pos.isEqual([[1,2],[0,3] ])){
    var x=1;
  }
  //try all 4 directions
  for(dir=0;dir<4;dir++){
    pos1 = pos.clone();
    //try moving in movamt in a dimension movdim
    var movdim=movelist[dir][0];
    var movamt=movelist[dir][1];
    
    //carrying loop -> pos1 (catch over=true)
    var over=true;
    for(d=depth-1;d>=0;d--){
      pos1[d][movdim]+=movamt;
//      debugout("try pos1 "+pos1.toString());
      
      //check outside -> over
      if(pos1[d][movdim]<0 || pos1[d][movdim]>=unit){// outside
        pos1[d][movdim]=(pos1[d][movdim]+unit)%unit;
      }else{
        over=false;
        break;//rewind is not needed
      }
      //try next depth
    }
    
    if(!over){//not over
      
      //enlarge pos1 if possible -> pos1 updated, isempty
      var isempty=false;
      for(d=0;d<pos1.length;d++){
        if(map[pos1[d][1]][pos1[d][0]]==0){//empty in depth d
          isempty=true;
          pos1.splice(d+1);//delete over depth d
          break;
        }
      }
      
      if(isempty){// pos1 is empty
        //add it as it is
        var node1 = new Node(pos1, parent);
        node1.cost = this.evalcost(parent.cost, node1);
        this.addopenlist(node1);
      }else{
        //try enter pos1
        rectry(this, pos1, parent, movdim, movamt);
      }
      
    }else{//over
      if(movdim==1 && movamt==-1 && pos[pos.length-1][1]==0){
        this.goalpath = parent;
        return 1; // goal
      }
    }//if over
  }//for dir

  // remove parent from openlist
  this.delopenlist(parent);
  
  return 0; //return unknown
}

/* recursively try enter pos1 by the direction (movdim, movamt). */
rectry = function(solver, pos1, parent, movdim, movamt){
  if(pos1.length >= solver.depth) return;

  var pcost = (parent!=null)?parent.cost:0;
  
  if(movdim==0){//x
    
    for(var y=0;y<unit;y++){
      var x=(movamt==-1)?unit-1:0;
      var pos2 = pos1.clone();
      pos2.push([x,y]);
      if(map[y][x]==0){ // pos2 is empty
        // empty
        var node2 = new Node(pos2, parent);
        node2.cost = solver.evalcost(pcost, node2);
        solver.addopenlist(node2);
      }else{//not empty
        //try enter pos2 recursively
        rectry(solver, pos2, parent, movdim, movamt);
      }
    }//for y
    
  }else{//y
    
    for(var x=0;x<unit;x++){
      var y=(movamt==-1)?unit-1:0;
      var pos2 = pos1.clone();
      pos2.push([x,y]);
      if(map[y][x]==0){ // is empty
        var node2 = new Node(pos2, parent);
        node2.cost = solver.evalcost(pcost, node2);
        solver.addopenlist(node2);
      }else{ //not empty
        //try enter pos2 recursively
        rectry(solver, pos2, parent, movdim, movamt);
      }
    }//for x
    
  }//if movdim==0
}


Solver.prototype.evalcost = function(pcost, node){
  return node.pos.length;
  /*
  var d = node.pos.length;
  return d + node.pos[d-1][1]/d;
  */
  var pos   = node.pos;
  var depth = pos.length;
  var unit = this.world.unit;

  var cind = 1/4;
  var cost = 0;
  for(var d=0;d<depth;d++){
    cost += pos[d][1]*cind;
    cind /= unit;
  }
  return cost;
}
Solver.prototype.addalllist = function(node){
  this.alllist.push(node);
}
Solver.prototype.ismemberalllist = function(node){
  var len=this.alllist.length;
  var alllist=this.alllist;
  for(var i=0;i<len;i++){
    if(alllist[i].pos.isEqual(node.pos)) return true;
  }
  return false;
}
Solver.prototype.printalllist=function(){
  var str="";
  for(var i=0;i<this.alllist.length;i++) str += this.alllist[i].toString();
  return str;
}
Solver.prototype.printopenlist=function(){
  var str="";
  for(var i=this.openlist.top;i!=null;i=i.next) str += i.body.toString(); 
  for(var i=this.openlist.top;i!=null;i=i.next) console.log(i.body.toString()); 
  return str;
}
