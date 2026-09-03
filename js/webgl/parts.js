/* ============================================================
   parts.js — TĚLESNÉ DÍLY VE 3D

   Skutečná tělesa, ne kresba natočená do prostoru. Každý díl má
   objem, normály a zapuštění, takže na něm světlo funguje samo.

   ------------------------------------------------------------
   SOUŘADNICE TĚLA

       +x   dopředu (břicho)
       +y   vzhůru  (k hlavě)
       +z   doprava

   Každý díl se staví v počátku a scéna si ho posadí, kam chce.
   Jednotka je vždy hlavní rozměr dílu — délka chodidla, délka
   lebky, výška hrudníku — aby proporce nezávisely na měřítku.

   ------------------------------------------------------------
   SOUŘADNICE RUKY

       +x   od zápěstí ke špičkám prstů
       +y   od dlaně ke hřbetu   (tloušťka ruky)
       +z   od palcové strany k malíkové

   Ruka ležící dlaní dolů má tedy prsty dopředu, hřbet nahoru.
   Ohyb článku = otočení kolem osy z, rozevření = kolem osy y.

   ------------------------------------------------------------
   ROZMĚRY RUKY

   Jednotka = délka ruky (zápěstí → špička prostředníku). Poměry
   jsou z antropometrie:

       dlaň k zápěstí          0,55
       prostředník             0,39   (0,19 + 0,115 + 0,085)
       šířka dlaně u kloubů    0,43
       tloušťka dlaně          0,13

   Kdo je změní, musí je změnit v celém `FINGERS` — články na
   sebe navazují, takže posun jednoho posune všechny za ním.
   ============================================================ */
(function (root) {
  "use strict";
  var G = root.KJGeom;
  if (!G) return;

  var TAU = G.TAU, lerp = G.lerp, clamp = G.clamp, curve = G.curve;

  /* Kost jako deformovaná koule: střed, poloosy a funkce, která
     podle směru přidá hrbol nebo plošku. Skoro každá kost na
     tomhle webu stojí na téhle jediné funkci.               */
  function lump(m, c, r, warp, opt) {
    opt = opt || {};
    return G.blob(m, opt.u || 14, opt.v || 9, function (d) {
      var k = warp ? warp(d) : 1;
      return [c[0] + d[0] * r[0] * k, c[1] + d[1] * r[1] * k, c[2] + d[2] * r[2] * k,
              opt.ao || 0.04, opt.key || 0];
    });
  }
  function bone(m, pts, rFn, seg, opt) {
    return G.tube(m, curve(pts, (opt && opt.dense) || 6), rFn, seg || 10, opt || {});
  }

  /* ============================================================
     RUKA
     ============================================================ */

  var FINGERS = [
    { name: "ukazovak",   mcp: [0.545,  0.012, -0.140], seg: [0.180, 0.108, 0.078],
      r: [0.048, 0.043, 0.038, 0.031], fan: -0.16, roll: -0.05 },
    { name: "prostrednik",mcp: [0.565,  0.020, -0.046], seg: [0.192, 0.116, 0.084],
      r: [0.050, 0.045, 0.039, 0.032], fan: -0.02, roll:  0.00 },
    { name: "prstenik",   mcp: [0.548,  0.016,  0.048], seg: [0.178, 0.110, 0.079],
      r: [0.047, 0.042, 0.036, 0.030], fan:  0.13, roll:  0.04 },
    { name: "malik",      mcp: [0.492,  0.004,  0.136], seg: [0.140, 0.084, 0.066],
      r: [0.040, 0.036, 0.031, 0.026], fan:  0.30, roll:  0.09 }
  ];
  /* Palec má vlastní řetěz: záprstní kost je schovaná v thenaru,
     takže se otáčí jinak než prsty a míří dopředu i do strany. */
  var THUMB = {
    cmc: [0.150, -0.020, -0.150],
    meta: 0.300, prox: 0.150, dist: 0.115,
    r: [0.078, 0.064, 0.052, 0.042],
    yaw: 0.62, pitch: -0.20
  };

  /* Průřez článku: mírně zploštělý ovál, na hřbetu plošší než
     na bříšku. Kulatý válec vypadá jako párek.               */
  function segRing(seg, r) {
    var out = [];
    for (var i = 0; i < seg; i++) {
      var a = i / seg * TAU;
      var c = Math.cos(a), s = Math.sin(a);
      var flat = 1 - 0.16 * Math.max(0, s);       /* hřbetní strana plošší */
      var belly = 1 + 0.10 * Math.max(0, -s);     /* bříško je plnější     */
      out.push([0, s * r * flat * belly, c * r * 1.06]);
    }
    return out;
  }

  /* Jeden článek podél +x, s kloubním vřetenem u obou konců.
     Vřeteno je to, co odliší prst od trubky.                 */
  function phalanx(mesh, len, r0, r1, opt) {
    opt = opt || {};
    var N = 9, rings = [];
    for (var i = 0; i <= N; i++) {
      var u = i / N;
      var r = lerp(r0, r1, u);
      r *= 1 + 0.13 * Math.exp(-Math.pow((u - 0.04) / 0.16, 2))
             + 0.11 * Math.exp(-Math.pow((u - 0.97) / 0.14, 2))
             - 0.05 * Math.exp(-Math.pow((u - 0.5) / 0.30, 2));
      var ring = segRing(12, r);
      for (var j = 0; j < ring.length; j++) {
        ring[j] = [u * len, ring[j][1], ring[j][2],
                   0.30 * Math.exp(-Math.pow((u - 0.06) / 0.12, 2)) * (ring[j][1] < 0 ? 1 : 0.2),
                   opt.key || 0];
      }
      rings.push(ring);
    }
    G.loft(mesh, rings, { capStart: !opt.open, capEnd: false });
    return rings[rings.length - 1];
  }

  /* Kulatá špička článku — bříško prstu, ne useknutá trubka. */
  function fingerTip(mesh, at, r, opt) {
    opt = opt || {};
    G.blob(mesh, 12, 7, function (d) {
      return [at + d[0] * r * 1.35, d[1] * r * 0.90, d[2] * r * 1.02, 0, opt.key || 0];
    });
  }

  /* NEHET — plochá destička zapuštěná do hřbetu posledního
     článku. Ve 3D je to nejlevnější detail s největším účinkem:
     bez něj čte oko prst jako gumovou trubku.               */
  function nail(mesh, len, r, opt) {
    opt = opt || {};
    G.sheet(mesh, 7, 5, function (u, v) {
      var x = lerp(0.30, 0.92, u) * len;
      var w = (1 - Math.pow(Math.abs(v - 0.5) * 2, 2.1)) * r * 0.80;
      var arch = Math.cos((v - 0.5) * Math.PI) * r * 0.16;
      return {
        p: [x, r * 0.80 + arch - 0.012 * Math.pow(u, 2), (v - 0.5) * 2 * w],
        n: [0, 1, 0], ao: 0.18 * (1 - u), key: opt.key || 0
      };
    }, 0.008);
  }

  /* opt.curl   0…1 sevření prstů
     opt.spread −1…1 rozevření
     opt.thumb  0…1 přiložení palce
     opt.arm    délka předloktí (0 = bez)
     opt.key    klíč děje pro celý díl                        */
  function hand(mesh, opt) {
    opt = opt || {};
    var curl = clamp(opt.curl == null ? 0.18 : opt.curl, 0, 1);
    var spread = opt.spread == null ? 0.15 : opt.spread;
    var thumbIn = opt.thumb == null ? 0.2 : opt.thumb;
    var key = opt.key || 0;

    /* --- DLAŇ: protažený zaoblený hranol ---------------------
       Průřez se od zápěstí rozšiřuje a ztenčuje. Zaoblení rohů
       (`square`) je to, co dělá rozdíl mezi dlaní a cihlou.  */
    var PALM = [
      /* x,     šířka z, tloušťka y, hranatost, zapuštění */
      [-0.020, 0.126, 0.058, 0.36, 0.10],
      [ 0.080, 0.148, 0.068, 0.32, 0.04],
      [ 0.200, 0.178, 0.072, 0.28, 0.00],
      [ 0.330, 0.200, 0.070, 0.26, 0.00],
      [ 0.450, 0.212, 0.062, 0.26, 0.00],
      [ 0.530, 0.214, 0.054, 0.28, 0.04],
      [ 0.585, 0.198, 0.042, 0.32, 0.12],
      [ 0.625, 0.168, 0.030, 0.36, 0.22]
    ];
    /* POZOR NA VINUTÍ. Články prstů staví prstenec jako
       (y = sin, z = cos); dlaň ho musí stavět stejně, jinak má
       obrácené normály, světlo do ní jde zevnitř a v renderu
       z ní je tmavý výsek.                                  */
    var rings = PALM.map(function (p) {
      var r = G.ring(16, p[1], p[2], { square: p[3] });
      return r.map(function (q) { return [p[0], q[1], q[0], p[4], key]; });
    });
    G.loft(mesh, rings, { capStart: true, capEnd: true });

    /* thenar — palcová masa. Bez ní je dlaň prkno. */
    G.blob(mesh, 14, 9, function (d) {
      return [0.255 + d[0] * 0.205, -0.028 + d[1] * 0.070, -0.150 + d[2] * 0.105, 0.06, key];
    });
    /* hypothenar — malíková masa */
    G.blob(mesh, 12, 8, function (d) {
      return [0.290 + d[0] * 0.190, -0.014 + d[1] * 0.056, 0.152 + d[2] * 0.078, 0.08, key];
    });
    /* zápěstní val, aby ruka nekončila řezem */
    G.blob(mesh, 12, 8, function (d) {
      return [-0.010 + d[0] * 0.075, d[1] * 0.068, d[2] * 0.135, 0.14, key];
    });

    /* meziprstní řasy — bez nich prsty na dlani jen sedí. */
    for (var wI = 0; wI < 3; wI++) {
      var A = FINGERS[wI].mcp, B = FINGERS[wI + 1].mcp;
      var wx = (A[0] + B[0]) / 2 + 0.055, wz = (A[2] + B[2]) / 2;
      var wy = (A[1] + B[1]) / 2 - 0.004;
      G.blob(mesh, 10, 6, function (d) {
        return [wx + d[0] * 0.070, wy + d[1] * 0.036, wz + d[2] * 0.062, 0.26, key];
      });
    }

    /* --- PRSTY ----------------------------------------------- */
    FINGERS.forEach(function (f, i) {
      var fold = [0.95, 1.35, 1.05];        /* MCP, PIP, DIP */
      /* malík a prsteník se svírají o kus dřív — ruka nikdy
         nesevře všechny prsty stejně                        */
      var bias = [0.86, 0.94, 1.04, 1.16][i];

      G.blob(mesh, 10, 6, function (d) {    /* kloubní hrbol na hřbetu */
        return [f.mcp[0] + d[0] * 0.055, f.mcp[1] + 0.020 + d[1] * 0.030,
                f.mcp[2] + d[2] * 0.048, 0.05, key];
      });

      mesh.push();
      mesh.move(f.mcp[0], f.mcp[1], f.mcp[2]);
      mesh.rotY(f.fan * (0.4 + spread * 0.9));
      mesh.rotX(f.roll);
      mesh.rotZ(-fold[0] * curl * bias - 0.06);
      phalanx(mesh, f.seg[0], f.r[0], f.r[1], { key: key });

      mesh.move(f.seg[0], 0, 0);
      mesh.rotZ(-fold[1] * curl * bias);
      phalanx(mesh, f.seg[1], f.r[1], f.r[2], { key: key });

      mesh.move(f.seg[1], 0, 0);
      mesh.rotZ(-fold[2] * curl * bias);
      phalanx(mesh, f.seg[2], f.r[2], f.r[3], { key: key });
      fingerTip(mesh, f.seg[2], f.r[3], { key: key });
      nail(mesh, f.seg[2], f.r[3], { key: key });
      mesh.pop();
    });

    /* --- PALEC ------------------------------------------------
       Vyrůstá z thenaru a míří dopředu i do strany. Kdyby se
       stavěl jako pátý prst v řadě, trčel by kolmo jako trn. */
    mesh.push();
    mesh.move(THUMB.cmc[0], THUMB.cmc[1], THUMB.cmc[2]);
    mesh.rotY(THUMB.yaw + thumbIn * 0.30);
    mesh.rotZ(THUMB.pitch - thumbIn * 0.22);
    phalanx(mesh, THUMB.meta, THUMB.r[0], THUMB.r[1], { key: key });
    mesh.move(THUMB.meta, 0, 0);
    mesh.rotZ(-0.30 - curl * 0.45);
    mesh.rotY(0.10);
    phalanx(mesh, THUMB.prox, THUMB.r[1], THUMB.r[2], { key: key });
    mesh.move(THUMB.prox, 0, 0);
    mesh.rotZ(-0.24 - curl * 0.55);
    phalanx(mesh, THUMB.dist, THUMB.r[2], THUMB.r[3], { key: key });
    fingerTip(mesh, THUMB.dist, THUMB.r[3], { key: key });
    nail(mesh, THUMB.dist, THUMB.r[3], { key: key });
    mesh.pop();

    /* --- PŘEDLOKTÍ --------------------------------------------
       Vybíhá z obrazu. Ruka useknutá u zápěstí vypadá jako
       protéza, ať je jakkoli dobře udělaná.                 */
    if (opt.arm) {
      var L = opt.arm;
      var ar = [];
      for (var i = 0; i <= 8; i++) {
        var u = i / 8;
        var rz = lerp(0.112, 0.150, u), ry = lerp(0.056, 0.104, u);
        var r = G.ring(14, rz, ry, { square: lerp(0.30, 0.10, u) });
        ar.push(r.map(function (q) {
          return [-u * L, q[1] - 0.010 * u, q[0] + 0.030 * u * u, 0.05 + 0.10 * u, key];
        }));
      }
      /* Prstence se stavěly od zápěstí ven, tedy proti směru
         dlaně — tím se obrátilo vinutí a předloktí zčernalo.
         Otočením pole jde loft zase po +x jako zbytek ruky. */
      ar.reverse();
      G.loft(mesh, ar, { capStart: true, capEnd: false });
    }
    return mesh;
  }

  /* ============================================================
     PÁTEŘ
     ============================================================ */

  /* Tělo, oblouk, trnový a příčné výběžky. Jeden parametrický
     kus pro celou páteř: krční je drobný, bederní mohutný.   */
  function vertebra(mesh, s, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var lean = opt.lean || 0;            /* sklon trnu dozadu */
    var body = [];
    for (var i = 0; i <= 6; i++) {
      var v = i / 6;
      var pinch = 1 - 0.16 * Math.sin(v * Math.PI);
      var r = G.ring(16, 0.62 * s * pinch, 0.54 * s * pinch, { square: 0.30 });
      body.push(r.map(function (q) {
        return [q[1], (v - 0.5) * 0.62 * s, q[0], 0.04, key];
      }));
    }
    G.loft(mesh, body, { capStart: true, capEnd: true });
    [-1, 1].forEach(function (sd) {
      G.tube(mesh, curve([                       /* oblouk */
        [-0.42 * s, -0.10 * s, sd * 0.40 * s],
        [-0.80 * s, -0.02 * s, sd * 0.46 * s],
        [-1.05 * s, 0.06 * s, sd * 0.26 * s]
      ], 4), function () { return 0.17 * s; }, 8, { ao: 0.20, key: key });
      G.tube(mesh, curve([                       /* příčný výběžek */
        [-0.55 * s, 0, sd * 0.44 * s],
        [-0.60 * s, 0.02 * s, sd * 0.78 * s],
        [-0.56 * s, 0.03 * s, sd * 1.00 * s]
      ], 4), function (u) { return (0.15 - u * 0.05) * s; }, 7, { ao: 0.18, key: key });
    });
    G.tube(mesh, curve([                         /* trnový výběžek */
      [-1.02 * s, 0.06 * s, 0],
      [-1.38 * s, 0.06 * s + lean * 0.5, 0],
      [-1.72 * s, 0.04 * s + lean, 0]
    ], 5), function (u) { return (0.17 - u * 0.06) * s; }, 8, { ao: 0.16, key: key });
    return mesh;
  }

  function disc(mesh, s, opt) {
    opt = opt || {};
    var rings = [];
    for (var i = 0; i <= 4; i++) {
      var v = i / 4;
      var bulge = 1 + 0.10 * Math.sin(v * Math.PI);
      var r = G.ring(16, 0.64 * s * bulge, 0.56 * s * bulge, { square: 0.30 });
      rings.push(r.map(function (q) {
        return [q[1], (v - 0.5) * 0.20 * s, q[0], 0.12, opt.key || 0];
      }));
    }
    G.loft(mesh, rings, { capStart: true, capEnd: true });
    return mesh;
  }

  /* ATLAS — prstenec bez těla. Jediný obratel, který nemá tělo:
     to, co by jím bylo, se odškrtlo a stalo se zubem čepovce. */
  function atlas(mesh, s, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var p = [];
    for (var i = 0; i <= 20; i++) {
      var a = i / 20 * TAU;
      /* vpředu užší oblouk, vzadu širší — prstenec není kruh */
      var rx = 0.62 * s * (1 + 0.16 * Math.max(0, -Math.cos(a)));
      p.push([Math.cos(a) * rx, Math.sin(a * 2) * 0.03 * s, Math.sin(a) * 0.74 * s]);
    }
    G.tube(mesh, p, function (u) {
      return [0.15 * s, (0.13 + 0.05 * Math.sin(u * Math.PI)) * s];
    }, 8, { ao: 0.12, key: key, caps: false, up: [0, 1, 0] });
    /* příčné výběžky — na atlasu nejdelší z celé páteře */
    [-1, 1].forEach(function (sd) {
      G.tube(mesh, curve([
        [-0.10 * s, 0, sd * 0.70 * s],
        [-0.14 * s, -0.02 * s, sd * 1.06 * s],
        [-0.12 * s, -0.03 * s, sd * 1.30 * s]
      ], 4), function (u) { return (0.15 - u * 0.06) * s; }, 7, { ao: 0.18, key: key });
    });
    return mesh;
  }

  /* ČEPOVEC — obratel se zubem, kolem kterého se otáčí hlava. */
  function axisVert(mesh, s, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    lump(mesh, [0, 0, 0], [0.60 * s, 0.34 * s, 0.72 * s], null, { key: key, u: 14, v: 8 });
    bone(mesh, [[0.16 * s, 0.20 * s, 0], [0.20 * s, 0.56 * s, 0], [0.19 * s, 0.80 * s, 0]],
      function (u) { return (0.20 - u * 0.05) * s; }, 8, { key: key });   /* zub */
    bone(mesh, [[-0.45 * s, 0.06 * s, 0], [-1.05 * s, 0.02 * s, 0], [-1.45 * s, -0.02 * s, 0]],
      function (u) { return (0.20 - u * 0.07) * s; }, 8, { key: key, ao: 0.16 });
    [-1, 1].forEach(function (sd) {
      bone(mesh, [[-0.30 * s, 0.02 * s, sd * 0.55 * s], [-0.40 * s, 0, sd * 0.95 * s]],
        function (u) { return (0.14 - u * 0.05) * s; }, 6, { key: key, ao: 0.18 });
    });
    return mesh;
  }

  /* ============================================================
     HRUDNÍK

     Nejčastější chyba u žeber je udělat z nich šroubovici:
     stejný poloměr, stejný sklon, pravidelný krok. Skutečný koš
     je jiný — každé žebro má vlastní šířku, vlastní spád a mezi
     obratlem a bokem má ÚHEL, ostrý ohyb dozadu. Bez toho z toho
     je pružina, ne hrudník.
     ============================================================ */

  /* poloviční šířka koše v úrovni žebra 1…12 */
  var RIB_W  = [0.078, 0.104, 0.126, 0.146, 0.160, 0.170, 0.176, 0.178, 0.172, 0.158, 0.132, 0.100];
  /* spád od obratle k hrudní kosti — kaudálně roste */
  var RIB_D  = [0.026, 0.038, 0.052, 0.066, 0.080, 0.094, 0.108, 0.120, 0.130, 0.138, 0.112, 0.086];
  var RIB_Y0 = 0.470, RIB_STEP = 0.0335;

  function ribY(i) { return RIB_Y0 - i * RIB_STEP; }

  function ribcage(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var kOf = opt.keyOf || function (i) { return key; };

    /* --- HRUDNÍ KOST ---------------------------------------- */
    var ST = [
      /* y,     šířka z, tloušťka x, střed x */
      [0.492, 0.030, 0.016, 0.150],
      [0.470, 0.044, 0.019, 0.154],   /* rukojeť */
      [0.432, 0.040, 0.020, 0.158],
      [0.410, 0.031, 0.019, 0.160],   /* úhel hrudní kosti */
      [0.350, 0.033, 0.018, 0.162],
      [0.290, 0.035, 0.017, 0.162],   /* tělo */
      [0.238, 0.031, 0.015, 0.159],
      [0.212, 0.019, 0.011, 0.154],   /* mečovitý výběžek */
      [0.194, 0.009, 0.006, 0.150]
    ];
    G.loft(mesh, ST.map(function (q) {
      var r = G.ring(14, q[1], q[2], { square: 0.55 });
      return r.map(function (p) { return [q[3] + p[1], q[0], p[0], 0.05, key]; });
    }), { capStart: true, capEnd: true });

    /* --- KLÍČNÍ KOSTI — esovité, ne oblouk ------------------ */
    [-1, 1].forEach(function (sd) {
      bone(mesh, [
        [0.148, 0.500, sd * 0.022],
        [0.128, 0.516, sd * 0.080],
        [0.062, 0.508, sd * 0.150],
        [-0.010, 0.482, sd * 0.196]
      ], function (u) { return [0.019 - u * 0.003, 0.017]; }, 9,
        { key: key, up: [0, 1, 0], ao: 0.05 });
    });

    /* --- ŽEBRA ---------------------------------------------- */
    for (var i = 0; i < 12; i++) {
      var y = ribY(i), w = RIB_W[i], d = RIB_D[i], k = kOf(i);
      var floating = i >= 10;
      var trueRib = i < 7;

      [-1, 1].forEach(function (sd) {
        /* Dráha žebra. Klíčový je bod 1: ŽEBRO NEJDŘÍV MÍŘÍ
           DOZADU a teprve v úhlu se láme do boku. Právě tenhle
           ohyb dělá z kruhu hrudník.                        */
        var path = [
          [-0.086, y, sd * 0.028],                             /* hlava u obratle */
          [-0.116, y - d * 0.10, sd * (0.050 + w * 0.26)],     /* úhel žebra      */
          [-0.070, y - d * 0.30, sd * (w * 0.88)],
          [ 0.016, y - d * 0.56, sd * w],                      /* nejširší místo  */
          [ 0.092, y - d * 0.82, sd * (w * 0.80)]
        ];
        if (!floating) path.push([0.138, y - d * 1.00, sd * (w * 0.46)]);
        else path[4] = [0.050, y - d * 0.95, sd * (w * 0.70)];

        bone(mesh, path, function (u) {
          /* Žebro je plochá lišta: vysoká a tenká. Poloměr sám
             o sobě by z ní udělal drát.                     */
          return [0.0175 - u * 0.0035, 0.0072];
        }, 8, { key: k, up: [0, 1, 0], ao: 0.06, dense: 5 });

        if (floating) return;

        /* --- CHRUPAVKA -----------------------------------
           Pravá žebra jdou vlastní chrupavkou nahoru k hrudní
           kosti. Nepravá se napojí na oblouk nad sebou — proto
           má hrudník dole klenutý okraj, ne useknutý.      */
        var e = [0.138, y - d * 1.00, sd * (w * 0.46)];
        var carti = trueRib
          ? [e, [0.156, y - d * 0.94, sd * (w * 0.26)], [0.161, y - d * 0.84, sd * 0.030]]
          : [e, [0.150, y - d * 0.92, sd * (w * 0.30)],
                [0.156, ribY(6) - RIB_D[6] * 0.86 - (i - 6) * 0.012, sd * (0.055 + (i - 7) * 0.012)]];
        G.tube(mesh, curve(carti, 5), function (u) {
          return [0.0135 - u * 0.002, 0.0068];
        }, 7, { key: k, up: [0, 1, 0], ao: 0.04 });
      });
    }
    return mesh;
  }

  /* HRUDNÍ PÁTEŘ — dvanáct obratlů s kyfózou. */
  function thoracicSpine(mesh, opt) {
    opt = opt || {};
    var kOf = opt.keyOf || function () { return opt.key || 0; };
    for (var i = 0; i < 12; i++) {
      var u = i / 11;
      /* kyfóza: střed se vyklene dozadu */
      var x = -0.086 - Math.sin(u * Math.PI) * 0.030;
      mesh.push();
      mesh.move(x, ribY(i), 0);
      mesh.rotZ(-0.06 + u * 0.12);
      vertebra(mesh, 0.052 + u * 0.010, { key: kOf(i), lean: -0.020 });
      mesh.pop();
    }
    return mesh;
  }

  /* BRÁNICE — kupole, ne talíř.
     Upíná se po obvodu na žeberní oblouk, mečovitý výběžek
     a bederní páteř; uprostřed má šlašitý střed, který se při
     nádechu nesplošťuje. Pravá klenba je výš, protože pod ní
     jsou játra — bez té asymetrie vypadá bránice jako deštník. */
  function diaphragm(mesh, br, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var drop = br * 0.052;

    /* obvod úponu — poloměr a výška podle úhlu */
    function rimAt(a) {
      var ca = Math.cos(a), sa = Math.sin(a);
      var R = 0.128 + 0.050 * Math.abs(sa) - 0.022 * Math.max(0, ca);
      var Y = 0.206 - 0.086 * (1 - ca) / 2 * 1.9;
      return [R, Y];
    }
    G.sheet(mesh, 30, 12, function (u, v) {
      var a = u * TAU;
      var rim = rimAt(a);
      var R = rim[0] * v;
      var x = 0.018 + Math.cos(a) * R;
      var z = Math.sin(a) * R;
      /* dvě klenby: pravá výš (játra), levá níž (žaludek) */
      var right = Math.exp(-Math.pow((z - 0.072) / 0.088, 2)) * 0.076;
      var left  = Math.exp(-Math.pow((z + 0.072) / 0.086, 2)) * 0.062;
      var tendon = Math.exp(-Math.pow((Math.hypot(x - 0.018, z)) / 0.052, 2)) * 0.052;
      var top = 0.176 + Math.max(Math.max(right, left), tendon) - drop;
      var y = lerp(top, rim[1], Math.pow(v, 1.7));
      return { p: [x, y, z], n: [0, 1, 0], ao: 0.04 + v * 0.14, key: key };
    }, function (u, v) { return 0.0038 + (1 - v) * 0.0022; });

    /* pilíře — bránice sahá po bederní páteř, ne po žebra */
    [-1, 1].forEach(function (sd) {
      bone(mesh, [
        [-0.052, 0.130 - drop * 0.4, sd * 0.030],
        [-0.070, 0.070, sd * 0.026],
        [-0.078, 0.010, sd * 0.022]
      ], function (u) { return [0.017 - u * 0.005, 0.012]; }, 7,
        { key: key, up: [0, 1, 0], ao: 0.10 });
    });
    return mesh;
  }

  /* ============================================================
     PÁNEV A KOST KŘÍŽOVÁ
     ============================================================ */

  /* Kost křížová: klín ze srostlých obratlů. Vpředu vydutá,
     vzadu s hřebenem — a s otvory, kudy vycházejí nervy. */
  function sacrum(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    G.sheet(mesh, 14, 16, function (u, v) {
      var t = (u - 0.5) * 2;
      var w = (0.152 - v * 0.096) * (1 - Math.pow(Math.abs(t), 2.8) * 0.42);
      var yy = 0.140 - v * 0.320;
      /* Prohnutá ve DVOU směrech: po délce dopředu, napříč
         dozadu. Bez příčného prohnutí je z klínu placatá karta. */
      var bend = Math.sin(v * Math.PI * 0.86) * 0.050;
      var ridge = (1 - Math.abs(t)) * 0.012;
      var cross = -Math.pow(Math.abs(t), 1.8) * 0.036;
      return {
        p: [bend + ridge + cross, yy, t * w],
        n: [1, 0, 0],
        ao: 0.05 + v * 0.07 + (1 - Math.abs(t)) * 0.04,
        key: key + v * (opt.keySpan || 0)
      };
    }, function (u, v) { return 0.032 - v * 0.014; });

    /* křížové otvory — čtyři páry. Nejlevnější detail, po kterém
       je z klínu okamžitě kost křížová.                     */
    for (var i = 0; i < 4; i++) {
      var v = 0.16 + i * 0.185;
      [-1, 1].forEach(function (sd) {
        lump(mesh, [Math.sin(v * Math.PI * 0.86) * 0.050 + 0.022, 0.140 - v * 0.320,
                    sd * (0.092 - v * 0.056)],
          [0.016, 0.014, 0.013], null, { u: 8, v: 5, ao: 0.42, key: key + v * (opt.keySpan || 0) });
      });
    }
    /* kostrč */
    bone(mesh, [[0.046, -0.182, 0], [0.040, -0.222, 0], [0.026, -0.254, 0]],
      function (u) { return [0.024 - u * 0.010, 0.020 - u * 0.008]; }, 8,
      { key: key + (opt.keySpan || 0), up: [0, 1, 0] });
    return mesh;
  }

  /* Pánev — jen tolik, aby kost křížová někde seděla. Lopata
     kyčelní kosti je plát, ne koule.                        */
  function pelvis(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    [-1, 1].forEach(function (sd) {
      G.sheet(mesh, 10, 9, function (u, v) {
        var t = (u - 0.5) * 2;
        /* od křížokyčelního kloubu ven a dopředu */
        var spread = 0.062 + v * 0.116;
        var x = -0.040 + v * 0.150 - Math.pow(Math.abs(t), 2) * 0.05;
        var y = 0.122 - Math.pow(t, 2) * 0.115 - v * 0.070;
        var z = sd * (spread + Math.abs(t) * 0.030);
        return { p: [x, y, z], n: [0, 0, sd], ao: 0.06 + Math.abs(t) * 0.10, key: key };
      }, function (u, v) { return 0.011 + (1 - v) * 0.011; });
      /* sedací hrbol — na něm se sedí, tak ať je vidět */
      lump(mesh, [-0.010, -0.185, sd * 0.115], [0.052, 0.044, 0.036], null,
        { key: key, ao: 0.08 });
      /* horní okraj lopaty */
      bone(mesh, [
        [-0.052, 0.128, sd * 0.070], [0.030, 0.150, sd * 0.130],
        [0.108, 0.118, sd * 0.150], [0.140, 0.052, sd * 0.120]
      ], function () { return [0.016, 0.013]; }, 8, { key: key, up: [0, 1, 0], ao: 0.05 });
    });
    return mesh;
  }

  /* ============================================================
     LEBKA

     Klenba není vejce. Má čelo, temenní hrby, šupinu spánkové
     kosti (plochou!), týlní hrbol a bázi, která se láme dovnitř.
     Teprve tyhle čtyři věci dohromady dávají lebku.

     +x dopředu (čelo), +y vzhůru, +z doprava. Jednotka = délka
     lebky zepředu dozadu.
     ============================================================ */
  /* Profil klenby po délce: x, poloviční šířka, výška nahoru,
     výška dolů. Odsud se bere i poloha švů, takže šev nemůže
     „minout“ povrch — leží na něm z definice.               */
  var VAULT = [
    /* Týlní pól se uzavírá dvěma prstenci, ne víčkem. Jediný
       prstenec s poloměrem 0,080 nechal na zátylku plochý
       terč — a ten se při pohledu zezadu četl jako důlek. */
    [-0.500, 0.026, 0.030, 0.024],
    [-0.486, 0.080, 0.090, 0.070],
    [-0.450, 0.200, 0.200, 0.150],
    [-0.380, 0.280, 0.290, 0.210],
    [-0.290, 0.335, 0.352, 0.245],
    [-0.170, 0.365, 0.392, 0.260],
    [-0.040, 0.372, 0.402, 0.258],
    [ 0.080, 0.358, 0.396, 0.250],
    [ 0.180, 0.330, 0.372, 0.240],
    [ 0.250, 0.292, 0.336, 0.230],
    [ 0.310, 0.236, 0.284, 0.222],
    [ 0.352, 0.176, 0.220, 0.214]
  ];
  var VAULT_CY = 0.100;

  function vaultAt(x) {
    if (x <= VAULT[0][0]) return VAULT[0].slice(1);
    var n = VAULT.length;
    if (x >= VAULT[n-1][0]) return VAULT[n-1].slice(1);
    for (var i = 0; i < n - 1; i++) {
      if (x >= VAULT[i][0] && x <= VAULT[i+1][0]) {
        var u = (x - VAULT[i][0]) / (VAULT[i+1][0] - VAULT[i][0]);
        return [lerp(VAULT[i][1], VAULT[i+1][1], u),
                lerp(VAULT[i][2], VAULT[i+1][2], u),
                lerp(VAULT[i][3], VAULT[i+1][3], u)];
      }
    }
    return VAULT[0].slice(1);
  }

  /* Bod na povrchu klenby. `a` = 0 vpravo, π/2 nahoře.
     Dolní polovina je užší a plošší — to je lebeční báze,
     ne spodek vejce.                                        */
  function skullPoint(x, a) {
    var q = vaultAt(x);
    var s = Math.sin(a), c = Math.cos(a);
    var nn = 2.5;
    var k = Math.pow(Math.pow(Math.abs(c), nn) + Math.pow(Math.abs(s), nn), -1 / nn);
    var ry = s > 0 ? q[1] : q[2];
    var narrow = s > 0 ? 1 : 1 - 0.24 * (-s);
    return [x, VAULT_CY + ry * s * k, q[0] * c * k * narrow];
  }

  /* ============================================================
     LEBKA

     Není to koule s hrbolky. Staví se z příčných řezů po délce
     — stejně jako trup nebo chodidlo — protože jen tak se dá
     ohlídat, že klenba je vysoká, spánek plochý a báze zúžená.

     +x dopředu (obličej), +y vzhůru, +z doprava.
     Jednotka = délka lebky (týl → obličej) = 1,0.
     ============================================================ */
  function skull(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    /* KLÍČ SE PTÁ NA MÍSTO, NE NA DÍL.

       `keyOf` se dřív používalo JEDINKRÁT — na klenbu. Obličej,
       očnice, jařmové oblouky i čelist braly pevné `opt.key`,
       tedy nulu, když scéna posílala jen `keyOf`. Dvě třetiny
       lebky pak měly klíč 0: nevyvolávaly se postupně, ale
       naskočily naráz, a vlna po nich nešla.

       Když `keyOf` chybí, vrací `kOf` prosté `key` a chová se
       přesně jako dřív — volat se tedy dá všude bez rizika. */
    var kOf = opt.keyOf || function () { return key; };
    var SEG = 26;

    /* --- KLENBA --------------------------------------------- */
    var rows = [];
    for (var i = 0; i < VAULT.length; i++) {
      var x = VAULT[i][0];
      var row = [];
      for (var j = 0; j < SEG; j++) {
        var a = j / SEG * TAU;
        var p = skullPoint(x, a);
        /* zapuštění: spánková jáma a týlní jamka */
        var ao = 0.03
               + 0.10 * Math.max(0, -Math.sin(a)) * (1 - Math.abs(x) * 1.2)
               + 0.06 * Math.max(0, -Math.cos(a));
        row.push([p[0], p[1], p[2], ao, kOf(p)]);
      }
      rows.push(row);
    }
    G.loft(mesh, rows, { capStart: true, capEnd: true });

    /* --- OBLIČEJOVÁ ČÁST -----------------------------------
       Horní čelist s nosním otvorem. Zužuje se dopředu a dolů;
       kdyby jen pokračovala klenba, byl by z lebky meloun.  */
    var FACE = [
      /* x,   pol. šířka, horní y, dolní y */
      [0.190, 0.268, 0.090, -0.330],
      [0.270, 0.248, 0.040, -0.352],
      [0.345, 0.216, -0.020, -0.368],
      [0.420, 0.172, -0.086, -0.372],
      [0.474, 0.118, -0.160, -0.362],
      [0.500, 0.062, -0.226, -0.340]
    ];
    G.loft(mesh, FACE.map(function (q) {
      var r = [];
      for (var j = 0; j < 20; j++) {
        var a = j / 20 * TAU;
        var s = Math.sin(a), c = Math.cos(a);
        var nn = 3.0;
        var k = Math.pow(Math.pow(Math.abs(c), nn) + Math.pow(Math.abs(s), nn), -1 / nn);
        var cy = (q[2] + q[3]) / 2, hy = (q[2] - q[3]) / 2;
        r.push([q[0], cy + hy * s * k, q[1] * c * k, 0.06, kOf([q[0], cy, 0])]);
      }
      return r;
    }), { capStart: false, capEnd: true });

    /* nosní otvor — hruškovitá jamka, podle které se lebka pozná */
    lump(mesh, [0.478, -0.166, 0], [0.026, 0.062, 0.024], function (d) {
      return 1 + 0.55 * Math.max(0, -d[1]) - 0.24 * Math.max(0, d[1]);
    }, { u: 12, v: 8, ao: 0.70, key: kOf([0.478, -0.166, 0]) });

    /* --- OČNICE --------------------------------------------- */
    [-1, 1].forEach(function (sd) {
      var rim = [];
      for (var i2 = 0; i2 <= 20; i2++) {
        var a = i2 / 20 * TAU;
        rim.push([0.352 - Math.max(0, Math.cos(a)) * 0.026 - Math.max(0, -Math.sin(a)) * 0.022,
                  -0.030 + Math.sin(a) * 0.082,
                  sd * (0.128 + Math.cos(a) * 0.084)]);
      }
      G.tube(mesh, rim, function (u) {
        return [0.024 + 0.008 * Math.cos(u * TAU), 0.018];
      }, 8, { key: kOf([0.352, -0.030, sd * 0.128]), ao: 0.16, caps: false, up: [0, 1, 0] });
      /* dutina očnice — tmavé zákoutí uvnitř okraje */
      lump(mesh, [0.296, -0.030, sd * 0.128], [0.058, 0.068, 0.070], null,
        { u: 12, v: 8, ao: 0.78, key: kOf([0.296, -0.030, sd * 0.128]) });

      /* jařmový oblouk — tenký můstek od očnice k uchu */
      bone(mesh, [
        [0.336, -0.126, sd * 0.212],
        [0.230, -0.152, sd * 0.282],
        [0.100, -0.156, sd * 0.310],
        [0.010, -0.140, sd * 0.296]
      ], function (u) { return [0.020 - u * 0.004, 0.012]; }, 8,
        { key: kOf([0.170, -0.145, sd * 0.276]), up: [0, 1, 0], ao: 0.12 });

      /* zevní zvukovod a bradavkový výběžek */
      lump(mesh, [-0.010, -0.176, sd * 0.286], [0.030, 0.028, 0.024], null,
        { u: 10, v: 7, ao: 0.62, key: kOf([-0.010, -0.176, sd * 0.286]) });
      lump(mesh, [-0.072, -0.250, sd * 0.244], [0.048, 0.070, 0.046], function (d) {
        return 1 - 0.34 * Math.max(0, -d[1] - 0.45);
      }, { key: kOf([-0.072, -0.250, sd * 0.244]), ao: 0.14 });
    });

    /* --- ZUBNÍ OBLOUK A DOLNÍ ČELIST ------------------------ */
    function arch(y, halfW, front, r) {
      var pts = [];
      for (var i3 = 0; i3 <= 16; i3++) {
        var t = (i3 / 16 - 0.5) * Math.PI * 1.04;
        var st = Math.sin(t);
        pts.push([front - Math.pow(Math.abs(st), 1.55) * (front - 0.235),
                  y - Math.pow(Math.abs(st), 2) * 0.012, st * halfW]);
      }
      G.tube(mesh, pts, function () { return r; }, 8,
        { key: kOf([front * 0.72, y, 0]), up: [0, 1, 0], ao: 0.18, caps: true });
    }
    arch(-0.354, 0.122, 0.478, [0.020, 0.024]);      /* horní zuby */
    arch(-0.408, 0.134, 0.472, [0.034, 0.030]);      /* tělo dolní čelisti */
    [-1, 1].forEach(function (sd) {                  /* rameno k závěsu */
      bone(mesh, [
        [0.286, -0.418, sd * 0.134],
        [0.146, -0.396, sd * 0.160],
        [0.036, -0.290, sd * 0.172],
        [0.006, -0.166, sd * 0.166]
      ], function (u) { return [0.036 - u * 0.012, 0.016]; }, 8,
        { key: kOf([0.150, -0.320, sd * 0.158]), up: [0, 1, 0], ao: 0.16 });
    });
    return mesh;
  }

  /* TÝLNÍ OTVOR A KLOUBNÍ HRBOLY — spodek lebky, o který se
     opírá atlas. Ve scéně týlu je to hlavní herec.          */
  function occipitalBase(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    /* okraj velkého týlního otvoru */
    var rim = [];
    for (var i = 0; i <= 20; i++) {
      var a = i / 20 * TAU;
      /* Otvor leží V bázi, ne pod ní. Klenba má v x = −0,100
         spodek na y = −0,156; prstenec proto sedí na −0,146
         a je o kus menší. Když visel na −0,168 s poloměrem
         0,092, čouhal ven a četl se jako oční jamka.       */
      rim.push([-0.108 + Math.cos(a) * 0.070, -0.138 + Math.abs(Math.sin(a)) * 0.008,
                Math.sin(a) * 0.058]);
    }
    G.tube(mesh, rim, function () { return [0.019, 0.016]; }, 8,
      { key: key, ao: 0.30, caps: false, up: [0, 1, 0] });
    /* kloubní hrboly — dva oblouky po stranách otvoru, na nich
       stojí celá hlava                                       */
    [-1, 1].forEach(function (sd) {
      lump(mesh, [-0.078, -0.150, sd * 0.054], [0.046, 0.017, 0.024], function (d) {
        return 1 - 0.26 * Math.max(0, -d[1]);
      }, { u: 12, v: 7, key: key, ao: 0.18 });
    });
    /* týlní hřeben — hmatný val, pod který jdou prsty */
    bone(mesh, [
      [-0.330, -0.036, -0.240], [-0.400, 0.010, -0.130],
      [-0.418, 0.020, 0], [-0.400, 0.010, 0.130], [-0.330, -0.036, 0.240]
    ], function () { return [0.014, 0.012]; }, 6,
      { key: key, ao: 0.20, up: [0, 1, 0] });
    return mesh;
  }

  /* ============================================================
     CHODIDLO

     Jednotka = délka chodidla. Nejčastější chyba je udělat
     z nohy placku: chodidlo má KLENBU, pata je vysoká a nárt
     stoupá. Kdo tohle vynechá, dostane pádlo.
     ============================================================ */
  function footBones(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var kOf = opt.keyOf || function (v) { return key; };

    /* patní kost — největší kost nohy, hrbol dozadu a dolů */
    lump(mesh, [0.112, 0.086, 0], [0.132, 0.082, 0.104], function (d) {
      return 1 + 0.26 * Math.max(0, -d[0])
               - 0.18 * Math.max(0, d[1]) * Math.max(0, d[0])
               + 0.10 * Math.max(0, -d[1]);
    }, { u: 18, v: 11, key: kOf(0.92) });
    /* hlezenní kost s kladkou nahoře — sem dosedá bérec */
    lump(mesh, [0.258, 0.156, 0.004], [0.084, 0.070, 0.098], function (d) {
      return 1 + 0.18 * Math.max(0, d[1]) - 0.10 * Math.max(0, -d[0]) * Math.max(0, -d[1]);
    }, { u: 16, v: 10, key: kOf(0.80) });
    /* člunková a tři klínové kosti — klenba drží na nich */
    lump(mesh, [0.372, 0.140, -0.010], [0.050, 0.056, 0.082], null, { key: kOf(0.70) });
    lump(mesh, [0.452, 0.132, -0.062], [0.046, 0.052, 0.052], null, { key: kOf(0.66) });
    lump(mesh, [0.450, 0.120, 0.006], [0.044, 0.046, 0.048], null, { key: kOf(0.66) });
    lump(mesh, [0.444, 0.104, 0.072], [0.044, 0.042, 0.050], null, { key: kOf(0.66) });
    /* krychlová kost — na vnější straně, níž */
    lump(mesh, [0.402, 0.090, 0.142], [0.058, 0.048, 0.058], null, { key: kOf(0.68) });

    /* Nártní kosti a články — pět paprsků, každý jinak dlouhý.
       DÉLKA JE KRITICKÁ. Paprsek začíná na 0,47 délky chodidla
       a musí dojít skoro na 1,0; nártní kost zabírá šest desetin,
       články čtyři. Původní čísla končila na 0,74 — přední
       třetina nohy byla uvnitř prázdná a obal se pak četl jako
       placka, protože v něm nic nebylo.                     */
    var LEN = [0.520, 0.548, 0.530, 0.498, 0.418];
    var ZOF = [-0.140, -0.070, 0.006, 0.080, 0.150];
    for (var i = 0; i < 5; i++) {
      var z0 = ZOF[i] * 0.62, z1 = ZOF[i];
      var base = 0.470 - i * 0.004;
      var mtEnd = base + LEN[i] * 0.60;
      /* klenba: prostřední paprsky sedí výš než okrajové */
      var lift = 0.036 * Math.exp(-Math.pow((i - 1.6) / 1.8, 2));
      bone(mesh, [
        [base, 0.104 + lift, z0],
        [base + LEN[i] * 0.32, 0.092 + lift * 0.7, lerp(z0, z1, 0.55)],
        [mtEnd, 0.070 + lift * 0.3, z1]
      ], function (u) { return [0.024 - u * 0.005, 0.022 - u * 0.005]; }, 8,
        { key: kOf(0.60), up: [0, 1, 0] });
      /* prstové články — u malíku kratší */
      var pl = LEN[i] * 0.40;
      bone(mesh, [
        [mtEnd, 0.068 + lift * 0.3, z1],
        [mtEnd + pl * 0.60, 0.056, z1 * 1.05],
        [mtEnd + pl, 0.048, z1 * 1.10]
      ], function (u) { return [0.019 - u * 0.005, 0.018 - u * 0.005]; }, 7,
        { key: kOf(0.54), up: [0, 1, 0] });
    }

    /* bérec — holenní a lýtková kost mizí horním okrajem */
    bone(mesh, [[0.248, 0.212, -0.020], [0.244, 0.44, -0.024], [0.240, 0.78, -0.028]],
      function (u) { return [0.058 + u * 0.022, 0.062 + u * 0.024]; }, 12,
      { key: kOf(0.34), up: [0, 1, 0] });
    bone(mesh, [[0.246, 0.222, 0.104], [0.242, 0.46, 0.106], [0.238, 0.78, 0.108]],
      function (u) { return [0.028 + u * 0.010, 0.028 + u * 0.012]; }, 10,
      { key: kOf(0.34), up: [0, 1, 0] });
    /* vnitřní a zevní kotník — hroty, které na noze každý najde */
    lump(mesh, [0.250, 0.164, -0.098], [0.038, 0.058, 0.032], null, { key: kOf(0.48) });
    lump(mesh, [0.244, 0.146, 0.122], [0.032, 0.064, 0.028], null, { key: kOf(0.48) });
    return mesh;
  }

  /* Obal chodidla. Profil je klíč: pod klenbou se kůže NEDOTÝKÁ
     podložky, u paty a u bříšek prstů ano.                   */
  function footShell(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    /* x, spodní hrana (chodidlo), horní hrana (nárt), pol. šířka,
       hranatost. Spodní hrana je skoro na nule — noha LEŽÍ.
       Kdo sem napíše střed a výšku místo dvou hran, dostane
       nohu zapuštěnou do podložky; přesně to byla stará chyba. */
    var P2 = [
      [-0.042, 0.014, 0.186, 0.090, 0.34],
      [ 0.012, 0.000, 0.222, 0.116, 0.26],
      [ 0.092, 0.000, 0.250, 0.132, 0.22],
      [ 0.176, 0.002, 0.264, 0.134, 0.20],
      [ 0.266, 0.008, 0.246, 0.130, 0.20],
      [ 0.360, 0.012, 0.214, 0.136, 0.22],
      [ 0.470, 0.012, 0.182, 0.154, 0.26],
      [ 0.590, 0.008, 0.152, 0.176, 0.30],
      [ 0.710, 0.004, 0.124, 0.184, 0.34],
      [ 0.830, 0.001, 0.098, 0.172, 0.38],
      [ 0.930, 0.000, 0.074, 0.140, 0.44],
      [ 0.998, 0.000, 0.050, 0.086, 0.52]
    ];
    G.loft(mesh, P2.map(function (q) {
      var cy = (q[1] + q[2]) / 2, hy = (q[2] - q[1]) / 2;
      var r = G.ring(18, q[3], hy, { square: q[4] });
      /* KLENBA. Zvedá se jen vnitřní strana a jen uprostřed
         chodidla — vnější hrana leží na podložce po celé délce.
         Bez toho je z nohy placka.                          */
      var lift = 0.062 * Math.exp(-Math.pow((q[0] - 0.400) / 0.215, 2));
      return r.map(function (p) {
        var z = p[0], y = p[1];
        var medial = Math.max(0, -z) / Math.max(q[3], 0.001);
        var below = Math.max(0, -y) / Math.max(hy, 0.001);
        return [q[0], cy + y + lift * medial * below, z, 0.04, key];
      });
    }), { capStart: true, capEnd: true });

    /* Bérec pokračuje vzhůru a mizí horním okrajem.

       POZOR NA OSY. Bérec roste podél +y, takže jeho PRŮŘEZ
       musí ležet v rovině xz. Dřív se prstenec skládal do
       roviny yz — tedy do téže osy, po které se lofto­valo —
       a z lýtka byla plochá stuha, ne noha. Teď jde prstenec
       do x (předozadní hloubka) a z (šířka), výška je čistě
       parametr.                                              */
    var calf = [];
    for (var i = 0; i <= 12; i++) {
      var u = i / 12;
      /* Lýtko není válec: nad kotníkem je nejužší, v půlce se
         vyklene a nahoře zase couvne. Bez toho je to trubka. */
      var swell = 1 + 0.34 * Math.sin(Math.pow(u * 0.78, 0.85) * Math.PI);
      var rr = G.ring(22, lerp(0.092, 0.118, u) * swell,
                          lerp(0.100, 0.132, u) * swell, { square: 0.04 });
      calf.push(rr.map(function (p) {
        /* osa bérce se s výškou mírně vrací dozadu */
        return [lerp(0.244, 0.208, u) + p[0], lerp(0.205, 1.30, u),
                p[1] + 0.006, 0.04, key];
      }));
    }
    /* Bez víčka: bérec MÁ vyjet z rámu, ne skončit useknutým
       terčem. Uzavřený konec se čte jako amputace.          */
    G.loft(mesh, calf, { capStart: false, capEnd: false });
    return mesh;
  }

  /* ============================================================
     PROSTŘEDÍ A REKVIZITY
     ============================================================ */

  /* LEHÁTKO — čalouněná deska s podnoží. Bez nohou se vznáší. */
  function couch(mesh, w, d, h, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    G.sheet(mesh, 14, 8, function (u, v) {
      var x = (u - 0.5) * w, z = (v - 0.5) * d;
      /* okraje se sklánějí — čalounění, ne deska */
      var edge = Math.pow(Math.abs(u - 0.5) * 2, 6) + Math.pow(Math.abs(v - 0.5) * 2, 6);
      return { p: [x, h - edge * 0.022, z], n: [0, 1, 0],
               ao: 0.04 + edge * 0.22, key: key };
    }, 0.026);
    /* podnož — dva rámy, aby lehátko stálo na zemi */
    [-1, 1].forEach(function (sd) {
      var x0 = sd * w * 0.30;
      [-1, 1].forEach(function (sz) {
        bone(mesh, [[x0, h - 0.030, sz * d * 0.30], [x0, h - 0.230, sz * d * 0.26]],
          function () { return [0.016, 0.016]; }, 8, { key: key, ao: 0.16, up: [1, 0, 0] });
      });
      bone(mesh, [[x0, h - 0.226, -d * 0.26], [x0, h - 0.226, d * 0.26]],
        function () { return [0.013, 0.013]; }, 6, { key: key, ao: 0.20, up: [0, 1, 0] });
    });
    return mesh;
  }

  /* POLŠTÁŘ — měkký klín pod hlavou. */
  function pillow(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    G.sheet(mesh, 16, 12, function (u, v) {
      var x = (u - 0.5) * 0.185, z = (v - 0.5) * 0.290;
      var soft = Math.cos((u - 0.5) * Math.PI) * Math.cos((v - 0.5) * Math.PI);
      return { p: [x, 0.034 * Math.pow(soft, 0.7), z], n: [0, 1, 0],
               ao: 0.05 + (1 - soft) * 0.20, key: key };
    }, function (u, v) {
      var soft = Math.cos((u - 0.5) * Math.PI) * Math.cos((v - 0.5) * Math.PI);
      return 0.006 + soft * 0.020;
    });
    return mesh;
  }

  /* BOTA — sundaná, položená vedle lehátka. Podrážka, svršek,
     jazyk. Bez podrážky je to porcelánový rohlík.          */
  function shoe(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    /* podrážka */
    G.sheet(mesh, 12, 6, function (u, v) {
      var x = u * 0.255;
      var w = 0.046 * (1 - Math.pow(Math.abs(u - 0.42) * 2.1, 3.2) * 0.42);
      return { p: [x, 0.012 + Math.pow(u, 3) * 0.010, (v - 0.5) * 2 * w],
               n: [0, 1, 0], ao: 0.10 + (1 - u) * 0.06, key: key };
    }, 0.010);
    /* svršek */
    var rings = [];
    for (var i = 0; i <= 9; i++) {
      var u = i / 9;
      var w = 0.042 * (1 - Math.pow(Math.abs(u - 0.40) * 2.1, 3.0) * 0.38);
      /* pata vysoká, špička nízká — profil boty */
      var h = lerp(0.062, 0.020, Math.pow(u, 0.75));
      var r = G.ring(14, w, h, { square: 0.40 });
      rings.push(r.map(function (p) {
        return [u * 0.250 + 0.004, 0.024 + p[1] + h * 0.42, p[0], 0.08, key];
      }));
    }
    G.loft(mesh, rings, { capStart: true, capEnd: true });
    /* nášlapný okraj u kotníku */
    lump(mesh, [0.036, 0.078, 0], [0.030, 0.020, 0.042], null, { u: 10, v: 6, ao: 0.24, key: key });
    return mesh;
  }

  /* CIFERNÍK VÁHY — pouzdro, sklo, stupnice, ručička.
     Rekvizita, na které stojí celá scéna „nikdo netlačí“:
     bez rysek a ručičky je to bílý disk.                    */
  function dialCase(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var R = opt.r || 0.26;
    /* pouzdro — rotační těleso s profilem */
    var prof = [[0.000, R * 0.06], [0.006, R * 0.55], [0.012, R * 0.86],
                [0.026, R * 0.99], [0.062, R * 1.00], [0.074, R * 0.94],
                [0.078, R * 0.80], [0.080, 0]];
    G.loft(mesh, prof.map(function (q) {
      var r = [];
      for (var i = 0; i < 30; i++) {
        var a = i / 30 * TAU;
        r.push([Math.cos(a) * q[1], q[0], Math.sin(a) * q[1], 0.04, key]);
      }
      return r;
    }), { capStart: true, capEnd: true });
    /* rysky stupnice — dvanáct krátkých, čtyři dlouhé */
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * TAU;
      var long = i % 6 === 0;
      var r0 = R * (long ? 0.66 : 0.76), r1 = R * 0.88;
      bone(mesh, [[Math.cos(a) * r0, 0.079, Math.sin(a) * r0],
                  [Math.cos(a) * r1, 0.079, Math.sin(a) * r1]],
        function () { return [long ? 0.006 : 0.0035, 0.0035]; }, 5,
        { key: key, ao: 0.30, up: [0, 1, 0] });
    }
    return mesh;
  }
  function dialNeedle(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var R = opt.r || 0.26;
    bone(mesh, [[-R * 0.14, 0, 0], [R * 0.80, 0.002, 0]],
      function (u) { return [0.008 - u * 0.005, 0.006 - u * 0.004]; }, 7,
      { key: key, up: [0, 1, 0] });
    lump(mesh, [0, 0, 0], [0.024, 0.012, 0.024], null, { u: 12, v: 6, key: key });
    return mesh;
  }

  /* STŘÍKAČKA — válec, píst, kónus, jehla. Ve scéně se ukazuje
     jen proto, aby zmizela.                                 */
  function syringe(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var cyl = [];
    for (var i = 0; i <= 5; i++) {
      var u = i / 5, r = [];
      for (var j = 0; j < 18; j++) {
        var a = j / 18 * TAU;
        r.push([u * 0.230 - 0.115, Math.cos(a) * 0.030, Math.sin(a) * 0.030, 0.05, key]);
      }
      cyl.push(r);
    }
    G.loft(mesh, cyl, { capStart: true, capEnd: true });
    /* příruba na palec */
    G.loft(mesh, [0, 1].map(function (k) {
      var r = [];
      for (var j = 0; j < 18; j++) {
        var a = j / 18 * TAU;
        r.push([-0.115 - k * 0.008, Math.cos(a) * 0.052, Math.sin(a) * 0.016, 0.08, key]);
      }
      return r;
    }), { capStart: true, capEnd: true });
    bone(mesh, [[-0.196, 0, 0], [-0.120, 0, 0]], function () { return [0.011, 0.011]; },
      8, { key: key, up: [0, 1, 0] });
    bone(mesh, [[0.115, 0, 0], [0.146, 0, 0]], function (u) { return [0.019 - u * 0.008, 0.019 - u * 0.008]; },
      8, { key: key, up: [0, 1, 0] });
    bone(mesh, [[0.146, 0, 0], [0.300, 0, 0]], function (u) { return [0.0045 - u * 0.0025, 0.0045 - u * 0.0025]; },
      6, { key: key, up: [0, 1, 0] });
    return mesh;
  }

  /* ============================================================
     LEŽÍCÍ ČLOVĚK

     Jedno těleso, ne obrys. Průřez se po délce mění z kulatého
     (hlava) přes široký plochý (hrudník) po úzký (nohy) — a to
     je celý rozdíl mezi člověkem a pytlem.

     +x  od hlavy k nohám, +y vzhůru, +z doprava
     Délka 1,0 = výška postavy.
     ============================================================ */
  var BODY = [
    /* x,    šířka z, výška y, střed y, hranatost */
    [0.000, 0.058, 0.060, 0.056, 0.10],   /* temeno   */
    [0.028, 0.074, 0.080, 0.054, 0.10],
    [0.070, 0.070, 0.076, 0.048, 0.14],   /* obličej  */
    [0.112, 0.046, 0.050, 0.038, 0.20],   /* krk      */
    [0.148, 0.112, 0.072, 0.046, 0.28],   /* ramena   */
    [0.200, 0.120, 0.080, 0.050, 0.30],
    [0.270, 0.112, 0.084, 0.052, 0.30],   /* hrudník  */
    [0.340, 0.094, 0.072, 0.048, 0.32],   /* pas      */
    [0.400, 0.106, 0.078, 0.050, 0.30],   /* pánev    */
    [0.470, 0.100, 0.076, 0.048, 0.26],
    [0.560, 0.074, 0.066, 0.042, 0.22],   /* stehna   */
    [0.660, 0.062, 0.056, 0.036, 0.20],   /* kolena   */
    [0.760, 0.052, 0.050, 0.032, 0.18],
    [0.870, 0.040, 0.038, 0.026, 0.16],   /* kotníky  */
    [0.930, 0.042, 0.046, 0.030, 0.20],   /* chodidla */
    [0.960, 0.038, 0.030, 0.022, 0.30]
  ];
  function bodyAt(x) {
    for (var i = 0; i < BODY.length - 1; i++) {
      if (x >= BODY[i][0] && x <= BODY[i + 1][0]) {
        var u = (x - BODY[i][0]) / (BODY[i + 1][0] - BODY[i][0]);
        return [lerp(BODY[i][1], BODY[i + 1][1], u),
                lerp(BODY[i][2], BODY[i + 1][2], u),
                lerp(BODY[i][3], BODY[i + 1][3], u)];
      }
    }
    return [0.05, 0.05, 0.04];
  }

  /* Postava po části. `from`–`to` v podílu délky, takže se dá
     zvlášť postavit hlava (kůže) a zvlášť trup (tričko).    */
  function lyingBody(mesh, opt) {
    opt = opt || {};
    var br = opt.breath || 0;
    var key = opt.key || 0;
    var from = opt.from == null ? 0 : opt.from;
    var to = opt.to == null ? 1 : opt.to;
    var pad = opt.pad || 0;
    var rows = [];
    BODY.forEach(function (b, i) {
      if (b[0] < from - 0.001 || b[0] > to + 0.001) return;
      rows.push(b);
    });
    /* dořízne se přesně na hranici, ať oblečení nekončí uprostřed
       obratle                                                */
    function edge(x) {
      var s = bodyAt(x);
      return [x, s[0], s[1], s[2], 0.26];
    }
    if (!rows.length || rows[0][0] > from + 0.001) rows.unshift(edge(from));
    if (rows[rows.length - 1][0] < to - 0.001) rows.push(edge(to));

    G.loft(mesh, rows.map(function (b) {
      /* hrudník se nadechne, zbytek ne */
      var chest = Math.exp(-Math.pow((b[0] - 0.245) / 0.11, 2));
      var w = (b[1] + pad) * (1 + 0.045 * br * chest);
      var h = (b[2] + pad) * (1 + 0.075 * br * chest);
      var r = G.ring(18, w, h, { square: b[4] });
      return r.map(function (q) {
        return [b[0], b[3] + q[1] - h * 0.06, q[0], 0.03, key];
      });
    }), { capStart: opt.caps !== false, capEnd: opt.caps !== false });

    if (opt.arms !== false) {
      [-1, 1].forEach(function (sd) {           /* paže podél těla */
        G.tube(mesh, curve([
          [0.155, 0.070, sd * 0.092],
          [0.230, 0.052, sd * 0.118],
          [0.330, 0.040, sd * 0.122],
          [0.420, 0.036, sd * 0.108],
          [0.470, 0.032, sd * 0.096]
        ], 6), function (u) { return 0.030 - u * 0.010 + pad; }, 10,
          { ao: 0.10, key: key });
      });
    }
    return mesh;
  }

  /* DEKA — nekopíruje tělo. Přes vyvýšeniny se napne a mezi nimi
     visí; proto se počítá z obrysu těla, ale s vlastním
     „provisem“. Bez toho vypadá jako nastříkaná barva.      */
  function blanket(mesh, x0, x1, opt) {
    opt = opt || {};
    var br = opt.breath || 0, key = opt.key || 0;
    G.sheet(mesh, 30, 16, function (u, v) {
      var x = lerp(x0, x1, u);
      var b = bodyAt(x);
      var chest = Math.exp(-Math.pow((x - 0.245) / 0.11, 2));
      var t = (v - 0.5) * 2;
      var w = b[0] * 1.34;
      var z = t * w;
      var over = Math.max(0, 1 - Math.pow(Math.abs(t) * 1.02, 2.4));
      var y = b[2] + b[1] * (0.55 + 0.55 * over) * (1 + 0.05 * br * chest);
      y -= 0.006 * Math.exp(-Math.pow((x - 0.71) / 0.06, 2));   /* provis u kolen */
      y = lerp(0.004, y, over > 0 ? 1 : 0.15);
      /* záhyby — dvě nesouměřitelné vlny, aby nevznikl rastr */
      var fold = (0.0020 * Math.sin(x * 47) + 0.0013 * Math.sin(x * 83 + 1.7)) * over;
      return { p: [x, y + fold, z], n: [0, 1, 0],
               ao: 0.05 + (1 - over) * 0.20, key: key };
    }, 0.0038);
    /* přehnutý okraj u hrudníku — deka má tloušťku */
    G.sheet(mesh, 20, 4, function (u, v) {
      var b = bodyAt(x0);
      var t = (v - 0.5) * 2;
      var z = (u - 0.5) * 2 * b[0] * 1.30;
      var over = Math.max(0, 1 - Math.pow(Math.abs((u - 0.5) * 2) * 1.02, 2.4));
      return { p: [x0 - t * 0.014, b[2] + b[1] * (0.58 + 0.55 * over) + 0.006 * (1 - Math.abs(t)), z],
               n: [0, 1, 0], ao: 0.10 + (1 - over) * 0.16, key: key };
    }, 0.0040);
    return mesh;
  }

  /* ============================================================
     PŘÍČNÉ PŘEPÁŽKY

     Tělo má několik vodorovných blan, kterými prochází všechno —
     cévy, nervy, jícen, mízní cesty. Scéna „Bránice a hrudní
     vstup“ je ukazuje všechny tři, protože o tom mluví text:
     když drží jedna, drží obvykle všechny.

     Nejsou to disky. Blána je NAPNUTÁ MEMBRÁNA: uprostřed
     prohnutá, po obvodu přirostlá, a když povolí, prohne se
     míň. Proto je `sag` parametr a ne konstanta.
     ============================================================ */
  function membrane(mesh, opt) {
    opt = opt || {};
    var y = opt.y || 0, rx = opt.rx || 0.16, rz = opt.rz || 0.12;
    var sag = opt.sag == null ? 0.030 : opt.sag;
    var cx = opt.cx || 0, key = opt.key || 0;
    G.sheet(mesh, 26, 10, function (u, v) {
      var a = u * TAU;
      var r = v;
      var x = cx + Math.cos(a) * rx * r;
      var z = Math.sin(a) * rz * r;
      /* Průhyb je největší uprostřed a na okraji nulový —
         jinak by blána z úponu odstávala.                  */
      var d = sag * (1 - Math.pow(r, 1.8));
      /* Dvě mělké vlny napříč: blána není soustružený talíř. */
      var ripple = 0.0035 * Math.sin(a * 3 + 0.7) * (1 - r) * r;
      return { p: [x, y - d + ripple, z], n: [0, 1, 0],
               ao: 0.03 + (1 - r) * 0.10, key: key };
    }, function (u, v) { return 0.0026 + (1 - v) * 0.0016; });
    /* obvodový úpon — val, kterým blána přirůstá k okraji */
    var rim = [];
    for (var i = 0; i <= 30; i++) {
      var a = i / 30 * TAU;
      rim.push([cx + Math.cos(a) * rx, y, Math.sin(a) * rz]);
    }
    G.tube(mesh, rim, function () { return [0.0062, 0.0052]; }, 7,
      { key: key, ao: 0.16, caps: false, up: [0, 1, 0] });
    return mesh;
  }

  /* ============================================================
     ZNAKY — pět scén sekce „Čeho se nebát“

     Sekce neukazuje anatomii, ale VĚCI, kterých se lidé bojí,
     a to, co se s nimi stane. Aby to fungovalo, musí být každý
     předmět rozeznatelný na první pohled a zároveň hezký sám
     o sobě: složená mikina, mince na kůži, jehla v přeškrtnutém
     kolečku, bublina s řečí, osmiúhelník.

     Všechno se staví v počátku, s hlavním rozměrem rovným 1.
     ============================================================ */

  /* SLOŽENÉ OBLEČENÍ.
     Ne kvádr se zaoblenými rohy: složená mikina má TŘI vrstvy
     nad sebou, převalený hřbet na jedné straně, dva rukávy
     přeložené přes sebe a žebrový úplet, na kterém se láme
     světlo. Bez úpletu je to polštář.

     +x šířka, +z hloubka, +y vzhůru. Šířka = 1,0.            */
  function foldedGarment(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var W = 0.50, D = 0.34;              /* poloviční rozměry */
    var puff = opt.puff == null ? 1 : opt.puff;

    /* jedna vrstva: měkký polštář se zaoblenými rohy a s úpletem */
    function layer(y0, h, sx, sz, k, rib) {
      G.sheet(mesh, 34, 24, function (u, v) {
        var tx = (u - 0.5) * 2, tz = (v - 0.5) * 2;
        var x = tx * W * sx, z = tz * D * sz;
        /* Superelipsový spád k okrajům — látka se u hrany
           sklápí, nekončí kolmou stěnou.                  */
        var e = Math.pow(Math.abs(tx), 5.0) + Math.pow(Math.abs(tz), 5.0);
        var dome = Math.max(0, 1 - e);
        var y = y0 + h * Math.pow(dome, 0.45) * puff;
        /* žebrový úplet — jemné svislé rýhy po celé šířce */
        y += rib * Math.sin(x * 96) * dome * 0.5;
        /* dva měkké záhyby, kde látka po složení nesedne */
        y -= 0.006 * Math.exp(-Math.pow((x + 0.10) / 0.05, 2)) * dome;
        y -= 0.004 * Math.exp(-Math.pow((x - 0.18) / 0.06, 2)) * dome;
        return { p: [x, y, z], n: [0, 1, 0],
                 ao: 0.05 + (1 - dome) * 0.26, key: k };
      }, function (u, v) { return 0.0075; });
    }

    /* DVĚ VRSTVY, NE TŘI. Se třemi vypadala hromádka jako stoh
       podložek na jógu: tři stejné desky nad sebou, tři stejné
       hrany. Dvě splynou v jednu měkkou hmotu a přeložení je
       pořád vidět.                                            */
    layer(0.000, 0.112, 1.000, 1.000, key, 0.0026);
    layer(0.082, 0.078, 0.912, 0.890, key + 0.09, 0.0019);

    /* PŘEVALENÝ HŘBET. Strana, přes kterou je oblečení
       přeložené, není hrana — je to VÁLEC. Právě podle něj
       oko pozná, že je věc složená, a ne ušitá do kvádru.  */
    [0, 1].forEach(function (i) {
      var y = [0.054, 0.120][i];
      var sx = [1.000, 0.912][i];
      var pts = [];
      for (var j = 0; j <= 8; j++) {
        var t = j / 8;
        pts.push([-W * sx, y, (t - 0.5) * 2 * D * [1.0, 0.89][i] * 0.96]);
      }
      G.tube(mesh, pts, function () { return [0.036 - i * 0.008, 0.037 - i * 0.008]; }, 12,
        { key: key + i * 0.09, ao: 0.12, caps: false, up: [0, 1, 0] });
    });

    /* RUKÁV přeložený napříč. Manžeta je vlastní prstenec —
       bez ní je rukáv jen tlustší záhyb.                   */
    var sl = curve([
      [-0.34, 0.176, -0.150], [-0.04, 0.184, -0.060],
      [ 0.22, 0.182, 0.040], [0.36, 0.174, 0.128]
    ], 6);
    G.tube(mesh, sl, function (u) { return [0.048 - u * 0.010, 0.030 - u * 0.006]; }, 14,
      { key: key + 0.16, ao: 0.08, up: [0, 1, 0] });
    G.tube(mesh, [[0.30, 0.176, 0.098], [0.38, 0.172, 0.142]],
      function () { return [0.042, 0.029]; }, 14,
      { key: key + 0.18, ao: 0.16, up: [0, 1, 0] });

    /* LÍMEC — půlkruhový val na horní vrstvě. Jediná věc,
       po které se pozná mikina od ručníku.                 */
    var col = [];
    for (var i = 0; i <= 16; i++) {
      var a = lerp(-0.40, 0.40, i / 16) * Math.PI;
      col.push([-0.285 + Math.cos(a) * 0.108, 0.170, Math.sin(a) * 0.112]);
    }
    G.tube(mesh, col, function () { return [0.015, 0.011]; }, 10,
      { key: key + 0.20, ao: 0.14, caps: false, up: [0, 1, 0] });
    return mesh;
  }

  /* MAKRO KŮŽE.
     Scéna „nikdo do vás nebude tlačit“ stojí na tom, že je vidět,
     jak MÁLO se pod pěti gramy stane. Musí to tedy být detail
     kůže, ne postava: velká plocha s vlastní texturou, do které
     se udělá důlek hluboký zlomek milimetru.

     `dent`  hloubka důlku (0 = nic)
     `at`    kde je jeho střed [x, z]
     `rad`   jeho poloměr                                     */
  function skinPatch(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var S = opt.size || 1.0;
    var dent = opt.dent || 0, rad = opt.rad || 0.16;
    var ax = (opt.at && opt.at[0]) || 0, az = (opt.at && opt.at[1]) || 0;
    /* KLENUTÍ. Rovná plocha má v perspektivě hranu a ta se čte
       jako okraj stolu — makro kůže se tím změní v desku.
       Mírné klenutí ke krajům dělá z téže plochy POVRCH TĚLA:
       obzor je pak oblouk paže, ne řez.                      */
    var dome = opt.dome == null ? 0.085 : opt.dome;
    G.sheet(mesh, 74, 62, function (u, v) {
      var x = (u - 0.5) * S, z = (v - 0.5) * S;
      /* Velká vlna: kůže není deska, leží přes tkáň pod sebou. */
      var y = 0.016 * Math.sin(x * 3.1 + 0.4) + 0.012 * Math.sin(z * 2.6 - 0.9);
      y -= dome * (x * x + z * z * 0.72);
      /* Jemná kresba kůže — dvě nesouměřitelné vlny, aby
         nevznikl rastr, plus tři vrásky, které jdou napříč. */
      y += 0.0022 * Math.sin(x * 61 + z * 23) + 0.0016 * Math.sin(z * 74 - x * 17);
      y -= 0.0030 * Math.exp(-Math.pow((z - x * 0.35 - 0.12) / 0.020, 2));
      y -= 0.0026 * Math.exp(-Math.pow((z - x * 0.28 + 0.16) / 0.017, 2));
      /* DŮLEK. Kolem něj se kůže nepatrně vyhrne — to je to,
         po čem oko pozná, že je měkká, a ne z gumy.        */
      var r = Math.hypot(x - ax, z - az) / rad;
      y -= dent * Math.exp(-r * r * 1.6);
      y += dent * 0.30 * Math.exp(-Math.pow((r - 1.35) / 0.55, 2));
      return { p: [x, y, z], n: [0, 1, 0],
               ao: 0.02 + dent * 3.2 * Math.exp(-r * r * 1.6), key: key };
    }, 0.020);
    return mesh;
  }

  /* MINCE — válec s vroubkovanou hranou a mělkým reliéfem.
     Vroubky nejsou ozdoba: díky nim se po hraně mince táhne
     přerušovaný odlesk, a teprve to z ní udělá kov.        */
  function coin(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var R = opt.r || 0.11, H = opt.h || 0.013;
    var SEG = 64;
    var rings = [];
    /* profil: spodek → vroubkovaná hrana → líc s mírnou klenbou */
    var prof = [
      [-H, 0.00], [-H, 0.86], [-H * 0.86, 0.98], [-H * 0.40, 1.00],
      [ H * 0.40, 1.00], [ H * 0.86, 0.98], [ H, 0.86], [ H, 0.00]
    ];
    for (var i = 0; i < prof.length; i++) {
      var q = prof[i], row = [];
      for (var j = 0; j < SEG; j++) {
        var a = j / SEG * TAU;
        /* vroubky jen na svislé části hrany */
        var edge = q[1] > 0.9 ? 1 : 0;
        var mill = edge * 0.0016 * Math.sin(a * 44);
        var rr = R * q[1] + mill;
        /* líc má mělkou klenbu a soustředný val — reliéf */
        var y = q[0];
        if (q[1] < 0.9 && q[0] > 0) y += 0.0016 * (1 - Math.pow(q[1], 2));
        row.push([Math.cos(a) * rr, y, Math.sin(a) * rr,
                  0.03 + (1 - q[1]) * 0.06, key]);
      }
      rings.push(row);
    }
    G.loft(mesh, rings, { capStart: true, capEnd: true });
    /* soustředný val na líci — mince má kresbu, ne prázdný kotouč */
    var band = [];
    for (var j2 = 0; j2 <= SEG; j2++) {
      var a2 = j2 / SEG * TAU;
      band.push([Math.cos(a2) * R * 0.74, H * 0.42, Math.sin(a2) * R * 0.74]);
    }
    G.tube(mesh, band, function () { return [0.0026, 0.0020]; }, 6,
      { key: key, ao: 0.20, caps: false, up: [0, 1, 0] });
    return mesh;
  }

  /* PŘEŠKRTNUTÉ KOLEČKO — mezinárodní „tohle ne“.

     Znak leží v rovině xy (z = 0), takže se dá postavit čelem
     ke kameře a předmět uvnitř zůstane v prostoru.

     PROČ NE TRUBKA. První verze byla prstenec z trubky vedené
     po kružnici. Na vnějším obrysu se ale počítaly jednotlivé
     příčné řezy a znak vypadal jako OZUBENÉ KOLO — na značce,
     která má uklidnit, ta nejhorší možná asociace. Teď je to
     PLOCHÁ MEZIKRUŽÍ DESKA se zaoblenou hranou: jedna
     souvislá plocha, žádné segmenty, a čte se jako ražený
     kov, ne jako had z korálků.

     `arc` 0…1 kreslí prstenec postupně, `cut` přes něj potom
     přetáhne příčné břevno.                                   */
  function banRing(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var R = opt.r || 0.46, W = opt.w || 0.052;
    var cut = opt.cut == null ? 1 : clamp(opt.cut, 0, 1);
    var arc = opt.arc == null ? 1 : clamp(opt.arc, 0, 1);
    var r0 = R - W / 2, r1 = R + W / 2;
    var a0 = -Math.PI * 0.75;
    var span = Math.max(0.02, arc) * TAU;
    var uSeg = Math.max(6, Math.round(96 * arc));

    /* Hrana není useknutá: tloušťka klesá k okrajům podle
       superelipsy, takže po ní jde odlesk jako po ražbě.    */
    function edge(v) {
      var t = (v - 0.5) * 2;
      return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 4)), 0.42);
    }
    G.sheet(mesh, uSeg, 8, function (u, v) {
      var a = a0 + u * span;
      var r = lerp(r0, r1, v);
      return { p: [Math.cos(a) * r, Math.sin(a) * r, 0], n: [0, 0, 1],
               ao: 0.03 + (1 - edge(v)) * 0.16, key: key };
    }, function (u, v) { return W * 0.30 * edge(v); });

    if (cut > 0.02) {
      /* Břevno je táž deska, jen rovná — a je o vlásek blíž
         ke kameře, aby na styku s prstencem nešlo o hádku
         hloubkového testu.                                  */
      var x0 = Math.cos(a0) * R, y0 = Math.sin(a0) * R;
      var x1 = Math.cos(a0 - Math.PI) * R, y1 = Math.sin(a0 - Math.PI) * R;
      G.sheet(mesh, 16, 8, function (u, v) {
        var t = (v - 0.5) * W;
        /* kolmice na směr břevna */
        var dx = x1 - x0, dy = y1 - y0;
        var L = Math.hypot(dx, dy) || 1;
        var nx = -dy / L, ny = dx / L;
        return { p: [lerp(x0, x1, u * cut) + nx * t,
                     lerp(y0, y1, u * cut) + ny * t, 0.004],
                 n: [0, 0, 1], ao: 0.03 + (1 - edge(v)) * 0.16, key: key + 0.04 };
      }, function (u, v) { return W * 0.30 * edge(v); });
    }
    return mesh;
  }

  /* BUBLINA S ŘEČÍ — zaoblený obdélník s ocáskem, ze skla.
     Je to jediný předmět scény „nemusíte nic vyprávět“, který
     se má rozplynout; proto je průhledný od začátku.        */
  function bubble(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var W = opt.w || 0.44, H = opt.h || 0.26, D = opt.d || 0.10;
    G.blob(mesh, 30, 18, function (d) {
      var nn = 4.0;
      var k = Math.pow(Math.pow(Math.abs(d[0]), nn) + Math.pow(Math.abs(d[1]), nn), -1 / nn);
      k = Math.min(k, 2.6);
      return [d[0] * W * k, d[1] * H * k, d[2] * D, 0.04, key];
    });
    /* ocásek — kužel dolů doleva */
    var t = opt.tail == null ? 1 : opt.tail;
    if (t > 0.02) {
      G.tube(mesh, [[-W * 0.30, -H * 0.86, 0],
                    [-W * 0.40, -H * (0.86 + 0.50 * t), 0]],
        function (u) { return [W * 0.11 * (1 - u), D * 0.55 * (1 - u * 0.7)]; }, 12,
        { key: key, ao: 0.10, up: [0, 0, 1] });
    }
    return mesh;
  }

  /* OBRYS BUBLINY.
     Plná bublina ze skla vyšla jako šedá pilulka: velká plocha
     bez kresby, která přebila to jediné, co ve scéně mluví —
     zvukovou stopu uvnitř. Zůstal z ní tedy jen OBRYS:
     zaoblený obdélník s ocáskem, protažený jako drátek.
     Čte se to jako ikona řeči a přitom je to těleso.        */
  function bubbleFrame(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var W = opt.w || 0.40, H = opt.h || 0.22, R = opt.r || 0.0075;
    var pts = [];
    for (var i = 0; i <= 84; i++) {
      var a = i / 84 * TAU + Math.PI * 0.5;
      var c = Math.cos(a), sn = Math.sin(a);
      var nn = 4.2;
      var k = Math.pow(Math.pow(Math.abs(c), nn) + Math.pow(Math.abs(sn), nn), -1 / nn);
      pts.push([c * W * k, sn * H * k, 0]);
    }
    G.tube(mesh, pts, function () { return [R, R]; }, 12,
      { key: key, ao: 0.05, caps: false, up: [0, 0, 1] });
    var t = opt.tail == null ? 1 : opt.tail;
    if (t > 0.02) {
      /* Ocásek je otevřený trojúhelník: dvě čáry dolů a zpět. */
      G.tube(mesh, curve([
        [-W * 0.30, -H * 1.00, 0],
        [-W * 0.40, -H * (1.00 + 0.54 * t), 0],
        [-W * 0.06, -H * 1.00, 0]
      ], 5), function () { return [R, R]; }, 12,
        { key: key, ao: 0.05, caps: false, up: [0, 0, 1] });
    }
    return mesh;
  }

  /* ZVUKOVÁ STOPA — sloupečky, které se srovnají do linky.
     Amplituda je parametr, takže se dá jedním číslem
     „utišit“. Sloupeček je zaoblený, ne hranol: hranol na
     tomhle webu nemá co dělat.                              */
  function soundBars(mesh, amp, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var N = opt.n || 17, W = opt.w || 0.60, r = opt.r || 0.0095;
    var PROF = [0.30, 0.62, 0.44, 0.92, 0.55, 1.00, 0.38, 0.74, 0.50,
                0.86, 0.42, 0.96, 0.34, 0.66, 0.48, 0.58, 0.28];
    for (var i = 0; i < N; i++) {
      var x = (i / (N - 1) - 0.5) * W;
      var h = Math.max(r * 1.15, PROF[i % PROF.length] * 0.115 * amp);
      G.tube(mesh, [[x, -h, 0], [x, h, 0]], function () { return [r, r]; }, 10,
        { key: key + (i / N) * 0.10, ao: 0.05, up: [0, 0, 1] });
    }
    return mesh;
  }

  /* OSMIÚHELNÍK — tvar, který na celém světě znamená STOP.
     Není to plechová značka: je to tlustá deska se zkosenou
     hranou a měkkým povrchem, aby seděla do porcelánového
     světa zbytku webu.                                      */
  function octaPlate(mesh, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var R = opt.r || 0.40, H = opt.h || 0.055;
    function octa(scale) {
      var out = [];
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * TAU + Math.PI / 8;
        /* rohy zaoblíme třemi body — ostrý roh by v tomhle
           osvětlení vypálil bílou tečku                    */
        for (var j = 0; j < 3; j++) {
          var b = a + (j - 1) * 0.055;
          out.push([Math.cos(b) * R * scale, Math.sin(b) * R * scale]);
        }
      }
      return out;
    }
    var prof = [[-H, 0.90], [-H * 0.72, 1.00], [H * 0.72, 1.00], [H, 0.90], [H * 0.96, 0.0]];
    var rings = prof.map(function (q) {
      return octa(q[1]).map(function (p) {
        return [p[0], q[0], p[1], 0.03 + (1 - q[1]) * 0.10, key];
      });
    });
    G.loft(mesh, rings, { capStart: true, capEnd: true });
    /* vyražený prstenec na líci */
    var band = [];
    var o = octa(0.74);
    for (var i2 = 0; i2 <= o.length; i2++) {
      var p2 = o[i2 % o.length];
      band.push([p2[0], H * 0.80, p2[1]]);
    }
    G.tube(mesh, band, function () { return [0.010, 0.008]; }, 8,
      { key: key + 0.05, ao: 0.18, caps: false, up: [0, 1, 0] });
    return mesh;
  }

  /* PRSTENEC NA VODĚ — rozbíhající se kruh. Používají ho dvě
     scény: puls po „stop“ a doznění po dotyku.              */
  function ripple(mesh, r, opt) {
    opt = opt || {};
    var key = opt.key || 0;
    var p = [];
    for (var i = 0; i <= 60; i++) {
      var a = i / 60 * TAU;
      p.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    G.tube(mesh, p, function () { return [opt.w || 0.006, (opt.w || 0.006) * 0.5]; }, 6,
      { key: key, ao: 0.04, caps: false, up: [0, 1, 0] });
    return mesh;
  }

  root.KJParts = {
    /* ruka a páteř */
    hand: hand, phalanx: phalanx, nail: nail, FINGERS: FINGERS, THUMB: THUMB,
    vertebra: vertebra, disc: disc, atlas: atlas, axisVert: axisVert,
    /* trup */
    ribcage: ribcage, thoracicSpine: thoracicSpine, diaphragm: diaphragm,
    sacrum: sacrum, pelvis: pelvis, ribY: ribY,
    /* hlava */
    skull: skull, occipitalBase: occipitalBase, skullPoint: skullPoint,
    /* končetina */
    footBones: footBones, footShell: footShell,
    /* prostředí */
    couch: couch, pillow: pillow, shoe: shoe,
    dialCase: dialCase, dialNeedle: dialNeedle, syringe: syringe,
    lyingBody: lyingBody, blanket: blanket, BODY: BODY, bodyAt: bodyAt,
    /* příčné přepážky */
    membrane: membrane,
    /* znaky sekce „Čeho se nebát“ */
    foldedGarment: foldedGarment, skinPatch: skinPatch, coin: coin,
    banRing: banRing, bubble: bubble, bubbleFrame: bubbleFrame,
    soundBars: soundBars,
    octaPlate: octaPlate, ripple: ripple,
    /* stavební pomůcky pro scény */
    lump: lump, bone: bone
  };
})(typeof window !== "undefined" ? window : globalThis);
