Array.prototype.dims = function(){
  if(this.length>0){
    if(this[0] instanceof Array){
      return this[0].dims()+1;
    }else{
      return 1;
    }
  }else{
    return 1;
  }
}
Array.prototype.min = function(){
  var ret=this[0];
  for(var i=1;i<this.length;i++){
    ret = ret<this[i]?ret:this[i];
  }
  return ret;
}
Array.prototype.max = function(){
  var ret=this[0];
  for(var i=1;i<this.length;i++){
    ret = ret>this[i]?ret:this[i];
  }
  return ret;
}
Array.prototype.argmax = function(){
  var ret=0;
  for(var i=1;i<this.length;i++){
    ret = this[ret]>this[i]?ret:i;
  }
  return ret;
}
Array.prototype.argmin = function(){
  var ret=0;
  for(var i=1;i<this.length;i++){
    ret = this[ret]<this[i]?ret:i;
  }
  return ret;
}
Array.prototype.sorti = function(){
  var a=this.clone();
  var i0=new Array(this.length);
  var i1=[];
  for(var i=0;i<a.length;i++) i0[i]=i;
  for(var i=0;i<this.length;i++){
    var am = a.argmax();
    i1.push(i0.splice(am,1)[0]);
    a.splice(am,1);
  }
  return i1;
}
Array.prototype.sum = function(){
  var ret = this[0];
  for(var i=1;i<this.length;i++){
    ret += this[i]
  }
  return ret;
}
Array.prototype.prod = function(){
  var ret = this[0];
  for(var i=1;i<this.length;i++){
    ret *= this[i]
  }
  return ret;
}
Array.prototype.mean = function(){
    return this.sum()/this.length;
}
Array.prototype.clone = function(){
  if(this.length==0){
    return [];
  }else{
    if( this[0].constructor == Array ) {
      var ar, n;
      ar = new Array( this.length );
      for ( n = 0; n < ar.length; n++ ) {
        ar[n] = this[n].clone();
      }
      return ar;
    }
    return [].concat(this);
  }
}
/* Value of multidimensional array
   with index array i[d]
   this function returns a[i[0]][i[1]][i[2]].  
   ex.
     [[1,2,3],[4,5,6],[7,8,9]].at([2,1])=8;
     [[1,2,3],[4,5,6],[7,8,9]].at([2])=[7,8,9];
*/
Array.prototype.at = function(i){
  var b = this;
  for(var d=0;d<i.length;d++) b = b[i[d]];
  return b;
}
/*
*/
Array.zeros = function(s){
  var f=function(s, d){
    var a = new Array(s[d]);
    if(d==s.length-1){
      for(var i=0;i<s[d];i++) a[i] = 0;
    }else{
      for(var i=0;i<s[d];i++) a[i] = f(s,d+1);
    }
    return a;
  };
  return f(s,0);
}
Array.prototype.toString = function(){
  var s="[";
  var i=0;
  for(i=0;i<this.length-1;i++){
    s+=this[i].toString()+", ";
  }
  if(this.length==0){
    s+="]";
  }else{
    s+=this[i].toString()+"]";
  }
  return s;
}
Array.prototype.isEqual = function(a){
  if(this.length!=a.length) return false;
  for(var i=0;i<this.length;i++){
    if(this[i] instanceof Array){
      if(!(a[i] instanceof Array)) return false;
      if(!this[i].isEqual(a[i])) return false;
    }else{
      if(this[i]!=a[i]) return false;
    }
  }
  return true;
}
/* -----------------------------------------
  push uniquely
  i = a.pushUniquely(e);
    if e is already member of a:
      push e into a if e is not member of a,
      and return the index of e in new a.
    else
      and return the index of e in a.
  usage:
      x=[2,3,4];
      i=x.pushUniquely(10);
      // x = [2,3,4,10];
      // i = 3;
      
      x=[2,3,4];
      i=x.pushUniquely(3);
      // x = [2,3,4];
      // i = 1;
-------------------------------------------- */
Array.prototype.pushUniquely = function(e){
  for(var i=0;i<this.length;i++){
    var ae = this[i];
    if(ae instanceof Array && e instanceof Array){
      if(ae.isEqual(e)) return i;
    }else{
      if(ae==e) return i;
    }
  }
  return this.push(e)-1;
}
Array.prototype.randomPop = function(){
  return this.splice(Math.floor(Math.random()*this.length),1)[0];
}
