/* ============================================================
   anatomy-mesh.js — GEOMETRIE POSTAVY

   Staví skutečné trojrozměrné sítě: lebku, dvacet čtyři obratlů,
   žebra, hrudní kost, pánev, durální tubus a nervový strom.
   Nic z toho není plochá kresba natočená do prostoru — každý
   kus má objem, normály a vlastní stínování.

   ------------------------------------------------------------
   SOUŘADNICE

       x   −1 vlevo        …  +1 vpravo
       y   +0.98 temeno    …  −1.00 chodidla
       z   −0.5 vzadu      …  +0.5 vpředu   (obličej k divákovi)

   Proporce jsou z antropometrie, ne od oka:

       temeno    +0.980      pas        +0.250
       brada     +0.720      rozkrok     0.000
       ramena    +0.620      koleno     −0.500
       bradavky  +0.450      kotník     −0.920

   ------------------------------------------------------------
   ATRIBUTY, KTERÉ NESE KAŽDÝ VRCHOL

       aPos    poloha
       aNrm    normála (počítaná z ploch, ne odhadovaná)
       aS      podíl na kraniosakrální ose: 0 = temeno, 1 = kostrč
               — podle něj se scéna dokresluje a po ní putuje vlna
       aExp    váha dechu: 0 = nehne se, 1 = rozpíná se naplno
               (žebra a hrudní kost mají 1, lebka 0)

   `aS` je důvod, proč celá scéna drží pohromadě: dokreslení,
   vlna i still point pracují s jedním číslem, ne s pěti
   nezávislými časovači.
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------- kraniosakrální osa ----------------------------- */
  var Y_TOP = 0.98, Y_BOT = -0.06;
  function sOf(y) {
    var s = (Y_TOP - y) / (Y_TOP - Y_BOT);
    return s < 0 ? 0 : s > 1 ? 1 : s;
  }

  /* ---------- akumulátor sítě -------------------------------- */
  function Mesh() {
    this.pos = []; this.nrm = []; this.s = []; this.exp = [];
    this.idx = [];
  }
  Mesh.prototype.vert = function (x, y, z, expW) {
    this.pos.push(x, y, z);
    this.nrm.push(0, 0, 0);
    this.s.push(sOf(y));
    this.exp.push(expW || 0);
    return this.pos.length / 3 - 1;
  };
  Mesh.prototype.tri = function (a, b, c) { this.idx.push(a, b, c); };
  Mesh.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };

  /* Normály z ploch. Průměrování přes sdílené vrcholy dělá
     hladký povrch; ostré hrany vznikají tím, že se vrchol
     nesdílí (žebra, výběžky obratlů).                        */
  Mesh.prototype.finish = function () {
    var p = this.pos, n = this.nrm, ix = this.idx;
    for (var i = 0; i < ix.length; i += 3) {
      var a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
      var ax = p[b] - p[a], ay = p[b + 1] - p[a + 1], az = p[b + 2] - p[a + 2];
      var bx = p[c] - p[a], by = p[c + 1] - p[a + 1], bz = p[c + 2] - p[a + 2];
      var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      n[a] += nx; n[a + 1] += ny; n[a + 2] += nz;
      n[b] += nx; n[b + 1] += ny; n[b + 2] += nz;
      n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
    }
    for (i = 0; i < n.length; i += 3) {
      var L = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      n[i] /= L; n[i + 1] /= L; n[i + 2] /= L;
    }
    return {
      pos: new Float32Array(this.pos),
      nrm: new Float32Array(this.nrm),
      s:   new Float32Array(this.s),
      exp: new Float32Array(this.exp),
      idx: (this.pos.length / 3 > 65535) ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
      count: this.idx.length,
      big: this.pos.length / 3 > 65535
    };
  };

  /* ---------- drobná matematika ------------------------------ */
  function norm(v) {
    var L = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / L, v[1] / L, v[2] / L];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function smoothstep(a, b, x) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  /* Catmull-Rom skrz body → hustá dráha */
  function curve(pts, steps) {
    steps = steps || 10;
    var p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    var out = [];
    for (var i = 1; i < p.length - 2; i++) {
      var a = p[i - 1], b = p[i], c = p[i + 1], d = p[i + 2];
      for (var j = 0; j < steps; j++) {
        var t = j / steps, t2 = t * t, t3 = t2 * t, o = [0, 0, 0];
        for (var k = 0; k < 3; k++) {
          o[k] = 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * t +
                 (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
                 (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
        }
        out.push(o);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  /* ============================================================
     STAVEBNÍ PRVKY
     ============================================================ */

  /* TRUBKA po dráze. Rámy se přenášejí paralelně — bez toho se
     trubka po zakřivené dráze zkroutí a žebro vypadá jako
     pomačkaná stuha.                                           */
  function tube(mesh, path, radiusFn, seg, expW, closeEnds) {
    seg = seg || 8;
    var rings = [];
    var up = [0, 1, 0];
    var prevN = null;

    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      var a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
      var T = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      var N;
      if (!prevN) {
        N = norm(cross(T, Math.abs(T[1]) > 0.9 ? [1, 0, 0] : up));
      } else {
        /* projekce předchozí normály do nové roviny = paralelní přenos */
        var d = prevN[0] * T[0] + prevN[1] * T[1] + prevN[2] * T[2];
        N = norm([prevN[0] - T[0] * d, prevN[1] - T[1] * d, prevN[2] - T[2] * d]);
      }
      prevN = N;
      var B = cross(T, N);
      /* Poloměr smí být i dvojice [podél N, podél B] — žebro
         a lopatka jsou ploché pásky, ne dráty.               */
      var r = typeof radiusFn === "function" ? radiusFn(i / (path.length - 1)) : radiusFn;
      var rN = r, rB = r;
      if (r && r.length === 2) { rN = r[0]; rB = r[1]; }
      var ring = [];
      for (var j = 0; j < seg; j++) {
        var ang = (j / seg) * Math.PI * 2;
        var cx = Math.cos(ang) * rN, cy = Math.sin(ang) * rB;
        var vx = p[0] + N[0] * cx + B[0] * cy;
        var vy = p[1] + N[1] * cx + B[1] * cy;
        var vz = p[2] + N[2] * cx + B[2] * cy;
        var w = typeof expW === "function" ? expW(i / (path.length - 1)) : expW;
        ring.push(mesh.vert(vx, vy, vz, w));
      }
      rings.push(ring);
    }
    for (i = 0; i < rings.length - 1; i++) {
      for (var j2 = 0; j2 < seg; j2++) {
        var k = (j2 + 1) % seg;
        mesh.quad(rings[i][j2], rings[i][k], rings[i + 1][k], rings[i + 1][j2]);
      }
    }
    if (closeEnds) {
      [0, rings.length - 1].forEach(function (ri, side) {
        var p2 = path[ri];
        var c = mesh.vert(p2[0], p2[1], p2[2], typeof expW === "function" ? expW(side) : expW);
        for (var j3 = 0; j3 < seg; j3++) {
          var k2 = (j3 + 1) % seg;
          if (side === 0) mesh.tri(c, rings[ri][k2], rings[ri][j3]);
          else mesh.tri(c, rings[ri][j3], rings[ri][k2]);
        }
      });
    }
    return rings;
  }

  /* KOULE, kterou tvaruje funkce. Skoro celá kostra na ní stojí:
     lebka, obratlová těla i pánevní lopaty jsou deformované
     koule, protože tak zůstane povrch hladký a normály čisté. */
  function blob(mesh, uSeg, vSeg, fn, expW) {
    var grid = [];
    for (var v = 0; v <= vSeg; v++) {
      var row = [];
      var phi = (v / vSeg) * Math.PI;
      for (var u = 0; u < uSeg; u++) {
        var th = (u / uSeg) * Math.PI * 2;
        var d = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
        var p = fn(d, u / uSeg, v / vSeg);
        row.push(mesh.vert(p[0], p[1], p[2], typeof expW === "function" ? expW(p) : (expW || 0)));
      }
      grid.push(row);
    }
    for (v = 0; v < vSeg; v++) {
      for (u = 0; u < uSeg; u++) {
        var k = (u + 1) % uSeg;
        mesh.quad(grid[v][u], grid[v][k], grid[v + 1][k], grid[v + 1][u]);
      }
    }
    return grid;
  }

  /* PLÁT — plocha s tloušťkou. Pánevní lopata a lopatka nejsou
     ani koule, ani trubka: jsou to zakřivené desky.           */
  function sheet(mesh, uSeg, vSeg, fn, thick, expW) {
    var A = [], B = [];
    for (var v = 0; v <= vSeg; v++) {
      var ra = [], rb = [];
      for (var u = 0; u <= uSeg; u++) {
        var r = fn(u / uSeg, v / vSeg);
        var p = r.p, n = norm(r.n);
        var t = thick * (r.t == null ? 1 : r.t) * 0.5;
        ra.push(mesh.vert(p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t, expW || 0));
        rb.push(mesh.vert(p[0] - n[0] * t, p[1] - n[1] * t, p[2] - n[2] * t, expW || 0));
      }
      A.push(ra); B.push(rb);
    }
    for (v = 0; v < vSeg; v++) {
      for (u = 0; u < uSeg; u++) {
        mesh.quad(A[v][u], A[v][u + 1], A[v + 1][u + 1], A[v + 1][u]);
        mesh.quad(B[v][u], B[v + 1][u], B[v + 1][u + 1], B[v][u + 1]);
      }
    }
    /* okraje, aby deska nebyla papír */
    for (v = 0; v < vSeg; v++) {
      mesh.quad(A[v][0], B[v][0], B[v + 1][0], A[v + 1][0]);
      mesh.quad(B[v][uSeg], A[v][uSeg], A[v + 1][uSeg], B[v + 1][uSeg]);
    }
    for (u = 0; u < uSeg; u++) {
      mesh.quad(B[0][u], A[0][u], A[0][u + 1], B[0][u + 1]);
      mesh.quad(A[vSeg][u], B[vSeg][u], B[vSeg][u + 1], A[vSeg][u + 1]);
    }
  }

  /* ============================================================
     PÁTEŘ — osa, na které visí všechno ostatní
     Dvojité zakřivení (krční a bederní lordóza, hrudní kyfóza)
     je nejčastější věc, na které se pozná kresba od oka.
     ============================================================ */
  var SPINE_KEY = [
    [0,  0.715, 0.020],   /* velký týlní otvor    */
    [0,  0.672, 0.030],   /* C2                   */
    [0,  0.620, 0.034],   /* C4 — krční lordóza   */
    [0,  0.560, 0.014],   /* C7 / T1              */
    [0,  0.480, -0.012],  /* T4                   */
    [0,  0.400, -0.026],  /* T7 — hrudní kyfóza   */
    [0,  0.320, -0.024],  /* T10                  */
    [0,  0.252, -0.006],  /* T12                  */
    [0,  0.196, 0.016],   /* L2 — bederní lordóza */
    [0,  0.140, 0.026],   /* L4                   */
    [0,  0.096, 0.012],   /* L5 / S1              */
    [0,  0.030, -0.014],  /* S3                   */
    [0, -0.030, -0.030]   /* kostrč               */
  ];
  var SPINE = curve(SPINE_KEY, 14);

  function spineAt(u) {
    var i = Math.max(0, Math.min(SPINE.length - 2, Math.floor(u * (SPINE.length - 1))));
    var f = u * (SPINE.length - 1) - i;
    var a = SPINE[i], b = SPINE[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  /* ============================================================
     LEBKA
     Deformovaná koule. Postup je stejný, jako když se lebka
     modeluje z hlíny: klenba, týlní hrbol, spánkové zploštění,
     nadočnicové oblouky, oční důlky, nosní otvor, horní čelist.
     ============================================================ */
  function buildSkull(mesh) {
    var C = [0, 0.848, 0.004];
    /* Klenba musí zůstat UVNITŘ porcelánové hlavy. Když byla
       širší, prorážela povrch a hlava vypadala jako přilba. */
    var R = [0.064, 0.092, 0.086];

    /* Obličej se nekreslí. Je to rozhodnutí, ne úspora:
       prosvítající oční důlky dělaly z porcelánové hlavy masku
       a na webu, který má slibovat bezpečí, je to to poslední,
       co tam smí být. Zůstává lebeční klenba — přesně ta část,
       se kterou kraniosakrální terapie pracuje.               */
    blob(mesh, 52, 32, function (d) {
      var k = 1;
      k += 0.052 * smoothstep(0.10, 0.95, d[1]);                 /* klenba      */
      k += 0.044 * smoothstep(0.25, 0.95, -d[2]) * smoothstep(-0.50, 0.20, d[1]); /* týlní hrbol */
      k -= 0.060 * smoothstep(0.52, 0.98, Math.abs(d[0])) * smoothstep(-0.35, 0.45, d[1]); /* spánky */
      k += 0.026 * smoothstep(0.45, 0.95, d[2]) * smoothstep(0.00, 0.26, d[1]) * (1 - smoothstep(0.26, 0.56, d[1]));

      var p = [C[0] + d[0] * R[0] * k, C[1] + d[1] * R[1] * k, C[2] + d[2] * R[2] * k];
      /* báze se pod klenbou zužuje a otevírá do velkého
         týlního otvoru — tam začíná tvrdá plena             */
      var low = smoothstep(-0.10, -0.85, d[1]);
      p[0] *= 1 - 0.30 * low;
      p[2] *= 1 - 0.22 * low;
      p[1] += 0.020 * low;
      return p;
    }, 0);

    /* LEBEČNÍ ŠVY — tři, které mají jméno a o kterých mluví
       pátá stanice ošetření. Skrz porcelán jsou jen naznačené,
       ale jsou to ony, ne ornament.                          */
    function suture(pts) {
      tube(mesh, curve(pts, 8), function (t) {
        return 0.0042 * (0.55 + 0.45 * Math.sin(t * Math.PI));
      }, 5, 0, true);
    }
    /* šípový — zepředu dozadu přes temeno */
    suture([
      [0, 0.900, 0.068], [0, 0.938, 0.036], [0, 0.944, -0.016], [0, 0.916, -0.058]
    ]);
    /* věnčitý — napříč temenem */
    suture([
      [-0.058, 0.884, 0.010], [-0.040, 0.922, 0.030], [0, 0.940, 0.034],
      [0.040, 0.922, 0.030], [0.058, 0.884, 0.010]
    ]);
    /* lambdový — vzadu, ve tvaru písmene lambda */
    suture([
      [-0.052, 0.852, -0.048], [-0.030, 0.888, -0.062], [0, 0.918, -0.056],
      [0.030, 0.888, -0.062], [0.052, 0.852, -0.048]
    ]);
  }

  /* ============================================================
     OBRATLE — dvacet čtyři kusů, každý zvlášť
     Řada stejných tvarů by byla plot. Tělo obratle roste
     shora dolů, trnový výběžek mění sklon a v hrudní části
     míří strmě dolů — proto se páteř na první pohled čte.
     ============================================================ */
  function buildVertebrae(mesh) {
    var N = 24;
    for (var i = 0; i < N; i++) {
      var u = 0.035 + (i / (N - 1)) * 0.735;      /* od C1 k L5 */
      var p = spineAt(u);
      var next = spineAt(Math.min(1, u + 0.02));
      var tilt = Math.atan2(next[2] - p[2], p[1] - next[1]);

      /* velikost roste dolů, krční obratle jsou drobné */
      var g = i / (N - 1);
      var rw = 0.0165 + g * 0.0155;
      var rd = 0.0135 + g * 0.0120;
      var hh = 0.0105 + g * 0.0060;
      var region = i < 7 ? 0 : i < 19 ? 1 : 2;      /* krční · hrudní · bederní */
      var expW = region === 1 ? 0.35 : 0.10;

      /* tělo obratle */
      (function () {
        var grid = [];
        var VS = 8, US = 14;
        for (var v = 0; v <= VS; v++) {
          var row = [];
          var fy = (v / VS - 0.5) * 2;
          /* boky jsou vpasované dovnitř — obratel není váleček */
          var waist = 1 - 0.16 * (1 - fy * fy);
          for (var uu = 0; uu < US; uu++) {
            var th = (uu / US) * Math.PI * 2;
            var x = Math.cos(th) * rw * waist;
            var z = Math.sin(th) * rd * waist * (Math.sin(th) < 0 ? 0.82 : 1);
            var y = fy * hh;
            /* zaoblení hran horní a spodní plochy */
            var edge = Math.max(0, Math.abs(fy) - 0.78) / 0.22;
            x *= 1 - 0.22 * edge * edge;
            z *= 1 - 0.22 * edge * edge;
            row.push(mesh.vert(p[0] + x, p[1] - y, p[2] + z + rd * 0.15, expW));
          }
          grid.push(row);
        }
        for (v = 0; v < VS; v++) {
          for (uu = 0; uu < US; uu++) {
            var k = (uu + 1) % US;
            mesh.quad(grid[v][uu], grid[v][k], grid[v + 1][k], grid[v + 1][uu]);
          }
        }
        /* uzavření obou plošek */
        [0, VS].forEach(function (row, side) {
          var c = mesh.vert(p[0], p[1] - (row / VS - 0.5) * 2 * hh, p[2] + rd * 0.15, expW);
          for (var uu2 = 0; uu2 < US; uu2++) {
            var k2 = (uu2 + 1) % US;
            if (side === 0) mesh.tri(c, grid[row][k2], grid[row][uu2]);
            else mesh.tri(c, grid[row][uu2], grid[row][k2]);
          }
        });
      })();

      /* trnový výběžek — sklon podle oblasti */
      var back = region === 1 ? 0.052 : region === 2 ? 0.040 : 0.030;
      var drop = region === 1 ? 0.030 : region === 2 ? 0.008 : 0.006;
      tube(mesh, curve([
        [p[0], p[1], p[2] - rd * 0.5],
        [p[0], p[1] - drop * 0.45, p[2] - rd * 0.5 - back * 0.55],
        [p[0], p[1] - drop, p[2] - rd * 0.5 - back]
      ], 5), function (t) { return (0.0072 - t * 0.0028) * (1 + g * 0.35); }, 6, expW, true);

      /* příčné výběžky */
      [-1, 1].forEach(function (sd) {
        tube(mesh, curve([
          [p[0], p[1], p[2] - rd * 0.2],
          [p[0] + sd * (rw + 0.012), p[1] - 0.002, p[2] - rd * 0.42],
          [p[0] + sd * (rw + 0.026), p[1] - 0.005, p[2] - rd * 0.52]
        ], 4), function (t) { return 0.0060 - t * 0.0022; }, 5, expW, true);
      });

      /* meziobratlová ploténka — jiný materiál, ale patří sem */
      if (i < N - 1) {
        var pn = spineAt(0.035 + ((i + 1) / (N - 1)) * 0.735);
        var mid = [(p[0] + pn[0]) / 2, (p[1] + pn[1]) / 2, (p[2] + pn[2]) / 2 + rd * 0.15];
        tube(mesh, [[mid[0], mid[1] + 0.0022, mid[2]], [mid[0], mid[1] - 0.0022, mid[2]]],
          rw * 0.94, 12, expW, true);
      }
    }
  }

  /* ============================================================
     KOST KŘÍŽOVÁ A KOSTRČ
     Klín mezi kyčelními kostmi. Je to dolní úpon tvrdé pleny —
     tedy místo, o kterém mluví celá druhá stanice ošetření.
     ============================================================ */
  function buildSacrum(mesh) {
    sheet(mesh, 10, 12, function (u, v) {
      /* v: 0 = základna u L5, 1 = hrot ke kostrči */
      var y = 0.104 - v * 0.134;
      var halfW = 0.056 * (1 - v * 0.70);
      var x = (u - 0.5) * 2 * halfW;
      /* křížová kost je vpředu vydutá */
      var z = 0.010 - v * 0.052 + (1 - (x / (halfW + 1e-6)) * (x / (halfW + 1e-6))) * 0.016 - v * v * 0.010;
      return {
        p: [x, y, z],
        n: [x * 0.4, 0.25, 1],
        t: 1 - v * 0.35
      };
    }, 0.034, 0.05);

    /* kostrč */
    tube(mesh, curve([
      [0, -0.032, -0.042], [0, -0.052, -0.050], [0, -0.068, -0.044]
    ], 5), function (t) { return 0.010 - t * 0.005; }, 6, 0, true);
  }

  /* ============================================================
     HRUDNÍ KOŠ — dvanáct párů žeber, chrupavky, žeberní oblouk

     Předchozí verze kreslila žebro jako plynulý oblouk od
     obratle dopředu. Na renderu z toho byly tenké obloučky
     rozbíhající se z páteře — pavoučí nohy, ne koš.

     Skutečné žebro má čtyři věci, které to lámou:

       1 · HLAVIČKA a KRČEK jdou z obratlového těla dozadu
           a mírně ven — ne rovnou do strany.
       2 · ÚHEL ŽEBRA (angulus costae): pár centimetrů za
           hrbolkem se dřík ostře stočí dopředu. Tenhle ohyb
           je nejzazší bod celého koše a je to on, co dělá
           záda široká. Bez něj vypadá koš jako žebřík.
       3 · DŘÍK je plochá čepel, ne drát: vysoká (shora dolů)
           a tenká (dovnitř–ven). V rámu trubky odpovídá
           svislé ose rB a radiální rN — proto poměr 1 : 0,42.
       4 · CHRUPAVKY. Prvních sedm párů jde přímo na hrudní
           kost, další tři se spojují do ŽEBERNÍHO OBLOUKU,
           poslední dva páry volně končí.

     Křivky jsou vedené osmi body, ne pěti; při 0,013 poloměru
     by se na pěti bodech ohyb v úhlu žebra rozpadl na hranu.
     ============================================================ */
  /* Tvar jednoho žebra na jednom místě. Používá ho hrudní koš
     i nervy — mezižeberní nerv běží po spodní hraně žebra,
     takže musí znát tutéž křivku. Kdyby si ji každý počítal
     po svém, nervy by po prvním přeladění koše visely vedle. */
  function ribShape(i, sd) {
    var u = i / 11;
    var sp = spineAt(0.035 + (0.10 + u * 0.52) * 0.735);
    var yv = sp[1], zv = sp[2];

    /* Rozpětí. Nejširší je sedmé žebro; první a poslední dvě
       jsou znatelně kratší — koš má tvar vejce, ne válce.   */
    var span = 0.068 + Math.sin(Math.PI * Math.min(1, 0.12 + 0.76 * u)) * 0.080;
    if (i === 0) span *= 0.74;
    else if (i === 1) span *= 0.89;
    else if (i === 10) span *= 0.90;
    else if (i === 11) span *= 0.72;

    /* Spád: horní žebra klesají málo, dolní hodně.          */
    var drop = 0.026 + u * 0.104;
    /* Jak daleko dopředu dřík dojde, než se předá chrupavce. */
    var frontZ = 0.050 + Math.sin(Math.PI * Math.min(1, u * 0.92)) * 0.028;
    /* Hloubka úhlu žebra — dozadu za obratel.                */
    var angleZ = zv - (0.030 + Math.sin(Math.PI * Math.min(1, 0.2 + 0.8 * u)) * 0.026);

    return {
      u: u, span: span, drop: drop, frontZ: frontZ, yv: yv, zv: zv,
      /* Dech: nejvíc se rozpínají střední žebra.             */
      expW: 0.52 + 0.48 * Math.sin(Math.PI * Math.min(1, 0.1 + 0.85 * u)),
      key: [
        [sd * 0.013, yv + 0.002, zv - 0.012],                          /* hlavička  */
        [sd * 0.038, yv - 0.002, zv - 0.030],                          /* krček     */
        [sd * 0.070, yv - drop * 0.14, angleZ],                        /* ÚHEL      */
        [sd * span * 0.93, yv - drop * 0.38, angleZ + 0.036],          /* dřík vzad */
        [sd * span, yv - drop * 0.62, zv + 0.030],                     /* nejšíře   */
        [sd * span * 0.88, yv - drop * 0.88, frontZ * 0.66],
        /* Přední konec dříku leží BLÍŽ ose, než by člověk čekal:
           u pátého žebra je od hrudní kosti sotva polovina
           toho, co měří v nejširším místě. Když se posadí dál
           (dřív 0,66 rozpětí), musí to chrupavka dohnat dlouhou
           šikmou spojnicí — a přední stěna hrudníku je pak jen
           mříž křížících se tyček.                           */
        [sd * span * 0.44, yv - drop * 1.04, frontZ * 1.00]            /* konec     */
      ]
    };
  }

  function buildRibs(mesh) {
    /* konce chrupavek pro žeberní oblouk — sbírají se za chodu */
    var archL = [], archR = [];

    for (var i = 0; i < 12; i++) {
      var u = i / 11;
      var floating = i >= 10;

      /* Konec chrupavky na hrudní kosti (jen prvních sedm).    */
      var u7 = Math.min(1, i / 6);
      var sternY = 0.508 - u7 * 0.196;

      [-1, 1].forEach(function (sd) {
        var R = ribShape(i, sd);
        var span = R.span, drop = R.drop, frontZ = R.frontZ, expW = R.expW;
        var key = R.key;

        /* Čepel: vysoká a tenká. Nejsilnější uprostřed dříku,
           k oběma koncům se ztenčuje — jako každá nosná kost. */
        tube(mesh, curve(key, 9), function (t) {
          var h = 0.0124 * (0.72 + 0.36 * Math.sin(Math.PI * Math.pow(t, 0.86)))
                * (0.80 + 0.20 * Math.sin(Math.PI * Math.min(1, 0.15 + 0.8 * u)));
          return [h * 0.38, h];
        }, 10, expW, true);

        var tip = key[key.length - 1];

        if (floating) {
          /* Volná žebra: krátký chrupavčitý hrot do prázdna. */
          tube(mesh, curve([
            tip,
            [sd * span * 0.50, tip[1] - 0.012, frontZ * 0.74],
            [sd * span * 0.38, tip[1] - 0.021, frontZ * 0.56]
          ], 6), function (t) { return [0.0034, 0.0064 * (1 - t * 0.55)]; }, 7, expW, true);
          return;
        }

        if (i < 7) {
          /* --- chrupavka rovnou na hrudní kost ---------------
             Stoupá dovnitř a nahoru; právě to stoupání dělá
             z plochého věnce trojrozměrný koš.                */
          tube(mesh, curve([
            tip,
            [sd * span * 0.34, (tip[1] + sternY) * 0.5 - 0.002, frontZ * 1.04],
            [sd * span * 0.20, sternY - 0.002, 0.0755],
            [sd * 0.022, sternY, 0.0725]
          ], 7), function (t) {
            return [0.0032 + t * 0.0006, 0.0072 - t * 0.0016];
          }, 7, expW, true);
        } else {
          /* --- chrupavka do žeberního oblouku ---------------
             Osmé až desáté žebro nedosáhne na hrudní kost.
             Jeho chrupavka se opře o tu nad sebou a všechny
             dohromady kreslí oblouk pod hrudníkem.           */
          var arcY = 0.318 - (i - 7) * 0.006;
          var mid = [sd * span * 0.42, tip[1] + (arcY - tip[1]) * 0.42, frontZ * 1.02];
          tube(mesh, curve([tip, mid,
            [sd * (0.086 - (i - 7) * 0.004), arcY - 0.004, 0.066]
          ], 7), function (t) {
            return [0.0031, 0.0068 - t * 0.0016];
          }, 7, expW, true);
          (sd < 0 ? archL : archR).push([sd * (0.086 - (i - 7) * 0.004), arcY - 0.004, 0.066]);
        }
      });
    }

    /* ŽEBERNÍ OBLOUK — hrana, kterou má člověk pod hrudníkem.
       Vede od mečovitého výběžku dolů a ven ke konci desátého
       žebra. Je to jediná kost, kterou si člověk na sobě sám
       nahmatá — a proto ji koš potřebuje, aby byl uvěřitelný. */
    [[-1, archL], [1, archR]].forEach(function (pair) {
      var sd = pair[0], ends = pair[1];
      if (!ends.length) return;
      var pts = [[sd * 0.020, 0.322, 0.070]];
      for (var k = 0; k < ends.length; k++) pts.push(ends[k]);
      pts.push([sd * 0.108, 0.244, 0.048]);
      tube(mesh, curve(pts, 8), function (t) {
        return [0.0026, 0.0056 - t * 0.0008];
      }, 7, 0.7, true);
    });

    /* HRUDNÍ KOST — rukojeť, tělo a mečovitý výběžek.
       Užší a tenčí než dřív: nemá to být prkno na hrudi.   */
    sheet(mesh, 5, 12, function (uu, v) {
      var y = 0.528 - v * 0.222;
      var halfW = v < 0.20 ? 0.027 - v * 0.020
                : v > 0.86 ? 0.011 - (v - 0.86) * 0.044
                : 0.023 - (v - 0.20) * 0.012;
      return {
        p: [(uu - 0.5) * 2 * halfW, y, 0.0705 + Math.sin(v * Math.PI) * 0.005],
        n: [0, 0, 1],
        t: 1
      };
    }, 0.013, 1.0);

    /* klíční kosti — esovité, ne rovné */
    [-1, 1].forEach(function (sd) {
      tube(mesh, curve([
        [sd * 0.024, 0.552, 0.066],
        [sd * 0.086, 0.566, 0.058],
        [sd * 0.148, 0.570, 0.018],
        [sd * 0.192, 0.564, -0.016]
      ], 8), function (t) { return [0.0058 - t * 0.0008, 0.0070 - t * 0.0012]; }, 7, 0.5, true);
    });

    /* LOPATKY — dvě trojúhelníkové desky na zádech.
       Nejsou ploché: přiléhají k oblině koše, takže se musí
       ohnout ve DVOU směrech. Rovná deska by na zádech stála
       jako drak a hned by bylo poznat, že je to kulisa.
       Leží úplně vzadu (z −0,055 a hlouběji), aby zůstaly za
       žebry a nekreslily přes ně.                            */
    [-1, 1].forEach(function (sd) {
      sheet(mesh, 9, 11, function (uu, v) {
        /* uu: 0 vnitřní okraj u páteře → 1 vnější k rameni
           v : 0 horní okraj → 1 dolní hrot                  */
        var taper = 1 - v * v * 0.86;              /* hrot dole  */
        var x = 0.040 + uu * (0.058 + 0.040 * (1 - v)) * taper;
        var y = 0.536 - v * 0.132 - uu * 0.016;
        /* obtočení kolem koše: čím dál od páteře, tím víc dopředu */
        /* Lopatka leží ZA košem, ne v něm. Úhel žebra sahá
           u T7 na z ≈ −0,082; kdyby deska začínala na −0,058,
           prorazila by mezi žebry dopředu a při pohledu zepředu
           by z ní byl bílý trychtýř uprostřed hrudníku.      */
        var z = -0.094 + Math.pow(uu, 1.5) * 0.030 + v * 0.010;
        return {
          p: [sd * x, y, z],
          n: [sd * (0.42 + uu * 0.5), 0.10, -1],
          t: (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, uu * 1.1))) * (1 - v * 0.45)
        };
      }, 0.010, 0.20);
    });
  }

  /* ============================================================
     PÁNEV
     Dvě lopaty, které se vpředu sbíhají ke sponě. Zakřivení
     je to jediné, co z desky udělá kyčelní kost.
     ============================================================ */
  function buildPelvis(mesh) {
    [-1, 1].forEach(function (sd) {
      /* Kyčelní lopata. Zakřivení jde ve dvou osách zároveň:
         nahoře se rozevírá ven a dopředu, dole se stáčí
         dovnitř k jamce. Plochá deska z toho dělá origami. */
      sheet(mesh, 14, 14, function (uu, v) {
        var y = 0.116 - v * 0.126;
        /* obrys shora: vpředu i vzadu se lopata sbíhá */
        var lobe = Math.sin(Math.pow(uu, 0.86) * Math.PI);
        /* Užší než dřív: lopata sahala až k povrchu těla
           a přes porcelán z ní čouhal ostrý trojúhelník.  */
        var spread = (0.060 + lobe * 0.058) * (1 - v * 0.44);
        var x = spread * (1 + 0.16 * (1 - v) * lobe);
        var z = -0.056 + uu * 0.156 - lobe * 0.026 + v * 0.030;
        /* miska: vnitřní plocha je vydutá */
        z -= (1 - v) * lobe * 0.014;
        return {
          p: [sd * x, y, z],
          n: [sd * (0.85 + 0.3 * lobe), 0.42 * (1 - v), 0.18],
          /* hřeben nahoře je silnější — proto se kost nedrolí */
          t: (1 - v * 0.42) * (0.55 + 0.45 * lobe)
        };
      }, 0.020, 0);

      /* HŘEBEN KYČELNÍ — zaoblený horní okraj.
         Bez něj má lopata břitvovou hranu.                 */
      var crest = [];
      for (var i = 0; i <= 12; i++) {
        var uu = i / 12;
        var lobe = Math.sin(Math.pow(uu, 0.86) * Math.PI);
        var spread = 0.060 + lobe * 0.058;
        crest.push([
          sd * spread * (1 + 0.16 * lobe),
          0.116,
          -0.056 + uu * 0.156 - lobe * 0.026 - lobe * 0.014
        ]);
      }
      tube(mesh, crest, function (t) {
        return 0.0088 * (0.6 + 0.4 * Math.sin(t * Math.PI));
      }, 7, 0, true);

      /* jamka kyčelního kloubu */
      tube(mesh, curve([
        [sd * 0.084, -0.014, 0.012],
        [sd * 0.100, -0.020, 0.006],
        [sd * 0.108, -0.026, 0.000]
      ], 5), function (t) { return 0.024 - t * 0.004; }, 10, 0, true);

      /* sedací kost — dolů a dozadu, na ní se sedí */
      tube(mesh, curve([
        [sd * 0.092, -0.030, -0.010],
        [sd * 0.086, -0.062, -0.024],
        [sd * 0.064, -0.082, -0.014],
        [sd * 0.040, -0.078, 0.020]
      ], 7), function (t) { return [0.0150 - t * 0.0045, 0.0130 - t * 0.0035]; }, 8, 0, true);

      /* raménka ke sponě stydké */
      tube(mesh, curve([
        [sd * 0.040, -0.078, 0.020],
        [sd * 0.030, -0.070, 0.046],
        [sd * 0.006, -0.062, 0.058]
      ], 6), function (t) { return [0.0110 - t * 0.0030, 0.0095 - t * 0.0025]; }, 7, 0, true);

      /* Stehenní ani pažní kost se nekreslí. Uvnitř porcelánu
         se četly jako šedé tyče vložené do končetin a braly
         pozornost ose, kvůli které tu scéna je. V rukou a
         nohou zůstává jen nerv — a přesně o tom je ten web. */
    });
  }

  /* ============================================================
     DURÁLNÍ TUBUS
     Průsvitný obal míchy od velkého týlního otvoru ke druhému
     křížovému obratli. Nahoře přirostlý k lebce, dole ke kosti
     křížové — to je celá kraniosakrální osa v jednom kuse.
     ============================================================ */
  function buildDura(mesh) {
    var path = [];
    for (var i = 0; i <= 70; i++) {
      var u = i / 70;
      var p = spineAt(u * 0.86);
      path.push([p[0], p[1], p[2] + 0.006]);
    }
    tube(mesh, path, function (t) {
      /* rozšíření v krční a bederní oblasti — tam je mícha silnější */
      return 0.026 + 0.006 * Math.exp(-Math.pow((t - 0.16) / 0.12, 2))
                   + 0.007 * Math.exp(-Math.pow((t - 0.72) / 0.14, 2))
                   - 0.008 * t * t;
    }, 14, 0.15, false);
  }

  /* ============================================================
     NERVOVÝ STROM
     Míšní kořeny, pleteň pažní a křížová, bloudivý nerv,
     sympatický kmen s ganglii. Tenké trubky, ne čáry — na
     světle je pak vidět, že mají tvar.
     ============================================================ */
  function buildNerves(mesh, ganglia) {
    /* --- MEZIŽEBERNÍ NERVY -----------------------------------
       Dřív tu bylo dvacet čtyři rovných kořenů, které z páteře
       trčely do stran jako paprsky. Na renderu z toho byly
       pavoučí nohy — a co hůř, byla to lež: mezižeberní nerv
       nikam netrčí. Vyjde z otvoru, obtočí se pod spodní hranu
       žebra a běží s ním dopředu.

       Proto se křivka počítá ze STEJNÉ funkce jako žebro
       (`ribShape`) a jen se posadí o kousek níž a dovnitř.
       Nerv tím leží na kosti z definice, ne shodou okolností.  */
    for (var i = 0; i < 12; i++) {
      var R0 = ribShape(i, 1);
      var u = R0.u;
      var p = [0, R0.yv, R0.zv];

      [-1, 1].forEach(function (sd) {
        var R = ribShape(i, sd);
        var k = R.key;
        /* Nerv kopíruje žebro od úhlu dál a dojde do dvou třetin
           dříku; dál by se pod chrupavkou stejně ztratil.       */
        var path = [
          [sd * 0.006, R.yv - 0.002, R.zv + 0.006],           /* výstup z tubu */
          [k[1][0] * 0.86, k[1][1] - 0.006, k[1][2] + 0.008],
          [k[2][0] * 0.97, k[2][1] - 0.009, k[2][2] + 0.009],
          [k[3][0] * 0.95, k[3][1] - 0.010, k[3][2] + 0.008],
          [k[4][0] * 0.94, k[4][1] - 0.011, k[4][2] + 0.006],
          [k[5][0] * 0.90, k[5][1] - 0.010, k[5][2] + 0.004]
        ];
        tube(mesh, curve(path, 7), function (t) {
          return 0.0030 * (1 - t * 0.72);
        }, 5, R.expW * 0.6, false);

        /* Ganglion sedí na výstupu z páteře, ne uprostřed pole. */
        ganglia.push([sd * 0.030, R.yv - 0.008, R.zv + 0.016, sOf(R.yv)]);
      });
    }

    /* --- BEDERNÍ A KRČNÍ KOŘENY ------------------------------
       Tam, kde nejsou žebra, kořeny opravdu jdou do stran —
       ale krátce a dolů, ne vodorovně do prázdna.             */
    [[0.045, 0.098, 4], [0.640, 0.800, 5]].forEach(function (band) {
      var n = band[2];
      for (var j = 0; j < n; j++) {
        var uu = band[0] + (band[1] - band[0]) * (j / Math.max(1, n - 1));
        var q = spineAt(uu);
        var reach = 0.034 + uu * 0.052;
        [-1, 1].forEach(function (sd) {
          tube(mesh, curve([
            [q[0], q[1], q[2] + 0.004],
            [q[0] + sd * 0.024, q[1] - 0.010, q[2] + 0.014],
            [q[0] + sd * reach * 0.72, q[1] - 0.028, q[2] + 0.024],
            [q[0] + sd * reach, q[1] - 0.048, q[2] + 0.030]
          ], 6), function (t) { return 0.0032 * (1 - t * 0.66); }, 5, 0.2, false);
          ganglia.push([q[0] + sd * 0.026, q[1] - 0.010, q[2] + 0.016, uu]);
        });
      }
    });

    /* sympatický kmen — řetěz podél páteře */
    [-1, 1].forEach(function (sd) {
      var chain = [];
      for (var j = 0; j <= 40; j++) {
        var u2 = 0.06 + (j / 40) * 0.76;
        var q = spineAt(u2);
        chain.push([q[0] + sd * 0.030, q[1], q[2] + 0.020]);
      }
      tube(mesh, chain, 0.0026, 5, 0.2, false);
    });

    /* PLETEŇ PAŽNÍ: z krčních kořenů do paže.
       Končí dřív než dřív (0,250 → 0,330) a ztenčuje se skoro
       k nule. Se sevřenějším záběrem hero sekce z ní totiž
       byl dlouhý osamělý oblouk přes celou paži — na renderu
       to nečetlo jako nerv, ale jako kabel pověšený vedle
       těla. Nerv má z osy vycházet a mizet, ne ji opouštět. */
    [-1, 1].forEach(function (sd) {
      tube(mesh, curve([
        [sd * 0.032, 0.606, 0.026],
        [sd * 0.096, 0.582, 0.030],
        [sd * 0.170, 0.548, 0.014],
        [sd * 0.212, 0.472, 0.006],
        [sd * 0.230, 0.396, 0.004],
        [sd * 0.236, 0.330, 0.006]
      ], 8), function (t) { return 0.0048 * (1 - t * 0.86); }, 6, 0.25, false);
      ganglia.push([sd * 0.100, 0.580, 0.032, 0.30]);
    });

    /* bloudivý nerv — hlavní kabel klidu */
    [-1, 1].forEach(function (sd) {
      tube(mesh, curve([
        [sd * 0.026, 0.742, 0.010],
        [sd * 0.038, 0.660, 0.032],
        [sd * 0.044, 0.560, 0.046],
        [sd * 0.040, 0.450, 0.040],
        [sd * 0.028, 0.360, 0.026],
        [sd * 0.020, 0.290, 0.014]
      ], 8), function (t) { return 0.0044 * (1 - t * 0.42); }, 6, 0.4, false);
    });

    /* pleteň křížová — do stehna, kde záběr končí */
    [-1, 1].forEach(function (sd) {
      tube(mesh, curve([
        [sd * 0.030, 0.130, 0.006],
        [sd * 0.062, 0.070, -0.006],
        [sd * 0.086, -0.010, -0.020],
        [sd * 0.098, -0.140, -0.024],
        [sd * 0.100, -0.300, -0.020],
        [sd * 0.096, -0.450, -0.016]
      ], 8), function (t) { return 0.0052 * (1 - t * 0.46); }, 6, 0.15, false);
      ganglia.push([sd * 0.040, 0.104, 0.000, 0.86]);
    });

    /* cauda equina — svazek uvnitř dolní části tubu */
    for (var f = 0; f < 9; f++) {
      var off = (f / 8 - 0.5) * 0.030;
      tube(mesh, curve([
        [off * 0.3, 0.240, -0.004],
        [off * 0.7, 0.170, 0.008],
        [off, 0.100, 0.006],
        [off * 0.8, 0.040, -0.012]
      ], 6), 0.0022, 4, 0.1, false);
    }

    /* Hlavové nervy se nekreslí. Vějíř před bází lebky se
       skrz porcelán četl jako maska přes obličej. Výstup
       z lebky nese bloudivý nerv — a ten tu je.            */
  }

  /* ============================================================
     TĚLESNÁ SKOŘEPINA — porcelán, kterým je vidět dovnitř

     Tohle je hlavní hmota scény. Kostra a nervy pod ní jsou
     vidět jako přes matné sklo, takže se z anatomického modelu
     stane socha — ne lékařská pomůcka.

     Tvar je loft: dvacet příčných řezů od temene k půli stehen.
     Řez není kruh ani elipsa, ale superelipsa — trup má ploché
     boky a kulatá záda, což kruh nesvede a čtverec přežene.
     ============================================================ */

  /* halfW · halfD · tvarový exponent (2 = elipsa, výš = plošší) */
  var BODY_PROFILE = [
    [ 0.980, 0.030, 0.034, 2.0],
    [ 0.968, 0.046, 0.052, 2.0],
    [ 0.950, 0.060, 0.068, 2.0],
    [ 0.928, 0.070, 0.082, 2.0],
    [ 0.905, 0.084, 0.098, 2.0],   /* hlava nejširší         */
    [ 0.850, 0.086, 0.104, 2.0],
    [ 0.790, 0.074, 0.096, 2.1],
    [ 0.748, 0.052, 0.070, 2.1],   /* čelist                 */
    [ 0.712, 0.043, 0.050, 2.1],   /* krk                    */
    [ 0.672, 0.046, 0.052, 2.1],
    [ 0.636, 0.072, 0.060, 2.2],   /* trapéz                 */
    [ 0.606, 0.148, 0.076, 2.4],   /* ramena                 */
    [ 0.556, 0.184, 0.088, 2.5],
    [ 0.486, 0.180, 0.096, 2.6],
    [ 0.406, 0.168, 0.100, 2.6],
    [ 0.334, 0.146, 0.092, 2.5],
    [ 0.272, 0.131, 0.085, 2.4],   /* pas                    */
    [ 0.196, 0.140, 0.090, 2.4],
    [ 0.116, 0.163, 0.100, 2.4],
    [ 0.036, 0.176, 0.108, 2.4],   /* boky                   */
    [-0.030, 0.172, 0.108, 2.4],
    [-0.072, 0.160, 0.104, 2.3]
  ];

  /* Řezy se prokládají Catmull-Romem, ne lineárně. Lineární
     interpolace nechá na trupu vodorovné prstence — přesně to,
     podle čeho se pozná loft udělaný narychlo.               */
  function profileAt(y) {
    var P = BODY_PROFILE, n = P.length;
    if (y >= P[0][0]) return P[0];
    if (y <= P[n - 1][0]) return P[n - 1];
    var i = 0;
    while (i < n - 2 && y < P[i + 1][0]) i++;
    var t = (P[i][0] - y) / (P[i][0] - P[i + 1][0]);
    var a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(n - 1, i + 2)];
    var t2 = t * t, t3 = t2 * t, out = [y, 0, 0, 0];
    for (var k = 1; k <= 3; k++) {
      out[k] = 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * t +
               (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
               (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
    }
    return out;
  }

  function superEllipse(a, w, d, n) {
    var c = Math.cos(a), sn = Math.sin(a);
    var e = 2 / n;
    return [
      Math.sign(c) * Math.pow(Math.abs(c), e) * w,
      Math.sign(sn) * Math.pow(Math.abs(sn), e) * d
    ];
  }

  function buildBody(mesh) {
    var VS = 78, US = 52;
    var grid = [];
    for (var v = 0; v <= VS; v++) {
      var tv = v / VS;
      var y = 0.980 - tv * 1.052;                /* temeno → půl stehen */
      var pr = profileAt(y);
      var row = [];
      for (var u = 0; u < US; u++) {
        var ang = (u / US) * Math.PI * 2;
        var q = superEllipse(ang, pr[1], pr[2], pr[3]);
        var x = q[0], z = q[1];

        /* páteř táhne záda dozadu podle skutečného zakřivení —
           jinak je trup válec a člověk v něm nestojí          */
        var sp = spineAt(Math.max(0, Math.min(1, (0.715 - y) / 0.745)));
        z += sp[2] * 0.55 * Math.max(0, -Math.sin(ang));

        /* zadeček */
        z -= smoothstep(0.10, -0.05, y) * smoothstep(-0.12, -0.02, y) * 0.030
             * Math.max(0, -Math.sin(ang));
        /* hrudní kost vpředu */
        z += smoothstep(0.62, 0.44, y) * smoothstep(0.26, 0.42, y) * 0.010
             * Math.max(0, Math.sin(ang));
        /* Temeno se uzavírá kulovou čepičkou. Srážením k nule
           vznikl na hlavě špičatý cíp — kupole musí být kupole. */
        if (y > 0.930) {
          var c2 = Math.min(1, (y - 0.930) / 0.050);
          var dome = Math.sqrt(Math.max(0, 1 - c2 * c2));
          x *= dome; z *= dome;
        }

        row.push(mesh.vert(x, y, z, 0.55 * smoothstep(0.24, 0.52, y) * (1 - smoothstep(0.56, 0.66, y))));
      }
      grid.push(row);
    }
    for (v = 0; v < VS; v++) {
      for (u = 0; u < US; u++) {
        var k = (u + 1) % US;
        mesh.quad(grid[v][u], grid[v][k], grid[v + 1][k], grid[v + 1][u]);
      }
    }

    /* PAŽE — volně podél těla, konec se rozplyne u okraje záběru */
    [-1, 1].forEach(function (sd) {
      /* Začátek je schovaný UVNITŘ trupu, jinak by na rameni
         seděl viditelný uzávěr trubky.                       */
      tube(mesh, curve([
        [sd * 0.045, 0.600, 0.000],
        [sd * 0.130, 0.596, -0.002],
        [sd * 0.172, 0.540, -0.004],
        [sd * 0.192, 0.430, 0.002],
        [sd * 0.200, 0.310, 0.010],
        [sd * 0.200, 0.190, 0.016],
        [sd * 0.194, 0.080, 0.022]
      ], 10), function (t) {
        /* rameno · biceps · loket · předloktí */
        return 0.052 - t * 0.024 + 0.006 * Math.sin(t * Math.PI * 2.4);
      }, 18, 0.18, true);
    });

    /* STEHNA */
    [-1, 1].forEach(function (sd) {
      tube(mesh, curve([
        [sd * 0.060, 0.060, 0.004],
        [sd * 0.086, -0.040, 0.002],
        [sd * 0.098, -0.150, 0.000],
        [sd * 0.096, -0.300, -0.002],
        [sd * 0.090, -0.440, -0.004]
      ], 9), function (t) { return 0.086 - t * 0.026; }, 20, 0, true);
    });
  }

  /* ============================================================
     ZDRAVOTNICKÝ KŘÍŽ — symbol uzdravení

     Nestojí vedle postavy jako nálepka. Je to skutečné těleso:
     vytažený kříž se zkosenými hranami, který se pomalu otáčí,
     dýchá se stejným rytmem jako hrudník a při still pointu se
     rozsvítí zevnitř.

     Zkosení je celý vtip. Ostrý kvádr vypadá jako ikona; jakmile
     má hrana fasetu, chytne se na ní světlo a z ikony je předmět.

     Kříž má vlastní `aS` (podíl na ose), aby jím projela táž
     vlna jako postavou — jsou to dvě části jednoho dechu, ne
     dvě animace vedle sebe.
     ============================================================ */
  function buildCross(mesh, cx, cy, cz, S) {
    var A = 0.30 * S;      /* poloviční délka ramene */
    /* ŠÍŘKA RAMENE: 0,108 → 0,082.
       Poměr šířky k délce byl 0,36. To je proporce lékárenské
       cedule — tlustý plný kříž, který se čte jako piktogram.
       Klenoty mají ramena útlá: při 0,082 je poměr 0,273,
       tvar dostane vzduch a hrana dostane délku, na které se
       má co odrazit. Menší plocha = víc obrysu = víc skla.  */
    var B = 0.082 * S;     /* poloviční šířka ramene */
    /* Hloubka klesla s šířkou (0,115 → 0,098), aby průřez
       ramene zůstal skoro čtvercový. Kdyby zůstala, byl by
       z kříže hranol postavený na hranu.                    */
    var D = 0.098 * S;     /* poloviční hloubka      */
    /* Fazeta naopak roste VŮČI šířce: 0,030/0,082 = 37 % půlky
       ramene proti dřívějším 31 %. Broušené sklo pozná oko
       podle toho, kolik z profilu zabírá zkosení.           */
    var F = 0.030 * S;     /* zkosení                */

    /* Obrys kříže v rovině xy — dvanáct rohů, každý zkosený.
       Jde se po obvodu proti směru hodin.                   */
    var raw = [
      [ B,  B], [ B,  A], [-B,  A], [-B,  B],
      [-A,  B], [-A, -B], [-B, -B], [-B, -A],
      [ B, -A], [ B, -B], [ A, -B], [ A,  B]
    ];
    /* každý roh nahradíme dvěma body → fazeta */
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var pv = raw[(i - 1 + raw.length) % raw.length];
      var cu = raw[i];
      var nx = raw[(i + 1) % raw.length];
      function towards(from, to, d) {
        var vx = to[0] - from[0], vy = to[1] - from[1];
        var L = Math.hypot(vx, vy) || 1;
        var k = Math.min(d, L * 0.45);
        return [from[0] + vx / L * k, from[1] + vy / L * k];
      }
      out.push(towards(cu, pv, F));
      out.push(towards(cu, nx, F));
    }

    var n = out.length;
    /* Vrcholy se ZÁMĚRNĚ nesdílejí mezi plochou a fazetou.
       Kdyby se sdílely, normály se při finish() zprůměrovaly,
       čelní plocha by se vyklenula do kupole a z fazety by
       zbyl měkký přechod. Kříž má být broušený, ne nafouklý. */
    var faceF = [], faceB = [], bevFi = [], bevFo = [], bevBi = [], bevBo = [], rimF = [], rimB = [];
    var k2 = 1 - F / Math.max(B, 0.001) * 0.22;
    for (i = 0; i < n; i++) {
      var q = out[i];
      var ix = cx + q[0] * k2, iy = cy + q[1] * k2;
      var ox2 = cx + q[0], oy2 = cy + q[1];
      faceF.push(mesh.vert(ix, iy, cz + D, 0));
      faceB.push(mesh.vert(ix, iy, cz - D, 0));
      bevFi.push(mesh.vert(ix, iy, cz + D, 0));
      bevFo.push(mesh.vert(ox2, oy2, cz + D - F * 0.9, 0));
      bevBi.push(mesh.vert(ix, iy, cz - D, 0));
      bevBo.push(mesh.vert(ox2, oy2, cz - D + F * 0.9, 0));
      rimF.push(mesh.vert(ox2, oy2, cz + D - F * 0.9, 0));
      rimB.push(mesh.vert(ox2, oy2, cz - D + F * 0.9, 0));
    }
    var fc = mesh.vert(cx, cy, cz + D, 0);
    var bc = mesh.vert(cx, cy, cz - D, 0);
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      mesh.tri(fc, faceF[i], faceF[j]);                     /* přední plocha */
      mesh.tri(bc, faceB[j], faceB[i]);                     /* zadní plocha  */
      mesh.quad(bevFi[i], bevFo[i], bevFo[j], bevFi[j]);    /* přední fazeta */
      mesh.quad(bevBi[j], bevBo[j], bevBo[i], bevBi[i]);    /* zadní fazeta  */
      mesh.quad(rimF[i], rimB[i], rimB[j], rimF[j]);        /* bok           */
    }
  }

  /* ============================================================
     VLÁKNO SVĚTLA — hrudní kost → kříž

     Kříž stál vedle postavy jako druhý obrázek na témže plátně.
     Nic je nespojovalo, takže se dal odmyslet. Tohle je ta
     spojnice: ve chvíli, kdy se rytmus zastaví, přeběhne po
     vlákně jedno světlo od hrudní kosti ke kříži a teprve pak
     se kříž rozsvítí. Z dvou věcí vedle sebe je tím jedna věta.

     Vlákno je vlas — 0,004 poloměru. Vidět je z něj v podstatě
     jen ta jiskra, která po něm běží; klidová trubka jen drží
     dráhu, aby světlo nelétalo vzduchem samo o sobě.

     PARAMETR JDE PODÉL DRÁHY, NE PODLE VÝŠKY.
     Mesh.vert dopočítává `s` z ypsilonu (podíl na kraniosakrální
     ose) — to je správně pro páteř, ale ne tady: vlákno je skoro
     vodorovné, takže by mělo `s` téměř konstantní a jiskra by
     se rozsvítila celá naráz. Proto se `s` po sestavení přepíše
     na podíl na dráze.
     ============================================================ */
  function buildLink(mesh) {
    var path = curve([
      [0.010, 0.500, 0.150],
      [0.110, 0.548, 0.150],
      [0.215, 0.566, 0.120],
      [0.300, 0.548, 0.060]
    ], 12);
    var seg = 6;
    tube(mesh, path, 0.0040, seg, 0);
    var rings = path.length;
    for (var i = 0; i < mesh.s.length; i++) {
      var ring = Math.floor(i / seg);
      mesh.s[i] = rings > 1 ? Math.min(1, ring / (rings - 1)) : 0;
    }
  }

  /* ============================================================
     SESTAVENÍ
     Tři sítě, protože každá se kreslí jiným materiálem:
     kost je neprůhledný porcelán, tubus je sklo, nervy svítí.
     ============================================================ */
  function build() {
    /* Dvě sítě, dva materiály. `axis` je to, o čem web mluví:
       lebeční klenba, páteř, kost křížová — kraniosakrální osa.
       `frame` je zbytek kostry. Kreslí se tišeji, protože má
       jen dát tělu strukturu, ne dělat z hero sekce atlas.   */
    var axis = new Mesh();
    buildSkull(axis);
    buildVertebrae(axis);
    buildSacrum(axis);

    /* Hrudní koš a pánev jsou dvě různé váhy. Koš je stavba,
       kterou má být vidět; pánev je jen ukotvení dolního konce
       osy. Ve společné síti by musely sdílet krytí i tón —
       proto dvě.                                              */
    var frame = new Mesh();
    buildRibs(frame);

    var girdle = new Mesh();
    buildPelvis(girdle);

    var dura = new Mesh();
    buildDura(dura);

    var shell = new Mesh();
    buildBody(shell);

    var nerve = new Mesh();
    var ganglia = [];
    buildNerves(nerve, ganglia);

    /* Kříž stojí vpravo od postavy, ve výšce hrudní kosti —
       tam, kde se v sezení pracuje s dechem.

       POLOHA JE VÝSLEDEK VÝPOČTU, NE ODHADU.
       Postava je v pase nejširší 0,184 od osy. Kříž má rameno
       0,30 × měřítko, takže při středu 0,330 a měřítku 0,34
       leží jeho vnitřní hrana na 0,228 — mezi ním a ramenem
       zůstane 0,044, tedy čtvrtina poloviční šířky těla. To je
       ta „ani daleko, ani blízko“ vzdálenost.
       Vnější hrana končí na 0,432. Plátno hero sekce má poměr
       520/908, takže při FOV 0,72 a vzdálenosti 2,179 je vidět
       ±0,470 — kříž se tedy vejde i po nádechu a probliknutí,
       kdy se nafoukne o 8,5 %. Kdo posune kterékoli z těch
       čísel, musí tenhle výpočet zopakovat.                */
    /* POZOR: střed a měřítko musí souhlasit s konstantou
       CROSS v js/webgl/anatomy-3d.js — shader kolem něj kříž
       otáčí. Kdo změní tady, musí změnit i tam.            */
    var cross = new Mesh();
    /* Měřítko 0,36 → 0,335. Kříž má být hallmark, ne značka:
       vnější hrana teď končí na 0,352 + 0,30·0,335 = 0,4525
       a při FOV 0,72 / vzdálenosti 1,56 je vidět ±0,512, takže
       i po nádechu (+3 %) a probliknutí (+5,5 %) zbývá rezerva.
       Vnitřní hrana leží na 0,2515; rameno postavy končí na
       0,184, mezera je tedy 0,0675 — o polovinu víc vzduchu
       než dřív. Kdo tahle čísla posune, musí přepočítat
       i CROSS a CROSS_ARM v js/webgl/anatomy-3d.js.        */
    buildCross(cross, 0.352, 0.545, 0.030, 0.335);

    /* Vlákno, po kterém se pulz předá kříži. */
    var link = new Mesh();
    buildLink(link);

    /* Částice mozkomíšního moku — proudí uvnitř tubu.
       Rozmístění je deterministické, aby scéna vypadala
       na každém načtení stejně.                          */
    var flow = [];
    var seed = 12345;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var i = 0; i < 260; i++) {
      var u = rnd();
      var p = spineAt(u * 0.86);
      var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.018;
      flow.push(
        p[0] + Math.cos(a) * r,
        p[1],
        p[2] + 0.006 + Math.sin(a) * r,
        u * 0.86,          /* podíl na ose */
        rnd()              /* fáze         */
      );
    }

    var gArr = new Float32Array(ganglia.length * 4);
    for (i = 0; i < ganglia.length; i++) {
      gArr[i * 4] = ganglia[i][0];
      gArr[i * 4 + 1] = ganglia[i][1];
      gArr[i * 4 + 2] = ganglia[i][2];
      gArr[i * 4 + 3] = ganglia[i][3];
    }

    return {
      bone: axis.finish(),
      cross: cross.finish(),
      link: link.finish(),
      frame: frame.finish(),
      girdle: girdle.finish(),
      shell: shell.finish(),
      dura: dura.finish(),
      nerve: nerve.finish(),
      ganglia: gArr,
      gangliaCount: ganglia.length,
      flow: new Float32Array(flow),
      flowCount: flow.length / 5,
      spine: SPINE
    };
  }

  root.AnatomyMesh = { build: build, spineAt: spineAt, sOf: sOf };
})(window);
