//=========================================
// matrix
//=========================================
/* require tag below:
  <script type="text/javascript" src="./matrix.js"></script>
*/
var transpose = function(a){
  if(!(a instanceof Array) || a.length==0){
    // not array
    return a;
  }else{
    // array
    if(!(a[0] instanceof Array)){
      //row vector
      return [a]; //-->column vector
    }else{
      //matrix
      var b=new Array(a[0].length);
      for(i=0;i<b.length;i++){
        b[i]=new Array(a.length);
        for(j=0;j<b[0].length;j++){
          b[i][j]=a[j][i];
        }
      }//for
      return b;
    }
  }
}
var det = function(a){
  return a[0][0]*a[1][1]-a[0][1]*a[1][0];
}
var inv = function(a){
  if(a.length==2){
    var det = det(a);
    if(det==0) return [[NaN,NaN],[NaN,NaN] ];
    var invdet = 1/det;
    return [
      [ a[1][1]*invdet,-a[0][1]*invdet],
      [-a[1][0]*invdet, a[0][0]*invdet],
    ];
  }else if(a.length==3){
    var invdet = 1/(
      +a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])
      -a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])
      +a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0])
    );
    return [
      [invdet*(a[1][1]*a[2][2]-a[1][2]*a[2][1]), invdet*(a[0][2]*a[2][1]-a[0][1]*a[2][2]), invdet*(a[0][1]*a[1][2]-a[0][2]*a[1][1])],
      [invdet*(a[1][2]*a[2][0]-a[1][0]*a[2][2]), invdet*(a[0][0]*a[2][2]-a[0][2]*a[2][0]), invdet*(a[0][2]*a[1][0]-a[0][0]*a[1][2])],
      [invdet*(a[1][0]*a[2][1]-a[1][1]*a[2][0]), invdet*(a[0][1]*a[2][0]-a[0][0]*a[2][1]), invdet*(a[0][0]*a[1][1]-a[0][1]*a[1][0])]
    ];
  }else{
    return NaN;
  }
};
var mul = function(a0, a1){
  if(a0 instanceof Array){
    //a0[]?
    if(a0[0] instanceof Array){
      //a0[][]a1?
      if(a1 instanceof Array){
        //a0[][]a1[]?
        if(a1[0] instanceof Array){
        //a0[][]a1[][]
          return mulxx(a0, a1);
        }else{
        //a0[][]a1[]
          return mulxv(a0, a1);
        }
      }else{
        //a0[][]a1
        return mulkx(a1,a0);
      }
    }else{
      //a0[]a1?
      if(a1 instanceof Array){
        //a0[]a1[]?
        if(a1 instanceof Array){
          //a0[]a1[][]
          return mulxx([a0],a1)[0];
        }else{
          //a0[]a1[]
          return dot(a0,a1);
        }
      }else{
        //a0[]a1
        return mulk(a1,a0);
      }
    }
  }else{
    //a0a1?
    if(a1 instanceof Array){
      //a0a1[]?
      if(a1[0] instanceof Array){
        //a0a1[][]
        return mulkx(a0,a1);
      }else{
        //a0a1[]
        return mulkv(a0,a1);
      }
    }else{
      //a0a1
      return a0*a1;
    }
  }
};
/* ３次元ベクトルのドット積 a・b */
var dot=function(a, b){
  var c = 0;
  for(var i=0;i<a.length;i++){
    c += a[i]*b[i];
  }
  return c;
};

// kv[]
var mulkv = function(k, v){
  var a = new Array(v.length);
  for(var i=0;i<v.length;i++){
    a[i]=k*v[i];
  }
  return a;
};
// kx[][]
var mulkx = function(k, x){
  var a = new Array(x.length);
  for(var i=0;i<x.length;i++){
    a[i] = new Array(x[0].length);
    for(var j=0;j<x[0].length;j++){
      a[i][j]=k*x[i][j];
    }
  }
  return a;
};
// x[][]v[]
var mulxv = function(x, v){
  var a = new Array(x.length);
  for(var i=0;i<a.length;i++){
    a[i] = 0;
    for(var j=0;j<v.length;j++){
      a[i] += x[i][j]*v[j];
    }
  }
  return a;
};
// x0[][]x1[][]
var mulxx = function(x0, x1){
  var a = new Array(x0.length);
  for(var i=0;i<a.length;i++){
    a[i] = new Array(x1[0].length);
    for(var k=0;k<x1[0].length;k++){
      a[i][k]=0;
      for(var j=0;j<x1.length;j++){
        a[i][k] = a[i][k] + x0[i][j]*x1[j][k];
      }
    }
  }
  return a;
};
Array.prototype.toString = function(){
  var str = "";
  str += "[";
  if(this.length>0){
    str += this[0];
  }
  for(var i=1;i<this.length;i++){
    str += ", " + this[i];
  }
  str += "]";
  return str;
};
/* ３次元ベクトル a, b のクロス積 a×b */
var cross=function(a, b){
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
};

var sub = function(a0,a1){
  b = new Array(a0.length);
  if(a0[0] instanceof Array){
    for(var i=0;i<a0.length;i++){
      b[i]=new Array(a0[0].length);
      for(var j=0;j<b.length;j++){
        b[i][j]=a0[i][j]-a1[i][j];
      }
    }
  }else{
    for(var i=0;i<a0.length;i++){
      b[i] = a0[i] - a1[i];
    }
  }
  return b;
};
var add = function(a0,a1){
  var b = new Array(a0.length);
  if(a0[0] instanceof Array){
    for(var i=0;i<a0.length;i++){
      b[i]=new Array(a0[0].length);
      for(var j=0;j<b.length;j++){
        b[i][j] = a0[i][j] + a1[i][j];
      }
    }
  }else{
    for(var i=0;i<a0.length;i++){
      b[i] = a0[i] + a1[i];
    }
  }
  return b;
};

var abs = function(a){
  var n = 0;
  for(var i=0;i<a.length;i++){
    n += a[i]*a[i];
  }
  return Math.sqrt(n);
};
var abs2 = function(a){
  var n = 0;
  for(var i=0;i<a.length;i++){
    n += a[i]*a[i];
  }
  return n;
};

var normalize=function(a){
  var invabs = 1/abs(a);
  var b = a.slice(0);
  for(var i=0;i<a.length;i++){
    b[i] = b[i]*invabs;
  }
  return b;
};
  /* 任意軸回転行列 R(A,theta) 
     in :a     = 単位回転ベクトル 
        :theta = 回転角（ラジアン）
        :cos   = cos(theta)
        :sin   = sin(theta)
     out:R = 回転行列
     Rodrigues' Rotation Formula より */
var ang2rot=function(a, cos, sin){
  cos1 = 1-cos;
  return [
    [ cos      + cos1*a[0]*a[0], -sin*a[2] + cos1*a[0]*a[1], +sin*a[1] + cos1*a[0]*a[2],],
    [+sin*a[2] + cos1*a[1]*a[0],  cos      + cos1*a[1]*a[1], -sin*a[0] + cos1*a[1]*a[2],],
    [-sin*a[1] + cos1*a[2]*a[0], +sin*a[0] + cos1*a[2]*a[1],  cos      + cos1*a[2]*a[2],],
  ];
};

var product = function(v1,v2){
  var a = 0;
  for(var i=0;i<v1.length;i++) a += v1[i]*v2[i];
  return a;
};

var testMatrix=function(){
  var str="";
  var a0 = [1,0,0];
  var a1 = [0,1,0];
  var a2 = [1,2,0];
  var R = getRotate(a0,a1);
  str += "R=" + mat2str(R) + " , ";
  str += "Ra2="+mat2str(mul(R,a2));
  return str;
};


