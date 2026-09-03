/* ============================================================
   stops.js — PĚT STANIC OŠETŘENÍ

   Pět anatomických listů. Ne pět ikonek: každá stanice má
   vlastní kompozici, vlastní měřítko a vlastní děj, protože
   pokaždé jde o jinou strukturu a jiný pohyb.

   Kabát je společný se sekcí „Čeho se nebát“ — obojí kreslí
   js/plate.js: týž papír, táž rytina, táž popiska, táž lupa.

     01  chodidlo a hlezno z boku, dlaň pod patou
     02  pánev z boku, kost křížová, tvrdá plena
     03  hrudník zepředu, bránice, hrudní vstup
     04  týlní kost, atlas, čep, bloudivý nerv
     05  lebka z boku, švy, still point

   ------------------------------------------------------------
   PRAVIDLO, KTERÉ TENHLE SOUBOR DRŽÍ

   Kreslí se KOSTRA, ne obrys s výplní. Každá kost má vlastní
   tvar z anatomie — patní kost je hranol s hrbolem, hlezenní
   má kladku, obratel má tělo, oblouk a trny. Když se kreslily
   fazole, výsledek vypadal jako piktogram, i když měl správný
   popisek.

   A: ruka je pod tělem, ne před ním. Proto se kreslí PRVNÍ
   a tělo ji překryje průsvitnou maskou — na anatomickém listu
   je to běžný způsob, jak ukázat, co leží vzadu.

   Co se hýbe, hýbe se proto, že se to hýbe i ve skutečnosti:
   kost křížová se naklápí devětkrát za minutu, bránice klesá
   při nádechu, lebeční rytmus se na still pointu zastaví.
   Nic tady není ornament.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ, PL = window.KJPlate;
  if (!KJ || !PL) return;

  var root = document.querySelector("[data-stops]");
  if (!root) return;

  var canvas = root.querySelector("[data-stops-canvas]");
  var ctx = canvas ? canvas.getContext("2d") : null;
  if (!ctx) return;

  var tabs   = KJ.$$("[data-stops-tab]", root);
  var panels = KJ.$$("[data-stops-panel]", root);
  var fill   = root.querySelector("[data-stops-fill]");
  if (!tabs.length) return;

  var C = PL.palette();
  var plate = PL.create(ctx);
  var clamp = PL.clamp, lerp = PL.lerp, mix = PL.mix, rgba = PL.rgba;
  var easeOut = PL.easeOut, easeIO = PL.easeIO, breathe = PL.breathe;
  var TAU = PL.TAU;

  /* ------------------------------------------------------------
     RÁMEC SCÉNY
     Kresba žije v místním souřadném systému, kde 100 jednotek =
     výška plátna. Proporce se pak nemusí přepisovat při každé
     změně poměru stran; `V` je jen převodník.
     ------------------------------------------------------------ */
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

  /* Ruka je v js/plate.js — jedna pro celý web. Tady zůstává
     jen převod z místních jednotek scény na plátno.          */
  function hand(V, x, y, size, rot, flipX, alpha, opt) {
    var p = V.p(x, y);
    plate.hand(p[0], p[1], V.l(size), rot || 0, flipX, alpha, opt);
  }

  /* MASKA — tělo leží PŘES ruku. Papírová plocha ruku ztlumí,
     ale nechá ji prosvítat: přesně tak se na anatomickém listu
     kreslí, co je pod povrchem.                              */
  function veil(V, pts, a) {
    plate.fillPath(V.a(pts), C.PAPER, a == null ? 0.82 : a);
  }

  /* Lehátko — vyskytuje se ve všech stanicích, takže je to
     jedna funkce, ne pět různých linek.                      */
  function couch(V, y, x0, x1, alpha) {
    var a = alpha == null ? 1 : alpha;
    plate.stroke(V.a([[x0, y], [x1, y]]), 2.0, C.INK3, 0.62 * a);
    plate.hair(V.a([[x0, y + 2.2], [x1, y + 2.2]]), 1, C.LINE, 0.9 * a);
    for (var x = x0 + 8; x < x1 - 4; x += 14) {
      plate.hair(V.a([[x, y + 0.4], [x, y + 2.0]]), 1, C.LINE, 0.8 * a);
    }
  }

  /* PÁS KOSTI po dráze — žebro, klíční kost, oblouk. Kost není
     čára: má šířku, světlou a stinnou hranu. Když se žebra
     kreslila tahem, byl z hrudníku drátěný model.
     Šrafa se tu záměrně nepoužívá — dvacet čtyři šrafovaných
     žeber by sežralo snímek. Objem dělá tón a obrys.        */
  function boneBand(V, axis, wFn, opt) {
    opt = opt || {};
    var p = PL.resample(axis, opt.dense || 7);
    var n = p.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var hw = wFn(i / (n - 1)) * 0.5;
      L.push([p[i][0] + nx * hw, p[i][1] + ny * hw]);
      R.push([p[i][0] - nx * hw, p[i][1] - ny * hw]);
    }
    var loop = V.a(L.concat(R.slice().reverse()));
    plate.fillPath(loop, C.PAPER, opt.fill == null ? 0.94 : opt.fill);
    plate.form(loop, { col: mix(C.INK3, C.INK, 0.3), ang: opt.formAng == null ? 1.15 : opt.formAng,
      a: opt.form == null ? 0.20 : opt.form });
    plate.stroke(loop.concat([loop[0]]), opt.w || 1.15,
      opt.col || C.INK3, opt.alpha == null ? 0.68 : opt.alpha);
    return { L: L, R: R };
  }

  /* ============================================================
     01 · NALADĚNÍ — chodidlo a hlezno z boku
     Ruce spočinou na chodidlech a nic se neděje. Kresba tedy
     nesmí nic „předvádět“: jediné, co se v ní děje, je usazení
     paty do dlaně a prohloubení dechu.

     Záběr je z vnitřní strany: vidíme vnitřní kotník, klenbu
     a patní hrbol. Dlaň leží POD patou — kreslí se první
     a chodidlo ji překryje.
     ============================================================ */
  function s01(W, H, t, io) {
    /* y −48…10, x −34…36 · podložka na y = 9.5 */
    var V = frame(W, H, W * 0.250, H * 0.800, 1.30);
    var set = easeIO(clamp((t - 0.6) / 5.5, 0, 1));
    var sink = V.l(0.8 * set);          /* pata se do dlaně usadí */

    couch(V, 9.5, -40, 50, io);

    /* --- 1 · DLAŇ POD PATOU, ještě pod chodidlem ------------
       Ruka je skoro tak dlouhá jako chodidlo — proto vyplní
       celou mezeru mezi patou a lehátkem. Dřív byla v měřítku
       dětské ručky a pata jí visela nad hlavou.
       Sklopená skoro do hrany: díváme se z boku, prsty
       vybíhají dopředu pod klenbu, předloktí odchází vlevo. */
    hand(V, 0.5, 3.4, 11.2, -0.05, true, io,
      { tilt: 0.60, curl: 0.24, spread: 0.08, arm: true, nails: false, tint: 0.26 });

    /* --- 2 · OBRYS CHODIDLA — překryje dlaň ----------------- */
    ctx.save();
    var piv = V.p(-8, 0);
    ctx.translate(piv[0], piv[1] - sink);
    ctx.rotate(-0.028 * set);
    ctx.translate(-piv[0], -piv[1]);

    /* Silueta z vnitřní strany: lýtko, achillovka, patní
       polštář, klenba, bříško palce, nárt, hrana bérce.    */
    var skin = [
      [-8.6, -48], [-9.8, -40], [-9.0, -32], [-7.4, -24], [-6.6, -18],  /* lýtko → achillovka */
      [-8.6, -11], [-10.8, -6.4], [-12.6, -3.2], [-12.2, -0.6],        /* patní hrbol */
      [-9.6, 0.6], [-6.0, 0.8],                                         /* pata dosedá */
      [-1.0, -1.4], [4.0, -2.8], [9.0, -3.2],                           /* klenba se zvedá */
      [14.5, -2.2], [19.0, -0.4], [24.0, 0.4], [28.5, 0.5],             /* bříško a prsty */
      [31.8, -0.4], [31.2, -2.4], [27.0, -3.6],                         /* palec */
      [22.0, -5.6], [16.0, -8.4], [10.5, -11.6], [6.0, -15.0],          /* nárt */
      [3.2, -19.0], [2.0, -25.0], [2.2, -34.0], [3.0, -48]              /* přední hrana bérce */
    ];
    /* Papírový závoj: tělo leží PŘES ruku. Dlaň pod patou
       nezmizí, jen ztichne — tak se na anatomickém listu
       kreslí, co je pod povrchem.                          */
    veil(V, skin, 0.80);
    plate.tissue(V.a(skin), { fill: 0.070, n: 130, seed: 5, edge: C.INK3,
      edgeA: 0.72 * io, w: 1.7, formAng: 1.05, formA: 0.13 });

    /* --- 3 · KOSTRA -----------------------------------------
       Sedm kusů, které v noze opravdu jsou. Fazole nahrazené
       tvary: patní kost má hrbol a nese hlezenní kost, ta má
       nahoře kladku pro vidlici bérce.                      */

    /* lýtková kost — vzadu, tenká, končí zevním kotníkem */
    plate.bone(V.a([[-5.6, -48], [-3.6, -48], [-3.0, -30], [-2.6, -18], [-2.4, -12.6],
                    [-4.4, -12.2], [-5.4, -18], [-6.0, -30]]),
      { shade: 0.16, gap: 5.4, w: 1.05, edgeA: 0.46, formAng: 1.0 });
    /* holenní kost — dřík se dolů rozšiřuje do vnitřního kotníku */
    plate.bone(V.a([[-2.6, -48], [1.6, -48], [2.0, -30], [2.6, -20], [3.0, -13.2],
                    [1.0, -11.6], [-2.0, -11.4], [-3.2, -13.6], [-3.4, -20], [-3.0, -30]]),
      { shade: 0.20, gap: 5.0, w: 1.25, edgeA: 0.62, formAng: 1.0 });
    /* vnitřní kotník — hrot, který na noze každý najde */
    plate.bone(V.a([[-3.0, -13.4], [-1.0, -13.0], [-0.6, -9.2], [-2.4, -8.4], [-3.6, -10.6]]),
      { shade: 0.26, gap: 4.2, w: 1.2, edgeA: 0.74 });

    /* hlezenní kost — tělo s kladkou nahoře a krčkem dopředu */
    plate.bone(V.a([[-2.6, -11.8], [1.6, -12.8], [4.0, -11.6], [5.2, -9.2],
                    [4.0, -7.0], [0.6, -6.2], [-2.6, -7.2], [-3.6, -9.6]]),
      { shade: 0.26, gap: 4.2, cross: 0.55, w: 1.3, edgeA: 0.80 });
    /* krček a hlavice hlezenní kosti */
    plate.bone(V.a([[4.2, -10.4], [7.6, -9.6], [8.8, -7.8], [7.4, -6.4], [4.4, -7.0]]),
      { shade: 0.22, gap: 4.0, w: 1.15, edgeA: 0.68 });

    /* PATNÍ KOST — největší kost nohy: hrbol vzad, tělo vpřed,
       nahoře plocha pro hlezenní kost. Tady leží dlaň.     */
    plate.bone(V.a([[-11.4, -5.6], [-8.4, -7.4], [-4.0, -7.0], [0.0, -5.4],
                    [3.0, -4.2], [4.2, -2.4], [1.0, -1.2], [-4.0, -0.6],
                    [-8.6, -0.8], [-11.6, -2.2]]),
      { shade: 0.30, gap: 4.0, cross: 0.62, w: 1.45, edgeA: 0.86,
        glow: 0.34 * io, formAng: 1.25 });

    /* člunková kost, klínové kosti, krychlová */
    plate.bone(V.a([[8.6, -9.2], [11.4, -8.6], [12.0, -5.8], [9.4, -5.2], [8.2, -7.0]]),
      { shade: 0.24, gap: 4.0, w: 1.1, edgeA: 0.70 });
    plate.bone(V.a([[12.0, -8.6], [15.6, -7.8], [16.0, -5.0], [12.2, -5.0]]),
      { shade: 0.22, gap: 4.0, w: 1.1, edgeA: 0.66 });
    plate.bone(V.a([[5.0, -4.6], [9.0, -4.4], [10.4, -2.2], [6.0, -1.8]]),
      { shade: 0.20, gap: 4.2, w: 1.05, edgeA: 0.60 });

    /* nártní kosti — pět kostí vějířem, přední tři jsou vidět */
    for (var i = 0; i < 3; i++) {
      var yy = -6.6 + i * 1.9;
      plate.bone(V.a([[15.8, yy], [22.4, yy + 1.6 + i * 0.5], [23.2, yy + 3.0 + i * 0.5],
                      [16.0, yy + 2.0]]),
        { shade: 0.20 - i * 0.03, gap: 4.4, w: 1.05, edgeA: 0.60 - i * 0.06 });
    }
    /* články palce */
    plate.bone(V.a([[23.0, -4.0], [27.6, -3.0], [28.0, -1.2], [23.2, -1.8]]),
      { shade: 0.20, gap: 4.2, w: 1.05, edgeA: 0.58 });
    plate.bone(V.a([[28.0, -3.0], [30.8, -2.2], [30.8, -0.8], [28.2, -1.2]]),
      { shade: 0.18, gap: 4.0, w: 1.0, edgeA: 0.54 });

    /* --- 4 · ŠLACHY A KLENBA -------------------------------- */
    /* achillova šlacha — dva tahy, mezi nimi světlo */
    plate.hair(V.a([[-7.8, -26], [-7.2, -20], [-8.2, -13.4], [-10.2, -7.0]]), 1.6, C.INK3, 0.60 * io);
    plate.hair(V.a([[-5.4, -26], [-5.0, -20], [-6.0, -14.0], [-7.6, -8.6]]), 1.1, C.INK4, 0.44 * io);
    plate.callout({ x: V.p(-7.4, -19)[0], y: V.p(-7.4, -19)[1], dx: -V.l(9), dy: -V.l(4),
      text: "ACHILLOVA ŠLACHA", alpha: io * 0.9 });
    /* podélné vazivo klenby — nese oblouk */
    plate.stroke(V.a([[-9.0, -0.8], [-2.0, -2.2], [6.0, -3.6], [14.0, -3.6], [20.0, -2.2]]),
      1.4, C.INK4, 0.52 * io, [5, 4]);
    plate.label("KLENBA DRŽÍ", V.p(20, -7.6)[0], V.p(20, -7.6)[1],
      { col: C.META, size: 7.2, align: "center", alpha: io });
    ctx.restore();

    /* --- 5 · DOSEDNUTÍ: pata v dlani ------------------------ */
    var hp = V.p(-9.0, 1.2);
    plate.contact(hp[0], hp[1] - sink, V.l(8.5), V.l(2.6), 0.22 * io, C.INK3);

    /* --- 6 · PŘÍLIV KLIDU stoupá od chodidla vzhůru --------- */
    var wave = (t / (60 / 9)) % 1;
    var wy = lerp(V.p(0, 0)[1], V.p(0, -44)[1], wave);
    plate.glow(V.p(-3, 0)[0], wy, V.l(14), C.TIDE, 0.15 * io * Math.sin(wave * Math.PI));

    /* --- 7 · POPISKY ---------------------------------------- */
    plate.callout({ x: V.p(-7.0, -3.2)[0], y: V.p(-7.0, -3.2)[1] - sink, dx: -V.l(7), dy: -V.l(4),
      text: "PATNÍ KOST", alpha: io });
    plate.callout({ x: V.p(0.6, -9.4)[0], y: V.p(0.6, -9.4)[1] - sink, dx: V.l(7), dy: -V.l(5),
      text: "HLEZNO", alpha: io });
    plate.callout({ x: V.p(-9.5, 4.2)[0], y: V.p(-9.5, 4.2)[1], dx: -V.l(6), dy: V.l(4.0),
      text: "DLAŇ POD PATOU", dot: C.TIDE, textCol: C.DEEP, alpha: io });

    /* --- 8 · LUPA: kůže se prohne, nic se netlačí ----------- */
    plate.inset({
      x: W * 0.615, y: H * 0.075, w: W * 0.335, h: H * 0.40, alpha: io, zoom: "8 ×",
      fromX: V.p(-10.2, 0.8)[0], fromY: V.p(-10.2, 0.8)[1],
      caption: "kůže se prohne, nic se netlačí",
      draw: function (x, y, w, h) {
        var x0 = x + w * 0.07, x1 = x + w * 0.93;
        var sk = y + h * 0.50;                       /* hranice kůže */
        var dip = h * 0.045 * (0.35 + 0.65 * set);

        /* patní kost shora — hmota, která na dlaň dosedá */
        plate.bone([[x0 + w * 0.04, y + h * 0.07], [x1 - w * 0.04, y + h * 0.06],
                    [x1 - w * 0.08, y + h * 0.26], [x + w * 0.52, y + h * 0.31],
                    [x0 + w * 0.08, y + h * 0.25]],
          { shade: 0.24, gap: 4.4, w: 1.2, edgeA: 0.72 });
        plate.label("PATNÍ KOST", x + w * 0.50, y + h * 0.19,
          { col: C.META, size: 6.8, align: "center" });

        /* tukový polštář paty — vrstva, která tlak rozloží */
        var pad = [[x0, y + h * 0.30], [x1, y + h * 0.29], [x1, sk], [x0, sk]];
        plate.fillPath(pad, C.INK4, 0.05);
        plate.stipple(pad, { col: C.INK4, alpha: 0.26, n: 50, r: 1.0, seed: 23 });
        plate.label("TUKOVÝ POLŠTÁŘ", x + w * 0.50, y + h * 0.43,
          { col: C.META, size: 6.6, align: "center" });

        /* kůže — prohne se, nezmáčkne */
        var skinL = [[x0, sk], [x + w * 0.30, sk + dip * 0.42],
                     [x + w * 0.52, sk + dip], [x + w * 0.74, sk + dip * 0.42], [x1, sk]];
        plate.stroke(skinL, 1.7, C.INK3, 0.88);

        /* dlaň zdola — měkká, ne nástroj */
        var palm = [[x0, sk + h * 0.115], [x + w * 0.30, sk + dip + h * 0.030],
                    [x + w * 0.52, sk + dip + h * 0.016], [x + w * 0.74, sk + dip + h * 0.030],
                    [x1, sk + h * 0.115]];
        plate.fillPath(palm.concat([[x1, y + h * 0.88], [x0, y + h * 0.88]]), C.SOFT, 0.38);
        plate.stroke(palm, 2.1, C.TIDE, 0.80);
        plate.label("DLAŇ", x + w * 0.50, y + h * 0.755,
          { col: C.DEEP, size: 7.2, align: "center" });

        plate.caliper(x + w * 0.80, sk, x + w * 0.80, sk + dip, "0,2 mm",
          { alpha: 0.92, textCol: C.INK3 });
      }
    });

    /* --- 9 · ODEČTY ----------------------------------------- */
    plate.readout(W * 0.615, H * 0.58, "DECH", "≈ " + Math.round(lerp(16, 9, set)) + " / min",
      { alpha: io, hot: set > 0.6 });

    var tx0 = W * 0.615, tx1 = W * 0.95, ty = H * 0.74, trace = [];
    for (i = 0; i <= 90; i++) {
      var u = i / 90;
      var rate = lerp(4.4, 2.1, u * set);
      trace.push([lerp(tx0, tx1, u), ty - Math.sin(u * Math.PI * 2 * rate - t * 0.9) * H * (0.028 + 0.028 * u * set)]);
    }
    plate.stroke(trace, 1.5, mix(C.INK3, C.TIDE, set), 0.75 * io);
    plate.label("RYCHLEJI", tx0, ty + H * 0.11, { col: C.META, size: 7.4, alpha: io });
    plate.label("HLOUBĚJI", tx1, ty + H * 0.11, { col: C.DEEP, size: 7.4, align: "right", alpha: io * set });
  }

  /* ============================================================
     02 · KOST KŘÍŽOVÁ — pánev z boku
     Kost křížová se naklápí dopředu a dozadu asi devětkrát za
     minutu. Tvrdá plena je nahoře přirostlá k lebce a dole
     k ní — proto se pohyb odsud přenese na celý sloupec.

     Nárys z boku, vzpříma. Pánev je poctivá: lopata kyčelní,
     jamka kyčelního kloubu, sedací hrbol, stydká kost.
     ============================================================ */
  function s02(W, H, t, io) {
    /* y −40…28, x −26…20 · pánev vzpřímeně, nárys z boku */
    var V = frame(W, H, W * 0.330, H * 0.625, 1.42);
    var ph = (t / (60 / 9)) % 1;
    var nut = Math.sin(ph * TAU) * 0.075;

    /* --- 1 · OBRYS PÁNVE, jen jako kontext -----------------
       Lopata kyčelní je na listu blíž divákovi než kost
       křížová. Kdyby se kreslila jako hmota, zakryla by osu
       i ruku a scéna by přestala být o tom, o čem je. Zůstane
       proto jen přerušovaná kontura — anatomický list to tak
       dělá vždycky, když je něco „nad řezem“.              */
    var pelvis = [[-11.0, -12.0], [-4.0, -15.2], [2.6, -11.4], [6.4, -3.2],
                  [7.4, 5.0], [4.8, 11.4], [-0.6, 14.6], [-6.6, 12.0], [-10.6, 3.6]];
    plate.hair(V.a(pelvis.concat([pelvis[0]])), 1.2, C.INK4, 0.50 * io, [5, 4]);
    plate.hair(V.a([[-10.6, -11.6], [-4.2, -14.6], [2.2, -11.0]]), 1.4, C.INK4, 0.55 * io);
    plate.label("PÁNEV · NAD ŘEZEM", V.p(-11.6, 8.0)[0], V.p(-11.6, 8.0)[1],
      { col: C.META, size: 6.8, align: "right", alpha: io });
    /* měkká tkáň zad a hýždí, ještě tišeji */
    plate.hair(V.a([[-9.6, -40], [-11.0, -26], [-10.2, -12], [-12.4, 0], [-14.0, 10],
                    [-11.6, 20], [-3.0, 25], [5.6, 23], [10.0, 14], [11.2, 2], [9.6, -12],
                    [8.2, -26], [7.8, -40]]), 1, C.INK4, 0.22 * io);

    /* --- 2 · DLAŇ POD KŘÍŽEM ------------------------------
       Prsty míří k hlavě, předloktí odchází dolů — přesně tak
       ruka pod kost křížovou vklouzne. Kreslí se před kostí,
       kost ji pak překryje: dlaň je POD ní.                */
    hand(V, -5.2, 5.0, 8.2, Math.PI / 2 - 0.18, false, io,
      { tilt: 0.52, curl: 0.16, spread: 0.08, arm: true, nails: false, tint: 0.28 });

    /* --- 3 · BEDERNÍ PÁTEŘ --------------------------------
       Tělo obratle vpředu (vpravo), oblouk a trnový výběžek
       vzad. Mezi nimi je kanál — a v něm teprve leží plena.  */
    for (var i = 0; i < 5; i++) {
      var u = i / 4;
      var vy = -32 + u * 24;
      var vx = 1.2 + Math.sin(u * Math.PI) * 1.8;
      var sc = 0.88 + u * 0.15;

      plate.bone(V.a([
        [vx - 2.4 * sc, vy - 2.7 * sc], [vx + 3.4 * sc, vy - 3.0 * sc],
        [vx + 3.8 * sc, vy], [vx + 3.4 * sc, vy + 2.9 * sc],
        [vx - 2.4 * sc, vy + 2.9 * sc]
      ]), { shade: 0.24, gap: 4.2, w: 1.2, edgeA: 0.78, cross: 0.42 });
      /* oblouk s kloubními výběžky — mezi tělem a trnem */
      plate.bone(V.a([
        [vx - 2.6 * sc, vy - 2.4], [vx - 6.2 * sc, vy - 2.8],
        [vx - 6.6 * sc, vy + 1.0], [vx - 2.8 * sc, vy + 1.2]
      ]), { shade: 0.22, gap: 4.4, w: 1.05, edgeA: 0.64 });
      /* trnový výběžek — dozadu a dolů, jak se v bedrech sklání */
      plate.bone(V.a([
        [vx - 6.4 * sc, vy - 1.8], [vx - 10.4 * sc, vy + 0.4],
        [vx - 10.6 * sc, vy + 2.6], [vx - 6.4 * sc, vy + 1.6]
      ]), { shade: 0.20, gap: 4.6, w: 1.0, edgeA: 0.58 });
      /* meziobratlová ploténka */
      if (i < 4) {
        var dsk = [[vx - 2.4, vy + 2.9 * sc], [vx + 3.5, vy + 2.9 * sc],
                   [vx + 3.6, vy + 4.9], [vx - 2.5, vy + 4.9]];
        plate.fillPath(V.a(dsk), C.INK4, 0.16);
        plate.stipple(V.a(dsk), { col: C.INK4, alpha: 0.28, n: 14, r: 0.7, seed: 30 + i });
      }
      if (i === 4) {
        plate.callout({ x: V.p(vx + 3.6, vy)[0], y: V.p(vx + 3.6, vy)[1],
          dx: V.l(7), dy: -V.l(3), text: "L5", alpha: io });
      }
    }

    /* --- 4 · KOST KŘÍŽOVÁ: klín, který se naklápí ----------
       Naklápí se kolem osy ve druhém křížovém obratli, ne
       kolem svého středu — proto se hrot houpe víc než báze. */
    ctx.save();
    var sp = V.p(0.0, -3.0);
    ctx.translate(sp[0], sp[1]);
    ctx.rotate(nut);
    ctx.translate(-sp[0], -sp[1]);

    plate.bone(V.a([[-3.6, -6.8], [4.0, -7.6], [5.0, -1.2], [4.0, 5.0],
                    [1.8, 10.6], [-1.2, 14.0], [-4.4, 10.6], [-5.4, 3.4], [-5.0, -3.0]]),
      { shade: 0.30, gap: 4.0, cross: 0.62, w: 1.5, edgeA: 0.90,
        glow: 0.26 * io, formAng: 1.22 });
    /* křížové otvory — čtyři páry, kudy vystupují nervy */
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      var op = V.p(0.4 - i * 0.24, -3.8 + i * 3.7);
      ctx.ellipse(op[0], op[1], V.l(0.85), V.l(0.62), 0.2, 0, TAU);
      ctx.fillStyle = rgba(C.INK3, 0.36);
      ctx.fill();
    }
    /* příčné hrany mezi srostlými křížovými obratli */
    for (i = 0; i < 3; i++) {
      plate.hair(V.a([[-4.6 + i * 0.5, -2.0 + i * 3.7], [4.4 - i * 0.7, -2.6 + i * 3.7]]),
        1, C.INK4, 0.34 * io);
    }
    /* kostrč */
    plate.bone(V.a([[-2.0, 13.6], [1.0, 13.0], [0.4, 17.6], [-1.8, 18.4], [-2.8, 15.8]]),
      { shade: 0.26, gap: 3.6, w: 1.05, edgeA: 0.72 });
    ctx.restore();

    /* --- 5 · TVRDÁ PLENA v páteřním kanálu ----------------
       Trubka, ne provázek: dvě stěny a průsvitná výplň. Leží
       v kanálu MEZI těly obratlů a trny — a končí dole úponem
       na S2. Odsud se pohyb přenese nahoru až k lebce.      */
    var dura = [[-2.6, -5.6], [-2.9, -12], [-2.7, -19], [-3.2, -27], [-2.6, -34], [-2.0, -42]];
    var wA = dura.map(function (q) { return [q[0] - 1.5, q[1]]; });
    var wB = dura.map(function (q) { return [q[0] + 1.5, q[1]]; });
    plate.fillPath(V.a(wA.concat(wB.slice().reverse())), C.SOFT, 0.44);
    plate.stroke(V.a(wA), 1.5, C.TIDE, 0.80);
    plate.stroke(V.a(wB), 1.5, C.TIDE, 0.80);
    /* úpon na S2 — kotva, kvůli které kost křížová vede sloupec.
       Kreslí se jen jako značka uvnitř kosti: tubus sám do
       kosti nezasahuje, jinak by kost vypadala prosklená.  */
    plate.stroke(V.a([[-4.1, -5.6], [-2.6, -2.6], [-1.1, -5.6]]), 2.0, C.TIDE, 0.85 * io);
    plate.hair(V.a([[-2.6, -2.6], [-2.6, 0.4]]), 1.4, C.TIDE, 0.45 * io, [2, 3]);
    plate.runner(V.a(dura), 1 - ph, { r: 12, dot: 3.0, alpha: io });

    /* --- 6 · dosednutí dlaně pod křížem --------------------- */
    var cp = V.p(-4.4, 4.0);
    plate.contact(cp[0], cp[1], V.l(3.0), V.l(7.5), 0.18 * io, C.INK3);

    plate.callout({ x: V.p(1.2, 4.0)[0], y: V.p(1.2, 4.0)[1], dx: V.l(9), dy: V.l(8),
      text: "KOST KŘÍŽOVÁ", alpha: io });
    plate.callout({ x: V.p(-3.2, -24)[0], y: V.p(-3.2, -24)[1], dx: -V.l(9), dy: -V.l(4),
      text: "TVRDÁ PLENA", dot: C.TIDE, textCol: C.DEEP, alpha: io });
    plate.callout({ x: V.p(-5.4, 12.0)[0], y: V.p(-5.4, 12.0)[1], dx: -V.l(7), dy: V.l(6),
      text: "DLAŇ POD KŘÍŽEM", dot: C.TIDE, textCol: C.DEEP, alpha: io });

    plate.inset({
      x: W * 0.635, y: H * 0.07, w: W * 0.315, h: H * 0.42, alpha: io, zoom: "6 ×",
      fromX: V.p(1.4, -3.0)[0], fromY: V.p(1.4, -3.0)[1],
      caption: "úpon pleny · S2",
      draw: function (x, y, w, h) {
        var cx = x + w * 0.40, cy = y + h * 0.58;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nut * 1.5);
        ctx.translate(-cx, -cy);
        plate.bone([[cx - w * 0.19, cy - h * 0.30], [cx + w * 0.07, cy - h * 0.34],
                    [cx + w * 0.15, cy], [cx + w * 0.07, cy + h * 0.24],
                    [cx - w * 0.13, cy + h * 0.22], [cx - w * 0.21, cy - h * 0.06]],
          { shade: 0.3, gap: 4.2, cross: 0.6, w: 1.4, edgeA: 0.85, glow: 0.4 });
        /* plena se upíná na druhý křížový obratel — dvě stěny */
        plate.stroke([[cx - w * 0.09, cy - h * 0.28], [cx + w * 0.03, cy - h * 0.46],
                      [cx + w * 0.21, cy - h * 0.54], [cx + w * 0.40, cy - h * 0.54]], 2.4, C.TIDE, 0.85);
        plate.stroke([[cx - w * 0.01, cy - h * 0.24], [cx + w * 0.11, cy - h * 0.40],
                      [cx + w * 0.27, cy - h * 0.46], [cx + w * 0.42, cy - h * 0.46]], 1.5, C.TIDE, 0.52);
        ctx.restore();
        plate.arrow(cx + w * 0.30, cy + h * 0.10, -1.25 + nut, h * 0.15, C.WARM, 0.8);
        plate.arrow(cx + w * 0.30, cy + h * 0.10, 1.89 + nut, h * 0.15, C.WARM, 0.8);
        plate.label("PLENA", x + w * 0.64, y + h * 0.14, { col: C.DEEP, size: 7.4 });
        plate.label("NAKLÁPÍ SE", x + w * 0.54, y + h * 0.82, { col: C.INK3, size: 7.2 });
      }
    });

    plate.readout(W * 0.635, H * 0.60, "NAKLOPENÍ", "≈ 9 cyklů / min", { alpha: io, hot: true });
    var g0 = W * 0.635, g1 = W * 0.95, gy = H * 0.80, curve = [];
    for (i = 0; i <= 90; i++) {
      var uu = i / 90;
      curve.push([lerp(g0, g1, uu), gy - Math.sin((uu * 3 - ph) * TAU) * H * 0.042]);
    }
    plate.hair([[g0, gy], [g1, gy]], 1, C.LINE, 0.9 * io);
    plate.stroke(curve, 1.6, C.TIDE, 0.7 * io);
  }

  /* ============================================================
     03 · BRÁNICE A HRUDNÍ VSTUP — hrudník zepředu
     Bránice je kupole, ne čára. Při nádechu klesá a plošší se,
     žebra se otáčejí ven. Když povolí, rozkmit povyroste —
     a to je jediná věc, kterou má tahle kresba ukázat.

     Koš je poctivý: dvanáct párů, sedm pravých žeber jde
     chrupavkou na hrudní kost, tři nepravá se skládají do
     žeberního oblouku, poslední dvě volně končí.
     ============================================================ */
  function s03(W, H, t, io) {
    /* y −36…30, x −30…30 */
    var V = frame(W, H, W * 0.29, H * 0.545, 1.31);
    var release = easeIO(clamp((t - 1.2) / 5.0, 0, 1));
    var amp = lerp(0.55, 1.0, release);
    var br = breathe(t, lerp(15, 9, release));

    /* --- 1 · RUKA POD ZÁDY, tedy ZA hrudníkem --------------
       Kreslí se první: leží pod tělem. Trup ji pak překryje
       závojem, takže prosvítá — přesně jako na listu, kde je
       něco „pod řezem“.                                    */
    hand(V, 1.0, 16.5, 9.4, 0.05, false, io,
      { tilt: 0.42, curl: 0.16, spread: 0.14, arm: false, nails: false, tint: 0.26 });

    /* --- 2 · trup jako závoj ------------------------------- */
    var torsoW = 25 + 1.4 * br * amp;
    var torso = [
      [-torsoW, -34], [-torsoW - 2, -14], [-torsoW + 1, 8], [-torsoW + 4, 26],
      [torsoW - 4, 26], [torsoW - 1, 8], [torsoW + 2, -14], [torsoW, -34]
    ];
    veil(V, torso, 0.66);
    plate.tissue(V.a(torso), { fill: 0.05, n: 60, seed: 9, edgeA: 0.30, w: 1.2, formA: 0.07 });

    /* --- 3 · klíční kosti a hrudní vstup ------------------- */
    var inlet = -30 - 1.2 * br * amp;
    [-1, 1].forEach(function (sd) {
      /* klíční kost je esovitá a má tloušťku, ne obrys */
      boneBand(V, [[sd * 22, inlet + 3.0], [sd * 15, inlet - 0.4], [sd * 8, inlet - 0.8],
                   [sd * 2.4, inlet + 1.2]],
        function (u) { return 2.9 - u * 0.7; }, { alpha: 0.72 * io, w: 1.15 });
    });

    /* hrudní kost — rukojeť, tělo, mečovitý výběžek */
    plate.bone(V.a([[-3.4, inlet + 0.6], [3.4, inlet + 0.6], [3.0, inlet + 5.4],
                    [-3.0, inlet + 5.4]]),
      { shade: 0.24, gap: 4.0, w: 1.25, edgeA: 0.76, cross: 0.45 });
    plate.bone(V.a([[-2.9, inlet + 5.6], [2.9, inlet + 5.6], [2.2, -13.0], [-2.2, -13.0]]),
      { shade: 0.26, gap: 4.0, w: 1.3, edgeA: 0.80, cross: 0.5 });
    plate.bone(V.a([[-2.1, -12.8], [2.1, -12.8], [1.4, -7.6], [-1.4, -7.6]]),
      { shade: 0.20, gap: 3.8, w: 1.1, edgeA: 0.64 });

    /* --- 4 · ŽEBRA -----------------------------------------
       Žebro je plochý pásek, ne čára. Dokud se kreslila čára,
       byl z hrudníku drátěný model — a přesně tak to vypadalo.
       Sklon roste dolů, rozpětí je největší kolem osmého žebra
       a dole se koš zase zužuje, jinak vznikne zvon.        */
    var arch = [];                       /* body žeberního oblouku */
    for (var i = 0; i < 12; i++) {
      var u = i / 11;
      var yTop = inlet + 2.4 + u * 30;
      var span = (8.5 + Math.sin(Math.PI * (0.14 + 0.72 * u)) * 16.0) * (1 + 0.038 * br * amp)
               * (1 - 0.34 * Math.max(0, u - 0.58) / 0.42);
      var drop = 2.4 + u * 2.6;
      var lift = -1.7 * br * amp * (0.28 + u * 0.95);
      var kind = i < 7 ? 0 : (i < 10 ? 1 : 2);   /* pravé · nepravé · volné */
      var thick = 2.5 - u * 0.5;

      [-1, 1].forEach(function (side) {
        /* Horní žebra se stáčejí až k hrudní kosti, dolní se
           jen svezou dopředu. Když se všechna zahákla dovnitř,
           spodek koše byl klubko.                            */
        var ribPts = [
          [side * 2.4, yTop + lift * 0.3],
          [side * (span * 0.48), yTop + drop * 0.30 + lift],
          [side * span, yTop + drop * 0.85 + lift],
          [side * (span * 0.90), yTop + drop * 1.65 + lift * 0.8],
          [side * (span * 0.52), yTop + drop * 2.25 + lift * 0.5]
        ];
        if (kind === 1) {
          ribPts[4] = [side * (span * 0.74), yTop + drop * 2.30 + lift * 0.5];
        } else if (kind === 2) {
          /* volná žebra nikam nedosahují — useknou se dřív,
             jinak se propletou s obloukem                    */
          ribPts = ribPts.slice(0, 3);
        }
        boneBand(V, ribPts, function (uu) { return thick * (1 - uu * 0.24); }, {
          alpha: 0.70 * io,
          col: mix(C.INK3, C.TIDE, release * 0.18),
          form: 0.22, formAng: side > 0 ? 1.15 : 2.0, w: 1.05
        });

        /* žeberní chrupavka — jiný materiál, jiná kresba */
        var cEnd = ribPts[ribPts.length - 1];
        if (kind === 0) {
          var cart = [cEnd, [side * (span * 0.26), yTop + drop * 2.55],
                      [side * 2.6, yTop + drop * 2.62]];
          boneBand(V, cart, function () { return 2.0; },
            { alpha: 0.40 * io, col: C.INK4, fill: 0.5, form: 0.10, w: 0.9 });
        } else if (kind === 1) {
          var join = [side * (span * 0.46), yTop + drop * 2.75];
          boneBand(V, [cEnd, join], function () { return 1.9; },
            { alpha: 0.36 * io, col: C.INK4, fill: 0.5, form: 0.10, w: 0.9 });
          if (side === 1) arch.push(join);
        }
      });
    }
    /* žeberní oblouk — hrana, kterou si každý nahmatá pod prsy */
    if (arch.length) {
      [-1, 1].forEach(function (sd) {
        var pts = [[sd * 3.0, arch[0][1] - 3.4]].concat(
          arch.map(function (q) { return [sd * q[0], q[1]]; }));
        plate.hair(V.a(pts), 1.4, C.INK4, 0.50 * io, [5, 4]);
      });
    }

    /* --- BRÁNICE -------------------------------------------
       Dvě kupole (pravá výš kvůli játrům) a mezi nimi šlašitý
       střed. Tohle je pravda, ne stylizace, a poznají to
       i lidé bez anatomie.                                  */
    var domeY = -7 + 4.6 * br * amp;
    var domeH = lerp(8, 4.8, br * amp);
    var domeW = 17.5;
    var dome = [];
    for (i = 0; i <= 34; i++) {
      var x = lerp(-domeW, domeW, i / 34);
      var h1 = Math.exp(-Math.pow((x + 8.5) / 8.4, 2)) * domeH * 1.06;
      var h2 = Math.exp(-Math.pow((x - 8.5) / 8.4, 2)) * domeH * 0.90;
      var ct = Math.exp(-Math.pow(x / 5.0, 2)) * domeH * 0.62;
      dome.push([x, domeY - Math.max(Math.max(h1, h2), ct)]);
    }
    plate.fillPath(V.a(dome.concat([[domeW, domeY + 5], [-domeW, domeY + 5]])), C.SOFT, 0.30);
    plate.stroke(V.a(dome), function (uu) { return 2.7 - Math.abs(uu - 0.5) * 1.7; },
      C.TIDE, 0.88 * io);
    /* šlašitý střed — plocha, ze které svalová vlákna vybíhají */
    plate.hair(V.a([[-5.2, domeY - domeH * 0.62], [0, domeY - domeH * 0.70],
                    [5.2, domeY - domeH * 0.62]]), 1.7, C.TIDE, 0.52 * io);
    for (i = -3; i <= 3; i++) {
      if (!i) continue;
      plate.hair(V.a([[i * 2.4, domeY - domeH * 0.66],
                      [i * 4.6, domeY - domeH * 0.20]]), 1, C.TIDE, 0.22 * io);
    }

    /* úpony na bederní páteři — bránice sahá níž, než se čeká */
    plate.stroke(V.a([[-3, domeY + 1], [-4.2, domeY + 7.5], [-3.6, domeY + 15]]), 1.8, C.TIDE, 0.55 * io);
    plate.stroke(V.a([[3, domeY + 1], [4.2, domeY + 7.5], [3.6, domeY + 15]]), 1.8, C.TIDE, 0.55 * io);

    /* --- dosednutí: hrudník spočine na dlani --------------- */
    var cpt = V.p(1.0, 13.0);
    plate.contact(cpt[0], cpt[1], V.l(11), V.l(3.0), 0.16 * io, C.INK3);
    plate.label("RUKA POD ZÁDY", V.p(0, 30)[0], V.p(0, 30)[1],
      { col: C.INK3, size: 7.6, align: "center", alpha: io });

    /* --- rozkmit: posuvka ukazuje, o kolik kupole klesá ----- */
    var hi = V.p(26, -15)[1], lo = V.p(26, -7 + 4.6 * amp)[1];
    plate.caliper(V.p(26, 0)[0], hi, V.p(26, 0)[0], lo, null, { alpha: io * 0.9 });
    plate.hair([[V.p(23, 0)[0], hi], [V.p(27.5, 0)[0], hi]], 1, C.INK4, 0.5 * io, [2, 3]);
    plate.hair([[V.p(23, 0)[0], lo], [V.p(27.5, 0)[0], lo]], 1, C.INK4, 0.5 * io, [2, 3]);
    plate.label(release > 0.5 ? "VĚTŠÍ ROZKMIT" : "ROZKMIT",
      V.p(29, 0)[0], (hi + lo) / 2, { col: release > 0.5 ? C.DEEP : C.INK3, size: 7.6, alpha: io });

    plate.callout({ x: V.p(-13, domeY - 5)[0], y: V.p(-13, domeY - 5)[1], dx: -V.l(8), dy: -V.l(3),
      text: "BRÁNICE", dot: C.TIDE, textCol: C.DEEP, alpha: io });
    plate.callout({ x: V.p(-11, inlet + 2)[0], y: V.p(-11, inlet + 2)[1], dx: -V.l(10), dy: -V.l(7),
      text: "HRUDNÍ VSTUP", alpha: io });
    plate.callout({ x: V.p(3.9, domeY + 12)[0], y: V.p(3.9, domeY + 12)[1], dx: V.l(11), dy: V.l(3),
      text: "ÚPON NA BEDRECH", alpha: io });

    plate.inset({
      x: W * 0.645, y: H * 0.06, w: W * 0.305, h: H * 0.42, alpha: io, zoom: "4 ×",
      fromX: V.p(-11, inlet + 2)[0], fromY: V.p(-11, inlet + 2)[1],
      caption: "úžina, kudy prochází vše",
      draw: function (x, y, w, h) {
        var cx = x + w * 0.5, cy = y + h * 0.56;
        var open = 1 + 0.06 * br * amp;
        /* kostěný prstenec vstupu */
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.32 * open, h * 0.215 * open, 0, 0, TAU);
        ctx.fillStyle = rgba(C.SOFT, 0.20);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = rgba(C.TIDE, 0.85);
        ctx.stroke();
        /* jícen, průdušnice, cévy — tři trubky s vlastní stěnou */
        [[-0.15, 0.03, 0.052], [0.02, -0.035, 0.058], [0.175, 0.025, 0.040]].forEach(function (q) {
          ctx.beginPath();
          ctx.arc(cx + w * q[0], cy + h * q[1], w * q[2], 0, TAU);
          ctx.fillStyle = rgba(C.PAPER, 0.9);
          ctx.fill();
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = rgba(C.INK3, 0.75);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + w * q[0], cy + h * q[1], w * q[2] * 0.52, 0, TAU);
          ctx.fillStyle = rgba(C.INK4, 0.22);
          ctx.fill();
        });
        plate.label("JÍCEN · PRŮDUŠNICE · CÉVY", cx, y + h * 0.22,
          { col: C.INK3, size: 7.0, align: "center" });
        plate.label(release > 0.5 ? "ÚŽINA POVOLILA" : "ÚŽINA", cx, y + h * 0.84,
          { col: release > 0.5 ? C.DEEP : C.META, size: 7.6, align: "center" });
      }
    });

    plate.readout(W * 0.645, H * 0.58, "DECH", "≈ " + Math.round(lerp(15, 9, release)) + " / min",
      { alpha: io, hot: release > 0.5 });
    plate.readout(W * 0.645, H * 0.78, "PŘEPÁŽKY", release > 0.5 ? "povolily" : "drží",
      { alpha: io, hot: release > 0.5 });
  }

  /* ============================================================
     04 · TÝLNÍ BÁZE — týl, atlas, čep, bloudivý nerv
     Tudy vystupuje hlavní kabel klidu. Když kloub dostane
     místo, tělo se přepne z pohotovosti do trávení — a to je
     vidět na tepové frekvenci vpravo dole.

     Týlní kost není vejce: má šupinu, kostěný hrbol, kloubní
     hrbolky po stranách velkého otvoru a šikmou bázi dopředu.
     ============================================================ */
  function s04(W, H, t, io) {
    /* y −28…56, x −30…42 */
    var V = frame(W, H, W * 0.285, H * 0.325, 1.09);
    var open = easeIO(clamp((t - 1.0) / 4.6, 0, 1));
    var gap = lerp(0.6, 2.4, open);

    /* --- 1 · PRSTY POD TÝLEM, ještě pod kostí --------------
       Ruka je větší než týlní kost — a tak to má být. Prsty
       se opřou o týlní bázi, dlaň nese celou váhu hlavy,
       předloktí odchází z obrazu vlevo dolů.               */
    hand(V, -30, 14, 9.0, -0.75, true, io,
      { tilt: 0.52, curl: 0.32, spread: 0.05, arm: true, nails: false, tint: 0.26 });

    /* --- TÝLNÍ KOST ----------------------------------------
       Šupina se klene dozadu a nahoru, dole se láme do báze.
       Zezadu vystupuje zevní hrbol, na který si člověk sáhne. */
    var occ = [
      [-26, -19], [-20, -24.4], [-12, -26.4], [-4, -24.2], [2, -19.0],
      [6.0, -12.0], [7.2, -4.6], [4.4, 1.0], [-1.0, 3.8],
      [-9, 5.0], [-17, 3.4], [-23, -1.0], [-26.4, -8.4]
    ];
    veil(V, occ, 0.86);
    plate.bone(V.a(occ), { shade: 0.24, gap: 5.0, cross: 0.42, w: 1.5, edgeA: 0.74,
      lightX: 0.34, formAng: 1.05 });
    /* zevní hrbol a šíjové čáry — reliéf, na který se upínají svaly */
    plate.hair(V.a([[-27, -8.6], [-18, -4.4], [-8, -3.0], [0.4, -4.6]]), 1.4, C.INK4, 0.52 * io);
    plate.hair(V.a([[-25, -14.0], [-16, -10.6], [-6, -9.8]]), 1.1, C.INK4, 0.36 * io);
    plate.bone(V.a([[-12.6, -4.4], [-9.0, -5.0], [-8.2, -2.2], [-12.0, -1.8]]),
      { shade: 0.20, gap: 3.8, w: 1.0, edgeA: 0.56 });

    /* --- velký týlní otvor a kloubní hrbolky ---------------- */
    ctx.save();
    var fm = V.p(-3.0, 3.4);
    ctx.beginPath();
    ctx.ellipse(fm[0], fm[1], V.l(5.4), V.l(2.1), 0.08, 0, TAU);
    ctx.fillStyle = rgba(C.INK3, 0.14);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(C.INK3, 0.72);
    ctx.stroke();
    ctx.restore();
    [-1, 1].forEach(function (sd) {
      plate.bone(V.a([[-3.0 + sd * 5.2, 3.0], [-3.0 + sd * 8.0, 3.4],
                      [-3.0 + sd * 7.6, 5.4], [-3.0 + sd * 4.6, 5.0]]),
        { shade: 0.26, gap: 3.6, w: 1.05, edgeA: 0.70, glow: 0.35 * open });
    });

    /* --- ATLAS · C1 — prstenec bez těla -------------------- */
    var atY = 8.6 + gap;
    plate.bone(V.a([[-14, atY - 2.4], [-5, atY - 3.4], [3, atY - 2.6], [7.6, atY + 0.2],
                    [3.4, atY + 3.2], [-5, atY + 3.6], [-13, atY + 2.2]]),
      { shade: 0.28, gap: 4.0, cross: 0.55, w: 1.4, edgeA: 0.82, glow: 0.5 * open });
    /* příčný výběžek atlasu — nahmatatelný pod uchem */
    plate.bone(V.a([[-13, atY - 0.6], [-20.6, atY + 0.2], [-21, atY + 2.4], [-13, atY + 2.8]]),
      { shade: 0.20, gap: 4.2, w: 1.05, edgeA: 0.58 });

    /* --- ČEP · C2 — obratel se zubem ----------------------- */
    var axY = atY + 8.6;
    plate.bone(V.a([[-13, axY - 2.6], [-3, axY - 3.4], [5, axY - 2.2], [6.4, axY + 2.6],
                    [-4, axY + 3.8], [-12, axY + 2.6]]),
      { shade: 0.26, gap: 4.0, cross: 0.5, w: 1.35, edgeA: 0.78 });
    /* zub, kolem kterého se hlava otáčí — vjíždí do atlasu */
    plate.bone(V.a([[-1.2, axY - 3.0], [2.6, axY - 3.2], [2.2, axY - 8.2], [-0.4, axY - 8.4]]),
      { shade: 0.22, gap: 3.6, w: 1.1, edgeA: 0.70 });
    /* trnový výběžek C2 — rozdvojený, největší v šíji */
    plate.bone(V.a([[-12, axY - 0.4], [-21, axY + 0.6], [-21.4, axY + 3.0], [-12, axY + 3.0]]),
      { shade: 0.20, gap: 4.2, w: 1.05, edgeA: 0.60 });

    /* --- ŠTĚRBINA: tady vzniká místo ----------------------- */
    plate.membrane(V.a([[-14, 5.6], [-5, 4.6], [3, 5.2], [7.6, 6.2],
                        [3.4, atY - 2.8], [-5, atY - 3.6], [-14, atY - 2.6]]),
      { fill: 0.15 + 0.32 * open, edgeA: 0 });
    plate.caliper(V.p(10.2, 5.6)[0], V.p(10.2, 5.6)[1], V.p(10.2, atY - 2.6)[0], V.p(10.2, atY - 2.6)[1],
      null, { alpha: io });
    if (open > 0.5) {
      plate.label("VÍC MÍSTA", V.p(12.4, (5.6 + atY - 2.6) / 2)[0],
        V.p(12.4, (5.6 + atY - 2.6) / 2)[1] + 3,
        { col: C.DEEP, size: 7.4, alpha: io * (open - 0.5) * 2 });
    }

    /* --- BLOUDIVÝ NERV z hrdelního otvoru dolů ------------- */
    var vag = [[3.4, 4.0], [9, 9], [13, 18], [14, 30], [12, 43], [9, 53]];
    plate.stroke(V.a(vag), function (u) { return 2.3 - u * 0.9; }, C.TIDE, 0.85 * io);
    plate.stroke(V.a([[13.6, 24], [21, 27], [26, 31]]), 1.3, C.TIDE, 0.5 * io);
    plate.stroke(V.a([[13.4, 34], [22, 37], [28, 39]]), 1.3, C.TIDE, 0.5 * io);
    plate.stroke(V.a([[10.6, 47], [19, 50], [26, 51]]), 1.3, C.TIDE, 0.5 * io);

    /* --- orgány, kterým nerv velí -------------------------- */
    /* srdce — hrot doleva dolů, ne fazole */
    plate.tissue(V.a([[27, 26.4], [32.4, 25.4], [36, 29.0], [34.6, 34.2],
                      [30.0, 36.6], [27.2, 32.0]]),
      { fill: 0.09, n: 26, seed: 21, edgeA: 0.55, w: 1.15 });
    plate.hair(V.a([[29.6, 27.4], [31.2, 31.2], [30.4, 35.6]]), 1, C.INK4, 0.42 * io);
    plate.label("SRDCE", V.p(38, 31.0)[0], V.p(38, 31.0)[1], { col: C.META, size: 7.4, alpha: io });
    /* plíce — lalok se zářezem */
    plate.tissue(V.a([[28.4, 37.2], [34.6, 36.2], [37.4, 40.4], [34.2, 44.6], [28.6, 43.4]]),
      { fill: 0.06, n: 22, seed: 33, edgeA: 0.48, w: 1.1 });
    plate.hair(V.a([[30.0, 37.6], [32.4, 40.4], [31.6, 43.8]]), 1, C.INK4, 0.34 * io);
    plate.label("PLÍCE", V.p(39, 41.0)[0], V.p(39, 41.0)[1], { col: C.META, size: 7.4, alpha: io });
    /* střeva — klička, ne ovál */
    plate.tissue(V.a([[26.6, 48.2], [33.4, 47.0], [37, 51.4], [33.2, 55.4], [26.8, 54.4]]),
      { fill: 0.06, n: 20, seed: 45, edgeA: 0.46, w: 1.1 });
    plate.hair(V.a([[28.4, 52.6], [31.0, 49.8], [33.6, 52.8]]), 1.1, C.INK4, 0.40 * io);
    plate.label("STŘEVA", V.p(39, 52.0)[0], V.p(39, 52.0)[1], { col: C.META, size: 7.4, alpha: io });

    plate.runner(V.a(vag), (t / 3.4) % 1, { r: 13, dot: 3.0, alpha: io });

    /* dosednutí prstů pod týl */
    var fp = V.p(-20.0, 4.4);
    plate.contact(fp[0], fp[1], V.l(7.0), V.l(2.4), 0.18 * io, C.INK3);

    plate.callout({ x: V.p(-20.0, 4.2)[0], y: V.p(-20.0, 4.2)[1], dx: -V.l(5), dy: V.l(7),
      text: "PRSTY POD TÝLEM", dot: C.TIDE, textCol: C.DEEP, alpha: io });
    plate.callout({ x: V.p(-17, -15)[0], y: V.p(-17, -15)[1], dx: -V.l(9), dy: -V.l(8),
      text: "TÝLNÍ KOST", alpha: io });
    plate.callout({ x: V.p(-9, atY + 1)[0], y: V.p(-9, atY + 1)[1], dx: -V.l(9), dy: V.l(6),
      text: "ATLAS · C1", alpha: io });
    plate.callout({ x: V.p(-6, axY + 2)[0], y: V.p(-6, axY + 2)[1], dx: -V.l(10), dy: V.l(8),
      text: "ČEP · C2", alpha: io });
    plate.callout({ x: V.p(13.6, 21)[0], y: V.p(13.6, 21)[1], dx: V.l(9), dy: V.l(5),
      text: "BLOUDIVÝ NERV", dot: C.TIDE, textCol: C.DEEP, alpha: io });

    plate.inset({
      x: W * 0.655, y: H * 0.05, w: W * 0.295, h: H * 0.40, alpha: io, zoom: "10 ×",
      fromX: V.p(3.4, 4.0)[0], fromY: V.p(3.4, 4.0)[1],
      caption: "otvor, kterým nerv vystupuje",
      draw: function (x, y, w, h) {
        plate.bone([[x + w * 0.06, y + h * 0.18], [x + w * 0.94, y + h * 0.12],
                    [x + w * 0.94, y + h * 0.44], [x + w * 0.06, y + h * 0.50]],
          { shade: 0.26, gap: 4.4, w: 1.3 });
        /* hrdelní otvor — díra v kosti, ne kroužek na kosti */
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.44, y + h * 0.38, w * 0.115, h * 0.082, -0.1, 0, TAU);
        ctx.fillStyle = rgba(C.PAPER, 1);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(C.INK3, 0.82);
        ctx.stroke();
        ctx.restore();
        plate.stroke([[x + w * 0.44, y + h * 0.28], [x + w * 0.46, y + h * 0.42],
                      [x + w * 0.54, y + h * 0.66], [x + w * 0.58, y + h * 0.88]],
          2.5, C.TIDE, 0.9);
        plate.hair([[x + w * 0.50, y + h * 0.52], [x + w * 0.66, y + h * 0.60]], 1.2, C.TIDE, 0.5);
        plate.label("BLOUDIVÝ NERV", x + w * 0.62, y + h * 0.64, { col: C.DEEP, size: 7.2 });
        plate.label("TÝLNÍ KOST", x + w * 0.08, y + h * 0.32, { col: C.META, size: 7.2 });
      }
    });

    var bpm = Math.round(lerp(78, 62, open));
    plate.readout(W * 0.655, H * 0.55, "TEP", "≈ " + bpm + " / min", { alpha: io, hot: open > 0.5 });

    var hx0 = W * 0.655, hx1 = W * 0.95, hy = H * 0.77, trace = [];
    for (var i = 0; i <= 150; i++) {
      var u = i / 150;
      var beat = ((u * lerp(7.5, 5.6, open) - t * 0.55) % 1 + 1) % 1;
      var yv = 0;
      if (beat > 0.30 && beat < 0.44) {
        var b = (beat - 0.30) / 0.14;
        yv = -Math.sin(b * Math.PI) * (b < 0.4 ? 0.28 : 1) * H * 0.052;
      } else if (beat > 0.44 && beat < 0.52) {
        yv = Math.sin((beat - 0.44) / 0.08 * Math.PI) * H * 0.015;
      }
      trace.push([lerp(hx0, hx1, u), hy + yv]);
    }
    plate.stroke(trace, 1.4, mix(C.INK3, C.TIDE, open), 0.8 * io);
    plate.label(open > 0.5 ? "KLID A TRÁVENÍ" : "POHOTOVOST",
      hx1, hy + H * 0.11, { col: open > 0.5 ? C.DEEP : C.INK3, size: 7.6, align: "right", alpha: io });
  }

  /* ============================================================
     05 · LEBKA A DOZNĚNÍ — švy a still point
     Zastavení je hlavní událost celé sekce, proto se zastaví
     opravdu všechno — i dech kresby.

     Klenba z boku má čtyři kosti, ne jeden ovál: čelní,
     temenní, spánkovou (se šupinou a lícním výběžkem)
     a týlní. Švy jsou hranice mezi nimi, ne ornament.
     ============================================================ */
  function s05(W, H, t, io) {
    /* y −38…28, x −34…24 */
    var V = frame(W, H, W * 0.30, H * 0.555, 1.33);

    var LOOP = 13.5;
    var p = (t % LOOP) / LOOP;
    var still = p > 0.44 && p < 0.60;
    var after = p >= 0.60;
    var rate = after ? 6.5 : 9;
    var phase = still ? 0.5 : breathe(t, rate);
    var deep = after ? 1.35 : 1;
    var flex = (phase - 0.5) * 2 * (still ? 0 : 1) * deep;

    /* --- DLANĚ OBEJMOU LEBKU, zezadu ----------------------- */
    hand(V, -33, 12, 7.6, -1.05, true, io * 0.95,
      { tilt: 0.48, curl: 0.34, spread: 0.05, arm: true, nails: false, tint: 0.26 });
    hand(V, -6, -38, 7.6, 0.36, true, io * 0.95,
      { tilt: 0.48, curl: 0.32, spread: 0.05, arm: true, nails: false, tint: 0.26 });

    ctx.save();
    var cc = V.p(-4, -14);
    ctx.translate(cc[0], cc[1]);
    ctx.scale(1 + flex * 0.016, 1 - flex * 0.010);
    ctx.translate(-cc[0], -cc[1]);

    /* Klenba z boku. Obličej ani čelist se nekreslí: pátá
       stanice je o klenbě, švech a still pointu, a každý další
       tvar jen bere pozornost. Řez je veden pod bází.       */
    var vault = [
      [-27, 6], [-30, -6], [-29.4, -18], [-24, -28], [-14, -34.6],
      [-2, -36.6], [9, -33.4], [16.6, -26], [19.6, -16], [19.4, -6],
      [16.6, 3], [11, 7]
    ];
    veil(V, vault.concat([[11, 8], [-27, 8]]), 0.88);
    plate.fillPath(V.a(vault.concat([[11, 8], [-27, 8]])), C.PAPER, 0.90);
    plate.hatch(V.a(vault.concat([[11, 8], [-27, 8]])),
      { col: C.INK3, alpha: still ? 0.15 : 0.20, gap: 5.8, angle: 34, cross: 0.30,
        lightX: 0.38, lightY: 0.22 });
    plate.form(V.a(vault.concat([[11, 8], [-27, 8]])),
      { col: mix(C.INK3, C.INK, 0.3), ang: 1.05, a: 0.13 });
    plate.stroke(V.a(vault), 1.8, still ? C.TIDE : C.INK3, 0.80 * io);

    /* spánková šupina — tenká kost nad uchem, jiná tloušťka */
    var squam = [[-16, -4], [-8, -8.4], [1, -8.8], [8, -5.4], [10, 1], [4, 5], [-6, 6], [-14, 3]];
    plate.hatch(V.a(squam), { col: C.INK4, alpha: 0.16, gap: 5.0, angle: -52, cross: 0, light: false });
    /* jařmový oblouk — jen náznak: obličej se nekreslí, ale
       bez téhle hrany by lebka neměla kde končit          */
    plate.hair(V.a([[8.6, -1.0], [14.6, -0.2], [17.0, 1.4]]), 1.5, C.INK4, 0.50 * io);
    /* zevní zvukovod — bod, podle kterého se lebka pozná */
    ctx.beginPath();
    var ea = V.p(3.4, 0.4);
    ctx.ellipse(ea[0], ea[1], V.l(1.9), V.l(1.4), 0.3, 0, TAU);
    ctx.fillStyle = rgba(C.INK3, 0.24);
    ctx.fill();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = rgba(C.INK3, 0.66);
    ctx.stroke();

    /* báze — rovná linka řezu, ne obrys hlavy */
    plate.hair(V.a([[-27, 7.4], [11, 7.4]]), 1.4, C.INK4, 0.72 * io, [4, 3]);
    /* velký týlní otvor v bázi */
    plate.stroke(V.a([[-9, 7.4], [-2, 7.4]]), 2.4, C.TIDE, 0.5 * io);

    /* --- ŠVY — šev není rovná čára, je to zubatý spoj ------ */
    function suture(pts, amp, alpha, hot, dens) {
      var r = PL.resample(pts, dens || 11), out = [];
      for (var i = 0; i < r.length; i++) {
        var a2 = r[Math.max(0, i - 1)], b2 = r[Math.min(r.length - 1, i + 1)];
        var dx = b2[0] - a2[0], dy = b2[1] - a2[1], L = Math.hypot(dx, dy) || 1;
        var w2 = Math.sin(i * 1.9) * 0.62 + Math.sin(i * 4.3) * 0.38;
        out.push([r[i][0] + (-dy / L) * w2 * amp,
                  r[i][1] + (dx / L) * w2 * amp]);
      }
      plate.stroke(out, 1.5, hot ? C.TIDE : C.INK3, alpha);
    }
    var gS = still ? 0.95 : 0.55;
    /* Věnčitý šev — hranice čelní a temenní kosti. Čelo je
       na tomhle nárysu VPRAVO, takže šev musí od temene
       klesat doprava. Dřív padal doleva, do týlu.        */
    suture(V.a([[1.6, -36.2], [4.4, -28], [7.0, -18], [9.0, -9], [10.0, -3]]),
      V.l(0.58), gS * io, still);
    /* lambdový — vzadu, hranice temenní a týlní */
    suture(V.a([[-24.6, -27], [-22.4, -19], [-23.4, -11], [-25.6, -4]]),
      V.l(0.52), gS * 0.82 * io, still);
    /* šupinový — nad uchem, plochý oblouk */
    suture(V.a([[-16, -4], [-8, -8.2], [1, -8.6], [8.4, -5.2]]),
      V.l(0.42), gS * 0.68 * io, still, 9);
    ctx.restore();

    plate.callout({ x: V.p(7.0, -18)[0], y: V.p(7.0, -18)[1], dx: V.l(8), dy: -V.l(4),
      text: "VĚNČITÝ ŠEV", alpha: io });
    plate.callout({ x: V.p(-23.4, -15)[0], y: V.p(-23.4, -15)[1], dx: -V.l(8), dy: -V.l(6),
      text: "LAMBDOVÝ ŠEV", alpha: io });
    plate.callout({ x: V.p(-6, -8.6)[0], y: V.p(-6, -8.6)[1], dx: -V.l(7), dy: V.l(11),
      text: "ŠUPINOVÝ ŠEV", alpha: io });

    plate.label("DLANĚ OBEJMOU LEBKU", V.p(-8, 22)[0], V.p(-8, 22)[1],
      { col: C.INK3, size: 8.2, align: "center", alpha: io });

    if (still) {
      var q = clamp((p - 0.44) / 0.16, 0, 1);
      plate.glow(V.p(-4, -12)[0], V.p(-4, -12)[1], V.l(46), C.TIDE, 0.16 * Math.sin(q * Math.PI) * io);
    }

    plate.inset({
      x: W * 0.635, y: H * 0.07, w: W * 0.315, h: H * 0.44, alpha: io,
      fromX: V.p(-4, -22)[0], fromY: V.p(-4, -22)[1],
      caption: "rytmus se zastaví a vrátí pomalejší",
      draw: function (x, y, w, h) {
        var x0 = x + w * 0.08, x1 = x + w * 0.92, cy = y + h * 0.46;
        plate.hair([[x0, cy], [x1, cy]], 1, C.LINE, 1);

        var pts = [];
        for (var i = 0; i <= 120; i++) {
          var u = i / 120, yy;
          if (u < 0.40) yy = cy - Math.sin(u / 0.40 * Math.PI * 2.6) * h * 0.15;
          else if (u < 0.58) yy = cy;
          else yy = cy - Math.sin((u - 0.58) / 0.42 * Math.PI * 1.6) * h * 0.22;
          pts.push([x0 + u * (x1 - x0), yy]);
        }
        plate.stroke(pts, 2.0, C.TIDE, 0.9);

        [0.40, 0.58].forEach(function (u) {
          plate.hair([[x0 + (x1 - x0) * u, y + h * 0.16], [x0 + (x1 - x0) * u, y + h * 0.74]],
            1, C.INK4, 0.7, [2, 3]);
        });
        plate.label("STILL POINT", x0 + (x1 - x0) * 0.49, y + h * 0.13,
          { col: C.INK3, size: 7.6, align: "center" });
        plate.label("PAK HLOUBĚJI", x1, y + h * 0.84, { col: C.DEEP, size: 7.6, align: "right" });

        var run = p, ry;
        if (run < 0.40) ry = cy - Math.sin(run / 0.40 * Math.PI * 2.6) * h * 0.15;
        else if (run < 0.58) ry = cy;
        else ry = cy - Math.sin((run - 0.58) / 0.42 * Math.PI * 1.6) * h * 0.22;
        var rx = x0 + run * (x1 - x0);
        if (still) {
          ctx.beginPath();
          ctx.arc(rx, ry, 8, 0, TAU);
          ctx.fillStyle = rgba(C.TIDE, 0.14);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(rx, ry, 3.4, 0, TAU);
        ctx.fillStyle = rgba(C.WARM, 1);
        ctx.fill();
      }
    });

    plate.readout(W * 0.635, H * 0.62, "RYTMUS",
      still ? "zastavil se" : (after ? "≈ 6,5 / min" : "≈ 9 / min"),
      { alpha: io, hot: still || after });
    plate.readout(W * 0.635, H * 0.80, "SEZENÍ", "posledních pár minut", { alpha: io });
  }

  var SCENES = [s01, s02, s03, s04, s05];

  /* ---------- přepínání ------------------------------------- */
  var index = -1, sceneT = 0;

  function select(i) {
    i = (i + tabs.length) % tabs.length;
    if (i === index) return;
    index = i;
    sceneT = 0;
    tabs.forEach(function (b, k) {
      var on = k === index;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (panels[k]) panels[k].hidden = !on;
    });
    if (fill) fill.style.width = ((index + 1) / tabs.length * 100) + "%";
  }

  tabs.forEach(function (b, i) {
    b.addEventListener("click", function () { select(i); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
            : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(index + d);
      tabs[index].focus();
    });
  });
  select(0);

  /* ---------- smyčka ---------------------------------------- */
  var last = performance.now();

  function draw(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var red = KJ.isReduced();

    var size = KJ.fitCanvas(canvas, ctx);
    var W = size.w, H = size.h;
    if (W < 8 || H < 8) return;

    /* Bez pohybu ukážeme scénu v okamžiku, kdy je nejvíc
       vypovídající — ne v nule, kdy se ještě nic nestalo.    */
    if (red) sceneT = 6.2; else sceneT += dt;

    plate.size(W, H);
    ctx.clearRect(0, 0, W, H);
    plate.paper(size.dpr);

    var io = red ? 1 : easeOut(clamp(sceneT / 0.55, 0, 1));
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
