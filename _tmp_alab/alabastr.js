window.__create = function create(){
  var TAU=6.28318530718;
  function sm(a,b,x){var k=(x-a)/(b-a);k=k<0?0:k>1?1:k;return k*k*(3-2*k);}
  function rad(g,x,y,r,sx,sy,c0,c1){g.save();g.translate(x,y);g.scale(sx,sy);var q=g.createRadialGradient(0,0,0,0,0,r);q.addColorStop(0,c0);q.addColorStop(1,c1);g.fillStyle=q;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();g.restore();}
  function curve(p,pt,close){
    p.moveTo(pt[0][0],pt[0][1]);
    for(var i=0;i<pt.length-1;i++){
      var a=pt[i-1]||pt[i],b=pt[i],c=pt[i+1],d=pt[i+2]||pt[i+1];
      p.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,c[0],c[1]);
    }
    if(close)p.closePath();
    return p;
  }
  function mkPath(pt,close){return curve(new Path2D(),pt,close);}
  function interp(arr,x){
    if(x<=arr[0][0])return arr[0][1];
    for(var i=0;i<arr.length-1;i++){
      if(x<=arr[i+1][0]){var k=(x-arr[i][0])/(arr[i+1][0]-arr[i][0]);return arr[i][1]+(arr[i+1][1]-arr[i][1])*k;}
    }
    return arr[arr.length-1][1];
  }

  /* ---------- filmove zrno ---------- */
  var NT=200,nc=document.createElement('canvas');nc.width=NT;nc.height=NT;
  var nx=nc.getContext('2d'),nd=nx.createImageData(NT,NT),ND=nd.data;
  for(var i=0;i<NT*NT;i++){var v=128+(Math.random()-0.5)*170;v=v<0?0:v>255?255:v;ND[i*4]=v;ND[i*4+1]=v;ND[i*4+2]=v;ND[i*4+3]=255;}
  nx.putImageData(nd,0,0);

  /* ---------- mineralni skvrnitost ---------- */
  var mc=document.createElement('canvas');mc.width=320;mc.height=180;
  var mx=mc.getContext('2d');mx.fillStyle='#808080';mx.fillRect(0,0,320,180);
  for(i=0;i<520;i++){
    var bx=Math.random()*320,by=Math.random()*180,brr=5+Math.random()*42,lv=Math.random()<0.5?'255,255,255':'0,0,0';
    var q=mx.createRadialGradient(bx,by,0,bx,by,brr);
    q.addColorStop(0,'rgba('+lv+','+(0.04+Math.random()*0.11).toFixed(3)+')');
    q.addColorStop(1,'rgba('+lv+',0)');
    mx.fillStyle=q;mx.fillRect(bx-brr,by-brr,brr*2,brr*2);
  }

  /* ---------- zilkovani alabastru ---------- */
  var vc=document.createElement('canvas');vc.width=1200;vc.height=675;
  var vx=vc.getContext('2d');vx.lineCap='round';vx.lineJoin='round';
  for(i=0;i<160;i++){
    var x=140+Math.random()*920,y=376+Math.random()*130,a=(Math.random()-0.5)*0.5;
    var seg=6+(Math.random()*12|0),st=7+Math.random()*15,dk=Math.random()<0.62,w=0.45+Math.random()*1.5;
    vx.beginPath();vx.moveTo(x,y);
    for(var s=0;s<seg;s++){a+=(Math.random()-0.5)*0.5;x+=Math.cos(a)*st;y+=Math.sin(a)*st*0.42;vx.lineTo(x,y);}
    vx.lineWidth=w*7;vx.strokeStyle=dk?'rgba(44,58,52,0.030)':'rgba(255,252,244,0.030)';vx.stroke();
    vx.lineWidth=w;vx.strokeStyle=dk?'rgba(44,58,52,'+(0.05+Math.random()*0.16).toFixed(3)+')':'rgba(255,253,246,'+(0.05+Math.random()*0.13).toFixed(3)+')';vx.stroke();
  }

  /* ---------- stopy dlata ---------- */
  var cc=document.createElement('canvas');cc.width=1200;cc.height=675;
  var cx2=cc.getContext('2d');cx2.lineCap='butt';
  for(i=0;i<1500;i++){
    var chx=145+Math.random()*925,chy=376+Math.random()*118;
    var cha=1.05+(Math.random()-0.5)*0.9,chl=5+Math.random()*13,lt=Math.random()<0.5;
    cx2.beginPath();cx2.moveTo(chx,chy);
    cx2.lineTo(chx+Math.cos(cha)*chl,chy+Math.sin(cha)*chl);
    cx2.strokeStyle=lt?'rgba(255,255,250,'+(0.03+Math.random()*0.09).toFixed(3)+')':'rgba(28,38,33,'+(0.03+Math.random()*0.10).toFixed(3)+')';
    cx2.lineWidth=0.7+Math.random()*1.5;cx2.stroke();
  }

  /* ---------- prach v kuzelu svetla ---------- */
  var motes=[];
  for(i=0;i<86;i++){motes.push([Math.random(),Math.random(),0.35+Math.random()*1.25,0.18+Math.random()*0.7,Math.random()*TAU,0.3+Math.random()*0.7]);}

  /* ---------- vytesane prameny vlasu ---------- */
  var strands=[];
  for(i=0;i<18;i++){
    var a0=2.66+Math.random()*1.55,a1=a0+0.4+Math.random()*1.1;
    strands.push([26+Math.random()*22,a0,a1,0.3+Math.random()*0.55]);
  }

  /* ---------- geometrie ---------- */
  var BODY=[[186,470],[181,451],[184,427],[194,408],[212,396],[236,391],[257,398],[266,412],[273,420],[278,427],[273,433],[279,440],[285,450],[288,458],[299,453],[308,446],[318,440],[330,432],[356,423],[392,416],[430,411],[478,412],[522,419],[560,427],[586,434],[634,433],[672,429],[706,426],[762,423],[822,426],[876,434],[936,441],[986,443],[1010,437],[1026,428],[1035,437],[1037,452],[1030,470]];
  var TORSO=[[318,440],[330,432],[356,423],[392,416],[430,411],[478,412],[522,419],[560,427]];
  var BLANK=[[557,419],[586,427],[634,426],[672,422],[706,419],[762,416],[822,419],[876,427],[936,435],[986,437],[1013,430],[1030,419],[1042,432],[1044,455],[1035,472]];
  var HAIR=[[258,400],[246,391],[228,387],[209,394],[193,407],[183,426],[184,449],[196,466],[209,471],[226,471],[237,451],[245,429],[252,413],[258,400]];
  var DRAPE=[[646,477],[651,499],[668,517],[692,507],[716,493],[742,509],[772,521],[800,510],[826,497],[856,512],[886,521],[914,507],[940,493],[962,481],[970,477]];
  var HPROF=[0.04,0.19,0.31,0.27,0.38,0.34,0.48,0.72,0.93,1.0,0.94,0.60];
  var HU=[0,0.06,0.13,0.20,0.27,0.34,0.43,0.53,0.64,0.75,0.87,1.0];
  var HANDS=[[369,445,16.5],[417,489,14.5]];

  function bump(x){return sm(298,378,x)*(1-sm(516,614,x));}
  function bodyPath(L){
    var p=[],i;
    for(i=0;i<BODY.length;i++)p.push([BODY[i][0],BODY[i][1]-L*bump(BODY[i][0])]);
    return mkPath(p,true);
  }
  function blanketPath(L){
    var p=[],i;
    for(i=0;i<BLANK.length;i++)p.push([BLANK[i][0],BLANK[i][1]-L*bump(BLANK[i][0])]);
    var q=mkPath(p,false);q.lineTo(557,472);q.closePath();return q;
  }
  var BTOP=[[557,419],[586,427],[634,426],[672,422],[706,419],[762,416],[822,419],[876,427],[936,435],[986,437],[1013,430],[1030,419]];
  var VFOLD=[[604,0.30,8],[652,0.16,5],[706,0.24,9],[772,0.13,5],[830,0.18,7],[900,0.10,5],[956,0.07,4]];
  function topY(x,L){return interp(TORSO,x)-L*bump(x);}
  function topB(x,L){return interp(BTOP,x)-L*bump(x);}
  function handPts(k,L){
    var x0=HANDS[k][0],x1=HANDS[k][1],rs=HANDS[k][2],pts=[],i;
    for(i=0;i<HU.length;i++){
      var xx=x0+(x1-x0)*HU[i];
      pts.push([xx,topY(xx,L)+2.2-rs*HPROF[i]]);
    }
    return pts;
  }
  var gp=null;

  return function draw(g,W,H,t){
    if(!gp)gp=g.createPattern(nc,'repeat');
    var ph=(t/6.66667)%1;
    var brz=ph<0.40?sm(0,0.40,ph):(ph<0.47?1:1-sm(0.47,0.96,ph));
    var L=7*brz,i,k,j;

    g.save();
    g.setTransform(1,0,0,1,0,0);
    g.globalCompositeOperation='source-over';
    g.globalAlpha=1;
    g.lineCap='round';g.lineJoin='round';

    /* ============ 1 - CYKLORAMA ============ */
    var wg=g.createLinearGradient(0,0,0,580);
    wg.addColorStop(0,'#050807');wg.addColorStop(0.30,'#0B100E');wg.addColorStop(0.68,'#141A16');wg.addColorStop(1,'#19201A');
    g.fillStyle=wg;g.fillRect(0,0,W,H);
    rad(g,884,336,690,1,0.80,'rgba(216,214,194,0.60)','rgba(216,214,194,0)');
    rad(g,832,396,360,1,0.74,'rgba(240,236,216,0.26)','rgba(240,236,216,0)');
    var lg=g.createLinearGradient(0,0,660,0);
    lg.addColorStop(0,'rgba(3,6,5,0.86)');lg.addColorStop(0.46,'rgba(3,6,5,0.40)');lg.addColorStop(1,'rgba(3,6,5,0)');
    g.fillStyle=lg;g.fillRect(0,0,660,580);
    var tg2=g.createLinearGradient(0,0,0,250);
    tg2.addColorStop(0,'rgba(2,4,4,0.70)');tg2.addColorStop(1,'rgba(2,4,4,0)');
    g.fillStyle=tg2;g.fillRect(0,0,W,250);

    /* ============ 2 - PODLAHA ============ */
    var fg=g.createLinearGradient(0,546,0,H);
    fg.addColorStop(0,'rgba(18,23,20,0)');fg.addColorStop(0.12,'rgba(15,20,17,0.9)');
    fg.addColorStop(0.30,'#0D1210');fg.addColorStop(1,'#050807');
    g.fillStyle=fg;g.fillRect(0,544,W,H-544);
    rad(g,238,622,330,1,0.42,'rgba(198,198,178,0.15)','rgba(198,198,178,0)');
    rad(g,850,604,540,1,0.24,'rgba(0,0,0,0.80)','rgba(0,0,0,0)');
    rad(g,1096,648,430,1,0.34,'rgba(0,0,0,0.60)','rgba(0,0,0,0)');
    g.fillStyle='rgba(2,4,3,0.94)';g.fillRect(150,558,912,5);
    var cg=g.createLinearGradient(0,562,0,596);
    cg.addColorStop(0,'rgba(2,4,3,0.86)');cg.addColorStop(1,'rgba(2,4,3,0)');
    g.fillStyle=cg;g.fillRect(150,562,912,36);

    /* ============ 3 - SOKL ============ */
    var pg=g.createLinearGradient(150,0,1062,0);
    pg.addColorStop(0,'#30372F');pg.addColorStop(0.26,'#1F2620');pg.addColorStop(0.62,'#121814');pg.addColorStop(1,'#0A0F0D');
    g.fillStyle=pg;g.fillRect(150,478,912,82);
    var pv=g.createLinearGradient(0,478,0,560);
    pv.addColorStop(0,'rgba(255,252,240,0.09)');pv.addColorStop(0.22,'rgba(0,0,0,0)');
    pv.addColorStop(0.80,'rgba(0,0,0,0.38)');pv.addColorStop(1,'rgba(126,140,118,0.12)');
    g.fillStyle=pv;g.fillRect(150,478,912,82);
    g.save();g.beginPath();g.rect(150,478,912,82);g.clip();
    g.globalCompositeOperation='overlay';g.globalAlpha=0.28;
    g.drawImage(mc,150,470,912,100);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    g.restore();

    /* ============ 4 - TELO ============ */
    var bp=bodyPath(L);
    var hA=handPts(0,L),hB=handPts(1,L);

    g.save();
    g.clip(bp);

    var bg=g.createLinearGradient(170,0,1080,0);
    bg.addColorStop(0,'#F7F3E8');bg.addColorStop(0.14,'#F0EBDD');bg.addColorStop(0.34,'#DEDACB');
    bg.addColorStop(0.55,'#B2B6AA');bg.addColorStop(0.76,'#787F74');bg.addColorStop(1,'#3E453F');
    g.fillStyle=bg;g.fillRect(150,380,930,96);

    var vgr=g.createLinearGradient(0,386,0,472);
    vgr.addColorStop(0,'rgba(10,16,13,0)');vgr.addColorStop(0.46,'rgba(10,16,13,0.07)');
    vgr.addColorStop(0.80,'rgba(8,13,11,0.36)');vgr.addColorStop(1,'rgba(6,10,9,0.70)');
    g.fillStyle=vgr;g.fillRect(150,380,930,96);

    /* klicove svetlo shora zleva */
    rad(g,232,400,80,1.18,1.0,'rgba(255,253,246,0.80)','rgba(255,253,246,0)');
    rad(g,270,412,28,1.0,1.0,'rgba(255,252,242,0.52)','rgba(255,252,242,0)');
    rad(g,282,428,13,1.0,1.0,'rgba(255,252,242,0.42)','rgba(255,252,242,0)');
    rad(g,424,398,178,1.32,0.62,'rgba(255,252,242,0.62)','rgba(255,252,242,0)');
    rad(g,372,414,96,1.3,0.72,'rgba(255,252,242,0.34)','rgba(255,252,242,0)');
    rad(g,350,420,60,1.2,0.8,'rgba(252,248,236,0.26)','rgba(252,248,236,0)');
    rad(g,648,416,180,1.05,0.46,'rgba(250,247,234,0.26)','rgba(250,247,234,0)');

    /* stiny, okluze, anatomie */
    rad(g,300,458,28,1.25,0.95,'rgba(8,13,11,0.62)','rgba(8,13,11,0)');
    rad(g,262,452,18,1.3,0.8,'rgba(8,13,11,0.34)','rgba(8,13,11,0)');
    rad(g,338,446,26,1.1,0.9,'rgba(8,13,11,0.40)','rgba(8,13,11,0)');
    rad(g,592,452,68,1.7,0.62,'rgba(10,16,13,0.30)','rgba(10,16,13,0)');
    rad(g,1000,458,54,1.5,0.7,'rgba(6,10,9,0.44)','rgba(6,10,9,0)');
    rad(g,194,452,32,1.0,1.0,'rgba(6,10,9,0.48)','rgba(6,10,9,0)');

    /* chladne odrazene svetlo zprava - zelen znacky ve stinech */
    g.globalCompositeOperation='lighter';
    rad(g,1140,458,340,1,0.72,'rgba(12,50,41,0.42)','rgba(12,50,41,0)');
    rad(g,880,450,210,1,0.6,'rgba(9,36,30,0.26)','rgba(9,36,30,0)');
    /* podpovrchovy rozptyl */
    rad(g,278,430,21,1.0,1.1,'rgba(212,132,84,0.30)','rgba(212,132,84,0)');
    rad(g,286,451,14,1.0,1.0,'rgba(204,124,74,0.26)','rgba(204,124,74,0)');
    rad(g,1028,432,20,1.0,1.0,'rgba(200,110,62,0.30)','rgba(200,110,62,0)');
    /* JEDINECNY DETAIL - kamen prosvita pod dlanemi, sili s nadechem */
    var bl=0.11+0.17*brz;
    rad(g,428,414,108,1.15,0.74,'rgba(228,142,80,'+bl.toFixed(3)+')','rgba(228,142,80,0)');
    rad(g,428,416,54,1.1,0.7,'rgba(246,180,116,'+(bl*0.66).toFixed(3)+')','rgba(246,180,116,0)');
    g.globalCompositeOperation='source-over';

    /* textura kamene */
    g.globalAlpha=0.88;g.drawImage(vc,0,0);g.globalAlpha=1;
    g.globalCompositeOperation='overlay';g.globalAlpha=0.24;
    g.drawImage(mc,150,372,930,110);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    g.globalAlpha=0.85;g.drawImage(cc,0,0);g.globalAlpha=1;

    /* pazde lezici podel tela */
    var arm=new Path2D();
    arm.moveTo(336,444-L*bump(336));
    arm.bezierCurveTo(384,452-L*bump(384),446,456-L*bump(446),512,456-L*bump(512));
    arm.bezierCurveTo(536,456,548,455,558,454);
    g.strokeStyle='rgba(10,16,13,0.20)';g.lineWidth=2.8;g.stroke(arm);
    g.save();g.translate(0,-2.6);
    g.strokeStyle='rgba(255,253,246,0.20)';g.lineWidth=1.6;g.stroke(arm);
    g.restore();
    rad(g,450,468,110,1.5,0.4,'rgba(8,13,11,0.30)','rgba(8,13,11,0)');

    /* zahyby kosile */
    for(i=0;i<2;i++){
      var fy=424+i*10,fl=new Path2D();
      fl.moveTo(346,fy-L*bump(346));
      fl.quadraticCurveTo(400,fy+8-L*bump(400),468,fy+5-L*bump(468));
      g.strokeStyle='rgba(12,20,16,'+(0.11-i*0.03).toFixed(3)+')';g.lineWidth=2.0;g.stroke(fl);
      g.save();g.translate(0,-1.8);
      g.strokeStyle='rgba(255,253,244,'+(0.14-i*0.04).toFixed(3)+')';g.lineWidth=1.0;g.stroke(fl);
      g.restore();
    }

    /* vlasy - vytesana hmota */
    var hp=mkPath(HAIR,true);
    g.save();g.clip(hp);
    var hg=g.createLinearGradient(196,384,250,472);
    hg.addColorStop(0,'#C3BCA9');hg.addColorStop(0.34,'#8A8F81');hg.addColorStop(0.72,'#454C45');hg.addColorStop(1,'#20261F');
    g.fillStyle=hg;g.fillRect(178,382,92,92);
    rad(g,213,396,40,1.15,0.85,'rgba(255,253,246,0.60)','rgba(255,253,246,0)');
    rad(g,230,470,42,1.2,0.8,'rgba(4,8,7,0.70)','rgba(4,8,7,0)');
    rad(g,186,440,26,0.9,1.1,'rgba(4,8,7,0.42)','rgba(4,8,7,0)');
    for(i=0;i<strands.length;i++){
      var st=strands[i];
      g.beginPath();g.arc(250,424,st[0],st[1],st[2]);
      g.strokeStyle='rgba(10,16,13,'+(0.12+st[3]*0.20).toFixed(3)+')';g.lineWidth=1.7;g.stroke();
      g.beginPath();g.arc(250,424,st[0]+1.9,st[1]+0.05,st[2]-0.05);
      g.strokeStyle='rgba(255,254,248,'+(0.05+st[3]*0.14).toFixed(3)+')';g.lineWidth=1.0;g.stroke();
    }
    g.restore();
    g.strokeStyle='rgba(255,253,246,0.34)';g.lineWidth=1.2;g.stroke(hp);

    /* oko, obrvi, usta, licni kost */
    rad(g,259,415,12,1.35,0.72,'rgba(10,16,13,0.42)','rgba(10,16,13,0)');
    rad(g,266,434,14,1.1,0.9,'rgba(10,16,13,0.20)','rgba(10,16,13,0)');
    g.beginPath();g.moveTo(252,420.6);g.quadraticCurveTo(258,423.2,265,419.4);
    g.strokeStyle='rgba(10,17,14,0.62)';g.lineWidth=1.6;g.stroke();
    g.beginPath();g.moveTo(252,418.2);g.quadraticCurveTo(258,420.6,265,417.2);
    g.strokeStyle='rgba(255,254,248,0.50)';g.lineWidth=1.0;g.stroke();
    g.beginPath();g.moveTo(272,440.6);g.quadraticCurveTo(278,442.6,284,441.4);
    g.strokeStyle='rgba(10,17,14,0.46)';g.lineWidth=1.4;g.stroke();
    g.beginPath();g.moveTo(271,433.4);g.lineTo(276,433.9);
    g.strokeStyle='rgba(10,17,14,0.40)';g.lineWidth=1.2;g.stroke();

    /* okluze dlani na hrudi */
    for(k=0;k<2;k++){
      var hh=k?hB:hA,mid=(hh[0][0]+hh[hh.length-1][0])/2;
      rad(g,mid+14,topY(mid,L)+4,46,1.0,0.30,'rgba(8,13,11,0.55)','rgba(8,13,11,0)');
    }

    /* obrysove svetlo */
    var rg=g.createLinearGradient(170,0,1060,0);
    rg.addColorStop(0,'rgba(255,255,250,0.95)');rg.addColorStop(0.30,'rgba(255,255,250,0.82)');
    rg.addColorStop(0.52,'rgba(255,255,250,0.34)');rg.addColorStop(0.78,'rgba(226,232,222,0.12)');
    rg.addColorStop(1,'rgba(196,214,204,0.16)');
    g.strokeStyle=rg;g.lineWidth=7;g.globalAlpha=0.28;g.stroke(bp);
    g.globalAlpha=1;g.lineWidth=2.2;g.stroke(bp);

    /* kontaktni okluze u desky */
    var oc=g.createLinearGradient(0,454,0,471);
    oc.addColorStop(0,'rgba(5,9,8,0)');oc.addColorStop(0.5,'rgba(5,9,8,0.26)');oc.addColorStop(1,'rgba(4,7,6,0.90)');
    g.fillStyle=oc;g.fillRect(150,452,930,20);
    g.restore();

    /* ============ 5 - DEKA ============ */
    var kp=blanketPath(L);
    g.save();g.clip(kp);
    var kg=g.createLinearGradient(550,0,1050,0);
    kg.addColorStop(0,'#E6E1D2');kg.addColorStop(0.24,'#BABDAE');kg.addColorStop(0.54,'#727870');
    kg.addColorStop(0.82,'#333A35');kg.addColorStop(1,'#1B221E');
    g.fillStyle=kg;g.fillRect(550,405,510,72);
    var kv=g.createLinearGradient(0,408,0,474);
    kv.addColorStop(0,'rgba(10,16,13,0)');kv.addColorStop(0.50,'rgba(10,16,13,0.16)');kv.addColorStop(1,'rgba(6,10,9,0.78)');
    g.fillStyle=kv;g.fillRect(550,405,510,72);
    rad(g,646,414,128,1.1,0.5,'rgba(255,252,242,0.32)','rgba(255,252,242,0)');
    rad(g,712,420,70,1.0,0.5,'rgba(255,252,242,0.16)','rgba(255,252,242,0)');
    rad(g,872,428,58,1.0,0.42,'rgba(250,246,234,0.30)','rgba(250,246,234,0)');
    rad(g,928,442,52,1.2,0.6,'rgba(6,10,9,0.34)','rgba(6,10,9,0)');
    rad(g,1016,432,34,1.0,0.5,'rgba(246,242,230,0.16)','rgba(246,242,230,0)');
    rad(g,942,452,60,1.3,0.6,'rgba(6,10,9,0.36)','rgba(6,10,9,0)');
    rad(g,760,448,90,1.5,0.6,'rgba(6,10,9,0.22)','rgba(6,10,9,0)');
    g.globalCompositeOperation='lighter';
    rad(g,1100,450,270,1,0.8,'rgba(12,48,39,0.34)','rgba(12,48,39,0)');
    rad(g,1030,430,26,1,1,'rgba(198,110,62,0.24)','rgba(198,110,62,0)');
    g.globalCompositeOperation='source-over';
    /* dlouhe zahyby textilie */
    for(i=0;i<2;i++){
      var y0=430+i*13,fp=new Path2D();
      fp.moveTo(596,y0+2-L*bump(596));
      fp.bezierCurveTo(700,y0-6,800,y0-2,872,y0+6);
      g.strokeStyle='rgba(10,16,13,'+(0.13-i*0.04).toFixed(3)+')';g.lineWidth=2.6;g.stroke(fp);
      g.save();g.translate(0,-2.4);
      g.strokeStyle='rgba(255,253,246,'+(0.13-i*0.04).toFixed(3)+')';g.lineWidth=1.1;g.stroke(fp);
      g.restore();
    }
    for(i=0;i<VFOLD.length;i++){
      var vfx=VFOLD[i][0],vfa=VFOLD[i][1],vfw=VFOLD[i][2];
      var vt=topB(vfx,L)+7,vp=new Path2D();
      vp.moveTo(vfx,vt);vp.bezierCurveTo(vfx+3,vt+16,vfx+6,vt+30,vfx+10,476);
      g.strokeStyle='rgba(6,10,9,'+(vfa*0.42).toFixed(3)+')';g.lineWidth=vfw*2.2;g.stroke(vp);
      g.strokeStyle='rgba(6,10,9,'+(vfa*0.34).toFixed(3)+')';g.lineWidth=vfw*0.9;g.stroke(vp);
      if(i%3===0){g.save();g.translate(-vfw*1.5,0);
      g.strokeStyle='rgba(255,253,246,'+(vfa*0.30).toFixed(3)+')';g.lineWidth=2.2;g.stroke(vp);
      g.restore();}
    }
    g.globalAlpha=0.7;g.drawImage(cc,0,0);g.globalAlpha=1;
    g.globalAlpha=0.72;g.drawImage(vc,0,0);g.globalAlpha=1;
    g.globalCompositeOperation='overlay';g.globalAlpha=0.30;
    g.drawImage(mc,548,398,516,86);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    var krg=g.createLinearGradient(550,0,1050,0);
    krg.addColorStop(0,'rgba(255,255,250,0.62)');krg.addColorStop(0.30,'rgba(255,255,250,0.22)');
    krg.addColorStop(0.62,'rgba(220,228,220,0.05)');krg.addColorStop(1,'rgba(178,200,190,0.10)');
    g.strokeStyle=krg;g.lineWidth=6;g.globalAlpha=0.26;g.stroke(kp);
    g.globalAlpha=1;g.lineWidth=1.7;g.stroke(kp);
    var koc=g.createLinearGradient(0,456,0,473);
    koc.addColorStop(0,'rgba(5,9,8,0)');koc.addColorStop(1,'rgba(4,7,6,0.88)');
    g.fillStyle=koc;g.fillRect(550,454,516,20);
    g.restore();

    /* prehyb deky - svinuty lem */
    var hemY=419-L*bump(557);
    var hem=new Path2D();
    hem.moveTo(556,hemY);hem.quadraticCurveTo(564,444,560,470);
    g.save();
    g.strokeStyle='rgba(6,10,9,0.50)';g.lineWidth=11;
    g.save();g.translate(5.5,1);g.stroke(hem);g.restore();
    var hg2=g.createLinearGradient(550,0,568,0);
    hg2.addColorStop(0,'#E4DECF');hg2.addColorStop(0.34,'#C0BBAC');hg2.addColorStop(0.72,'#6E7469');hg2.addColorStop(1,'#333A34');
    g.strokeStyle=hg2;g.lineWidth=7.5;g.stroke(hem);
    g.strokeStyle='rgba(255,255,250,0.55)';g.lineWidth=1.3;
    g.save();g.translate(-2.6,0);g.stroke(hem);g.restore();
    g.restore();

    /* ============ 6 - RUCE TERAPEUTKY ============ */
    for(k=0;k<2;k++){
      var pts=k?hB:hA,np=pts.length;
      var x0=pts[0][0],x1=pts[np-1][0],span=x1-x0,dim=k?1:0.84;
      if(k===1){rad(g,x0+2,topY(x0,L)-5,22,1.0,0.9,'rgba(8,13,11,0.50)','rgba(8,13,11,0)');}
      var hnd=mkPath(pts,false);
      hnd.lineTo(x1,topY(x1,L)+8);hnd.lineTo(x0,topY(x0,L)+8);hnd.closePath();
      g.save();g.clip(hnd);
      var hgr=g.createLinearGradient(x0+span*0.28,pts[9][1]-9,x1-span*0.08,topY(x1,L)+10);
      hgr.addColorStop(0,'#FEFCF6');hgr.addColorStop(0.40,'#F4EFE2');hgr.addColorStop(0.74,'#C6C9BB');hgr.addColorStop(1,'#7A8177');
      g.fillStyle=hgr;g.fillRect(x0-8,pts[9][1]-18,span+16,40);
      rad(g,x0+span*0.60,pts[9][1]+3,span*0.44,1.1,0.85,'rgba(255,255,250,'+(0.50*dim).toFixed(3)+')','rgba(255,255,250,0)');
      rad(g,x0+span*0.15,topY(x0+span*0.15,L)-2,span*0.24,1.25,0.7,'rgba(255,255,250,'+(0.28*dim).toFixed(3)+')','rgba(255,255,250,0)');
      rad(g,x1-4,topY(x1,L)+3,20,1.0,0.9,'rgba(8,13,11,0.48)','rgba(8,13,11,0)');
      for(i=1;i<8;i++){
        if(HPROF[i]<HPROF[i-1]){
          var gx=x0+span*HU[i];
          rad(g,gx+1,pts[i][1]+5,7.5,1.0,1.5,'rgba(14,22,18,0.22)','rgba(14,22,18,0)');
        }
      }
      g.globalCompositeOperation='lighter';
      rad(g,x0+span*0.5,topY(x0+span*0.5,L)+3,span*0.5,1,0.55,'rgba(226,142,82,'+(0.17+0.13*brz).toFixed(3)+')','rgba(226,142,82,0)');
      g.globalCompositeOperation='source-over';
      g.globalAlpha=0.5;g.drawImage(vc,0,0);g.globalAlpha=1;
      g.restore();
      var hrim=new Path2D();curve(hrim,pts,false);
      g.globalAlpha=0.26*dim;g.strokeStyle='rgba(255,255,250,0.9)';g.lineWidth=4.5;g.stroke(hrim);
      g.globalAlpha=1;g.strokeStyle='rgba(255,255,250,'+(0.60*dim).toFixed(3)+')';g.lineWidth=1.4;g.stroke(hrim);
    }

    /* ============ 7 - DESKA LEHATKA ============ */
    var tg=g.createLinearGradient(150,0,1062,0);
    tg.addColorStop(0,'#7A8173');tg.addColorStop(0.32,'#4F574E');tg.addColorStop(0.70,'#262D28');tg.addColorStop(1,'#151B17');
    g.fillStyle=tg;g.fillRect(150,470,912,12);
    var og=g.createLinearGradient(0,470,0,482);
    og.addColorStop(0,'rgba(3,6,5,0.92)');og.addColorStop(0.55,'rgba(3,6,5,0.14)');og.addColorStop(1,'rgba(3,6,5,0)');
    g.fillStyle=og;g.fillRect(176,470,864,12);
    var eg=g.createLinearGradient(150,0,1062,0);
    eg.addColorStop(0,'rgba(255,253,244,0.92)');eg.addColorStop(0.34,'rgba(255,253,244,0.42)');
    eg.addColorStop(0.72,'rgba(255,253,244,0.10)');eg.addColorStop(1,'rgba(210,226,216,0.10)');
    g.fillStyle=eg;g.fillRect(150,481,912,1.4);

    /* ============ 8 - SPLYVAJICI DEKA PRES HRANU ============ */
    var dp=mkPath(DRAPE,true);
    g.save();g.clip(dp);
    var dg=g.createLinearGradient(0,476,0,528);
    dg.addColorStop(0,'#262D28');dg.addColorStop(0.34,'#161C18');dg.addColorStop(0.78,'#0A0E0C');dg.addColorStop(1,'#060907');
    g.fillStyle=dg;g.fillRect(636,472,346,60);
    var dh=g.createLinearGradient(636,0,982,0);
    dh.addColorStop(0,'rgba(255,252,242,0.16)');dh.addColorStop(0.32,'rgba(255,252,242,0.03)');dh.addColorStop(1,'rgba(255,252,242,0)');
    g.fillStyle=dh;g.fillRect(636,472,346,60);
    var dfx=[678,730,786,846,908,952],dfa=[0.10,0.055,0.06,0.035,0.03,0.02];
    for(i=0;i<dfx.length;i++){
      rad(g,dfx[i],492,20,0.55,2.2,'rgba(255,252,242,'+dfa[i]+')','rgba(255,252,242,0)');
      rad(g,dfx[i]+22,496,16,0.5,2.4,'rgba(0,0,0,0.30)','rgba(0,0,0,0)');
    }
    g.globalCompositeOperation='overlay';g.globalAlpha=0.26;
    g.drawImage(mc,634,468,352,72);
    g.globalAlpha=1;g.globalCompositeOperation='source-over';
    g.restore();
    var edge=new Path2D();curve(edge,DRAPE.slice(1,14),false);
    g.save();g.globalCompositeOperation='lighter';
    g.strokeStyle='rgba(172,102,58,0.15)';g.lineWidth=2.6;g.stroke(edge);
    g.strokeStyle='rgba(206,184,152,0.10)';g.lineWidth=0.9;g.stroke(edge);
    g.restore();

    /* ============ 9 - ATMOSFERA ============ */
    g.save();
    g.globalCompositeOperation='lighter';
    g.translate(258,-140);g.rotate(0.70);
    var bal=[0.075,0.058,0.040,0.024];
    for(j=0;j<4;j++){
      rad(g,10+j*18,120+j*200,250,0.62,1.15,'rgba(255,248,232,'+bal[j]+')','rgba(255,248,232,0)');
    }
    g.restore();
    g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<motes.length;i++){
      var m=motes[i];
      var mxp=70+m[0]*560+Math.sin(t*0.11+m[4])*20;
      var myp=(m[1]*640+t*m[3]*6)%640;
      var al=m[5]*0.20*sm(0,80,myp)*(1-sm(380,520,myp))*sm(50,190,mxp)*(1-sm(440,640,mxp));
      if(al>0.004){g.fillStyle='rgba(255,250,236,'+al.toFixed(3)+')';g.beginPath();g.arc(mxp,myp,m[2],0,TAU);g.fill();}
    }
    rad(g,250,230,340,1,1,'rgba(255,244,224,0.045)','rgba(255,244,224,0)');
    g.restore();

    /* mlha nad podlahou */
    var hz=g.createLinearGradient(0,470,0,604);
    hz.addColorStop(0,'rgba(150,158,142,0)');hz.addColorStop(0.6,'rgba(140,150,136,0.055)');hz.addColorStop(1,'rgba(130,142,128,0)');
    g.fillStyle=hz;g.fillRect(0,470,W,144);

    /* vinetace */
    var vg2=g.createRadialGradient(470,330,190,470,330,830);
    vg2.addColorStop(0,'rgba(2,5,4,0)');vg2.addColorStop(0.55,'rgba(2,5,4,0.16)');vg2.addColorStop(1,'rgba(2,5,4,0.66)');
    g.fillStyle=vg2;g.fillRect(0,0,W,H);

    /* teplo-studeny rozklad */
    var tt=g.createLinearGradient(0,0,W,H);
    tt.addColorStop(0,'rgba(255,232,196,0.05)');tt.addColorStop(0.5,'rgba(255,255,255,0)');
    tt.addColorStop(1,'rgba(14,86,68,0.10)');
    g.fillStyle=tt;g.fillRect(0,0,W,H);

    /* zrno */
    g.save();g.globalCompositeOperation='overlay';g.globalAlpha=0.11;
    g.fillStyle=gp;g.fillRect(0,0,W,H);
    g.globalCompositeOperation='soft-light';g.globalAlpha=0.16;
    g.scale(2.6,2.6);g.fillStyle=gp;g.fillRect(0,0,W/2.6,H/2.6);
    g.restore();

    /* ============ 10 - POPISKY ============ */
    g.save();
    g.font='500 11px "JetBrains Mono", monospace';
    g.textBaseline='alphabetic';
    if('letterSpacing' in g)g.letterSpacing='0.24em';
    g.fillStyle='rgba(214,218,208,0.55)';
    g.fillText('ALABASTR',84,90);
    g.fillStyle='rgba(139,149,141,0.66)';
    g.fillText('DECH · 9 / MIN',84,622);
    if('letterSpacing' in g)g.letterSpacing='0px';
    g.strokeStyle='rgba(214,218,208,0.18)';g.lineWidth=1;
    g.beginPath();g.moveTo(84.5,102.5);g.lineTo(178.5,102.5);g.stroke();
    g.fillStyle='rgba(255,252,244,0.85)';
    g.beginPath();g.arc(84.5+94*brz,102.5,2.1,0,TAU);g.fill();
    g.restore();

    g.restore();
  };
};
