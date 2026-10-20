var log10 = function(x){
  return Math.LOG10E + Math.log(x);
}
var log2 = function(x){
  return Math.LOG2E + Math.log(x);
}
var ln = function(x){
  return Math.log(x);
}
var sqrt1p2=function(){
  return 0.7071067811865475;
}
var chisqr_1_0p05 = function(){
  -3.841
}
var factorial=function(n){
  return [1,1,2,6,24,120,720,5040,40320,362880,3628800,39916800,479001600,6227020800,87178291200,1307674368000,20922789888000,355687428096000,6402373705728000,121645100408832000,2432902008176640000][n];
}
var perm2hash=function(a0){
  var a = a0.clone();
  var base = a.length;
  var h = 0;
  for(var i=0;i<a.length;i++){
    h += a[i]*factorial(--base);
    for(var j=i+1;j<a.length;j++){
      if(a[j]>a[i])a[j]--;
    }
  }
  return h;
};
var hash2perm=function(h0,n0){
  var h=h0;
  var n=n0-1;
  var a=new Array(n0);
  for (i=0;i<n0;i++){
    a[i] = Math.floor(h/factorial(n));
    h   -= factorial(n)*a[i];
    n--;
  }
  for(i=n0-2;i>=0;i--){
    for (j=i+1;j<n0;j++){
      if(a[i]<=a[j])a[j]++;
    }
  }
  return a;
};
//xorshift random object
var XorShift=function(s){
  if(s==undefined) s=(new Date()).getTime();
  this.x=123456789;
  this.y=362436069;
  this.z=521288629;
  this.seed=s;
  this.w=this.seed;
  for(var i=0;i<1000;i++) this.getNext(); // because randomness is very poor
};
// random float value 0.0<=x<+1.0
XorShift.prototype.getNext = function() {
  var t = this.x ^ (this.x << 11);
  this.x = this.y;
  this.y = this.z;
  this.z = this.w;
  this.w = (this.w^(this.w>>>19))^(t^(t>>>8));
  return this.w/(1<<31)/2+1/2;
};
//test randomness
XorShift.test = function(seed){
  var str="";
  var xs=new this(seed);
  var sumx=0;
  var maxx=-Infinity;
  var minx=+Infinity;
  var N=100000;
  for(var i=0;i<N;i++){
    var x=this.getNext();
    sumx+=x;
    if(x>maxx)maxx=x;
    if(x<minx)minx=x;
  }
  str+="avg="+sumx/N+0.5;
  str+=" max="+maxx;
  str+=" min="+minx;
  return str;
}
/* solve ax^2+bx+c=0.
 * retval = [x0,x1]
 * x0=-b+sqrt(b^2-4ac)/2a
 * x1=-b-sqrt(b^2-4ac)/2a
 * retval = [] if there is no solution.
 * */
var solvequad = function(a,b,c){
  if(a==0){
    /* bx+c=0 x=-c/b */
    return -c/b;
  }else{
    var sqrt=b*b-4*a*c;
    sqrt=Math.sqrt(sqrt);
    if(sqrt<0) return [];
    var inv2a=0.5/a;
    return [(-b+sqrt)*inv2a,(-b-sqrt)*inv2a];
  }
}

