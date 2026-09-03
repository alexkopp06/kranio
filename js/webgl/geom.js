/* ============================================================
   geom.js — GEOMETRICKÉ JÁDRO

   Čistá geometrie. Žádné WebGL, žádné DOM: jen matice, sítě
   a stavební prvky. Díky tomu se dá celá scéna postavit
   a zkontrolovat i mimo prohlížeč — a hlavně se dá znovu
   použít v obou sekcích i v hero.

   ------------------------------------------------------------
   PROČ ZÁSOBNÍK TRANSFORMACÍ

   Ruka má osmnáct článků. Kdyby se každý počítal v globálních
   souřadnicích, byla by z toho tabulka čísel, kterou nikdo
   nikdy neupraví. Se zásobníkem se článek postaví v počátku
   a jen se zavěsí na rodiče — přesně jako kostra v 3D programu.

     m.push(); m.rotZ(a); m.move(0, L, 0);  ...článek...  m.pop();

   ------------------------------------------------------------
   ATRIBUTY VRCHOLU

     pos   poloha
     nrm   normála (počítá se z ploch, neodhaduje se)
     aoV   zapuštění — 0 na vypouklině, 1 v zákoutí. Dělá se
           ručně při stavbě, protože spočítat pravé AO by na
           klientovi trvalo déle než celá animace.
     key   klíč pro děj: podle něj scéna rozsvěcí, odkrývá
           a posílá vlnu. Jedno číslo pro celou scénu.
   ============================================================ */
(function (root) {
  "use strict";

  var TAU = Math.PI * 2;

  /* ---------- matice 4×4 (sloupcově, jako WebGL) ------------- */
  function mat4() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }
  function mulInto(out, a, b) {
    var t = new Float32Array(16);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      t[i*4+j] = a[j]*b[i*4] + a[4+j]*b[i*4+1] + a[8+j]*b[i*4+2] + a[12+j]*b[i*4+3];
    }
    out.set(t);
    return out;
  }
  function fromTranslate(x, y, z) {
    var m = mat4(); m[12]=x; m[13]=y; m[14]=z; return m;
  }
  function fromScale(x, y, z) {
    var m = mat4(); m[0]=x; m[5]=y; m[10]=z; return m;
  }
  function fromRotX(a) {
    var m = mat4(), c = Math.cos(a), s = Math.sin(a);
    m[5]=c; m[6]=s; m[9]=-s; m[10]=c; return m;
  }
  function fromRotY(a) {
    var m = mat4(), c = Math.cos(a), s = Math.sin(a);
    m[0]=c; m[2]=-s; m[8]=s; m[10]=c; return m;
  }
  function fromRotZ(a) {
    var m = mat4(), c = Math.cos(a), s = Math.sin(a);
    m[0]=c; m[1]=s; m[4]=-s; m[5]=c; return m;
  }
  function applyPoint(m, x, y, z) {
    return [m[0]*x + m[4]*y + m[8]*z + m[12],
            m[1]*x + m[5]*y + m[9]*z + m[13],
            m[2]*x + m[6]*y + m[10]*z + m[14]];
  }

  /* ---------- drobná matematika ------------------------------ */
  function norm(v) {
    var L = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0]/L, v[1]/L, v[2]/L];
  }
  function cross(a, b) {
    return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* Catmull-Rom skrz body → hustá dráha ve 3D */
  function curve(pts, steps) {
    steps = steps || 10;
    var p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    var out = [];
    for (var i = 1; i < p.length - 2; i++) {
      var a = p[i-1], b = p[i], c = p[i+1], d = p[i+2];
      for (var j = 0; j < steps; j++) {
        var t = j / steps, t2 = t*t, t3 = t2*t, o = [0,0,0];
        for (var k = 0; k < 3; k++) {
          o[k] = 0.5 * ((2*b[k]) + (-a[k]+c[k])*t +
                 (2*a[k]-5*b[k]+4*c[k]-d[k])*t2 +
                 (-a[k]+3*b[k]-3*c[k]+d[k])*t3);
        }
        out.push(o);
      }
    }
    out.push(pts[pts.length-1].slice());
    return out;
  }

  /* ============================================================
     SÍŤ
     ============================================================ */
  function Mesh() {
    this.pos = []; this.nrm = []; this.ao = []; this.key = [];
    this.idx = [];
    this._stack = [mat4()];
    this._ao = 0; this._key = 0;
  }
  Mesh.prototype.top = function () { return this._stack[this._stack.length - 1]; };
  Mesh.prototype.push = function () {
    var m = mat4(); m.set(this.top());
    this._stack.push(m);
    return this;
  };
  Mesh.prototype.pop = function () {
    if (this._stack.length > 1) this._stack.pop();
    return this;
  };
  Mesh.prototype.apply = function (m) { mulInto(this.top(), this.top(), m); return this; };
  Mesh.prototype.move  = function (x, y, z) { return this.apply(fromTranslate(x, y, z)); };
  Mesh.prototype.scale = function (x, y, z) {
    return this.apply(fromScale(x, y == null ? x : y, z == null ? x : z));
  };
  Mesh.prototype.rotX = function (a) { return this.apply(fromRotX(a)); };
  Mesh.prototype.rotY = function (a) { return this.apply(fromRotY(a)); };
  Mesh.prototype.rotZ = function (a) { return this.apply(fromRotZ(a)); };
  /* zapuštění a klíč děje platí pro všechny další vrcholy */
  Mesh.prototype.setAO  = function (v) { this._ao = v; return this; };
  Mesh.prototype.setKey = function (v) { this._key = v; return this; };

  Mesh.prototype.vert = function (x, y, z, ao, key) {
    var p = applyPoint(this.top(), x, y, z);
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(0, 0, 0);
    this.ao.push(ao == null ? this._ao : ao);
    this.key.push(key == null ? this._key : key);
    return this.pos.length / 3 - 1;
  };
  Mesh.prototype.tri = function (a, b, c) { this.idx.push(a, b, c); };
  Mesh.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };

  /* MĚKKÁ PODLAHA — dotyk, ne průnik.
     Ruka položená na tělo nesmí do těla zajet ani se nad ním
     vznášet. Softplus místo tvrdého ořezu: nad hranicí se nic
     nemění, pod ní se tvar plynule usadí — z bříška prstu
     vznikne ploška přesně tak, jak se prst o kůži opře.
     Volá se PŘED finish(), aby se normály dopočítaly ze
     zdeformovaného tvaru.                                   */
  Mesh.prototype.press = function (y0, soft) {
    soft = soft || 0.02;
    var p = this.pos;
    for (var i = 1; i < p.length; i += 3) {
      var t = (p[i] - y0) / soft;
      if (t > 12) continue;                       /* daleko nad — beze změny */
      p[i] = y0 + soft * (t > -12 ? Math.log(1 + Math.exp(t)) : 0);
    }
    return this;
  };

  /* Normály z ploch. Sdílený vrchol = hladký přechod, nesdílený
     = ostrá hrana. Právě tím vzniká rozdíl mezi kostí a hranou
     nehtu, ne dodatečným vyhlazováním.                        */
  Mesh.prototype.finish = function () {
    var p = this.pos, n = this.nrm, ix = this.idx;
    for (var i = 0; i < ix.length; i += 3) {
      var a = ix[i]*3, b = ix[i+1]*3, c = ix[i+2]*3;
      var ax = p[b]-p[a], ay = p[b+1]-p[a+1], az = p[b+2]-p[a+2];
      var bx = p[c]-p[a], by = p[c+1]-p[a+1], bz = p[c+2]-p[a+2];
      var nx = ay*bz - az*by, ny = az*bx - ax*bz, nz = ax*by - ay*bx;
      n[a]+=nx; n[a+1]+=ny; n[a+2]+=nz;
      n[b]+=nx; n[b+1]+=ny; n[b+2]+=nz;
      n[c]+=nx; n[c+1]+=ny; n[c+2]+=nz;
    }
    for (i = 0; i < n.length; i += 3) {
      var L = Math.hypot(n[i], n[i+1], n[i+2]) || 1;
      n[i]/=L; n[i+1]/=L; n[i+2]/=L;
    }
    var big = this.pos.length / 3 > 65535;
    return {
      pos: new Float32Array(this.pos),
      nrm: new Float32Array(this.nrm),
      ao:  new Float32Array(this.ao),
      key: new Float32Array(this.key),
      idx: big ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
      count: this.idx.length,
      big: big
    };
  };

  /* ============================================================
     STAVEBNÍ PRVKY
     ============================================================ */

  /* PROTAŽENÍ — hlavní nástroj. Dostane seznam prstenců
     (každý stejně bodů) a sešije je. Z toho se dá udělat prst,
     dlaň, kost i deka; rozdíl je jen v tom, jaký prstenec se
     dodá.                                                     */
  function loft(mesh, rings, opt) {
    opt = opt || {};
    var rows = [];
    for (var i = 0; i < rings.length; i++) {
      var row = [];
      for (var j = 0; j < rings[i].length; j++) {
        var q = rings[i][j];
        row.push(mesh.vert(q[0], q[1], q[2], q[3], q[4]));
      }
      rows.push(row);
    }
    var closed = opt.closed !== false;   /* prstenec dokola */
    for (i = 0; i < rows.length - 1; i++) {
      var A = rows[i], B = rows[i+1];
      var n = A.length;
      for (j = 0; j < (closed ? n : n - 1); j++) {
        var k = (j + 1) % n;
        mesh.quad(A[j], B[j], B[k], A[k]);
      }
    }
    /* víčka: vějíř ze středu prstence */
    if (opt.capStart) capRing(mesh, rings[0], rows[0], true);
    if (opt.capEnd)   capRing(mesh, rings[rings.length-1], rows[rows.length-1], false);
    return rows;
  }

  function capRing(mesh, ring, row, flip) {
    var cx = 0, cy = 0, cz = 0, ao = 0;
    for (var i = 0; i < ring.length; i++) {
      cx += ring[i][0]; cy += ring[i][1]; cz += ring[i][2];
      ao += (ring[i][3] || 0);
    }
    var n = ring.length;
    var c = mesh.vert(cx/n, cy/n, cz/n, ao/n, ring[0][4]);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      if (flip) mesh.tri(c, row[j], row[i]);
      else mesh.tri(c, row[i], row[j]);
    }
  }

  /* PRSTENEC: elipsa se zaoblenými rohy. Jedním číslem se z ní
     stane kruh (kost), plochý ovál (prst) nebo zaoblený obdélník
     (dlaň, hrudní kost). Tenhle jeden tvar pokryje skoro celou
     scénu.                                                    */
  function ring(seg, rx, ry, opt) {
    opt = opt || {};
    var sq = opt.square == null ? 0 : opt.square;   /* 0 elipsa … 1 obdélník */
    var out = [];
    for (var i = 0; i < seg; i++) {
      var a = i / seg * TAU;
      var c = Math.cos(a), s = Math.sin(a);
      /* superelipsa: |x|^n + |y|^n = 1 */
      var n2 = lerp(2, 5.5, sq);
      var k = Math.pow(Math.pow(Math.abs(c), n2) + Math.pow(Math.abs(s), n2), -1/n2);
      out.push([c * k * rx, s * k * ry, 0]);
    }
    return out;
  }

  /* Prstenec posazený do rámu (osa + normála + binormála). */
  function place(r2d, o, N, B, ao, key) {
    var out = [];
    for (var i = 0; i < r2d.length; i++) {
      var u = r2d[i][0], v = r2d[i][1];
      out.push([o[0] + N[0]*u + B[0]*v,
                o[1] + N[1]*u + B[1]*v,
                o[2] + N[2]*u + B[2]*v, ao, key]);
    }
    return out;
  }

  /* TRUBKA po dráze s paralelním přenosem rámů. Bez přenosu se
     trubka po zakřivené dráze zkroutí a žebro vypadá jako
     pomačkaná stuha.                                          */
  function tube(mesh, path, radiusFn, seg, opt) {
    opt = opt || {};
    seg = seg || 10;
    var rings = [];
    var prevN = null;
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      var a = path[Math.max(0, i-1)], b = path[Math.min(path.length-1, i+1)];
      var T = norm([b[0]-a[0], b[1]-a[1], b[2]-a[2]]);
      var N;
      /* Pevný rám. Žebro je plochá lišta, ne provaz — musí vědět,
         kde má výšku a kde tloušťku. Paralelní přenos to sám od
         sebe neudrží: po zakřivené dráze se rám stočí a z lišty
         je pomačkaná stuha. S `up` se prstenec drží svislice. */
      if (opt.up) {
        var u = opt.up;
        var d0 = u[0]*T[0] + u[1]*T[1] + u[2]*T[2];
        var cand = [u[0]-T[0]*d0, u[1]-T[1]*d0, u[2]-T[2]*d0];
        if (Math.hypot(cand[0], cand[1], cand[2]) < 1e-4) {
          cand = cross(T, [1, 0, 0]);
        }
        N = norm(cand);
        prevN = N;
      } else if (!prevN) {
        N = norm(cross(T, Math.abs(T[1]) > 0.9 ? [1,0,0] : [0,1,0]));
      } else {
        var d = prevN[0]*T[0] + prevN[1]*T[1] + prevN[2]*T[2];
        N = norm([prevN[0]-T[0]*d, prevN[1]-T[1]*d, prevN[2]-T[2]*d]);
        prevN = N;
      }
      var B = norm(cross(T, N));
      var u = i / (path.length - 1);
      var r = radiusFn(u);
      var rx = (r.length ? r[0] : r), ry = (r.length ? r[1] : r);
      rings.push(place(ring(seg, rx, ry, opt), p, N, B,
        opt.ao == null ? 0 : (typeof opt.ao === "function" ? opt.ao(u) : opt.ao),
        opt.key == null ? 0 : (typeof opt.key === "function" ? opt.key(u) : opt.key)));
    }
    return loft(mesh, rings, { capStart: opt.caps !== false, capEnd: opt.caps !== false });
  }

  /* KOULE tvarovaná funkcí. Skoro každá kost na ní stojí:
     dostane směr a vrátí poloměr.                            */
  function blob(mesh, uSeg, vSeg, fn, opt) {
    opt = opt || {};
    var rings = [];
    for (var v = 0; v <= vSeg; v++) {
      var ph = v / vSeg * Math.PI;
      var sy = Math.cos(ph), sr = Math.sin(ph);
      var row = [];
      for (var u = 0; u < uSeg; u++) {
        var th = u / uSeg * TAU;
        var d = [Math.cos(th)*sr, sy, Math.sin(th)*sr];
        var q = fn(d, u/uSeg, v/vSeg);
        row.push([q[0], q[1], q[2], q[3] == null ? 0 : q[3], q[4] == null ? 0 : q[4]]);
      }
      rings.push(row);
    }
    return loft(mesh, rings, {});
  }

  /* PLÁT s tloušťkou — kost křížová, lopatka, deka, ciferník. */
  function sheet(mesh, uSeg, vSeg, fn, thick, opt) {
    opt = opt || {};
    var top = [], bot = [];
    for (var v = 0; v <= vSeg; v++) {
      var rowT = [], rowB = [];
      for (var u = 0; u <= uSeg; u++) {
        var q = fn(u/uSeg, v/vSeg);
        var t = typeof thick === "function" ? thick(u/uSeg, v/vSeg) : thick;
        var n = q.n || [0, 0, 1];
        rowT.push([q.p[0]+n[0]*t, q.p[1]+n[1]*t, q.p[2]+n[2]*t, q.ao || 0, q.key || 0]);
        rowB.push([q.p[0]-n[0]*t, q.p[1]-n[1]*t, q.p[2]-n[2]*t, (q.ao || 0) + 0.15, q.key || 0]);
      }
      top.push(rowT); bot.push(rowB);
    }
    function grid(rows, flip) {
      var ids = rows.map(function (r) {
        return r.map(function (q) { return mesh.vert(q[0], q[1], q[2], q[3], q[4]); });
      });
      for (var i = 0; i < ids.length - 1; i++) {
        for (var j = 0; j < ids[i].length - 1; j++) {
          if (flip) mesh.quad(ids[i][j], ids[i][j+1], ids[i+1][j+1], ids[i+1][j]);
          else mesh.quad(ids[i][j], ids[i+1][j], ids[i+1][j+1], ids[i][j+1]);
        }
      }
      return ids;
    }
    var idT = grid(top, false), idB = grid(bot, true);
    /* boky, aby plát nebyl papír */
    for (var i = 0; i < idT.length - 1; i++) {
      mesh.quad(idT[i][0], idT[i+1][0], idB[i+1][0], idB[i][0]);
      var last = idT[i].length - 1;
      mesh.quad(idB[i][last], idB[i+1][last], idT[i+1][last], idT[i][last]);
    }
    for (var j = 0; j < idT[0].length - 1; j++) {
      var e = idT.length - 1;
      mesh.quad(idB[0][j], idB[0][j+1], idT[0][j+1], idT[0][j]);
      mesh.quad(idT[e][j], idT[e][j+1], idB[e][j+1], idB[e][j]);
    }
    return { top: idT, bot: idB };
  }

  root.KJGeom = {
    Mesh: Mesh, loft: loft, ring: ring, place: place,
    tube: tube, blob: blob, sheet: sheet, curve: curve,
    norm: norm, cross: cross, lerp: lerp, clamp: clamp, smooth: smooth,
    mat4: mat4, mul: mulInto, translate: fromTranslate, scaleM: fromScale,
    rotX: fromRotX, rotY: fromRotY, rotZ: fromRotZ, applyPoint: applyPoint,
    TAU: TAU
  };
})(typeof window !== "undefined" ? window : globalThis);
