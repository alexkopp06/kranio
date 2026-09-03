/* ============================================================
   help-index.js — „Poznáváte se?“ rejstřík sedmi obtíží

   Nejsilnější konverzní místo úvodní stránky: čtenář se pozná
   podle projevů dřív, než dočte popis.

   Sedm obtíží má sedm rukopisů. Vpravo leží jediný canvas,
   který mezi nimi morfuje bod po bodu — profil hlavy se
   protáhne v mělkou vlnu, vlna se sbalí do páteře. Není to
   sedm obrázků, je to jedna ruka.

   Proti první verzi je kresba doslovná, ne abstraktní: profil
   hlavy s ohniskem tlaku, srpek měsíce s prameny horka, kolébka
   s klubíčkem, páteř s obratli, křivka srdce, která se zklidní.
   Ke kresbě přibyla barva: každá stopa má vlastní tón (tlumený
   → téma → prosvětlené téma), sílu, výplň a záři. Všechny tyhle
   vlastnosti se morfují spolu s body, takže se nemění jen tvar,
   ale i teplota obrázku.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-help-index]");
  if (!root) return;

  var rows = KJ.$$("[data-help-row]", root);
  if (!rows.length) return;

  var canvas = root.querySelector("[data-help-sig]");
  var ctx = canvas ? canvas.getContext("2d") : null;

  var current = null;
  var demoTimer = null;
  var placeTimer = null;
  var userTook = false;

  /* ---------- barvy -----------------------------------------
     --theme je odkaz na jinou proměnnou, přímo se přečíst nedá.
     Sonda se skutečnou barvou je stejný trik jako v lince dechu
     — jeden zdroj pravdy zůstává v CSS.                        */
  var cs = getComputedStyle(document.documentElement);
  var C_INK4 = cs.getPropertyValue("--ink-4").trim() || "#97A099";

  function hexRGB(hex) {
    hex = hex.replace("#", "");
    return [ parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16) ];
  }
  function rgba(c, a) {
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")";
  }
  function mix(a, b, t) {
    return [ a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t ];
  }

  var restRGB = hexRGB(C_INK4);
  var themeRGB = restRGB.slice();
  var col = restRGB.slice();
  var probe = null;

  function readTheme() {
    if (!probe) return restRGB.slice();
    var c = getComputedStyle(probe).color;
    var m = c.match(/(\d+(?:\.\d+)?)/g);
    return m ? [ +m[0], +m[1], +m[2] ] : restRGB.slice();
  }

  if (ctx) {
    probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;color:var(--theme)";
    document.body.appendChild(probe);
    themeRGB = readTheme();
    window.addEventListener("kj:theme", function () { themeRGB = readTheme(); });
  }

  /* Tři tóny jedné barvy. Tón 0 je tlumený (kresba, která jen
     drží tvar), 1 je plné téma, nad 1 se prosvětluje — tam, kde
     má obrázek svítit. Mezi tóny se přechází plynule, takže se
     dá morfovat i barevnost, ne jen geometrie.                 */
  var WHITE = [255, 255, 255];
  function tone(t) {
    if (t <= 1) return mix(mix(col, restRGB, 0.62), col, KJ.clamp(t, 0, 1));
    return mix(col, WHITE, KJ.clamp(t - 1, 0, 1) * 0.55);
  }

  /* ---------- model kresby ----------------------------------
     Podpis je předpis, který do sedmi stop zapíše body v
     normovaném prostoru 0–1 (y je referenční osa, x se
     dopočítává poměrem plátna). Počet bodů na stopě je pevný,
     takže se dvě libovolné kresby dají interpolovat bod po bodu
     — proto morf, ne prolínačka.

     Stopa 5 se kreslí po dvojicích jako krátké čárky (výběžky
     obratlů, rysky, mlha), stopa 6 jako korálky.

     Vlastnosti stopy:
       a — krytí       w — síla čáry     t — tón barvy
       f — výplň       g — záře                                 */
  var NP = 176;                       /* bodů na spojitou stopu */
  var ND = 18;                        /* značky — devět dvojic   */
  var LEN = [NP, NP, NP, NP, NP, ND, ND];
  var I_DASH = 5;
  var I_BEAD = 6;

  function mkFig() {
    var f = [], k, i, s;
    for (k = 0; k < LEN.length; k++) {
      s = { x: [], y: [], a: 0, w: 1.2, t: 1, f: 0, g: 0 };
      for (i = 0; i < LEN[k]; i++) { s.x.push(0.5); s.y.push(0.5); }
      f.push(s);
    }
    return f;
  }
  var figFrom = mkFig();              /* zmrazený výchozí tvar  */
  var figTo = mkFig();                /* cíl, ten dál žije       */
  var figNow = mkFig();               /* co se kreslí            */

  function smooth(u, a, b) {
    var v = KJ.clamp((u - a) / (b - a), 0, 1);
    return v * v * (3 - 2 * v);
  }
  function gauss(x, m, w) { var d = (x - m) / w; return Math.exp(-d * d); }

  /* Vlastnosti stopy na jeden zápis. */
  function props(s, a, w, t, f, g) {
    s.a = a;
    s.w = w == null ? 1.2 : w;
    s.t = t == null ? 1 : t;
    s.f = f || 0;
    s.g = g || 0;
  }

  /* ---------- stavební kameny ------------------------------- */

  /* vodorovná osa — a zároveň klidový tvar skrytých stop */
  function flat(s, y, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) { s.x[i] = i / (n - 1); s.y[i] = y; }
    props(s, a, w || 1, t == null ? 0.35 : t, 0, 0);
  }
  /* klidový tvar značkových stop: všechno v jednom bodě, aby se
     nic nevynořovalo z rohu plátna                              */
  function marksOff(s, cx, cy) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) { s.x[i] = cx; s.y[i] = cy; }
    props(s, 0, 1, 1, 0, 0);
  }

  function ring(s, cx, cy, r, ar, a, w, t, f, g) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var q = (i / (n - 1)) * Math.PI * 2;
      s.x[i] = cx + Math.cos(q) * r * ar;
      s.y[i] = cy + Math.sin(q) * r;
    }
    props(s, a, w, t, f, g);
  }
  function arcOpen(s, cx, cy, r, ar, q0, q1, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var q = q0 + (q1 - q0) * (i / (n - 1));
      s.x[i] = cx + Math.cos(q) * r * ar;
      s.y[i] = cy + Math.sin(q) * r;
    }
    props(s, a, w, t, 0, 0);
  }

  /* Catmull–Rom: z hrstky kotev udělá hladkou křivku. Díky tomu
     se dá profil hlavy nebo kolébka zapsat deseti body a stejně
     se navzorkuje na stejný počet bodů jako vlna.              */
  function cr(p0, p1, p2, p3, t, j) {
    var a = p0[j], b = p1[j], c = p2[j], d = p3[j];
    return 0.5 * ((2 * b) + (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t);
  }
  function shape(s, pts, cx, cy, sc, ar, closed, a, w, t, f, g) {
    var n = s.x.length, m = pts.length;
    var segs = closed ? m : m - 1;
    for (var i = 0; i < n; i++) {
      var u = (i / (n - 1)) * segs;
      var k = Math.floor(u), fr = u - k;
      if (k >= segs) { k = segs - 1; fr = 1; }
      var p0, p1, p2, p3;
      if (closed) {
        p0 = pts[(k - 1 + m) % m]; p1 = pts[k % m];
        p2 = pts[(k + 1) % m];     p3 = pts[(k + 2) % m];
      } else {
        p0 = pts[Math.max(k - 1, 0)];     p1 = pts[k];
        p2 = pts[Math.min(k + 1, m - 1)]; p3 = pts[Math.min(k + 2, m - 1)];
      }
      s.x[i] = cx + cr(p0, p1, p2, p3, fr, 0) * sc * ar;
      s.y[i] = cy + cr(p0, p1, p2, p3, fr, 1) * sc;
    }
    props(s, a, w, t, f, g);
  }

  /* otočení hotové stopy kolem bodu — kolébka se houpe celá */
  function rot(s, cx, cy, ang, ar) {
    var co = Math.cos(ang), si = Math.sin(ang), n = s.x.length;
    for (var i = 0; i < n; i++) {
      var dx = (s.x[i] - cx) / ar, dy = s.y[i] - cy;
      s.x[i] = cx + (dx * co - dy * si) * ar;
      s.y[i] = cy + (dx * si + dy * co);
    }
  }

  /* vlna s obálkou: env(u) tlumí amplitudu podél šířky */
  function wv(s, mid, amp, cycles, phase, jit, a, env, w, t, f, g) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      var e = env ? env(u) : 1;
      var y = Math.sin((u * cycles + phase) * Math.PI * 2) * amp;
      if (jit) y += Math.sin(u * 61.3 + phase * 9) * jit + Math.sin(u * 27.1 - phase * 5) * jit * 0.6;
      s.x[i] = u;
      s.y[i] = mid - y * e;
    }
    props(s, a, w, t, f, g);
  }

  /* stoupající pramen horka */
  function plume(s, x0, yBot, yTop, amp, ph, ar, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      s.y[i] = yBot + (yTop - yBot) * u;
      s.x[i] = x0 + Math.sin(u * 5.0 + ph) * amp * ar * (0.18 + u * 1.15);
    }
    props(s, a, w, t, 0, 0);
  }

  /* klubíčko — spirála, se kterou se dá kolébat */
  function spiral(s, cx, cy, r0, r1, turns, ph, ar, a, w, t, g) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      var q = ph + u * turns * Math.PI * 2;
      var r = r0 + (r1 - r0) * u;
      s.x[i] = cx + Math.cos(q) * r * ar;
      s.y[i] = cy + Math.sin(q) * r;
    }
    props(s, a, w, t, 0, g);
  }

  /* srpek měsíce — dva oblouky, mezi nimi noc */
  function crescent(s, cx, cy, r, bite, ar, a, w, t, f, g) {
    var n = s.x.length, half = n >> 1;
    for (var i = 0; i < n; i++) {
      var q, rr, ox;
      if (i < half) {
        q = -Math.PI / 2 + (i / (half - 1)) * Math.PI;
        rr = r; ox = 0;
      } else {
        var u = (i - half) / (n - half - 1);
        q = Math.PI / 2 - u * Math.PI;
        rr = r * 0.96; ox = bite * r;
      }
      s.x[i] = cx + ox * ar + Math.cos(q) * rr * ar;
      s.y[i] = cy + Math.sin(q) * rr;
    }
    props(s, a, w, t, f, g);
  }

  /* kolébka: mísa pánve, ve které se dá houpat */
  var BOWL = [ [-1.00, -0.62], [-0.86, -0.10], [-0.52, 0.34], [0, 0.50],
               [0.52, 0.34], [0.86, -0.10], [1.00, -0.62] ];

  /* g = 0 volná páteř, g = 1 slepená: úklon se srovná a výběžky
     se stáhnou k sobě                                           */
  function spineX(u, g) { return 0.50 + (0.085 - 0.035 * g) * Math.sin(u * Math.PI * 2.1 + 0.5); }
  function spineY(u) { return 0.08 + u * 0.84; }
  function spine(s, g, a, w, t, gl) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      s.x[i] = spineX(u, g);
      s.y[i] = spineY(u);
    }
    props(s, a, w, t, 0, gl || 0);
  }
  /* úsek páteře, který drží napětí — kreslí se přes ni silněji */
  function spineHot(s, g, u0, u1, a, w, t, gl) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = u0 + (u1 - u0) * (i / (n - 1));
      s.x[i] = spineX(u, g);
      s.y[i] = spineY(u);
    }
    props(s, a, w, t, 0, gl || 0);
  }
  /* příčné výběžky obratlů */
  function rungs(s, g, ar, a, w, t) {
    var pairs = s.x.length / 2;
    for (var j = 0; j < pairs; j++) {
      var u = j / (pairs - 1);
      var v = spineY(u);
      var half = (0.20 - 0.07 * g) * (0.42 + 0.58 * Math.sin(Math.PI * u)) * ar;
      var cx = spineX(u, g);
      s.x[2 * j] = cx - half; s.y[2 * j] = v;
      s.x[2 * j + 1] = cx + half; s.y[2 * j + 1] = v;
    }
    props(s, a, w, t, 0, 0);
  }
  /* těla obratlů jako korálky na ose */
  function vertebrae(s, g, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      s.x[i] = spineX(u, g);
      s.y[i] = spineY(u);
    }
    props(s, a, w, t, 1, 0);
  }

  /* EKG: hrotitá stopa se s rostoucím calm rozpouští v sinusoidu */
  function ekg(s, t, calm, a, w, tn, f, g) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      var p = (u * 2.2 - t * 0.42) % 1;
      if (p < 0) p += 1;
      var beat = -0.20 * gauss(p, 0.40, 0.026)
               +  1.00 * gauss(p, 0.47, 0.024)
               -  0.32 * gauss(p, 0.55, 0.030)
               +  0.22 * gauss(p, 0.74, 0.075);
      var soft = Math.sin((u * 1.9 - t * 0.30) * Math.PI * 2) * 0.52;
      s.x[i] = u;
      s.y[i] = 0.50 - (beat * (1 - calm) * 0.40 + soft * calm * 0.30);
    }
    props(s, a, w, tn, f, g);
  }

  function qmark(s, cx, cy, ar, a, w, t) {
    var n = s.x.length, r = 0.115, k = 1.25;
    var q1 = Math.PI * (1.05 - 1.45);
    var ex = cx + Math.cos(q1) * r * ar * k;
    var ey = cy - 0.06 - Math.sin(q1) * r;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      if (u < 0.66) {
        var uu = u / 0.66;
        var q = Math.PI * (1.05 - uu * 1.45);
        s.x[i] = cx + Math.cos(q) * r * ar * k;
        s.y[i] = cy - 0.06 - Math.sin(q) * r;
      } else {
        var v = (u - 0.66) / 0.34;
        s.x[i] = ex + (cx - ex) * v;
        s.y[i] = ey + ((cy + 0.16) - ey) * v;
      }
    }
    props(s, a, w, t, 0, 0);
  }

  /* korálky rozeseté po kružnici */
  function beadsRing(s, cx, cy, r, ar, ph, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var q = ph + (i / n) * Math.PI * 2;
      s.x[i] = cx + Math.cos(q) * r * ar;
      s.y[i] = cy + Math.sin(q) * r;
    }
    props(s, a, w, t, 0, 0);
  }
  /* korálky nesené vlnou — drobný proud po čáře */
  function beadsWave(s, mid, amp, cycles, phase, a, w, t) {
    var n = s.x.length;
    for (var i = 0; i < n; i++) {
      var u = 0.06 + (i / (n - 1)) * 0.88;
      s.x[i] = u;
      s.y[i] = mid - Math.sin((u * cycles + phase) * Math.PI * 2) * amp;
    }
    props(s, a, w, t, 0, 0);
  }
  /* svislé rysky, které se krátí — nádrž, která dochází */
  function ticks(s, y0, len, fall, a, w, t) {
    var pairs = s.x.length / 2;
    for (var j = 0; j < pairs; j++) {
      var u = j / (pairs - 1);
      var x = 0.07 + u * 0.86;
      var h = len * (1 - fall * u);
      s.x[2 * j] = x; s.y[2 * j] = y0;
      s.x[2 * j + 1] = x; s.y[2 * j + 1] = y0 - Math.max(h, 0.012);
    }
    props(s, a, w, t, 0, 0);
  }
  /* vodorovné cáry mlhy nad zemí */
  function fog(s, t, a, w, tn) {
    var pairs = s.x.length / 2;
    for (var j = 0; j < pairs; j++) {
      var u = j / (pairs - 1);
      var y = 0.68 + (j % 3) * 0.070;
      var drift = Math.sin(t * 0.30 + j * 1.7) * 0.055;
      var x0 = 0.08 + u * 0.70 + drift;
      var w2 = 0.06 + 0.05 * ((j * 7) % 3);
      s.x[2 * j] = x0; s.y[2 * j] = y;
      s.x[2 * j + 1] = x0 + w2; s.y[2 * j + 1] = y;
    }
    props(s, a, w, tn, 0, 0);
  }

  /* ---------- profil hlavy ----------------------------------
     Kotvy jdou po směru: temeno, čelo, obočí, kořen nosu, nos,
     rty, brada, čelist, týl a zpátky nahoru.                   */
  var HEAD = [
    [ 0.00, -1.00], [-0.36, -0.90], [-0.62, -0.60], [-0.70, -0.30],
    [-0.62, -0.20], [-0.80, -0.04], [-0.62,  0.02], [-0.66,  0.14],
    [-0.56,  0.24], [-0.60,  0.36], [-0.40,  0.50], [-0.10,  0.60],
    [ 0.24,  0.56], [ 0.52,  0.30], [ 0.68, -0.05], [ 0.62, -0.48],
    [ 0.36, -0.85]
  ];
  var HEAD_CX = 0.40, HEAD_CY = 0.50, HEAD_SC = 0.46;
  /* ohnisko tlaku — kousek za okem */
  var FOC_X = -0.36, FOC_Y = -0.14;

  /* ---------- sedm rukopisů ---------------------------------
     Čas každého podpisu běží od nuly od chvíle, kdy na řádek
     přijdete. Jinak by „úzkost, která se zklidní“ začínala
     uprostřed a nikdo by ten příběh neviděl.                   */
  var SIGS = {
    /* klid — nikdo si zatím nevybral */
    tide: function (f, t, ar) {
      wv(f[0], 0.50, 0.080, 1.8, t * 0.15, 0, 0.90, null, 1.5, 0.85, 0, 0.10);
      wv(f[1], 0.50, 0.050, 1.8, t * 0.15 + 0.30, 0, 0.34, null, 1.1, 0.45, 0, 0);
      wv(f[2], 0.50, 0.028, 1.8, t * 0.15 + 0.62, 0, 0.18, null, 1.0, 0.30, 0, 0);
      flat(f[3], 0.50, 0);
      flat(f[4], 0.50, 0);
      marksOff(f[I_DASH], 0.5, 0.5);
      beadsWave(f[I_BEAD], 0.50, 0.080, 1.8, t * 0.15, 0.30, 1.1, 1.15);
    },

    /* Hlava z profilu a tlak, který z jednoho bodu za okem
       vyzařuje ven — rychle a nepravidelně.                    */
    migrena: function (f, t, ar) {
      var fx = HEAD_CX + FOC_X * HEAD_SC * ar;
      var fy = HEAD_CY + FOC_Y * HEAD_SC;
      var p = Math.sin(t * 3.1) * 0.6 + Math.sin(t * 5.1 + 1.1) * 0.4;

      shape(f[0], HEAD, HEAD_CX, HEAD_CY, HEAD_SC, ar, true, 0.95, 1.5, 0.55, 0.10, 0);
      ring(f[1], fx, fy, 0.030 + p * 0.008, ar, 1.00, 2.0, 1.35, 0.85, 0.75);
      ring(f[2], fx, fy, 0.072 + Math.sin(t * 3.1 - 0.55) * 0.016, ar, 0.72, 1.4, 1.10, 0, 0.35);
      ring(f[3], fx, fy, 0.125 + Math.sin(t * 3.1 - 1.10) * 0.024, ar, 0.44, 1.2, 0.95, 0, 0);
      ring(f[4], fx, fy, 0.190 + Math.sin(t * 3.1 - 1.65) * 0.032, ar, 0.24, 1.0, 0.80, 0, 0);
      marksOff(f[I_DASH], fx, fy);
      beadsRing(f[I_BEAD], fx, fy, 0.255 + Math.sin(t * 3.1 - 2.1) * 0.03, ar, t * 0.22, 0.28, 1.0, 0.9);
    },

    /* Dech, který se cestou zkracuje: vlevo hluboký a klidný,
       vpravo rychlý a mělký. Pod ním rysky ubývající nádrže.   */
    stres: function (f, t, ar) {
      var env = function (u) { return 1 - 0.86 * smooth(u, 0.10, 0.94); };
      /* frekvence roste podél osy, proto se fáze integruje ručně */
      var n = f[0].x.length, i, u, ph = 0, prev = 0, y;
      for (i = 0; i < n; i++) {
        u = i / (n - 1);
        ph += (1.6 + u * 5.2) * (u - prev);
        prev = u;
        y = Math.sin((ph + t * 0.75) * Math.PI * 2) * 0.30 * env(u);
        f[0].x[i] = u; f[0].y[i] = 0.44 - y;
        f[1].x[i] = u; f[1].y[i] = 0.44 - y * 0.62;
      }
      props(f[0], 1.00, 1.7, 1.15, 0.55, 0.30);
      props(f[1], 0.30, 1.0, 0.70, 0, 0);
      flat(f[2], 0.44, 0.34, 1, 0.40);
      flat(f[3], 0.50, 0);
      flat(f[4], 0.50, 0);
      ticks(f[I_DASH], 0.88, 0.115, 0.86, 0.62, 1.4, 1.0);
      marksOff(f[I_BEAD], 0.5, 0.88);
    },

    /* Noc, ve které se nespí: srpek měsíce, prameny horka
       a nízká mlha nad zemí.                                   */
    menopauza: function (f, t, ar) {
      var b = 0.5 - 0.5 * Math.cos(t * 0.42);
      crescent(f[0], 0.74, 0.34, 0.185, 0.44 + b * 0.10, ar, 0.98, 1.5, 1.20, 0.55, 0.45);
      plume(f[1], 0.30, 0.86, 0.26, 0.115, t * 1.15,       ar, 0.92, 1.7, 1.05);
      plume(f[2], 0.44, 0.88, 0.34, 0.095, t * 1.15 + 2.1, ar, 0.60, 1.4, 0.85);
      plume(f[3], 0.17, 0.88, 0.38, 0.080, t * 1.15 + 4.2, ar, 0.40, 1.2, 0.70);
      flat(f[4], 0.94, 0.30, 1, 0.35);
      fog(f[I_DASH], t, 0.50, 1.3, 0.60);
      beadsRing(f[I_BEAD], 0.74, 0.34, 0.30, ar, -t * 0.16, 0.24, 0.9, 0.95);
    },

    /* Kolébka, ve které leží klubíčko. Houpe se celá — mísa
       pánve i to, co v ní odpočívá.                            */
    poporodu: function (f, t, ar) {
      var ang = Math.sin(t * 0.52) * 0.10;
      var px = 0.50, py = 0.30;
      shape(f[0], BOWL, 0.50, 0.56, 0.34, ar, false, 1.00, 1.8, 0.75, 0, 0.15);
      shape(f[1], BOWL, 0.50, 0.50, 0.34, ar, false, 0.34, 1.1, 0.45, 0, 0);
      spiral(f[2], 0.50, 0.50, 0.020, 0.105, 1.45, -1.2 + Math.sin(t * 0.52) * 0.12, ar, 0.95, 1.6, 1.20, 0.40);
      ring(f[3], 0.50 + 0.085 * ar, 0.435, 0.043, ar, 0.95, 1.5, 1.25, 0.55, 0.45);
      flat(f[4], 0.50, 0);
      rot(f[0], px, py, ang, ar);
      rot(f[1], px, py, ang, ar);
      rot(f[2], px, py, ang, ar);
      rot(f[3], px, py, ang, ar);
      marksOff(f[I_DASH], 0.5, 0.62);
      beadsRing(f[I_BEAD], 0.50, 0.50, 0.175, ar, t * 0.20, 0.18, 0.9, 0.8);
    },

    /* Páteř s obratli. Volná, pak se výběžky slepí k sobě a zase
       povolí; v kříži při tom naskočí teplé místo.              */
    zada: function (f, t, ar) {
      var g = 0.5 - 0.5 * Math.cos(t * 0.58);
      spine(f[0], g, 0.95, 1.6, 0.60, 0);
      spineHot(f[1], g, 0.58, 0.92, 0.35 + g * 0.60, 2.4, 1.25, 0.35 + g * 0.45);
      flat(f[2], 0.50, 0);
      flat(f[3], 0.50, 0);
      flat(f[4], 0.50, 0);
      rungs(f[I_DASH], g, ar, 0.70, 1.3, 0.90);
      vertebrae(f[I_BEAD], g, 0.90, 1.5, 1.10);
    },

    /* Nejdřív ostrá a hrotitá, po pár vteřinách měkká sinusoida.
       Obálka bdělosti se k ní shora i zdola přimyká — zklidnění
       se nevrací zpátky, to je celá pointa.                     */
    uzkost: function (f, t, ar) {
      var calm = 0.04 + 0.96 * smooth(t, 0.4, 6.2);
      var band = 0.30 - 0.215 * calm;
      ekg(f[0], t, calm, 1.00, 1.8, 1.15, 0.30 * calm, 0.55);
      flat(f[1], 0.50 - band, 0.20 + 0.22 * calm, 1, 0.55);
      flat(f[2], 0.50 + band, 0.20 + 0.22 * calm, 1, 0.55);
      flat(f[3], 0.50, 0.16, 1, 0.30);
      flat(f[4], 0.50, 0);
      marksOff(f[I_DASH], 0.5, 0.5);
      beadsWave(f[I_BEAD], 0.50, 0.30 * calm, 1.9, -t * 0.30, 0.32 * calm, 1.0, 1.10);
    },

    /* otevřená kružnice, otazník a pár bodů, které kolem krouží */
    dalsi: function (f, t, ar) {
      var br = 0.13 + 0.07 * Math.sin(t * 0.5);
      arcOpen(f[0], 0.5, 0.5, 0.38, ar, -Math.PI / 2 + br, Math.PI * 1.5 - br, 0.85, 1.3, 0.60);
      qmark(f[1], 0.5, 0.46, ar, 0.98, 1.8, 1.15);
      ring(f[2], 0.5, 0.74, 0.020, ar, 0.98, 1.6, 1.25, 0.9, 0.5);
      flat(f[3], 0.50, 0);
      flat(f[4], 0.50, 0);
      marksOff(f[I_DASH], 0.5, 0.5);
      beadsRing(f[I_BEAD], 0.5, 0.5, 0.46, ar, t * 0.24, 0.32, 1.0, 0.95);
    }
  };

  /* ---------- morf ------------------------------------------ */
  var sigKey = "tide";
  var morph = 1;
  var sigT = 0;              /* vlastní čas právě kresleného podpisu */
  var dirty = true;
  var lastW = 0, lastH = 0;

  function copyFig(A, B) {
    for (var k = 0; k < A.length; k++) {
      var a = A[k], b = B[k], n = a.x.length;
      for (var i = 0; i < n; i++) { b.x[i] = a.x[i]; b.y[i] = a.y[i]; }
      b.a = a.a; b.w = a.w; b.t = a.t; b.f = a.f; b.g = a.g;
    }
  }
  function blendFig(A, B, e, C) {
    for (var k = 0; k < C.length; k++) {
      var a = A[k], b = B[k], c = C[k], n = c.x.length;
      for (var i = 0; i < n; i++) {
        c.x[i] = a.x[i] + (b.x[i] - a.x[i]) * e;
        c.y[i] = a.y[i] + (b.y[i] - a.y[i]) * e;
      }
      c.a = a.a + (b.a - a.a) * e;
      c.w = a.w + (b.w - a.w) * e;
      c.t = a.t + (b.t - a.t) * e;
      c.f = a.f + (b.f - a.f) * e;
      c.g = a.g + (b.g - a.g) * e;
    }
  }
  /* cubic-bezier(.7,0,.2,1) v čísle: rozjezd i dojezd měkký */
  function easeInOut(m) {
    return m < 0.5 ? 4 * m * m * m : 1 - Math.pow(-2 * m + 2, 3) / 2;
  }

  function setSig(key) {
    if (!SIGS[key]) key = "tide";
    if (key === sigKey) return;
    /* výchozím tvarem morfu je přesně to, co je právě vidět —
       přepnutí uprostřed přechodu tak nikdy neuskočí          */
    copyFig(figNow, figFrom);
    sigKey = key;
    morph = 0;
    sigT = 0;
    dirty = true;
  }

  var last = performance.now();

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!ctx) return;

    var size = KJ.fitCanvas(canvas, ctx);
    var W = size.w, H = size.h;
    if (W < 8 || H < 8) return;                /* pod 820 px je canvas schovaný */
    if (W !== lastW || H !== lastH) { lastW = W; lastH = H; dirty = true; }

    var red = KJ.isReduced();
    var want = current ? themeRGB : restRGB;

    if (red) {
      /* Statický, ale plnohodnotný snímek: čas se zmrazí na
         hodnotě, kde má každá kresba co ukázat.               */
      if (!dirty) return;
      dirty = false;
      morph = 1;
      col = want.slice();
    } else {
      sigT += dt;
      morph = Math.min(1, morph + dt / 0.46);
      for (var c = 0; c < 3; c++) col[c] += (want[c] - col[c]) * 0.09;
    }

    var pad = Math.max(10, Math.min(22, H * 0.14));
    var dw = W - pad * 2, dh = H - pad * 2;
    /* Poměr, kterým se z normované osy y dopočítá x. Na širokém
       pruhu by kružnice zůstaly tečkami, proto má spodní mez.  */
    var ar = Math.max(dh / dw, 0.45);
    /* Reduced motion: čas zmrazený tam, kde má každá ze sedmi
       kreseb co ukázat — ne v nule, kde by byly ploché.        */
    var t = red ? 2.6 : sigT;

    SIGS[sigKey](figTo, t, ar);
    if (morph >= 1) copyFig(figTo, figNow);
    else blendFig(figFrom, figTo, easeInOut(morph), figNow);

    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (var k = 0; k < figNow.length; k++) {
      var s = figNow[k];
      if (s.a <= 0.012) continue;
      var c2 = tone(s.t);
      var i, j, px, py;

      if (k === I_BEAD) {
        /* korálky: drobná tělesa, ne čára */
        ctx.fillStyle = rgba(c2, s.a);
        if (s.g > 0.02) { ctx.shadowColor = rgba(c2, 0.55); ctx.shadowBlur = s.g * 12; }
        for (j = 0; j < s.x.length; j++) {
          ctx.beginPath();
          ctx.arc(pad + s.x[j] * dw, pad + s.y[j] * dh, Math.max(0.8, s.w * 1.15), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        continue;
      }

      ctx.beginPath();
      if (k === I_DASH) {
        for (j = 0; j < s.x.length; j += 2) {
          ctx.moveTo(pad + s.x[j] * dw, pad + s.y[j] * dh);
          ctx.lineTo(pad + s.x[j + 1] * dw, pad + s.y[j + 1] * dh);
        }
      } else {
        for (i = 0; i < s.x.length; i++) {
          px = pad + s.x[i] * dw; py = pad + s.y[i] * dh;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }

      if (s.f > 0.012 && k !== I_DASH) {
        ctx.fillStyle = rgba(c2, s.f * 0.20 * s.a);
        ctx.fill();
      }
      if (s.g > 0.02) { ctx.shadowColor = rgba(c2, 0.5); ctx.shadowBlur = s.g * 14; }
      ctx.strokeStyle = rgba(c2, s.a);
      ctx.lineWidth = s.w;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  /* ---------- ukazatel na kolejnici -------------------------
     Popis aktivního řádku se rozbaluje, takže se jeho střed
     ještě 320 ms po aktivaci posouvá. Změříme dvakrát: hned
     (aby se rozjel) a po dojezdu (aby seděl).                 */
  function place(row) {
    if (!row) return;
    var y = row.offsetTop + row.offsetHeight / 2;
    /* Podpis nesmí vyjet nad rejstřík ani pod něj — u krajních
       řádků se proto zarazí o hranu.                          */
    if (canvas) {
      var half = canvas.offsetHeight / 2;
      if (half > 0) y = KJ.clamp(y, half, root.offsetHeight - half);
    }
    root.style.setProperty("--hi-y", Math.round(y) + "px");
  }

  function activate(row, fromUser) {
    if (fromUser) takeOver();
    if (current === row) return;
    if (current) current.classList.remove("is-active");
    current = row;
    if (row) {
      row.classList.add("is-active");
      root.classList.add("is-on");
      /* Ztlumení ostatních řádků je odpověď na skutečný záměr
         uživatele (najetí, fokus, tap). Během tiché ukázky se
         netlumí: šest ze sedmi řádků na 35 % je pod hranicí
         čitelnosti a nikdo si o to neřekl.                       */
      if (userTook) root.dataset.active = "";
      if (KJ.setTheme) KJ.setTheme(row.dataset.helpRow || "tide");
      setSig(row.dataset.helpRow);
      place(row);
    } else {
      root.classList.remove("is-on");
      root.removeAttribute("data-active");
      if (KJ.setTheme) KJ.setTheme("tide");
      setSig("tide");
    }
    if (placeTimer) clearTimeout(placeTimer);
    placeTimer = setTimeout(function () { place(current); }, 380);
  }

  function takeOver() {
    if (userTook) return;
    userTook = true;
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
  }

  /* ---------- myš ------------------------------------------- */
  if (!KJ.prefersCoarse()) {
    rows.forEach(function (row) {
      row.addEventListener("pointerenter", function () { activate(row, true); });
      row.addEventListener("focus", function () { activate(row, true); });
    });
    root.addEventListener("pointerleave", function () { activate(null, true); });
  }
  /* Odchod fokusem ven: bez tohohle by rejstřík zůstal svítit
     i potom, co je kurzor dávno jinde.                        */
  root.addEventListener("focusout", function (e) {
    if (root.contains(e.relatedTarget)) return;
    if (root.matches(":hover")) return;
    activate(null, true);
  });

  /* ---------- dotyk: roli hoveru přebírá střed obrazovky ---- */
  if (KJ.prefersCoarse() && KJ.watch) {
    /* Řádky jsou [data-reveal] — přes IntersectionObserver by je
       maska clip-path schovala a na dotyku by se nikdy nerozsvítily. */
    rows.forEach(function (r) {
      KJ.watch(r, "-45% 0px -45% 0px", function () { activate(r, true); }, null, false);
    });
  }

  /* ---------- klávesnice ------------------------------------ */
  rows.forEach(function (row, i) {
    row.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowDown") next = rows[Math.min(i + 1, rows.length - 1)];
      else if (e.key === "ArrowUp") next = rows[Math.max(i - 1, 0)];
      if (next) { e.preventDefault(); next.focus(); }
    });
  });

  /* ---------- tichá demo smyčka -----------------------------
     Modul se sám předvede, aby bylo vidět, že je živý.
     Jakmile do něj někdo sáhne, řízení přebírá on.            */
  function startDemo() {
    if (userTook || KJ.isReduced() || KJ.prefersCoarse() || demoTimer) return;
    var i = 0;
    /* Jedno kolo stačí, aby bylo vidět, že je modul živý.
       Nekonečná smyčka by z rejstříku udělala poutač.            */
    demoTimer = setInterval(function () {
      if (userTook) { clearInterval(demoTimer); demoTimer = null; return; }
      if (i >= rows.length) {
        clearInterval(demoTimer); demoTimer = null;
        activate(null, false);
        return;
      }
      activate(rows[i], false);
      i++;
    }, 2400);
  }

  var stop = null;
  KJ.visibilityGate(root, function () {
    if (ctx && !stop) { last = performance.now(); stop = KJ.addTicker(frame); }
    setTimeout(startDemo, 900);
  }, function () {
    if (stop) { stop(); stop = null; }
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    if (!userTook && current) activate(null, false);
  });

  /* Výchozí poloha podpisu: u prvního řádku, tečka ještě zhasnutá. */
  place(rows[0]);
  window.addEventListener("resize", KJ.debounce(function () { place(current || rows[0]); }, 160), { passive: true });
  if (ctx) requestAnimationFrame(function (x) { last = x; frame(x); });
})();
