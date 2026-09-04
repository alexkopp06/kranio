function create(){
var INK='#070D0B';
var S=20260903>>>0;
function rnd(){S=(Math.imul(S,1664525)+1013904223)>>>0;return S/4294967296;}
function rr(a,b){return a+(b-a)*rnd();}
function gs(){return (rnd()+rnd()+rnd()-1.5)*0.85;}
function ss(a,b,v){var t=(v-a)/(b-a);t=t<0?0:(t>1?1:t);return t*t*(3-2*t);}
function h1(n){var s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s);}

/* ---------- geometrie ---------- */
function PT(a){var o=[],i;for(i=0;i<a.length;i+=2)o.push({x:a[i],y:a[i+1]});return o;}
function poly(a){var X=[],Y=[],i;for(i=0;i<a.length;i+=2){X.push(a[i]);Y.push(a[i+1]);}return {X:X,Y:Y};}
function deform(p,depth,amp,dec){
  var cur=p,d,i,out,A,B,dx,dy,L,n;
  for(d=0;d<depth;d++){
    out=[];
    for(i=0;i<cur.length;i++){
      A=cur[i];B=cur[(i+1)%cur.length];
      out.push(A);
      dx=B.x-A.x;dy=B.y-A.y;L=Math.sqrt(dx*dx+dy*dy)||1;
      n=gs()*amp*Math.min(1.6,L/22);
      out.push({x:(A.x+B.x)/2-dy/L*n,y:(A.y+B.y)/2+dx/L*n});
    }
    cur=out;amp*=dec;
  }
  return cur;
}
/* jedna hlavni deformace, vrstvy jen mirne posunute -> ostry mokry okraj */
function layersOf(base,n,j,depth,amp){
  var m=deform(base,depth,amp,0.5),L=[],i,k,dx,dy,q;
  for(i=0;i<n;i++){
    dx=gs()*j;dy=gs()*j;q=[];
    for(k=0;k<m.length;k++)q.push({x:m[k].x+dx+gs()*j*0.55,y:m[k].y+dy+gs()*j*0.55});
    L.push(q);
  }
  return L;
}
function pathOf(p){
  var P=new Path2D(),n=p.length,i,A,B;
  P.moveTo((p[0].x+p[n-1].x)/2,(p[0].y+p[n-1].y)/2);
  for(i=0;i<n;i++){A=p[i];B=p[(i+1)%n];P.quadraticCurveTo(A.x,A.y,(A.x+B.x)/2,(A.y+B.y)/2);}
  P.closePath();return P;
}
function paths(base,n,j,depth,amp){var L=layersOf(base,n,j,depth,amp),o=[],i;for(i=0;i<L.length;i++)o.push(pathOf(L[i]));return o;}

/* ---------- mokre plochy ---------- */
function wash(x,Ps,col,a){
  x.save();x.globalCompositeOperation='multiply';x.fillStyle=col;x.globalAlpha=a;
  for(var i=0;i<Ps.length;i++)x.fill(Ps[i]);
  x.restore();
}
/* mokry okraj: uzky tmavy lem plus mekke vzlinuti dovnitr */
function wet(x,Ps,deep,a,w){
  x.save();x.globalCompositeOperation='multiply';x.lineJoin='round';x.lineCap='round';
  x.strokeStyle=deep;
  x.globalAlpha=a*0.26;x.lineWidth=w*3.6;x.stroke(Ps[Ps.length>1?1:0]);
  x.globalAlpha=a*0.5;x.lineWidth=w*1.6;x.stroke(Ps[0]);
  x.globalAlpha=a;x.lineWidth=w*0.65;x.stroke(Ps[0]);
  x.restore();
}
function blob(cx,cy,rx,ry,k){
  var b=[],i,a;
  for(i=0;i<k;i++){a=i/k*6.2831853;b.push({x:cx+Math.cos(a)*rx*rr(0.72,1.28),y:cy+Math.sin(a)*ry*rr(0.72,1.28)});}
  return b;
}
/* kaluze a suche flaky uvnitr plochy */
function granul(x,clip,n,x0,y0,x1,y1,dark,light){
  var i,px,py,pr,P,B;
  x.save();x.clip(clip);x.lineJoin='round';x.lineCap='round';
  for(i=0;i<n;i++){
    px=rr(x0,x1);py=rr(y0,y1);pr=rr(8,38);
    B=blob(px,py,pr,pr*rr(0.32,0.8),7);
    P=pathOf(deform(B,2,pr*0.22,0.55));
    if(i%3===0){
      x.globalCompositeOperation='source-over';
      x.fillStyle='rgba('+light+','+rr(0.05,0.13).toFixed(3)+')';x.fill(P);
    }else{
      x.globalCompositeOperation='multiply';
      x.fillStyle='rgba('+dark+','+rr(0.03,0.08).toFixed(3)+')';x.fill(P);
      x.strokeStyle='rgba('+dark+','+rr(0.04,0.1).toFixed(3)+')';x.lineWidth=1.3;x.stroke(P);
    }
  }
  x.restore();
}
/* stopy plocheho stetce: kazdy tah nechava hreben */
function passes(x,clip,n,x0,y0,x1,y1,col,deep){
  var i,yy,hh,B,P;
  x.save();x.clip(clip);x.lineJoin='round';x.lineCap='round';
  for(i=0;i<n;i++){
    hh=(y1-y0)/n;yy=y0+hh*i;
    B=PT([x0,yy+gs()*4, (x0+x1)/2,yy-hh*0.1, x1,yy+gs()*4, x1,yy+hh*1.04, (x0+x1)/2,yy+hh*1.16, x0,yy+hh*1.0]);
    P=pathOf(deform(B,3,9,0.45));
    x.globalCompositeOperation='multiply';
    x.globalAlpha=rr(0.018,0.05);x.fillStyle=col;x.fill(P);
    x.globalAlpha=rr(0.05,0.12);x.strokeStyle=deep;x.lineWidth=1.5;x.stroke(P);
  }
  x.restore();
}

/* ---------- tusova linka ---------- */
function rs(L,step){
  var X=[],Y=[],i,k,n,dx,dy,d;
  for(i=0;i<L.X.length-1;i++){
    dx=L.X[i+1]-L.X[i];dy=L.Y[i+1]-L.Y[i];d=Math.sqrt(dx*dx+dy*dy);
    n=Math.max(1,Math.round(d/step));
    for(k=0;k<n;k++){X.push(L.X[i]+dx*k/n);Y.push(L.Y[i]+dy*k/n);}
  }
  X.push(L.X[L.X.length-1]);Y.push(L.Y[L.Y.length-1]);
  return {X:X,Y:Y};
}
function smo(L,it){
  var X=L.X.slice(),Y=L.Y.slice(),i,k,nx,ny;
  for(k=0;k<it;k++){
    nx=X.slice();ny=Y.slice();
    for(i=1;i<X.length-1;i++){nx[i]=(X[i-1]+2*X[i]+X[i+1])/4;ny[i]=(Y[i-1]+2*Y[i]+Y[i+1])/4;}
    X=nx;Y=ny;
  }
  return {X:X,Y:Y};
}
function nv(L,amp,drift,sd){
  var X=[],Y=[],n=L.X.length,i,a,b,dx,dy,d,q;
  for(i=0;i<n;i++){
    a=Math.max(0,i-1);b=Math.min(n-1,i+1);
    dx=L.X[b]-L.X[a];dy=L.Y[b]-L.Y[a];d=Math.sqrt(dx*dx+dy*dy)||1;
    q=amp*(Math.sin(i*0.21+sd)*0.58+Math.sin(i*0.57+sd*2.3)*0.42)+drift*Math.sin(i*0.037+sd*0.7);
    X.push(L.X[i]-dy/d*q);Y.push(L.Y[i]+dx/d*q);
  }
  return {X:X,Y:Y};
}
function mk(flat,step,smt,amp,drift,sd){return nv(smo(rs(poly(flat),step),smt),amp,drift,sd);}
function ink(x,L,base,alpha,sd,gap,Wt,b){
  var X=L.X,Y=L.Y,n=X.length,i,y0,y1,tp,w,r;
  x.save();x.lineCap='round';x.lineJoin='round';x.strokeStyle=INK;x.fillStyle=INK;
  for(i=0;i<n-1;i++){
    if(h1(i*3.1+sd)<gap)continue;
    y0=Y[i]-(Wt?Wt[i]*b:0);y1=Y[i+1]-(Wt?Wt[i+1]*b:0);
    tp=Math.min(1,Math.min(i,n-2-i)/8);
    w=base*1.35*(0.34+0.92*h1(i*0.9+sd*1.7))*(0.7+0.5*Math.sin(i*0.11+sd))*(0.3+0.7*tp);
    x.globalAlpha=Math.min(1,alpha*(0.55+0.55*h1(i*1.7+sd)))*(0.35+0.65*tp);
    x.lineWidth=Math.max(0.4,w);
    x.beginPath();x.moveTo(X[i],y0);x.lineTo(X[i+1],y1);x.stroke();
    if(h1(i*5.3+sd)<0.03){
      r=base*(0.8+h1(i*7.1)*1.2);
      x.globalAlpha=Math.min(1,alpha*1.4);
      x.beginPath();x.arc(X[i],y0,r,0,6.2832);x.fill();
    }
  }
  x.restore();
}
function line(x,flat,step,smt,amp,drift,sd,base,alpha,gap){ink(x,mk(flat,step,smt,amp,drift,sd),base,alpha,sd,gap,null,0);}

/* ---------- papir ---------- */
function noiseTile(size,specs,lo,hi){
  var c=document.createElement('canvas');c.width=size;c.height=size;
  var cx=c.getContext('2d'),img=cx.createImageData(size,size),d=img.data;
  var grids=[],s,i,y,x,v,G,fx,fy,i0,j0,i1,j1,tx,ty,o,g8,tot=0;
  for(s=0;s<specs.length;s++){
    var nx=Math.max(1,Math.round(size/specs[s][0])),ny=Math.max(1,Math.round(size/specs[s][1]));
    var arr=new Float32Array(nx*ny);
    for(i=0;i<nx*ny;i++)arr[i]=rnd();
    grids.push({nx:nx,ny:ny,cw:size/nx,ch:size/ny,w:specs[s][2],a:arr});
    tot+=specs[s][2];
  }
  function sf(t){return t*t*(3-2*t);}
  for(y=0;y<size;y++)for(x=0;x<size;x++){
    v=0;
    for(s=0;s<grids.length;s++){
      G=grids[s];
      fx=x/G.cw;fy=y/G.ch;
      i0=Math.floor(fx)%G.nx;j0=Math.floor(fy)%G.ny;
      i1=(i0+1)%G.nx;j1=(j0+1)%G.ny;
      tx=sf(fx-Math.floor(fx));ty=sf(fy-Math.floor(fy));
      v+=G.w*((G.a[j0*G.nx+i0]*(1-tx)+G.a[j0*G.nx+i1]*tx)*(1-ty)+(G.a[j1*G.nx+i0]*(1-tx)+G.a[j1*G.nx+i1]*tx)*ty);
    }
    v/=tot;
    g8=Math.round(lo+(hi-lo)*v);
    o=(y*size+x)*4;
    d[o]=g8;d[o+1]=g8;d[o+2]=g8>3?g8-3:0;d[o+3]=255;
  }
  cx.putImageData(img,0,0);
  return c;
}
var tooth=noiseTile(256,[[2,2,0.34],[6,6,0.3],[24,24,0.22],[128,3,0.14]],202,255);
var grain=noiseTile(128,[[1,1,0.6],[3,3,0.25],[16,16,0.15]],200,255);

/* ---------- tvary ---------- */
var WALL=PT([650,-70, 900,-70, 1270,-70, 1270,240, 1270,470, 1268,556, 1120,566, 1000,558, 942,470, 866,330, 786,186, 710,52]);
var WALL2=PT([906,-70, 1270,-70, 1270,180, 1270,404, 1170,452, 1064,424, 1000,320, 950,178, 922,48]);
var HAZE=PT([540,520, 900,514, 1270,522, 1270,566, 900,574, 540,566]);
var LEFT=PT([-70,-70, 78,-70, 104,190, 92,430, 112,566, -70,566]);
var FLOOR=PT([-70,552, 200,562, 520,552, 860,564, 1270,552, 1270,745, -70,745]);
var FLOOR2=PT([470,626, 880,572, 1270,558, 1270,745, 520,745]);
var SHADOW=PT([176,558, 420,552, 700,554, 1000,552, 1124,564, 1140,592, 980,614, 640,622, 300,610, 180,586]);
var COUCH=PT([148,470, 400,467, 700,469, 1000,467, 1062,470, 1066,492, 1060,506, 700,509, 400,507, 150,505, 144,488]);
var COUCHD=PT([150,494, 500,498, 900,495, 1060,498, 1058,509, 700,513, 300,511, 150,507]);
var LEG1=PT([195,504, 217,504, 214,562, 197,562]);
var LEG2=PT([995,504, 1017,504, 1014,562, 997,562]);
var HEAD=PT([206,396, 226,388, 246,390, 260,398, 267,410, 272,419, 277,427, 281,436, 285,447, 292,453, 303,450, 311,445, 322,456, 326,468, 250,472, 206,470, 188,452, 184,430, 190,410]);
var HAIR=PT([208,393, 228,385, 246,388, 238,398, 222,405, 208,418, 201,437, 207,456, 222,469, 196,471, 183,453, 181,430, 190,405]);
var FACESH=PT([266,420, 278,432, 286,450, 300,456, 316,452, 324,464, 300,470, 258,470, 244,458, 250,436]);
var LEGS=PT([536,430, 600,432, 660,428, 706,426, 764,426, 820,429, 876,434, 922,438, 962,441, 992,441, 1008,436, 1020,429, 1027,428, 1034,438, 1035,450, 1026,463, 1014,471, 900,474, 700,474, 540,472]);
var FOOT=PT([994,442, 1008,434, 1021,427, 1030,432, 1036,444, 1032,458, 1020,469, 1002,471, 990,459]);
var BLANK=PT([548,456, 570,442, 600,435, 650,423, 706,416, 762,420, 812,426, 868,417, 918,428, 972,436, 1002,441, 1008,462, 1000,487, 962,499, 918,505, 858,499, 800,507, 740,502, 678,509, 618,503, 570,499, 550,486, 542,468]);
var BLIP=PT([540,464, 550,448, 572,437, 602,432, 618,438, 610,451, 586,462, 558,471, 542,474]);
var TORSO=PT([300,449, 310,439, 328,431, 350,423, 376,415, 404,410, 430,409, 458,411, 488,416, 520,422, 552,428, 572,431, 586,435, 596,442, 600,456, 596,473, 540,480, 450,480, 360,479, 310,475]);
var HANDA=PT([368,398, 380,389, 400,386, 418,391, 429,400, 424,411, 406,415, 384,413, 370,407]);
var HANDB=PT([420,407, 434,395, 454,392, 472,397, 481,407, 474,417, 452,421, 430,419]);
var RESERVE=PT([344,382, 382,368, 434,364, 486,374, 508,394, 504,420, 476,436, 424,444, 376,438, 350,420, 340,400]);
var SHADE=PT([796,-70, 1270,-70, 1270,745, 856,745, 894,560, 926,470, 872,300, 826,120]);

/* ---------- vrstvy ---------- */
var Lwall=paths(WALL,8,1.6,3,16), Lwall2=paths(WALL2,7,1.8,3,13), Lhaze=paths(HAZE,4,1.6,3,6);
var Lleft=paths(LEFT,5,1.4,3,8);
var Lfloor=paths(FLOOR,7,1.6,3,11), Lfloor2=paths(FLOOR2,6,2,3,13), Lshad=paths(SHADOW,8,1.6,3,9);
var Lcouch=paths(COUCH,6,1,3,4), Lcouchd=paths(COUCHD,4,0.9,3,3.6);
var Lleg1=paths(LEG1,5,0.8,2,2.2), Lleg2=paths(LEG2,5,0.8,2,2.2);
var Lhead=paths(HEAD,7,1,3,3.6), Lhair=paths(HAIR,10,1.2,3,4.4), Lface=paths(FACESH,5,1.6,3,4.4);
var Llegs=paths(LEGS,7,1.3,3,4.4), Lfoot=paths(FOOT,6,0.9,3,2.8);
var Lblank=paths(BLANK,9,1.6,3,6), Lblip=paths(BLIP,6,1,3,3);
var Lres=paths(RESERVE,7,1.8,3,7);
var LhandA=paths(HANDA,7,0.8,3,2.4), LhandB=paths(HANDB,7,0.8,3,2.4);
var Lshade=paths(SHADE,3,2,3,12);

/* hrudnik s vahou dechu */
function bwt(x,y){return Math.min(ss(306,344,x),1-ss(536,604,x))*(1-ss(438,472,y));}
var torsoRaw=layersOf(TORSO,8,1.3,3,6);
var TL=[],ti,tj;
for(ti=0;ti<torsoRaw.length;ti++){
  var p=torsoRaw[ti],n=p.length,X=new Float32Array(n),Y=new Float32Array(n),Wt=new Float32Array(n);
  for(tj=0;tj<n;tj++){X[tj]=p[tj].x;Y[tj]=p[tj].y;Wt[tj]=bwt(p[tj].x,p[tj].y);}
  TL.push({x:X,y:Y,w:Wt,n:n});
}
var chestA=mk([300,452, 312,440, 330,432, 356,423, 384,414, 412,410, 440,410, 470,412, 502,417, 534,423, 562,429, 586,434, 598,443],5.5,2,1.8,5.4,3.1);
var CWA=new Float32Array(chestA.X.length);
for(ti=0;ti<CWA.length;ti++)CWA[ti]=bwt(chestA.X[ti],chestA.Y[ti]);
var chestB=mk([306,456, 320,441, 344,430, 372,419, 404,412, 436,411, 468,414, 500,419, 532,425, 566,432, 592,439],7,2,2.6,6.4,7.7);
var CWB=new Float32Array(chestB.X.length);
for(ti=0;ti<CWB.length;ti++)CWB[ti]=bwt(chestB.X[ti],chestB.Y[ti]);

/* zive tusove linky */
var IL=[
  [mk([366,400, 380,390, 400,387, 419,392, 429,401, 424,412, 405,416, 383,414, 369,407, 366,400],3.5,1,0.9,1.8,2.7),1.35,0.98,2.7,0.07],
  [mk([419,409, 433,396, 454,393, 472,398, 481,408, 474,418, 452,422, 430,420, 419,409],3.5,1,0.9,1.8,6.9),1.35,0.98,6.9,0.07],
  [mk([392,392, 396,410],3,1,0.4,0.7,3.3),0.8,0.66,3.3,0.12],
  [mk([404,389, 408,411],3,1,0.4,0.7,5.8),0.8,0.66,5.8,0.12],
  [mk([415,391, 418,410],3,1,0.4,0.7,8.4),0.8,0.64,8.4,0.16],
  [mk([444,395, 446,417],3,1,0.4,0.7,1.6),0.8,0.66,1.6,0.12],
  [mk([456,394, 458,418],3,1,0.4,0.7,4.2),0.8,0.66,4.2,0.12],
  [mk([467,397, 468,416],3,1,0.4,0.7,7.1),0.8,0.64,7.1,0.16],
  [mk([376,395, 387,404, 380,411],3,1,0.5,0.9,9.3),0.85,0.75,9.3,0.04],
  [mk([430,403, 441,411, 434,418],3,1,0.5,0.9,2.1),0.85,0.75,2.1,0.04],
  [mk([382,394, 368,346, 356,300, 346,252],5,1,1.1,2.6,4.6),1.25,0.85,4.6,0.2],
  [mk([419,390, 412,346, 402,300, 392,254],5,1,1.1,2.6,8.2),1.1,0.6,8.2,0.36],
  [mk([431,396, 442,352, 456,306, 470,262],5,1,1.1,2.6,1.9),1.25,0.8,1.9,0.22],
  [mk([471,400, 482,360, 496,318, 510,276],5,1,1.1,2.6,5.5),1.1,0.56,5.5,0.38],
  [mk([300,452, 308,462, 306,472],3,1,0.7,1.1,5.2),1.05,0.62,5.2,0.12]
];

/* kropenani a sul */
var flick=[],fi,fa,fr;
for(fi=0;fi<140;fi++){
  fa=rr(0,6.2832);fr=Math.pow(rnd(),0.6)*250;
  flick.push({x:290+Math.cos(fa)*fr*1.45,y:576+Math.sin(fa)*fr*0.4,r:rr(0.4,2.6),a:rr(0.2,0.9),e:rr(1,2.8)});
}
var salt=[];
for(fi=0;fi<110;fi++)salt.push({x:rr(552,1004),y:rr(420,506),r:rr(1.4,5),a:rr(0.1,0.3)});

/* ---------- staticka vrstva ---------- */
var cache=document.createElement('canvas');cache.width=1200;cache.height=675;
var c=cache.getContext('2d');
(function(){
  c.fillStyle='#F2F3EF';c.fillRect(0,0,1200,675);
  var lg=c.createRadialGradient(262,64,20,352,190,720);
  lg.addColorStop(0,'rgba(255,255,252,1)');
  lg.addColorStop(0.34,'rgba(255,254,247,0.72)');
  lg.addColorStop(1,'rgba(255,253,246,0)');
  c.fillStyle=lg;c.fillRect(0,0,1200,675);
  c.save();c.globalCompositeOperation='multiply';c.globalAlpha=0.6;
  c.fillStyle=c.createPattern(tooth,'repeat');c.fillRect(0,0,1200,675);c.restore();

  /* velka diagonalni plocha vpravo, papir vlevo zustava nedotceny */
  wash(c,Lwall,'#5C6F67',0.05);
  passes(c,Lwall[0],7,560,-60,1280,570,'#3C544B','#20372F');
  granul(c,Lwall[0],26,620,-40,1260,556,'32,50,44','248,249,242');
  wet(c,Lwall,'#16302A',0.4,3);
  wash(c,Lwall2,'#1B2B26',0.055);
  granul(c,Lwall2[0],16,900,-40,1260,430,'8,18,15','226,232,224');
  wet(c,Lwall2,'#08120F',0.34,3.4);
  wash(c,Lleft,'#6E7F77',0.035);
  wet(c,Lleft,'#2A403A',0.22,2);
  wash(c,Lhaze,'#3E504A',0.05);

  /* podlaha */
  wash(c,Lfloor,'#1D2924',0.095);
  passes(c,Lfloor[0],4,-60,548,1280,700,'#16241E','#060E0B');
  granul(c,Lfloor[0],20,-40,552,1240,690,'6,14,11','200,208,198');
  wet(c,Lfloor,'#050C09',0.5,3);
  wash(c,Lfloor2,'#050A08',0.13);
  wash(c,Lshad,'#080F0D',0.105);
  wet(c,Lshad,'#040907',0.34,3.4);

  /* lehatko */
  wash(c,Lcouch,'#CFC5B2',0.05);
  granul(c,Lcouch[0],10,148,466,1064,508,'120,112,94','252,250,242');
  wet(c,Lcouch,'#4A4C40',0.3,2.2);
  wash(c,Lcouchd,'#4C4C40',0.08);
  wash(c,Lleg1,'#252B24',0.11);wash(c,Lleg2,'#1C221C',0.12);

  /* telo */
  wash(c,Llegs,'#B4AFA0',0.05);
  wet(c,Llegs,'#4A4E42',0.24,2);
  wash(c,Lfoot,'#C4A88D',0.07);
  wet(c,Lfoot,'#6B5340',0.3,1.8);
  wash(c,Lhead,'#CAAF95',0.055);
  wash(c,Lface,'#98795F',0.05);
  wet(c,Lhead,'#5E4634',0.3,2);
  wash(c,Lhair,INK,0.125);
  wash(c,Lhair.slice(0,5),INK,0.18);
  wash(c,Lhair.slice(0,3),INK,0.2);
  wet(c,Lhair,'#04100B',0.34,3);

  /* deka */
  wash(c,Lblank,'#0E6B54',0.055);
  wash(c,Lblank.slice(0,4),'#0A5442',0.05);
  c.save();c.clip(Lblank[0]);
  c.globalCompositeOperation='multiply';
  for(fi=0;fi<10;fi++){
    var bx=rr(590,990),by=rr(428,478),br=rr(16,52);
    var bg=c.createRadialGradient(bx,by,1,bx,by,br);
    bg.addColorStop(0,'rgba(6,52,40,'+rr(0.06,0.16).toFixed(3)+')');
    bg.addColorStop(1,'rgba(6,52,40,0)');
    c.fillStyle=bg;c.fillRect(bx-br,by-br,br*2,br*2);
  }
  c.globalCompositeOperation='source-over';
  for(fi=0;fi<salt.length;fi++){
    var sl=salt[fi];
    var sg2=c.createRadialGradient(sl.x,sl.y,0,sl.x,sl.y,sl.r);
    sg2.addColorStop(0,'rgba(238,244,236,'+sl.a+')');
    sg2.addColorStop(1,'rgba(238,244,236,0)');
    c.fillStyle=sg2;c.fillRect(sl.x-sl.r,sl.y-sl.r,sl.r*2,sl.r*2);
  }
  c.restore();
  wet(c,Lblank,'#03231B',0.5,3.4);
  wash(c,Lblip,'#CFE6DA',0.1);
  wet(c,Lblip,'#0A5442',0.3,1.8);

  /* kapky pigmentu z lemu deky */
  (function(){
    var drips=[[672,508,54],[806,506,32],[930,505,72],[566,500,24]];
    c.save();c.globalCompositeOperation='multiply';c.strokeStyle='#083E30';c.lineCap='round';
    for(var i=0;i<drips.length;i++){
      var dx0=drips[i][0],dy0=drips[i][1],dl=drips[i][2],k,f;
      for(k=0;k<Math.round(dl/2);k++){
        f=k/(dl/2);
        c.globalAlpha=0.2*(1-f*0.5);
        c.lineWidth=2.8*(1-f*0.62);
        c.beginPath();
        c.moveTo(dx0+Math.sin(f*7+i)*1.7,dy0+f*dl);
        c.lineTo(dx0+Math.sin((f+0.06)*7+i)*1.7,dy0+(f+0.06)*dl);
        c.stroke();
      }
      c.globalAlpha=0.45;c.fillStyle='#062A21';
      c.beginPath();c.arc(dx0+Math.sin(7+i)*1.7,dy0+dl,2.8,0,6.2832);c.fill();
    }
    c.restore();
  })();

  /* stin, ktery lehne na nohy a chodidla */
  wash(c,Lshade.slice(0,3),'#39504A',0.07);

  /* ---- tus ---- */
  line(c,[150,471, 380,468, 620,470, 860,468, 1062,470],7,1,1.1,3.6,1.3,2.0,1.0,0.04);
  line(c,[1060,507, 820,510, 560,508, 300,510, 150,506],8,1,1.3,2.4,4.7,1.3,0.78,0.28);
  line(c,[197,506, 199,562],5,0,0.7,1.1,2.2,1.4,0.88,0.06);
  line(c,[215,506, 213,562],5,0,0.7,1.1,5.5,1.2,0.74,0.14);
  line(c,[996,506, 998,562],5,0,0.7,1.1,8.1,1.4,0.88,0.06);
  line(c,[1015,506, 1013,562],5,0,0.7,1.1,3.3,1.2,0.72,0.16);
  line(c,[-10,559, 240,561, 560,557, 900,563, 1210,558],9,1,1.5,2.8,6.6,0.95,0.45,0.5);
  line(c,[190,410, 206,394, 228,385, 248,389, 262,399, 269,411, 273,420, 278,428, 282,437, 286,448, 293,454, 304,451, 312,446, 323,457, 327,469],4,1,1.5,5.2,2.4,1.85,1.0,0.09);
  line(c,[182,430, 185,452, 197,467, 216,472],5,1,1.3,2.2,9.2,1.35,0.75,0.18);
  line(c,[246,406, 264,403],3,1,0.6,0.9,4.4,1.15,0.8,0.04);
  line(c,[247,417, 258,419, 266,417, 270,421],3,1,0.4,0.6,5.1,1.5,1.0,0.0);
  line(c,[268,412, 274,421, 278,428, 271,431],3,1,0.5,0.8,1.9,1.25,0.88,0.05);
  line(c,[276,442, 288,444],3,1,0.4,0.5,7.4,1.25,0.9,0.0);
  line(c,[284,450, 297,456, 312,452],4,1,0.7,1.2,2.8,1.15,0.7,0.18);
  line(c,[212,392, 202,404, 196,420, 194,438],4,1,1.1,1.8,6.1,1.05,0.58,0.28);
  line(c,[228,388, 214,400, 205,417, 202,436, 206,454],4,1,1.0,1.6,3.7,1.0,0.52,0.3);
  line(c,[596,432, 660,427, 706,425, 780,425, 840,430, 876,433, 930,437, 972,440, 998,440, 1014,433, 1027,427, 1034,438, 1035,451, 1026,464, 1012,472],6,1,1.6,5.0,4.2,1.45,0.88,0.14);
  line(c,[992,444, 1006,436, 1020,429],4,1,0.8,1.2,8.8,1.15,0.88,0.04);
  line(c,[998,455, 1012,452, 1024,455],4,1,0.7,1.0,5.6,1.0,0.68,0.18);
  line(c,[548,458, 572,443, 604,434, 650,423, 706,416, 762,419, 812,425, 868,416, 918,427, 972,435, 1004,442],6,1,1.8,6.4,1.4,1.7,0.95,0.12);
  line(c,[1006,462, 1000,488, 962,500, 918,506, 858,499, 800,508, 740,502, 678,510, 618,504, 570,500, 548,486],6,1,1.9,5.6,9.7,1.8,1.0,0.07);
  line(c,[540,466, 552,448, 574,437, 604,432, 620,439, 610,452, 584,463, 556,472],5,1,1.1,1.8,6.3,1.3,0.85,0.06);
  line(c,[618,432, 624,452, 616,474, 622,502],6,1,1.2,2.0,2.2,1.35,0.72,0.24);
  line(c,[692,420, 700,444, 690,470, 698,508],6,1,1.2,2.0,7.8,1.1,0.58,0.28);
  line(c,[772,419, 780,442, 770,470, 778,506],6,1,1.2,2.0,4.9,1.05,0.52,0.32);
  line(c,[858,424, 866,448, 856,472, 862,498],6,1,1.2,2.0,3.4,1.05,0.54,0.3);
  line(c,[938,432, 944,454, 934,476, 940,502],6,1,1.2,2.0,8.5,1.0,0.5,0.34);

  c.save();c.fillStyle=INK;
  for(fi=0;fi<flick.length;fi++){
    var fl=flick[fi];
    if(fl.y<548||fl.y>668||fl.x<20||fl.x>740)continue;
    c.globalAlpha=fl.a*0.6;
    c.beginPath();c.ellipse(fl.x,fl.y,fl.r*fl.e,fl.r,0.28,0,6.2832);c.fill();
  }
  c.restore();

  /* svetlo a vinetace */
  c.save();
  c.globalCompositeOperation='screen';
  var sg=c.createRadialGradient(300,70,10,352,190,520);
  sg.addColorStop(0,'rgba(255,250,230,0.44)');
  sg.addColorStop(1,'rgba(255,250,230,0)');
  c.fillStyle=sg;c.fillRect(0,0,1200,675);
  c.globalCompositeOperation='multiply';
  var vg=c.createRadialGradient(400,230,110,470,320,900);
  vg.addColorStop(0,'rgba(255,255,255,0)');
  vg.addColorStop(0.55,'rgba(150,160,152,0.1)');
  vg.addColorStop(1,'rgba(14,26,22,0.72)');
  c.fillStyle=vg;c.fillRect(0,0,1200,675);
  c.restore();
})();

var pat=null;

/* ---------- kresba ---------- */
return function draw(g,W,H,t){
  var T=6.6667,ph=(t%T)/T;
  var wq=ph<0.42?(ph/0.42)*0.5:0.5+((ph-0.42)/0.58)*0.5;
  var u=0.5-0.5*Math.cos(6.2831853*wq);
  var b=7*u,i,j,k,L,n,X,Y,Wt,ay,by;

  g.save();
  if(W!==1200||H!==675)g.scale(W/1200,H/675);
  g.drawImage(cache,0,0);

  /* hrudnik, ktery dycha */
  g.save();g.globalCompositeOperation='multiply';g.fillStyle='#BBB5A4';g.globalAlpha=0.06;
  for(i=0;i<TL.length;i++){
    L=TL[i];n=L.n;X=L.x;Y=L.y;Wt=L.w;
    g.beginPath();
    ay=Y[0]-Wt[0]*b;by=Y[n-1]-Wt[n-1]*b;
    g.moveTo((X[0]+X[n-1])/2,(ay+by)/2);
    for(j=0;j<n;j++){
      k=(j+1)%n;
      ay=Y[j]-Wt[j]*b;by=Y[k]-Wt[k]*b;
      g.quadraticCurveTo(X[j],ay,(X[j]+X[k])/2,(ay+by)/2);
    }
    g.closePath();g.fill();
  }
  g.strokeStyle='#3E4438';g.lineJoin='round';g.lineCap='round';
  for(i=0;i<3;i++){
    L=TL[i];n=L.n;X=L.x;Y=L.y;Wt=L.w;
    g.globalAlpha=i===0?0.24:0.09;
    g.lineWidth=i===0?1.6:3.6;
    g.beginPath();
    ay=Y[0]-Wt[0]*b;by=Y[n-1]-Wt[n-1]*b;
    g.moveTo((X[0]+X[n-1])/2,(ay+by)/2);
    for(j=0;j<n;j++){
      k=(j+1)%n;
      ay=Y[j]-Wt[j]*b;by=Y[k]-Wt[k]*b;
      g.quadraticCurveTo(X[j],ay,(X[j]+X[k])/2,(ay+by)/2);
    }
    g.closePath();g.stroke();
  }
  g.restore();

  /* vynechany papir kolem rukou */
  g.save();g.translate(0,-b*0.95);
  g.fillStyle='#FAF9F1';g.globalAlpha=0.115;
  for(i=0;i<Lres.length;i++)g.fill(Lres[i]);
  g.globalCompositeOperation='multiply';
  g.globalAlpha=0.13;g.lineJoin='round';g.lineCap='round';g.strokeStyle='#4E6055';
  g.lineWidth=1.6;g.stroke(Lres[0]);
  g.globalAlpha=0.07;g.lineWidth=6;g.stroke(Lres[1]);
  g.restore();

  /* zavodneni: rozpity kruh se zubatym okrajem */
  g.save();
  g.beginPath();
  g.moveTo(302,474);g.lineTo(304,432);g.lineTo(412,402);g.lineTo(560,424);
  g.lineTo(700,412);g.lineTo(900,422);g.lineTo(1004,438);g.lineTo(1006,496);
  g.lineTo(700,508);g.lineTo(400,496);g.closePath();
  g.clip();
  for(i=0;i<3;i++){
    var pp=(ph+i/3)%1;
    var R=44+124*pp;
    var al=Math.pow(Math.sin(Math.PI*pp),1.4);
    if(al<=0.015)continue;
    g.beginPath();
    for(j=0;j<=104;j++){
      var a2=j/104*6.2831853;
      var r2=R*(1+0.06*Math.sin(6*a2+1.3+i)+0.038*Math.sin(11*a2+4.1)+0.024*Math.sin(19*a2+i*2));
      var px=424+Math.cos(a2)*r2*1.2,py=404-b*0.95+Math.sin(a2)*r2*0.6;
      if(j===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath();
    g.globalCompositeOperation='source-over';
    g.strokeStyle='rgba(252,251,242,'+(0.24*al).toFixed(3)+')';g.lineWidth=9;g.stroke();
    g.globalCompositeOperation='multiply';
    g.strokeStyle='rgba(10,60,48,'+(0.32*al).toFixed(3)+')';g.lineWidth=1.3;g.stroke();
  }
  g.restore();

  /* predlokti mizici do papiru */
  g.save();g.translate(0,-b*0.95);g.globalCompositeOperation='multiply';
  var ag=g.createLinearGradient(0,402,0,268);
  ag.addColorStop(0,'rgba(122,88,64,0.78)');
  ag.addColorStop(0.26,'rgba(136,102,78,0.46)');
  ag.addColorStop(0.62,'rgba(152,122,98,0.16)');
  ag.addColorStop(1,'rgba(158,128,104,0)');
  g.fillStyle=ag;g.strokeStyle=ag;g.lineJoin='round';g.lineCap='round';
  g.beginPath();
  g.moveTo(380,394);g.quadraticCurveTo(354,302,332,172);g.lineTo(382,164);
  g.quadraticCurveTo(400,300,420,390);g.closePath();g.fill();
  g.beginPath();
  g.moveTo(430,398);g.quadraticCurveTo(454,304,482,178);g.lineTo(532,194);
  g.quadraticCurveTo(494,308, 472,402);g.closePath();g.fill();
  g.globalAlpha=0.92;g.lineWidth=2.4;
  g.beginPath();g.moveTo(380,394);g.quadraticCurveTo(354,302,336,190);g.stroke();
  g.beginPath();g.moveTo(430,398);g.quadraticCurveTo(454,304,480,186);g.stroke();
  g.restore();

  /* ruce */
  g.save();g.translate(0,-b*0.95);
  wash(g,LhandA,'#A87E5E',0.1);
  wash(g,LhandB,'#A87E5E',0.1);
  wet(g,LhandA,'#3E2718',0.44,1.9);
  wet(g,LhandB,'#3E2718',0.44,1.9);
  g.save();g.globalCompositeOperation='multiply';g.globalAlpha=0.2;g.fillStyle='#33261C';
  g.beginPath();g.ellipse(400,415,34,5.5,0.06,0,6.2832);g.fill();
  g.beginPath();g.ellipse(452,421,32,5.5,0.05,0,6.2832);g.fill();
  g.restore();
  for(i=0;i<IL.length;i++)ink(g,IL[i][0],IL[i][1],IL[i][2],IL[i][3],IL[i][4],null,0);
  g.restore();

  /* hrudni linka */
  ink(g,chestB,0.95,0.44,7.7,0.38,CWB,b);
  ink(g,chestA,1.45,1.0,3.1,0.07,CWA,b);

  /* zrno */
  g.save();
  g.globalCompositeOperation='multiply';g.globalAlpha=0.4;
  if(!pat)pat=g.createPattern(grain,'repeat');
  g.fillStyle=pat;g.fillRect(0,0,1200,675);
  g.restore();

  /* popisky */
  g.save();
  g.font="11px 'JetBrains Mono', monospace";
  g.fillStyle='rgba(228,234,226,0.66)';
  g.fillText('DECH  9 / MIN',92,624);
  g.globalAlpha=0.3;
  g.strokeStyle='rgba(228,234,226,0.9)';g.lineWidth=1;
  g.beginPath();g.moveTo(92,637.5);g.lineTo(232,637.5);g.stroke();
  g.globalAlpha=0.9;
  g.fillStyle='rgba(238,243,234,0.95)';
  g.beginPath();g.arc(92+140*ph,637.5,2.3,0,6.2832);g.fill();
  g.globalAlpha=0.4;
  g.fillStyle='rgba(224,232,224,0.9)';
  g.fillText('akvarel / tus',1006,74);
  g.restore();

  g.restore();
};
}
