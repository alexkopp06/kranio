/* ============================================================
   calm.js — ČEHO SE NEBÁT

   Pět obav, pět scén. Sekce neříká „nebojte se“ — ukazuje, co
   se dít NEBUDE, a to doslova. Každá scéna je věc, kterou má
   člověk v hlavě, když se bojí, nakreslená tak, aby se na ni
   dalo ukázat prstem.

   Kabát je společný se sekcí „Ruce mají svá místa“ — obojí
   kreslí js/plate.js: týž papír, táž rytina, táž popiska,
   táž lupa. Obsah je jiný, ruka je stejná.

     01  člověk v oblečení pod dekou, boty vedle lehátka
     02  laboratorní váha — ručka se zastaví na pěti gramech
     03  jehla a lupnutí přeškrtnuté, zůstanou ruce
     04  bublina s vyprávěním se rozplyne, stopa ztichne
     05  ruce se po slově stop zvednou do tří desetin vteřiny

   ------------------------------------------------------------
   CO SE TU ZMĚNILO A PROČ

   Ležící člověk byl dřív jedna obrysová čára s hrbolky. Ve
   scéně, která má říct „zůstáváte oblečení“, ale musí být
   vidět ČLOVĚK — hlava, rameno, hrudník, pánev, koleno — jinak
   je to pytel a slib nedává smysl.

   Ruka byla složená z tobolek. Teď ji kreslí plate.js jako
   jeden obrys s nehty, šlachami a tónem — a hlavně ve
   správném MĚŘÍTKU vůči tělu, ne jako dětská ručka.

   Panely se přehazují samy, dokud si někdo nevybere. Pak se
   automat vypne: kdo čte, tomu se nesmí nic hnout pod rukama.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ, PL = window.KJPlate;
  if (!KJ || !PL) return;

  var root = document.querySelector("[data-calm]");
  if (!root) return;

  var canvas = root.querySelector("[data-calm-canvas]");
  var ctx = canvas ? canvas.getContext("2d") : null;
  if (!ctx) return;

  var items   = KJ.$$("[data-calm-item]", root);
  var tabs    = KJ.$$("[data-calm-tab]", root);
  var panels  = KJ.$$("[data-calm-panel]", root);
  var meters  = KJ.$$("[data-calm-meter]", root);
  var stamp   = root.querySelector("[data-calm-stamp]");
  var autoBtn = root.querySelector("[data-calm-auto]");
  var autoLbl = root.querySelector("[data-calm-auto-label]");
  if (!items.length) return;

  var STAMPS = ["v oblečení", "≈ 5 g", "jen ruce", "ticho je v pořádku", "ruce pryč"];
  var DWELL = 8.5;

  var C = PL.palette();
  var plate = PL.create(ctx);
  var clamp = PL.clamp, lerp = PL.lerp, mix = PL.mix, rgba = PL.rgba;
  var easeOut = PL.easeOut, easeIO = PL.easeIO, breathe = PL.breathe;
  var TAU = PL.TAU;

  function frame(W, H, cx, cy, scale) {
    var s = H / 100 * scale;
    return {
      s: s,
      p: function (x, y) { return [cx + x * s, cy + y * s]; },
      a: function (arr) {
        var o = new Array(arr.length);
        for (var i = 0; i < arr.length; i++) o[i] = [cx + arr[i][0] * s, cy + arr[i][1] * s];
        return o;
      },
      l: function (v) { return v * s; }
    };
  }

  /* Ruka je v js/plate.js — jedna pro celý web. */
  function hand(V, x, y, size, rot, flipX, alpha, opt) {
    var p = V.p(x, y);
    plate.hand(p[0], p[1], V.l(size), rot || 0, flipX, alpha, opt);
  }

  /* Lehátko s nohou — v téhle sekci je vidět celé, protože
     scéna je odstup, ne detail.                            */
  function couch(V, y, x0, x1, alpha) {
    var a = alpha == null ? 1 : alpha;
    plate.stroke(V.a([[x0, y], [x1, y]]), 2.2, C.INK3, 0.68 * a);
    plate.fillPath(V.a([[x0, y], [x1, y], [x1, y + 2.6], [x0, y + 2.6]]), C.INK4, 0.10);
    plate.hair(V.a([[x0, y + 2.6], [x1, y + 2.6]]), 1, C.LINE, 0.9 * a);
    plate.hair(V.a([[x0 + 6, y + 2.6], [x0 + 6, y + 13]]), 1.4, C.INK4, 0.7 * a);
    plate.hair(V.a([[x1 - 6, y + 2.6], [x1 - 6, y + 13]]), 1.4, C.INK4, 0.7 * a);
  }

  /* ------------------------------------------------------------
     LEŽÍCÍ ČLOVĚK
     Sdílí ho scéna 01, 04 i 05, takže tvar je na jednom místě —
     jinak by se po první úpravě rozešly a v každé scéně by
     ležel jiný člověk.

     Není to jedna vlnovka. Je to hlava se šíjí, rameno, hrudník,
     který se dechem zvedá, pas, pánev, stehno, koleno, lýtko
     a chodidlo. Teprve když jde po siluetě přejet prstem
     a pojmenovat části, čte se to jako člověk.
     ------------------------------------------------------------ */
  function lying(V, y, br, opt) {
    opt = opt || {};
    var a = opt.alpha == null ? 1 : opt.alpha;
    var rise = 1.0 * br;                 /* hrudník při nádechu */

    /* horní obrys: temeno → čelo → nos → brada → šíje → rameno
       → hrudník → pas → pánev → stehno → koleno → lýtko → nárt */
    var body = [
      [-41.0, y - 1.0], [-42.6, y - 4.2], [-42.0, y - 7.0],           /* temeno */
      [-39.6, y - 8.8], [-36.8, y - 8.6],                              /* čelo */
      [-35.4, y - 7.0], [-35.8, y - 5.6],                              /* nos a brada */
      [-33.6, y - 4.6], [-30.0, y - 4.2],                              /* šíje */
      [-26.0, y - 6.8 - rise * 0.5],                                   /* rameno */
      [-19.0, y - 9.6 - rise], [-11.0, y - 10.2 - rise],               /* hrudník dýchá */
      [-4.0, y - 8.4], [1.0, y - 7.6],                                 /* pas */
      [7.0, y - 9.2], [13.0, y - 9.0],                                 /* pánev */
      [19.0, y - 7.2], [25.0, y - 8.4],                                /* stehno a koleno */
      [30.0, y - 4.0], [33.4, y - 5.6],                                /* lýtko */
      [35.6, y - 1.0], [33.6, y]                                       /* nárt */
    ];
    plate.tissue(V.a(body), { fill: opt.fill == null ? 0.075 : opt.fill, n: 120, seed: 17,
      edge: C.INK3, edgeA: 0.62 * a, w: 1.5, formAng: 1.20, formA: 0.10 });

    /* paže položená podél těla — vlastní obrys, ne rýha */
    var arm = [[-25.0, y - 5.6], [-17, y - 3.4], [-8, y - 2.6], [-1, y - 3.4], [3, y - 5.0]];
    plate.stroke(V.a(arm), function (u) { return 1.4 - u * 0.4; }, C.INK4, 0.52 * a);
    /* ruka klienta na podložce */
    plate.hair(V.a([[3, y - 5.0], [5.4, y - 4.0], [5.0, y - 1.8], [2.4, y - 2.2]]),
      1.1, C.INK4, 0.46 * a);
    /* šíje a klíček — dva tahy, které rameno posadí */
    plate.hair(V.a([[-33.0, y - 4.4], [-29.0, y - 5.6], [-26.4, y - 6.6]]), 1, C.INK4, 0.44 * a);
    /* zavřené oko — jediný rys v obličeji, a to je dost */
    plate.hair(V.a([[-40.0, y - 7.2], [-38.2, y - 7.4]]), 1.2, C.INK3, 0.55 * a);
    return body;
  }

  /* ============================================================
     01 · NESVLÉKÁTE SE
     Člověk leží oblečený a přikrytý. Kresba musí být tak
     konkrétní, aby si šlo přepočítat kusy oblečení: tričko,
     kalhoty, ponožky. Vedle lehátka stojí boty — jediné, co
     se sundává.
     ============================================================ */
  function sc01(W, H, t, io) {
    /* ležící postava: y −12…28, x −52…44 */
    var V = frame(W, H, W * 0.535, H * 0.42, 1.75);
    var br = breathe(t, 9);
    var settle = easeIO(clamp((t - 0.4) / 3.2, 0, 1));

    couch(V, 6, -52, 44, io);
    lying(V, 6, br, { alpha: io });

    /* --- oblečení: tričko ------------------------------------
       Má límec, rukáv a lem — jinak je to jen jiná výplň.  */
    var shirt = [
      [-27.0, 6 - 5.6], [-24, 6 - 7.6 - br * 0.5], [-19, 6 - 9.6 - br],
      [-11, 6 - 10.2 - br], [-4, 6 - 8.4], [1, 6 - 7.6], [1.6, 6], [-27.0, 6]
    ];
    plate.fillPath(V.a(shirt), C.INK4, 0.10);
    plate.hatch(V.a(shirt), { col: C.INK4, alpha: 0.15, gap: 5.4, angle: 68, cross: 0 });
    /* límec */
    plate.stroke(V.a([[-29.4, 6 - 4.4], [-27.4, 6 - 6.2], [-25.2, 6 - 6.9]]), 1.4, C.INK3, 0.68 * io);
    /* lem u pasu */
    plate.stroke(V.a([[1.0, 6 - 7.6], [1.8, 6 - 3.4], [1.8, 6]]), 1.3, C.INK3, 0.60 * io);
    /* rukáv končí nad loktem */
    plate.stroke(V.a([[-19.4, 6 - 5.2], [-18.6, 6 - 3.0]]), 1.3, C.INK4, 0.55 * io);
    /* záhyby látky — tři tahy, které z plochy udělají tkaninu */
    plate.hair(V.a([[-21, 6 - 7.4], [-18, 6 - 3.4], [-17, 6]]), 1, C.INK4, 0.46 * io);
    plate.hair(V.a([[-13, 6 - 9.4], [-11, 6 - 4.6], [-10.4, 6]]), 1, C.INK4, 0.38 * io);
    plate.hair(V.a([[-5, 6 - 8.8], [-4, 6 - 3.8], [-3.6, 6]]), 1, C.INK4, 0.30 * io);

    /* --- kalhoty ---------------------------------------------- */
    var pants = [[1.6, 6 - 7.8], [7, 6 - 9.2], [13, 6 - 9.0], [19, 6 - 7.2],
                 [25, 6 - 8.4], [29, 6 - 4.6], [29, 6], [1.6, 6]];
    plate.fillPath(V.a(pants), C.INK4, 0.13);
    plate.hatch(V.a(pants), { col: C.INK4, alpha: 0.19, gap: 5.0, angle: 60, cross: 0 });
    plate.stroke(V.a([[1.6, 6 - 7.8], [1.8, 6]]), 1.3, C.INK3, 0.55 * io);
    /* boční šev a záhyb v koleni */
    plate.hair(V.a([[8, 6 - 8.8], [9, 6 - 4.0], [9, 6]]), 1, C.INK4, 0.42 * io);
    plate.hair(V.a([[22, 6 - 8.0], [23, 6 - 3.4], [23, 6]]), 1, C.INK4, 0.36 * io);

    /* --- ponožka ---------------------------------------------- */
    plate.fillPath(V.a([[30, 6 - 4.4], [33.4, 6 - 5.6], [35.6, 6 - 1.0], [33.6, 6], [30, 6]]),
      C.INK4, 0.20);
    plate.hair(V.a([[30.4, 6 - 4.0], [30.0, 6]]), 1.2, C.INK3, 0.60 * io);

    /* --- DEKA: přetažená přes tělo, s přehybem ---------------
       Deka nekopíruje tělo. Leží přes ně a mezi vyvýšeninami
       visí — proto má vlastní křivku a vlastní stín.        */
    var edge = lerp(-2, -19, settle);      /* přehyb dojede ke hrudníku */
    var blanket = [
      [40, 6], [38, 6 - 2.2], [34.4, 6 - 6.0], [29, 6 - 5.2], [24, 6 - 9.0],
      [18, 6 - 8.0], [12, 6 - 9.8], [4, 6 - 8.6],
      [edge + 2, 6 - 9.6 - 0.5 * br], [edge, 6 - 7.0], [edge - 1.4, 6 - 1.8], [edge - 0.8, 6]
    ];
    plate.fillPath(V.a(blanket), C.SOFT, 0.44);
    plate.hatch(V.a(blanket), { col: C.TIDE, alpha: 0.10, gap: 6.2, angle: 58, cross: 0, light: false });
    plate.form(V.a(blanket), { col: C.TIDE, ang: 1.32, a: 0.10 });
    plate.stroke(V.a(blanket), function (u) { return 2.1 - u * 0.5; }, C.TIDE, 0.80 * io);
    /* přehyb u hrudníku — deka je přeložená, ne nalepená */
    plate.stroke(V.a([[edge + 2, 6 - 9.6 - 0.5 * br], [edge + 5.4, 6 - 7.8], [edge + 3.4, 6 - 5.8]]),
      1.5, C.TIDE, 0.55 * io);
    /* záhyby deky */
    plate.hair(V.a([[9, 6 - 9.4], [10, 6 - 4.6], [10, 6]]), 1, C.TIDE, 0.26 * io);
    plate.hair(V.a([[20, 6 - 8.4], [21, 6 - 4.2], [21, 6]]), 1, C.TIDE, 0.22 * io);
    plate.hair(V.a([[31, 6 - 5.6], [32, 6 - 2.6], [32, 6]]), 1, C.TIDE, 0.20 * io);

    /* --- boty vedle lehátka -----------------------------------
       Bota má podrážku, patu a nárt — jinak je to jen placka. */
    [[-47, 61], [-33, 71]].forEach(function (q) {
      var bx = q[0];
      /* Bota z boku: pata, nákotník s výstřihem, nárt, špička
         a podrážka. Dokud to byl jen obrys s hrbolem, vypadalo
         to jako bochník — a slib „jediné, co se sundává“ pak
         nedával smysl.                                      */
      var shoe = [
        [bx + 0.2, 22.6], [bx + 0.4, 20.4], [bx + 1.8, 19.4],    /* pata a nákotník */
        [bx + 3.6, 20.4], [bx + 5.6, 20.0],                       /* výstřih a jazyk */
        [bx + 8.4, 20.6], [bx + 11.0, 21.6], [bx + 12.0, 22.8],   /* nárt a špička */
        [bx + 12.0, 23.4], [bx + 0.2, 23.4]
      ];
      plate.tissue(V.a(shoe), { fill: 0.13, n: 26, seed: q[1], edgeA: 0.66 * io, w: 1.35,
        formAng: 1.28, formA: 0.14 });
      /* podrážka — vlastní vrstva, ne jen čára */
      plate.fillPath(V.a([[bx - 0.2, 23.0], [bx + 12.2, 23.0],
                          [bx + 12.2, 24.2], [bx - 0.2, 24.2]]), C.INK4, 0.26);
      plate.stroke(V.a([[bx - 0.2, 24.2], [bx + 12.2, 24.2]]), 1.8, C.INK3, 0.66 * io);
      /* šněrování — tři křížky přes nárt */
      for (var k = 0; k < 3; k++) {
        var lx = bx + 4.4 + k * 1.7;
        plate.hair(V.a([[lx, 20.2 + k * 0.16], [lx + 1.3, 21.5 + k * 0.16]]), 1, C.INK4, 0.55 * io);
        plate.hair(V.a([[lx + 1.3, 20.3 + k * 0.16], [lx, 21.6 + k * 0.16]]), 1, C.INK4, 0.42 * io);
      }
      /* zadní šev paty */
      plate.hair(V.a([[bx + 0.9, 20.0], [bx + 1.2, 22.8]]), 1, C.INK4, 0.45 * io);
    });
    plate.label("JEDINÉ, CO SE SUNDÁVÁ", V.p(-34, 27.4)[0], V.p(-34, 27.4)[1],
      { col: C.INK3, size: 7.8, align: "center", alpha: io });

    /* --- popisky ---------------------------------------------- */
    plate.callout({ x: V.p(-14, -3.4)[0], y: V.p(-14, -3.4)[1], dx: -V.l(3), dy: -V.l(13),
      text: "TRIČKO", alpha: io });
    plate.callout({ x: V.p(15, -2.0)[0], y: V.p(15, -2.0)[1], dx: V.l(5), dy: -V.l(12),
      text: "KALHOTY", alpha: io });
    plate.callout({ x: V.p(33, 2.0)[0], y: V.p(33, 2.0)[1], dx: V.l(5), dy: V.l(7),
      text: "PONOŽKY", alpha: io });
    plate.callout({ x: V.p(edge + 4, -6.6)[0], y: V.p(edge + 4, -6.6)[1], dx: -V.l(9), dy: -V.l(4),
      text: "DEKA", dot: C.TIDE, textCol: C.DEEP, alpha: io * settle, size: 8.6 });

    plate.readout(W * 0.955, H * 0.78, "NEPOUŽÍVÁ SE", "olej ani krém", { alpha: io, align: "right" });
  }

  /* ============================================================
     02 · NIKDO DO VÁS NEBUDE TLAČIT
     Váha, na které se dá tlak přečíst. Ručka dojede na pět
     gramů a tam zůstane — a vedle stojí, kolik váží masáž,
     aby bylo s čím porovnat. Rozdíl je celé sdělení.
     ============================================================ */
  function sc02(W, H, t, io) {
    /* ciferník a ruka: y −46…44, x −30…30 */
    var V = frame(W, H, W * 0.325, H * 0.545, 1.02);
    var land = easeIO(clamp((t - 0.9) / 2.2, 0, 1));
    var br = breathe(t, 9);
    /* Ručka dosedne a pak už jen nepatrně dýchá s rukou. */
    var g = 5 * land + 0.22 * br * land;

    /* --- ciferník váhy ----------------------------------------
       Přístroj, ne kolečko: obruba, sklo, stupnice, terč. */
    var cx = V.p(0, 6)[0], cy = V.p(0, 6)[1], R = V.l(25);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, TAU);
    ctx.fillStyle = rgba(C.INK4, 0.10);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(C.INK3, 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = rgba(C.PAPER, 1);
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = rgba(C.INK3, 0.82);
    ctx.stroke();
    /* odlesk skla — jeden, vlevo nahoře */
    var gg = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.4, cy + R * 0.6);
    gg.addColorStop(0, rgba(C.PAPER, 0.9));
    gg.addColorStop(0.5, rgba(C.PAPER, 0));
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.99, 0, TAU);
    ctx.clip();
    ctx.fillStyle = gg;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.90, 0, TAU);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(C.LINE, 1);
    ctx.stroke();

    /* stupnice 0–60 g: to je rozsah, ve kterém se pohybuje
       i běžná masáž, takže pět gramů má kam být malé      */
    var A0 = Math.PI * 0.78, A1 = Math.PI * 2.22;
    for (var i = 0; i <= 60; i++) {
      var big = i % 10 === 0, mid = i % 5 === 0;
      if (!mid && i % 2) continue;
      var a = lerp(A0, A1, i / 60);
      var r0 = R * (big ? 0.72 : mid ? 0.79 : 0.83), r1 = R * 0.88;
      plate.hair([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0],
                  [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]],
        big ? 1.4 : 1, big ? C.INK3 : C.INK4, big ? 0.85 : 0.55);
      if (big) {
        plate.label(String(i), cx + Math.cos(a) * R * 0.60, cy + Math.sin(a) * R * 0.60 + 3,
          { col: C.META, size: 7.4, align: "center", track: 0 });
      }
    }
    /* pásmo pěti gramů — jediné sytě zelené místo na ciferníku */
    var a5 = lerp(A0, A1, 5 / 60);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.845, A0, a5);
    ctx.lineWidth = R * 0.07;
    ctx.strokeStyle = rgba(C.TIDE, 0.28);
    ctx.stroke();

    /* ručka s protizávažím — jako na skutečném přístroji */
    var an = lerp(A0, A1, g / 60);
    plate.stroke([[cx - Math.cos(an) * R * 0.16, cy - Math.sin(an) * R * 0.16],
                  [cx + Math.cos(an) * R * 0.80, cy + Math.sin(an) * R * 0.80]],
      function (u) { return 3.4 - u * 2.4; }, C.TIDE, 0.95 * io);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.065, 0, TAU);
    ctx.fillStyle = rgba(C.INK, 0.9);
    ctx.fill();

    plate.label("GRAMY", cx, cy + R * 0.34, { col: C.META, size: 7.6, align: "center" });
    plate.label(g.toFixed(1).replace(".", ",") + " g", cx, cy + R * 0.58,
      { col: C.DEEP, size: 13, align: "center", track: 0.02 });

    /* --- ruka spočívá na misce váhy ---------------------------
       Miska má stopku a ruka na ní opravdu leží — proto je
       mezi nimi dosednutí, ne mezera.                      */
    plate.stroke(V.a([[-15, -24], [15, -24]]), 2.2, C.INK3, 0.72 * io);
    plate.hair(V.a([[0, -24], [0, -19.6]]), 1.6, C.INK4, 0.72 * io);
    var hy = lerp(-40, -27.4, land);
    hand(V, 1.5, hy, 11.5, 0.04, false, io,
      { tilt: 0.30, curl: 0.14, spread: 0.14, arm: true, tint: 0.24 });
    var cp = V.p(-2, -24.4);
    plate.contact(cp[0], cp[1], V.l(11), V.l(2.0), 0.18 * io * land, C.INK3);

    /* --- srovnání: kolik váží masáž --------------------------- */
    var bx = W * 0.665, by = H * 0.185, bw = W * 0.285;
    plate.label("PRO SROVNÁNÍ", bx, by - 10, { col: C.META, size: 7.6 });
    var rows = [
      ["KRANIOSAKRÁLNÍ DOTEK", 5, C.TIDE, true],
      ["MASÁŽ ZAD", 45, C.INK4, false],
      ["MANUÁLNÍ TERAPIE", 60, C.INK4, false]
    ];
    rows.forEach(function (r, k) {
      var ry = by + k * H * 0.135;
      plate.label(r[0], bx, ry, { col: r[3] ? C.DEEP : C.INK3, size: 7.4, alpha: io });
      plate.hair([[bx, ry + 14], [bx + bw, ry + 14]], 1, C.LINE, 0.9 * io);
      var wdt = bw * (r[1] / 60) * (r[3] ? land : easeOut(clamp((t - 1.6 - k * 0.2) / 0.8, 0, 1)));
      plate.stroke([[bx, ry + 14], [bx + wdt, ry + 14]], 3.6, r[2], (r[3] ? 0.95 : 0.42) * io);
      plate.label("≈ " + r[1] + " g", bx + bw, ry + 1,
        { col: r[3] ? C.DEEP : C.META, size: 7.6, align: "right", alpha: io });
    });

    /* --- lupa: o kolik se kůže prohne ------------------------- */
    plate.inset({
      x: W * 0.665, y: H * 0.60, w: W * 0.285, h: H * 0.33, alpha: io,
      zoom: "20 ×", caption: "kůže se prohne o desetiny milimetru",
      draw: function (x, y, w, h) {
        var sk = y + h * 0.54, dip = h * 0.060 * land;
        var x0 = x + w * 0.08, x1 = x + w * 0.92;
        /* podkoží — vrstva pod kůží, aby řez měl hloubku */
        var sub = [[x0, sk], [x1, sk], [x1, y + h * 0.82], [x0, y + h * 0.82]];
        plate.fillPath(sub, C.INK4, 0.06);
        plate.stipple(sub, { col: C.INK4, alpha: 0.22, n: 42, r: 1.0, seed: 19 });
        var skin = [[x0, sk], [x + w * 0.32, sk + dip * 0.45],
                    [x + w * 0.52, sk + dip], [x + w * 0.72, sk + dip * 0.45], [x1, sk]];
        plate.stroke(skin, 1.8, C.INK3, 0.90);
        plate.label("KŮŽE", x0, sk - h * 0.06, { col: C.META, size: 6.8 });
        /* prst shora — měkký polštářek, ne hrot */
        var pad = [[x + w * 0.14, y + h * 0.20], [x + w * 0.30, y + h * 0.28 + dip * 0.5],
                   [x + w * 0.52, y + h * 0.31 + dip], [x + w * 0.74, y + h * 0.28 + dip * 0.5],
                   [x + w * 0.90, y + h * 0.20]];
        plate.fillPath(pad.concat([[x + w * 0.90, y + h * 0.06], [x + w * 0.14, y + h * 0.06]]),
          C.SOFT, 0.42);
        plate.stroke(pad, 2.3, C.TIDE, 0.82);
        plate.label("BŘÍŠKO PRSTU", x + w * 0.52, y + h * 0.17,
          { col: C.DEEP, size: 6.8, align: "center" });
        plate.caliper(x + w * 0.84, sk, x + w * 0.84, sk + dip, "0,2 mm", { alpha: 0.95 });
      }
    });

    plate.label("NENÍ TO MASÁŽ ANI NAPRAVOVÁNÍ", V.p(0, 41)[0], V.p(0, 41)[1],
      { col: C.INK3, size: 8.0, align: "center", alpha: io });
  }

  /* ============================================================
     03 · ŽÁDNÉ JEHLY, ŽÁDNÉ LUPNUTÍ
     Dvě věci přijedou do obrazu, obě se přeškrtnou a zhasnou.
     Zůstane jediný nástroj — ruce. Pořadí je důležité: nejdřív
     se ukáže obava, teprve pak se zruší.
     ============================================================ */
  function sc03(W, H, t, io) {
    /* dva výjevy nahoře, ruce dole: y −42…52, x −48…42 */
    var V = frame(W, H, W * 0.50, H * 0.40, 1.16);
    /* dramaturgie v osmi vteřinách */
    var inA  = easeOut(clamp((t - 0.3) / 0.9, 0, 1));
    var offA = easeIO(clamp((t - 2.0) / 0.9, 0, 1));
    var inB  = easeOut(clamp((t - 1.0) / 0.9, 0, 1));
    var offB = easeIO(clamp((t - 3.0) / 0.9, 0, 1));
    var hands = easeOut(clamp((t - 4.0) / 1.2, 0, 1));
    var br = breathe(t, 9);

    /* --- vlevo: JEHLA -----------------------------------------
       Stříkačka je přístroj: válec s ryskami, píst s talířkem,
       kónus a jehla se zkosenou špičkou.                   */
    var nx = -30, ny = -14;
    var slide = lerp(-14, 0, inA);
    ctx.save();
    ctx.globalAlpha = (1 - offA * 0.72) * io;
    var sx = nx + slide;
    var barrel = [[sx - 11, ny - 3.4], [sx + 3, ny - 3.4], [sx + 3, ny + 3.4], [sx - 11, ny + 3.4]];
    plate.fillPath(V.a(barrel), C.PAPER, 0.95);
    plate.form(V.a(barrel), { col: C.INK3, ang: 1.35, a: 0.16 });
    plate.stroke(V.a(barrel.concat([barrel[0]])), 1.5, C.INK3, 0.85);
    for (var q = 1; q < 5; q++) {
      plate.hair(V.a([[sx - 11 + q * 2.6, ny - 3.4], [sx - 11 + q * 2.6, ny - 1.4]]), 1, C.INK4, 0.7);
    }
    /* píst uvnitř válce */
    plate.fillPath(V.a([[sx - 11, ny - 3.0], [sx - 6, ny - 3.0],
                        [sx - 6, ny + 3.0], [sx - 11, ny + 3.0]]), C.INK4, 0.30);
    plate.stroke(V.a([[sx - 15, ny], [sx - 11, ny]]), 2.4, C.INK3, 0.85);
    plate.stroke(V.a([[sx - 17, ny - 3.6], [sx - 17, ny + 3.6]]), 2.2, C.INK3, 0.85);
    /* kónus a jehla se zkosením */
    plate.fillPath(V.a([[sx + 3, ny - 1.8], [sx + 6, ny - 1.0],
                        [sx + 6, ny + 1.0], [sx + 3, ny + 1.8]]), C.INK4, 0.34);
    plate.stroke(V.a([[sx + 6, ny], [sx + 16, ny - 0.2]]),
      function (u) { return 1.8 - u * 1.2; }, C.INK3, 0.9);
    plate.hair(V.a([[sx + 16, ny - 0.2], [sx + 17.4, ny + 0.6]]), 1.2, C.INK3, 0.9);
    ctx.restore();
    plate.cross(V.p(nx + 1, ny)[0], V.p(nx + 1, ny)[1], V.l(14), C.INK3, 0.72 * io, offA);
    plate.label("ŽÁDNÉ JEHLY", V.p(nx, ny + 21)[0], V.p(nx, ny + 21)[1],
      { col: offA > 0.6 ? C.INK3 : C.META, size: 8.4, align: "center", alpha: io });

    /* --- vpravo: LUPNUTÍ --------------------------------------
       Tři krční obratle s tělem a trnem, a trhnutí, které se
       u nich NEDĚJE.                                        */
    var kx = 22, ky = -14;
    ctx.save();
    ctx.globalAlpha = (1 - offB * 0.72) * io;
    for (var i = 0; i < 3; i++) {
      var vy = ky - 8 + i * 8;
      var shove = (i === 1) ? Math.sin(t * 9) * 1.3 * inB * (1 - offB) : 0;
      plate.bone(V.a([[kx - 5 + shove, vy - 3], [kx + 6 + shove, vy - 3.4],
                      [kx + 6.4 + shove, vy + 3], [kx - 4.6 + shove, vy + 3.4]]),
        { shade: 0.24, gap: 4.2, w: 1.3, edgeA: 0.75 });
      /* trnový výběžek dozadu */
      plate.bone(V.a([[kx - 4.8 + shove, vy - 1.6], [kx - 9.6 + shove, vy - 0.2],
                      [kx - 9.8 + shove, vy + 1.6], [kx - 4.8 + shove, vy + 1.8]]),
        { shade: 0.20, gap: 4.4, w: 1.05, edgeA: 0.58 });
      /* ploténka */
      if (i < 2) {
        plate.fillPath(V.a([[kx - 4.6, vy + 3.2], [kx + 6.4, vy + 3.0],
                            [kx + 6.4, vy + 4.8], [kx - 4.6, vy + 5.0]]), C.INK4, 0.16);
      }
    }
    /* šipka trhnutí */
    if (inB > 0.05 && offB < 0.95) {
      plate.arrow(V.p(kx + 17, ky)[0], V.p(kx + 17, ky)[1], Math.PI, V.l(8),
        C.INK3, 0.7 * (1 - offB));
      /* „prásk“ — tři paprsky */
      for (i = 0; i < 3; i++) {
        var aa = -0.9 + i * 0.9;
        plate.hair(V.a([[kx + 8, ky - 1], [kx + 8 + Math.cos(aa) * 5, ky - 1 + Math.sin(aa) * 5]]),
          1.4, C.INK3, 0.5 * inB * (1 - offB));
      }
    }
    ctx.restore();
    plate.cross(V.p(kx, ky)[0], V.p(kx, ky)[1], V.l(14), C.INK3, 0.72 * io, offB);
    plate.label("ŽÁDNÉ LUPNUTÍ", V.p(kx, ky + 21)[0], V.p(kx, ky + 21)[1],
      { col: offB > 0.6 ? C.INK3 : C.META, size: 8.4, align: "center", alpha: io });

    /* --- dole: JEDINÝ NÁSTROJ --------------------------------
       Dvě ruce vedle sebe, dlaněmi vzhůru — nic v nich není.  */
    plate.hair([[W * 0.14, V.p(0, 14)[1]], [W * 0.86, V.p(0, 14)[1]]], 1, C.LINE, 0.9 * io * hands);
    if (hands > 0.02) {
      /* Obě ruce dlaněmi dolů, prsty od diváka, předloktí
         vybíhají dolů z obrazu — tak leží na těle.        */
      hand(V, -12, 24 + br * 0.5, 9.2, 1.52, false, hands * io,
        { tilt: 0.20, curl: 0.16, spread: 0.18, arm: true, tint: 0.24 });
      hand(V, 12, 24 + br * 0.5, 9.2, -1.52, true, hands * io,
        { tilt: 0.20, curl: 0.16, spread: 0.18, arm: true, tint: 0.24 });
      plate.glow(V.p(0, 26)[0], V.p(0, 26)[1], V.l(26), C.TIDE, 0.10 * hands * io);
      plate.label("JEDINÝ NÁSTROJ JSOU RUCE, KTERÉ LEŽÍ",
        V.p(0, 50)[0], V.p(0, 50)[1],
        { col: C.DEEP, size: 8.6, align: "center", alpha: hands * io });
    }
  }

  /* ============================================================
     04 · NEMUSÍTE NIC VYPRÁVĚT
     Bublina s vyprávěním se nafoukne — a pak se rozplyne.
     Pod ní stopa zvuku, která dojede do rovné linky. Ticho
     tady není prázdno, je to povolený stav.
     ============================================================ */
  function sc04(W, H, t, io) {
    var V = frame(W, H, W * 0.545, H * 0.545, 1.50);
    var br = breathe(t, 9);
    var quiet = easeIO(clamp((t - 1.6) / 3.0, 0, 1));

    couch(V, 8, -50, 42, io);
    lying(V, 8, br, { alpha: io, fill: 0.06 });
    /* deka */
    var blanket = [[38, 8], [34, 8 - 5.6], [26, 8 - 5.2], [18, 8 - 8.6],
                   [8, 8 - 9.6], [-2, 8 - 9.8], [-14, 8 - 8.4],
                   [-16, 8 - 4.4], [-16.6, 8]];
    plate.fillPath(V.a(blanket), C.SOFT, 0.40);
    plate.form(V.a(blanket), { col: C.TIDE, ang: 1.32, a: 0.09 });
    plate.stroke(V.a(blanket), 1.8, C.TIDE, 0.72 * io);

    /* --- bublina, která se rozplyne ---------------------------
       Vychází od úst, ne odněkud z prostoru — proto má ocásek
       mířící k hlavě a s mizením se roztřepí.              */
    var grow = easeOut(clamp(t / 1.2, 0, 1));
    var fade = 1 - quiet;
    if (fade > 0.02) {
      var bx = -30, by = -21 - 4 * grow;
      var bw = 15 * grow, bh = 8.6 * grow;
      ctx.save();
      ctx.globalAlpha = fade * io;
      var bub = [];
      for (var i = 0; i <= 28; i++) {
        var a = (i / 28) * TAU;
        /* okraj bubliny se s mizením roztřepí */
        var wob = 1 + Math.sin(a * 5 + t * 2.2) * 0.05 * (1 - fade) * 3;
        bub.push([bx + Math.cos(a) * bw * wob, by + Math.sin(a) * bh * wob]);
      }
      plate.fillPath(V.a(bub), C.PAPER, 0.94);
      plate.stroke(V.a(bub), 1.4, C.INK4, 0.75, { dense: 6 });
      /* ocásek k ústům */
      plate.stroke(V.a([[bx - 3, by + bh * 0.86], [bx - 5.4, by + bh * 1.9],
                        [bx + 1.4, by + bh * 0.78]]), 1.4, C.INK4, 0.7);
      /* řádky „textu“, které blednou zprava */
      for (i = 0; i < 3; i++) {
        var lw = (9.5 - i * 2.4) * grow;
        plate.stroke(V.a([[bx - 6.4, by - 2.4 + i * 2.6], [bx - 6.4 + lw, by - 2.4 + i * 2.6]]),
          1.6, C.INK4, 0.5 * (1 - i * 0.2));
      }
      ctx.restore();
    }

    /* --- stopa zvuku dojede do ticha -------------------------- */
    var tx0 = W * 0.10, tx1 = W * 0.90, ty = H * 0.13, wave = [];
    for (i = 0; i <= 180; i++) {
      var u = i / 180;
      /* amplituda padá zleva doprava podle toho, jak daleko
         dojel útlum — ticho není střih, je to doznění      */
      var amp = clamp((quiet * 1.25 - u) * 3, 0, 1);
      var v = (1 - amp) * (Math.sin(u * 74) * 0.5 + Math.sin(u * 31 + 1.7) * 0.3 + Math.sin(u * 127) * 0.2);
      wave.push([lerp(tx0, tx1, u), ty + v * H * 0.075]);
    }
    plate.hair([[tx0, ty], [tx1, ty]], 1, C.LINE, 0.9 * io);
    plate.stroke(wave, 1.4, mix(C.INK3, C.TIDE, quiet), 0.8 * io);
    plate.label("ŘEKNETE, CO CHCETE", tx0, ty - H * 0.075, { col: C.META, size: 7.6, alpha: io });
    plate.label("PAK UŽ MŮŽETE MLČET", tx1, ty - H * 0.075,
      { col: C.DEEP, size: 7.6, align: "right", alpha: io * quiet });

    /* Razítko sekce sedí vlevo dole (HTML), odečty proto
       nesmí pod třetí čtvrtinu výšky.                      */
    plate.readout(W * 0.10, H * 0.79, "CO ŘEKNETE", "jen to, co chcete", { alpha: io });
    plate.readout(W * 0.90, H * 0.79, "DÉLKA SEZENÍ", "75 min", { alpha: io, align: "right" });
  }

  /* ============================================================
     05 · KDYKOLI ŘEKNETE STOP
     Slovo padne a ruce jsou pryč. Rychlost je celé sdělení,
     proto je vedle měřený čas: tři desetiny vteřiny.
     ============================================================ */
  function sc05(W, H, t, io) {
    var V = frame(W, H, W * 0.545, H * 0.545, 1.50);
    var LOOP = 7.0;
    var p = t % LOOP;
    var said = clamp((p - 1.4) / 0.35, 0, 1);           /* slovo padlo */
    var lift = easeOut(clamp((p - 1.7) / 0.30, 0, 1));  /* ruce nahoru */
    var br = breathe(t, 9);

    couch(V, 8, -50, 42, io);
    lying(V, 8, br, { alpha: io, fill: 0.06 });
    var blanket = [[38, 8], [34, 8 - 5.6], [26, 8 - 5.2], [18, 8 - 8.6],
                   [8, 8 - 9.6], [-2, 8 - 9.8], [-14, 8 - 8.4],
                   [-16, 8 - 4.4], [-16.6, 8]];
    plate.fillPath(V.a(blanket), C.SOFT, 0.40);
    plate.form(V.a(blanket), { col: C.TIDE, ang: 1.32, a: 0.09 });
    plate.stroke(V.a(blanket), 1.8, C.TIDE, 0.72 * io);

    /* --- slovo, které stačí -----------------------------------
       Bublina vychází od úst klienta, ne z prostoru.        */
    if (said > 0.02) {
      var sa = said * (1 - clamp((p - 3.4) / 1.0, 0, 1));
      ctx.save();
      ctx.globalAlpha = sa * io;
      var bx = -33, by = -20;
      var bub = [];
      for (var i = 0; i <= 26; i++) {
        var a = (i / 26) * TAU;
        bub.push([bx + Math.cos(a) * 11.5 * said, by + Math.sin(a) * 7 * said]);
      }
      plate.fillPath(V.a(bub), C.PAPER, 0.96);
      plate.stroke(V.a(bub), 1.5, C.TIDE, 0.85, { dense: 6 });
      plate.stroke(V.a([[bx - 2.4, by + 6.4], [bx - 4.6, by + 12], [bx + 2.6, by + 5.6]]),
        1.5, C.TIDE, 0.85);
      plate.label("STOP", V.p(bx, by + 2.2)[0], V.p(bx, by + 2.2)[1],
        { col: C.DEEP, size: 11, align: "center", track: 0.16 });
      ctx.restore();
    }

    /* --- ruce: leží na hrudníku, pak se zvednou a odjedou ----
       Dráha není úsečka: ruka se nejdřív odlepí kolmo a teprve
       pak odejde stranou. Přesně tak se ruka zvedá, když nemá
       nic strhnout.                                         */
    var arcX = lerp(0, 15, lift * lift);
    var arcY = lerp(-3.5, -21, easeOut(lift));
    var rot = 0.06 - lift * 0.55;
    /* stopa, kterou ruka opsala */
    if (lift > 0.05) {
      var trailPts = [];
      for (var k = 0; k <= 12; k++) {
        var u = (k / 12) * lift;
        trailPts.push([lerp(0, 15, u * u), lerp(-3.5, -21, easeOut(u))]);
      }
      plate.hair(V.a(trailPts), 1, C.INK4, 0.42 * io, [3, 4]);
      plate.arrow(V.p(trailPts[Math.max(1, trailPts.length - 3)][0],
                      trailPts[Math.max(1, trailPts.length - 3)][1])[0],
                  V.p(trailPts[Math.max(1, trailPts.length - 3)][0],
                      trailPts[Math.max(1, trailPts.length - 3)][1])[1],
        -0.85, V.l(6), C.INK4, 0.5 * io);
    }
    /* dosednutí zmizí, jakmile se ruka zvedne */
    if (lift < 0.9) {
      var cp = V.p(-1, -1.6);
      plate.contact(cp[0], cp[1], V.l(11), V.l(2.4), 0.16 * io * (1 - lift), C.INK3);
    }
    hand(V, arcX, arcY, 11.0, rot, false, io * (1 - lift * 0.28),
      { tilt: lerp(0.34, 0.10, lift), curl: 0.16, spread: 0.14, arm: true, tint: 0.24 });

    /* --- měřený čas ------------------------------------------- */
    var mx0 = W * 0.10, mx1 = W * 0.90, my = H * 0.13;
    plate.hair([[mx0, my], [mx1, my]], 1, C.LINE, 0.9 * io);
    var markSaid = lerp(mx0, mx1, 0.42), markOff = lerp(mx0, mx1, 0.58);
    plate.hair([[markSaid, my - 8], [markSaid, my + 8]], 1.4, C.INK3, 0.8 * io * said);
    plate.hair([[markOff, my - 8], [markOff, my + 8]], 1.4, C.TIDE, 0.85 * io * lift);
    plate.stroke([[markSaid, my], [lerp(markSaid, markOff, lift), my]], 3.0, C.TIDE, 0.9 * io);
    plate.label("ŘEKNETE STOP", markSaid, my - 14, { col: C.INK3, size: 7.6, align: "center", alpha: io * said });
    plate.label("RUCE PRYČ", markOff, my - 14, { col: C.DEEP, size: 7.6, align: "center", alpha: io * lift });
    plate.caliper(markSaid, my + 18, markOff, my + 18, "0,3 s", { alpha: io * lift });

    plate.readout(W * 0.10, H * 0.79, "BEZ VYSVĚTLOVÁNÍ", "vždycky", { alpha: io });
    plate.readout(W * 0.90, H * 0.79, "NOVÝ DOTEK", "vždy předem ohlásím",
      { alpha: io, align: "right", hot: true });
  }

  var SCENES = [sc01, sc02, sc03, sc04, sc05];

  /* ---------- přepínání ------------------------------------- */
  var index = -1, elapsed = 0, auto = true, sceneT = 0;

  function select(i, byUser) {
    i = (i + items.length) % items.length;
    if (byUser && auto) setAuto(false);
    if (i === index && !byUser) return;
    index = i;
    elapsed = 0;
    sceneT = 0;

    items.forEach(function (it, k) {
      var on = k === index;
      it.setAttribute("aria-current", on ? "true" : "false");
      tabs[k].setAttribute("aria-selected", String(on));
      tabs[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
      if (!on && meters[k]) meters[k].style.width = "0%";
    });
    if (stamp) stamp.textContent = STAMPS[index] || "";
  }

  function setAuto(on) {
    auto = on;
    root.dataset.auto = on ? "on" : "off";
    if (autoBtn) autoBtn.setAttribute("aria-pressed", String(on));
    if (autoLbl) autoLbl.textContent = on ? "Sekce se přehazuje sama" : "Přehazování zastaveno";
    if (!on) meters.forEach(function (m) { m.style.width = "0%"; });
  }

  tabs.forEach(function (btn, i) {
    btn.addEventListener("click", function () { select(i, true); });
    btn.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
            : e.key === "ArrowUp"   || e.key === "ArrowLeft"  ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(index + d, true);
      tabs[index].focus();
    });
  });

  if (autoBtn) autoBtn.addEventListener("click", function () {
    setAuto(!auto);
    if (auto) elapsed = 0;
  });

  /* Kdo najede na scénu, ten se dívá — nepřehazujeme mu ji. */
  var paused = false;
  root.addEventListener("pointerenter", function () { paused = true; });
  root.addEventListener("pointerleave", function () { paused = false; });
  root.addEventListener("focusin", function () { paused = true; });
  root.addEventListener("focusout", function () { paused = false; });

  setAuto(!KJ.isReduced());
  select(0, false);

  /* ---------- smyčka ---------------------------------------- */
  var last = performance.now();

  function draw(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var red = KJ.isReduced();

    var size = KJ.fitCanvas(canvas, ctx);
    var W = size.w, H = size.h;
    if (W < 8 || H < 8) return;

    if (red) {
      sceneT = 5.4;
    } else {
      sceneT += dt;
      if (auto && !paused) {
        elapsed += dt;
        var m = meters[index];
        if (m) m.style.width = (elapsed / DWELL * 100).toFixed(1) + "%";
        if (elapsed >= DWELL) select(index + 1, false);
      }
    }

    plate.size(W, H);
    ctx.clearRect(0, 0, W, H);
    plate.paper(size.dpr);

    var io = red ? 1 : easeOut(clamp(sceneT / 0.5, 0, 1));
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    (SCENES[index] || SCENES[0])(W, H, sceneT, io);
  }

  var stop = null;
  KJ.visibilityGate(root, function () {
    if (!stop) { last = performance.now(); stop = KJ.addTicker(draw); }
  }, function () {
    if (stop) { stop(); stop = null; }
  });

  requestAnimationFrame(function (x) { last = x; draw(x); });
})();
