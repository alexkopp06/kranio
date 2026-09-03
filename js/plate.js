/* ============================================================
   plate.js — ANATOMICKÝ LIST
   Sdílené vykreslovací jádro pro dvě scénické sekce webu:
   „Ruce mají svá místa“ (stops) a „Čeho se nebát“ (calm).

   ------------------------------------------------------------
   PROČ TENHLE SOUBOR EXISTUJE

   Obě sekce mají ukazovat jinou věc, ale mají vypadat, jako by
   je kreslila jedna ruka jedním perem na jeden papír. Kdyby si
   každá držela vlastní kreslení, rozejdou se po první úpravě —
   jiná tloušťka tahu, jiný odstín, jiná typografie popisku.
   Proto je tvarosloví tady a scény si berou jen slovník.

   ------------------------------------------------------------
   SLOVNÍK („kabát“, který obě sekce sdílejí)

   1  PAPÍR      teplý list s vinětou, rohovými soutiskovými
                 značkami a vlasovou měřicí osnovou. Kreslí se
                 jednou do offscreen plátna, ne každý snímek.
   2  TAH        obrys s proměnnou tloušťkou. Ne `lineWidth`,
                 ale vyplněná stuha — jen tak jde tah na koncích
                 ztenčit a kresba přestane být klipart.
   3  ŠRAFA      rytina. Rovnoběžky pod 32°, druhá vrstva pod
                 −58° tam, kde má být hloubka. Tohle je jediná
                 věc, která z plochého obrysu udělá objem.
   4  TEČKOVÁNÍ  chrupavka, vazivo, měkká tkáň.
   5  POPISKA    vlasová odkazová linka + tečka v anatomickém
                 bodě + mono verzálky s prostrkáním. Nikdy ne
                 popisek volně ve vzduchu.
   6  LUPA       vsazený panel s vlastním výřezem a odkazovou
                 linkou do místa na těle.
   7  MĚŘIDLO    posuvka s kótou. Čísla jsou mono, malá, u kraje.
   8  DOKRESLENÍ rodina KRESBA — tah se vypisuje od začátku ke
                 konci, se zpožděním po vrstvách.

   ------------------------------------------------------------
   PRAVIDLA, KTERÁ SE NESMÍ PORUŠIT

   · Sytá barva jen tam, kde je děj. Kostra je porcelán, ne zeleň.
   · Popisek nikdy nesmí ležet na kresbě.
   · Žádný tvar bez obrysu. Plocha bez tahu je AI slop.
   · Vše, co dýchá, dýchá v tempu primární respirace ≈ 9/min.
   ============================================================ */
(function (root) {
  "use strict";

  var TAU = Math.PI * 2;

  /* ---------- barvy z tokenů --------------------------------
     Čte se jednou. Kdyby tokeny nebyly (jiná stránka, styl se
     nenačetl), platí záložní hodnoty z DESIGN.md.             */
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    function hx(v, fb) {
      var h = (cs.getPropertyValue(v).trim() || fb).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    return {
      TIDE: hx("--tide", "#0E6B54"),
      DEEP: hx("--tide-deep", "#0A5442"),
      WARM: hx("--tide-warm", "#1E7A5B"),
      SOFT: hx("--tide-soft", "#CFE6DA"),
      INK:  hx("--ink", "#070D0B"),
      INK2: hx("--ink-2", "#101815"),
      INK3: hx("--ink-3", "#1B2521"),
      /* POZOR: INK4 je KRESBA, ne písmo. Kontrast 2,78:1 na
         porcelánu stačí tečce nebo lince, ne slovu. Popisky
         na plátnech proto berou META — týž drobný odstín, jaký
         má web v CSS pro číslovky a štítky (14,3:1).
         Zálohy výš byly ještě předrefaktorové (#3C4944, #5F6A64)
         a při prvním snímku, než doběhne CSS, kreslily plátna
         v odstínech, které už web nikde nepoužívá.          */
      INK4: hx("--ink-4", "#8B958D"),
      META: hx("--ink-meta", "#202A26"),
      LINE: hx("--line-strong", "#C6CBBF"),
      HAIR: hx("--line", "#DCDFD7"),
      SAND: hx("--sand", "#EDE7DC"),
      PAPER: [255, 255, 255],
      MONO: cs.getPropertyValue("--font-mono").trim() || "monospace",
      SANS: cs.getPropertyValue("--font-sans").trim() || "sans-serif"
    };
  }

  var P = null;
  function palette() { if (!P) P = readPalette(); return P; }

  /* ---------- drobná matematika ------------------------------ */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function rgba(c, a) {
    return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a < 0 ? 0 : a > 1 ? 1 : a) + ")";
  }
  /* Nejpoužívanější náběh webu — rodina ODKRYTÍ. */
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeIO(t)  { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* Dech tkáně: 0 → 1 → 0. Devět cyklů za minutu. */
  function breathe(t, rate) { return (1 - Math.cos(t / (60 / (rate || 9)) * TAU)) / 2; }

  /* Catmull-Rom → pole hustých bodů. Scény pracují se seznamy
     bodů, ne s bezierovými kontrolami: proporci pak jde měnit
     jedním číslem a křivka se dopočítá.                       */
  function resample(pts, steps) {
    steps = steps || 12;
    if (pts.length < 2) return pts.slice();
    var p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    var out = [];
    for (var i = 1; i < p.length - 2; i++) {
      var a = p[i - 1], b = p[i], c = p[i + 1], d = p[i + 2];
      for (var j = 0; j < steps; j++) {
        var t = j / steps, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * b[0]) + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
          0.5 * ((2 * b[1]) + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)
        ]);
      }
    }
    out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
    return out;
  }

  /* ============================================================
     PLATE — vše ostatní visí na kontextu jednoho plátna
     ============================================================ */
  function Plate(ctx) {
    this.ctx = ctx;
    this.c = palette();
    this.W = 0; this.H = 0;
    this._paper = null;      /* offscreen s papírem     */
    this._pw = 0; this._ph = 0;
    this.S = 1;              /* měřítko odvozené z výšky scény */
  }

  Plate.prototype.size = function (W, H) {
    this.W = W; this.H = H;
    /* Všechny tloušťky tahů se odvozují od výšky scény, aby
       kresba na mobilu nebyla drátěná a na 4K nebyla tučná. */
    this.S = clamp(H / 420, 0.62, 1.5);
    return this;
  };

  /* ---------- 1 · PAPÍR --------------------------------------
     Kreslí se do offscreen plátna a jen se překlápí. Osnova má
     40 vlasových linek; přepočítávat je 60× za vteřinu by byl
     zbytečně drahý luxus za něco, co se nehýbe.               */
  Plate.prototype.paper = function (dpr) {
    var W = this.W, H = this.H, c = this.c;
    var pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (!this._paper || this._pw !== pw || this._ph !== ph) {
      var off = document.createElement("canvas");
      off.width = pw; off.height = ph;
      var o = off.getContext("2d");
      o.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* list */
      o.fillStyle = rgba(c.PAPER, 1);
      o.fillRect(0, 0, W, H);

      /* měřicí osnova — čtvercová, jemná, jen v tělu listu */
      var step = Math.max(26, H / 11);
      o.strokeStyle = rgba(c.HAIR, 0.55);
      o.lineWidth = 1;
      o.beginPath();
      for (var x = step; x < W; x += step) { o.moveTo(Math.round(x) + .5, 0); o.lineTo(Math.round(x) + .5, H); }
      for (var y = step; y < H; y += step) { o.moveTo(0, Math.round(y) + .5); o.lineTo(W, Math.round(y) + .5); }
      o.stroke();

      /* viněta — papír není zářivka */
      var g = o.createRadialGradient(W * 0.5, H * 0.46, Math.min(W, H) * 0.18, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      g.addColorStop(0, rgba(c.PAPER, 0));
      g.addColorStop(1, rgba(c.LINE, 0.16));
      o.fillStyle = g;
      o.fillRect(0, 0, W, H);

      /* soutiskové značky v rozích — z tiskové desky */
      var m = Math.max(10, H * 0.030), pad = Math.max(9, H * 0.026);
      o.strokeStyle = rgba(c.INK4, 0.5);
      o.lineWidth = 1;
      o.beginPath();
      [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]]
        .forEach(function (q) {
          o.moveTo(q[0], q[1]); o.lineTo(q[0] + q[2] * m, q[1]);
          o.moveTo(q[0], q[1]); o.lineTo(q[0], q[1] + q[3] * m);
        });
      o.stroke();

      this._paper = off; this._pw = pw; this._ph = ph;
    }
    this.ctx.drawImage(this._paper, 0, 0, W, H);
    return this;
  };

  /* ---------- cesty ------------------------------------------ */
  Plate.prototype.path = function (pts, close) {
    var ctx = this.ctx, p = resample(pts, 14);
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    if (close) ctx.closePath();
    return this;
  };

  /* ---------- 2 · TAH s proměnnou tloušťkou ------------------
     Stuha kolem osy. `w` může být číslo nebo funkce(u) → px,
     takže tah umí na koncích vyběhnout do špičky. Tohle je
     rozdíl mezi kresbou a obrysem z vektorového programu.     */
  Plate.prototype.stroke = function (pts, w, col, alpha, opt) {
    var ctx = this.ctx, S = this.S;
    opt = opt || {};
    var p = resample(pts, opt.dense || 10);
    var draw = opt.draw == null ? 1 : clamp(opt.draw, 0, 1);
    if (draw <= 0.001) return this;
    var n = Math.max(2, Math.round(p.length * draw));
    p = p.slice(0, n);
    if (p.length < 2) return this;

    var fn = (typeof w === "function") ? w : function () { return w; };
    var L = [], R = [];
    for (var i = 0; i < p.length; i++) {
      var a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var hw = Math.max(0.18, fn(i / (p.length - 1)) * S * 0.5);
      L.push([p[i][0] + nx * hw, p[i][1] + ny * hw]);
      R.push([p[i][0] - nx * hw, p[i][1] - ny * hw]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(col, alpha == null ? 1 : alpha);
    ctx.fill();
    return this;
  };

  /* Rychlá vlasová linka — tam, kde stuha není potřeba. */
  Plate.prototype.hair = function (pts, w, col, alpha, dash) {
    var ctx = this.ctx;
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    this.path(pts, false);
    ctx.lineWidth = w * this.S;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(col, alpha == null ? 1 : alpha);
    ctx.stroke();
    ctx.restore();
    return this;
  };

  Plate.prototype.fillPath = function (pts, col, alpha) {
    var ctx = this.ctx;
    this.path(pts, true);
    ctx.fillStyle = rgba(col, alpha == null ? 1 : alpha);
    ctx.fill();
    return this;
  };

  /* ---------- 3 · ŠRAFA (rytina) -----------------------------
     Rovnoběžky ořezané tvarem. `light` je směr, odkud jde
     světlo (0–1 podél osy x tvaru): na osvětlené straně jsou
     linky řidší, ve stínu se přidá druhá vrstva křížem.

     Tohle je jediné místo, kde vzniká objem. Bez šrafy je
     kresba plochá a vypadá jako ikonka.                       */
  Plate.prototype.hatch = function (pts, opt) {
    var ctx = this.ctx;
    opt = opt || {};
    var col = opt.col || this.c.INK3;
    var a = opt.alpha == null ? 0.30 : opt.alpha;
    var ang = (opt.angle == null ? 32 : opt.angle) * Math.PI / 180;
    var gap = (opt.gap || 6) * this.S;
    var cross = opt.cross || 0;          /* 0–1 síla druhé vrstvy */
    var lw = (opt.w || 0.9) * this.S;

    /* obálka tvaru */
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var R = Math.hypot(maxX - minX, maxY - minY) / 2 + gap;

    ctx.save();
    this.path(pts, true);
    ctx.clip();

    function pass(angle, alpha, spacing) {
      var ca = Math.cos(angle), sa = Math.sin(angle);
      ctx.beginPath();
      for (var d = -R; d <= R; d += spacing) {
        var px = cx + ca * d, py = cy + sa * d;
        ctx.moveTo(px - sa * R, py + ca * R);
        ctx.lineTo(px + sa * R, py - ca * R);
      }
      ctx.lineWidth = lw;
      ctx.strokeStyle = rgba(col, alpha);
      ctx.stroke();
    }
    pass(ang, a, gap);
    if (cross > 0.01) pass(ang - Math.PI / 2 * 1.28, a * cross, gap * 1.55);

    /* Gradientní zeslabení k osvětlené straně — přesně tenhle
       přechod dělá dojem, že objekt má kulatý povrch.        */
    if (opt.light !== false) {
      var lx = opt.lightX == null ? 0.30 : opt.lightX;
      var ly = opt.lightY == null ? 0.16 : opt.lightY;
      var g = ctx.createRadialGradient(
        lerp(minX, maxX, lx), lerp(minY, maxY, ly), 0,
        lerp(minX, maxX, lx), lerp(minY, maxY, ly), Math.max(maxX - minX, maxY - minY) * 0.82);
      g.addColorStop(0, rgba(this.c.PAPER, 0.92));
      g.addColorStop(0.55, rgba(this.c.PAPER, 0.30));
      g.addColorStop(1, rgba(this.c.PAPER, 0));
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = g;
      ctx.fillRect(minX - gap, minY - gap, maxX - minX + gap * 2, maxY - minY + gap * 2);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
    return this;
  };

  /* ---------- 4 · TEČKOVÁNÍ ----------------------------------
     Chrupavka, vazivo, tuk. Rozmístění je deterministické
     (vlastní generátor), aby kresba mezi snímky neblikala.    */
  Plate.prototype.stipple = function (pts, opt) {
    var ctx = this.ctx;
    opt = opt || {};
    var col = opt.col || this.c.INK3;
    var a = opt.alpha == null ? 0.34 : opt.alpha;
    var n = opt.n || 90;
    var r = (opt.r || 0.85) * this.S;
    var seed = opt.seed || 7;

    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    ctx.save();
    this.path(pts, true);
    ctx.clip();
    ctx.fillStyle = rgba(col, a);
    var s = seed;
    for (i = 0; i < n; i++) {
      s = (s * 16807) % 2147483647;
      var u = (s / 2147483647);
      s = (s * 16807) % 2147483647;
      var v = (s / 2147483647);
      ctx.beginPath();
      ctx.arc(lerp(minX, maxX, u), lerp(minY, maxY, v), r * (0.6 + 0.8 * u), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return this;
  };

  /* ---------- složené hmoty ---------------------------------- */

  /* KOST — porcelán se šrafou, tónem a obrysem. Čtyři vrstvy
     v pořadí, ve kterém je kreslí ruka: plocha, rytina, tón,
     obrys. Tón (`form`) je to, co přidalo objem: samotná šrafa
     dělá jen texturu, kulatost dělá až přechod světla.       */
  Plate.prototype.bone = function (pts, opt) {
    opt = opt || {};
    var c = this.c;
    var tint = opt.glow ? mix(c.PAPER, c.SOFT, clamp(opt.glow, 0, 1) * 0.55) : c.PAPER;
    this.fillPath(pts, tint, opt.fill == null ? 0.96 : opt.fill);
    this.hatch(pts, {
      col: opt.hatch || c.INK3,
      alpha: (opt.shade == null ? 0.26 : opt.shade),
      gap: opt.gap || 5.2,
      angle: opt.angle == null ? 34 : opt.angle,
      cross: opt.cross == null ? 0.5 : opt.cross,
      lightX: opt.lightX, lightY: opt.lightY
    });
    this.form(pts, { col: mix(c.INK3, c.INK, 0.34),
      ang: opt.formAng == null ? 1.12 : opt.formAng,
      a: opt.form == null ? 0.15 : opt.form });
    var edge = opt.glow ? mix(c.INK3, c.TIDE, clamp(opt.glow, 0, 1)) : c.INK3;
    this.stroke(pts.concat([pts[0]]), opt.w || 1.45,
      edge, opt.edgeA == null ? 0.8 : opt.edgeA, { draw: opt.draw });
    return this;
  };

  /* MĚKKÁ TKÁŇ — plocha bez šrafy, jen tečkování a měkký obrys */
  Plate.prototype.tissue = function (pts, opt) {
    opt = opt || {};
    var c = this.c;
    this.fillPath(pts, opt.col || c.INK4, opt.fill == null ? 0.085 : opt.fill);
    if (opt.form !== false) {
      this.form(pts, { col: c.INK3, ang: opt.formAng == null ? 1.18 : opt.formAng,
        a: opt.formA == null ? 0.10 : opt.formA });
    }
    if (opt.stipple !== false) {
      this.stipple(pts, { col: c.INK4, alpha: 0.22, n: opt.n || 60, r: 0.8, seed: opt.seed || 11 });
    }
    this.stroke(pts.concat(opt.close ? [pts[0]] : []), opt.w || 1.2,
      opt.edge || c.INK3, opt.edgeA == null ? 0.55 : opt.edgeA, { draw: opt.draw });
    return this;
  };

  /* MEMBRÁNA / TEKUTINA — jediné místo, kde smí být sytá barva */
  Plate.prototype.membrane = function (pts, opt) {
    opt = opt || {};
    var c = this.c;
    this.fillPath(pts, c.SOFT, opt.fill == null ? 0.42 : opt.fill);
    this.stroke(pts.concat(opt.close ? [pts[0]] : []), opt.w || 1.3,
      c.TIDE, opt.edgeA == null ? 0.72 : opt.edgeA, { draw: opt.draw });
    return this;
  };

  /* ---------- 4b · TVAROVÁNÍ OBJEMU ---------------------------
     Šrafa udělá z obrysu rytinu, ale objem dělá až tón. Tyhle
     tři pomůcky jsou jediný důvod, proč kost, kůže i ruka
     přestanou být placka.
     ------------------------------------------------------------ */

  /* Cesta bez převzorkování — pro tvary, které si body počítají
     samy (ruka má vlastní obrys o dvou stech bodech; hnát ho
     ještě přes Catmull-Rom je zbytečné a rozmazalo by špičky). */
  Plate.prototype.rawPath = function (pts, close) {
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
    return this;
  };

  /* FORMA — směrový přechod oříznutý tvarem. Tohle je stín na
     odvrácené straně objemu: světlo přichází zleva shora, takže
     pravý dolní okraj tvaru ztmavne. Bez tohohle vypadá každý
     obrys jako vystřižený z papíru.                            */
  Plate.prototype.form = function (pts, opt) {
    opt = opt || {};
    var ctx = this.ctx;
    var col = opt.col || this.c.INK3;
    var ang = opt.ang == null ? 0.92 : opt.ang;      /* směr stínu */
    var a1 = opt.a == null ? 0.16 : opt.a;

    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var R = Math.hypot(maxX - minX, maxY - minY) * 0.5 || 1;
    var dx = Math.cos(ang), dy = Math.sin(ang);

    ctx.save();
    (opt.raw ? this.rawPath(pts, true) : this.path(pts, true));
    ctx.clip();
    var g = ctx.createLinearGradient(cx - dx * R, cy - dy * R, cx + dx * R, cy + dy * R);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.46, rgba(col, a1 * 0.18));
    g.addColorStop(1, rgba(col, a1));
    ctx.fillStyle = g;
    ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
    ctx.restore();
    return this;
  };

  /* LESK — měkké světlo na vypouklině. Jeden odlesk, ne tři:
     porcelán a kůže mají jeden zdroj světla.                   */
  Plate.prototype.sheen = function (pts, x, y, r, opt) {
    opt = opt || {};
    var ctx = this.ctx;
    ctx.save();
    (opt.raw ? this.rawPath(pts, true) : this.path(pts, true));
    ctx.clip();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(opt.col || this.c.PAPER, opt.a == null ? 0.55 : opt.a));
    g.addColorStop(1, rgba(opt.col || this.c.PAPER, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
    return this;
  };

  /* DOSEDNUTÍ — měkký stín tam, kde se dvě hmoty dotýkají.
     Bez něj se ruka na těle vznáší.                            */
  Plate.prototype.contact = function (x, y, rx, ry, a, col) {
    var ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(col || this.c.INK3, a));
    g.addColorStop(0.55, rgba(col || this.c.INK3, a * 0.42));
    g.addColorStop(1, rgba(col || this.c.INK3, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
    return this;
  };

  /* ---------- RUKA TERAPEUTKY ---------------------------------
     Jedna ruka pro celý web. Kdyby si ji každá sekce kreslila
     sama, po první úpravě by se rozešly a v každé scéně by
     ležela jiná ruka.

     ------------------------------------------------------------
     PROČ JE TO POSTAVENÉ TAKHLE

     Předchozí ruka byla složená z tobolek: čtyři protáhlé
     ovály jako prsty, ovál jako dlaň, ovál jako palec. Ve
     zmenšení z toho byl zelený list se stopkou. Problém nebyl
     v detailu, ale v tom, že tobolky nemají SPOLEČNÝ OBRYS —
     a právě spojitá silueta je to, co oko čte jako ruku.

     Tahle ruka se proto kreslí jako jeden uzavřený obrys:
     z bradavice zápěstí přes malíkovou hranu, kolem každého
     prstu, do meziprstních zářezů, kolem palce a thenaru zpět.
     Uvnitř obrysu pak leží to, co dělá ruku rukou:

       · nehty na hřbetní straně (bez nich je to rukavice)
       · šlachy natahovačů, vějíř od zápěstí ke kloubům
       · klouby a rýhy v ohybech článků
       · thenar a hypothenar jako vypouklá masa, ne plocha
       · tón: světlo zleva shora, stín na malíkové hraně

     ------------------------------------------------------------
     PARAMETRY

       size    délka ruky v pixelech (zápěstí → špička prostředníku)
       rot     natočení
       flip    zrcadlení (levá / pravá)
       opt.curl    0…1  pokrčení prstů (zkracuje se perspektivou,
                        neohýbá se do strany — ruka leží na těle)
       opt.tilt    0…1  sklopení do hrany. 0 = hřbet k divákovi,
                        1 = ruka viděná téměř z boku
       opt.spread  −1…1 rozevření prstů
       opt.arm     předloktí (výchozí true)
       opt.tint    0…1  příměs zeleně v pleti (výchozí 0.22)
       opt.nails   nehty (výchozí true, u velkých ruk)
     ------------------------------------------------------------ */

  Plate.prototype.capsule = function (x0, y0, x1, y1, r) {
    var ctx = this.ctx;
    var a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.arc(x0, y0, r, a + Math.PI / 2, a - Math.PI / 2);
    ctx.arc(x1, y1, r, a - Math.PI / 2, a + Math.PI / 2);
    ctx.closePath();
    return this;
  };

  /* Kostra ruky v místních jednotkách. Délka ruky = 2,66:
     dlaň 1,5 a prostředník 1,16 — poměr z antropometrie, ne
     od oka. Palec vychází z RADIÁLNÍ strany, tedy z téže
     jako ukazovák; předtím rostl vedle malíku.               */
  var HAND_F = [
    /* ukazovák */
    { j: [[0.17, -0.41], [-0.41, -0.47], [-0.79, -0.50], [-1.03, -0.515]],
      r: [0.121, 0.106, 0.093, 0.082], fan: -0.30 },
    /* prostředník */
    { j: [[0.06, -0.12], [-0.58, -0.145], [-1.00, -0.16], [-1.26, -0.17]],
      r: [0.127, 0.112, 0.098, 0.086], fan: -0.06 },
    /* prsteník */
    { j: [[0.12, 0.175], [-0.50, 0.215], [-0.90, 0.25], [-1.14, 0.275]],
      r: [0.119, 0.105, 0.092, 0.081], fan: 0.22 },
    /* malík */
    { j: [[0.31, 0.425], [-0.17, 0.50], [-0.49, 0.565], [-0.69, 0.605]],
      r: [0.102, 0.090, 0.079, 0.070], fan: 0.46 }
  ];
  /* PALEC se nekreslí z osy a poloměru jako prst. Vyrůstá
     z thenaru, je dvakrát tlustší a jeho vnitřní hrana JE
     meziprstní řasa — kdyby se počítal z osy jako prst,
     kolejnice by ležely uvnitř dlaně a palec by se s ní slil.

     Osa jde dopředu A do strany. Uvolněný palec svírá s osou
     ruky asi 40°, ne 90°: kolmý palec vypadá jako trn.      */
  var HAND_T = {
    /* vnější hrana: zápěstí → thenar → kloub → špička */
    out: [[1.658, -0.140], [1.706, -0.330], [1.672, -0.510],
          [1.560, -0.646], [1.400, -0.790], [1.180, -0.996], [0.960, -1.176]],
    tipO: [0.880, -1.238],
    tipC: [0.762, -1.256],
    tipI: [0.660, -1.150],
    /* vnitřní hrana: špička → meziprstní řasa */
    inn: [[0.700, -1.060], [0.840, -0.906], [1.010, -0.744], [1.120, -0.618]],
    web: [1.104, -0.512]
  };

  /* Prst v perspektivě. Pokrčení NEotáčí článek do strany —
     ruka leží na těle, takže se prst krátí směrem od diváka.
     Přesně tohle dělá rozdíl mezi ležící rukou a rukou, která
     mává.                                                     */
  function flexChain(f, curl, spread, tilt) {
    var j = f.j, out = [j[0].slice()];
    var fold = [0.62, 1.02, 0.86];     /* MCP, PIP, DIP */
    var cum = 0;
    for (var i = 1; i < j.length; i++) {
      cum += fold[i - 1] * curl;
      var k = Math.cos(cum * 0.92);              /* zkrácení perspektivou */
      var dx = j[i][0] - j[i - 1][0], dy = j[i][1] - j[i - 1][1];
      /* rozevření: článek se odklání od osy ruky */
      var sp = spread * f.fan * 0.34 * (i / 3);
      var c = Math.cos(sp), s = Math.sin(sp);
      var rx = dx * c - dy * s, ry = dx * s + dy * c;
      var p = out[i - 1];
      out.push([p[0] + rx * k, p[1] + ry * k * (1 - tilt * 0.55) + Math.sin(cum) * 0.05]);
    }
    return out;
  }

  /* Obrys údu z osy a poloměrů: dvě boční kolejnice a kulatá
     špička. `from` uřízne začátek — palec vyrůstá z dlaně, takže
     jeho kolejnice nesmí začínat uprostřed thenaru.            */
  function limbRails(chain, radii, tilt, steps, from) {
    steps = steps || 7;
    var p = resample(chain, steps);
    var n = p.length;
    var i0c = Math.round((from || 0) * (n - 1));
    var Lr = [], Rr = [];
    for (var i = i0c; i < n; i++) {
      var a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var u = i / (n - 1) * (radii.length - 1);
      var k0 = Math.floor(u), fr = u - k0;
      var r = lerp(radii[k0], radii[Math.min(k0 + 1, radii.length - 1)], fr);
      r *= (1 - tilt * 0.34);
      /* kloubní vřetena: článek je u kloubu o něco širší */
      r *= 1 + 0.075 * Math.sin(i / (n - 1) * Math.PI * 3);
      Lr.push([p[i][0] + nx * r, p[i][1] + ny * r]);
      Rr.push([p[i][0] - nx * r, p[i][1] - ny * r]);
    }
    /* špička: půloblouk od L přes vrchol k R */
    var tip = p[n - 1], prev = p[n - 2];
    var ta = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    var tr = radii[radii.length - 1] * (1 - tilt * 0.34);
    var cap = [];
    for (i = 1; i < 8; i++) {
      var ang = ta + Math.PI / 2 - Math.PI * (i / 8);
      cap.push([tip[0] + Math.cos(ang) * tr * 0.99, tip[1] + Math.sin(ang) * tr * 0.99]);
    }
    return { axis: p, L: Lr, R: Rr, cap: cap };
  }

  Plate.prototype.hand = function (x, y, size, rot, flip, alpha, opt) {
    opt = opt || {};
    var ctx = this.ctx, c = this.c;
    var a = alpha == null ? 1 : alpha;
    if (a <= 0.01) return this;

    var curl   = opt.curl   == null ? 0.16 : clamp(opt.curl, 0, 1);
    var tilt   = opt.tilt   == null ? 0.12 : clamp(opt.tilt, 0, 1);
    var spread = opt.spread == null ? 0.18 : opt.spread;
    var tint   = opt.tint   == null ? 0.22 : opt.tint;
    var nails  = opt.nails !== false && size > 26;
    var detail = size > 17;
    var steps  = detail ? 6 : 3;

    /* pleť: teplý porcelán s náznakem zeleně — ne zelený list */
    var SKIN  = mix(c.PAPER, c.SOFT, 0.14 + tint * 0.26);
    var EDGE  = opt.col || mix(c.INK3, c.TIDE, 0.26 + tint * 0.18);
    var SHADE = mix(c.INK3, c.TIDE, 0.16);

    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -size : size, size);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    /* --- kolejnice všech pěti údů ---------------------------- */
    var F = [];
    for (var i = 0; i < 4; i++) {
      F.push(limbRails(flexChain(HAND_F[i], curl, spread, tilt), HAND_F[i].r, tilt, steps, 0));
    }


    /* --- jedna spojitá silueta -------------------------------
       Pořadí je celé kouzlo: od zápěstí po malíkové hraně ven,
       kolem každého prstu tam a zpět, zářezem k dalšímu, a po
       palcové straně zpátky. Jeden obrys, ne pět tobolek.    */
    var yk = 1 - tilt * 0.42;              /* sklopení stlačí ruku na výšku */
    function P(px, py) { return [px, py * yk]; }
    function sq(pt) { return [pt[0], pt[1] * yk]; }

    /* Úsek kolejnice mezi dvěma podíly. Vnitřní strany prstů
       se NEvedou až k dlani — meziprstní zářez leží ve třetině
       základního článku, ne u kloubu. Když se kolejnice dotáhly
       až dolů, obrys se v zářezu zlomil do ostrého klínu a při
       obtažení z toho byla tmavá špice mezi prsty.           */
    function railSlice(rails, side, uFrom, uTo) {
      var arr = side === "L" ? rails.L : rails.R;
      var n = arr.length - 1;
      var i0 = clamp(Math.round(uFrom * n), 0, n);
      var i1 = clamp(Math.round(uTo * n), 0, n);
      var out = [], st = i0 <= i1 ? 1 : -1;
      for (var k = i0; st > 0 ? k <= i1 : k >= i1; k += st) out.push(sq(arr[k]));
      return out;
    }
    var WEB = 0.22;                     /* hloubka meziprstí */
    function web(A, B) {
      var na = A.L.length - 1, nb = B.R.length - 1;
      var pa = A.L[Math.round(WEB * na)], pb = B.R[Math.round(WEB * nb)];
      return P((pa[0] + pb[0]) * 0.5, (pa[1] + pb[1]) * 0.5 + 0.008);
    }

    var sil = [];
    /* zápěstí → hypothenar (malíková masa) */
    sil.push(P(1.64, 0.300), P(1.50, 0.394), P(1.28, 0.470),
             P(1.02, 0.516), P(0.76, 0.528), P(0.54, 0.528));
    /* prsty od malíku k ukazováku */
    for (i = 3; i >= 0; i--) {
      var f = F[i];
      var outer = i === 3 ? 0 : WEB;    /* malík má volnou hranu až k dlani */
      var inner = i === 0 ? 0 : WEB;    /* ukazovák taky, ale na druhé straně */
      sil = sil.concat(railSlice(f, "R", outer, 1));
      for (var q = f.cap.length - 1; q >= 0; q--) sil.push(sq(f.cap[q]));
      sil = sil.concat(railSlice(f, "L", 1, inner));
      if (i > 0) sil.push(web(F[i], F[i - 1]));
    }
    /* palcová hrana dlaně → první meziprstí.
       Meziprstní řasa je široká plocha mezi kloubem ukazováku
       a kloubem palce, ne úzký zářez — proto se okraj dlaně
       táhne daleko doprava, než se zlomí do palce.          */
    sil.push(P(0.38, -0.522), P(0.70, -0.508), P(0.96, -0.500));
    /* PALEC. Pokrčení ho zkracuje směrem k řase, sklopení zužuje. */
    var tc = 1 - curl * 0.22, tw = 1 - tilt * 0.26;
    function TP(q) {
      return P(HAND_T.web[0] + (q[0] - HAND_T.web[0]) * tc * tw,
               HAND_T.web[1] + (q[1] - HAND_T.web[1]) * tc);
    }
    sil.push(TP(HAND_T.web));
    for (var w = HAND_T.inn.length - 1; w >= 0; w--) sil.push(TP(HAND_T.inn[w]));
    sil.push(TP(HAND_T.tipI), TP(HAND_T.tipC), TP(HAND_T.tipO));
    for (w = HAND_T.out.length - 1; w >= 0; w--) sil.push(TP(HAND_T.out[w]));
    /* vnější hrana palce dosedla na zápěstí — obrys se uzavře */
    sil.push(P(1.665, -0.050));

    /* --- předloktí, pod ruku ---------------------------------
       Vybíhá z obrazu, ruka nesmí končit pahýlem. Kreslí se
       první a tišeji: je to jen doběh, ne téma.             */
    if (opt.arm !== false) {
      var aw = 0.30 * yk, aw2 = 0.335 * yk;
      var fa = [[1.52, -aw], [2.10, -aw2], [2.95, -aw2 * 1.04],
                [2.95, aw2 * 1.04], [2.10, aw2], [1.52, aw]];
      ctx.globalAlpha = a * 0.92;
      this.rawPath(fa, true);
      ctx.fillStyle = rgba(SKIN, 0.86);
      ctx.fill();
      this.form(fa, { col: SHADE, ang: 1.42, a: 0.22, raw: true });
      this.sheen(fa, 2.1, -aw * 0.5, 0.62, { a: 0.34, raw: true });
      ctx.beginPath();
      ctx.moveTo(2.95, -aw2 * 1.04); ctx.lineTo(1.62, -aw);
      ctx.moveTo(2.95, aw2 * 1.04); ctx.lineTo(1.62, aw);
      ctx.lineWidth = 0.028;
      ctx.strokeStyle = rgba(EDGE, 0.60);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = a;

    /* --- plocha ---------------------------------------------- */
    this.rawPath(sil, true);
    ctx.fillStyle = rgba(SKIN, 0.94);
    ctx.fill();

    /* --- tón: světlo zleva shora, stín na malíkové hraně ----- */
    this.form(sil, { col: SHADE, ang: 1.28, a: 0.26, raw: true });
    this.sheen(sil, 0.55, -0.30 * yk, 0.95, { a: 0.42, raw: true });
    /* thenar a hypothenar jsou VYPOUKLÉ — dvě masy, ne plocha */
    this.sheen(sil, 1.16, -0.20 * yk, 0.44, { a: 0.30, raw: true });
    this.sheen(sil, 1.18, 0.28 * yk, 0.40, { a: 0.22, raw: true });

    /* jemná rytina jen ve stínu — týž jazyk jako kost */
    if (detail) {
      ctx.save();
      this.rawPath(sil, true);
      ctx.clip();
      ctx.beginPath();
      for (var d = -1.6; d < 3.2; d += 0.088) {
        ctx.moveTo(d, -1.6); ctx.lineTo(d + 1.9, 1.5);
      }
      ctx.lineWidth = 0.012;
      ctx.strokeStyle = rgba(SHADE, 0.165);
      ctx.stroke();
      /* rytinu na osvětlené straně zase smažeme */
      var gg = ctx.createLinearGradient(0.2, -1.0, 1.0, 0.9);
      gg.addColorStop(0, rgba(c.PAPER, 0.96));
      gg.addColorStop(0.62, rgba(c.PAPER, 0.34));
      gg.addColorStop(1, rgba(c.PAPER, 0));
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = gg;
      ctx.fillRect(-2, -2, 6, 4);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }

    /* --- vnitřní kresba -------------------------------------- */
    if (detail) {
      ctx.lineCap = "round";
      /* šlachy natahovačů: vějíř od zápěstí ke kloubům */
      ctx.lineWidth = 0.017;
      ctx.strokeStyle = rgba(SHADE, 0.26 * (1 - tilt * 0.6));
      ctx.beginPath();
      for (i = 0; i < 4; i++) {
        var mcp = F[i].axis[0];
        ctx.moveTo(1.16, (-0.06 + i * 0.10) * yk);
        ctx.quadraticCurveTo(0.78, (-0.22 + i * 0.22) * yk, mcp[0] + 0.10, mcp[1] * yk * 0.98);
      }
      ctx.stroke();

      /* klouby: krátký oblouk přes hřbet každého prstu */
      ctx.lineWidth = 0.024;
      ctx.strokeStyle = rgba(SHADE, 0.30);
      ctx.beginPath();
      for (i = 0; i < 4; i++) {
        [0.30, 0.62, 0.84].forEach(function (u, k) {
          var ax = F[i].axis, n2 = ax.length;
          var p0 = ax[Math.round(u * (n2 - 1))];
          var p1 = ax[Math.min(n2 - 1, Math.round(u * (n2 - 1)) + 1)];
          var an2 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
          var rr = HAND_F[i].r[Math.min(k, 3)] * 0.78 * (1 - tilt * 0.34);
          ctx.moveTo(p0[0] + Math.cos(an2 + 1.35) * rr, (p0[1] + Math.sin(an2 + 1.35) * rr) * yk);
          ctx.lineTo(p0[0] + Math.cos(an2 - 1.35) * rr, (p0[1] + Math.sin(an2 - 1.35) * rr) * yk);
        });
      }
      ctx.stroke();

      /* řasa v meziprstí palce — krátký záhyb, který z klínu
         udělá kůži                                          */
      ctx.lineWidth = 0.018;
      ctx.strokeStyle = rgba(SHADE, 0.26);
      ctx.beginPath();
      ctx.moveTo(1.02 * tw, -0.46 * yk);
      ctx.quadraticCurveTo(0.94 * tw, -0.60 * yk, 0.90 * tw, -0.74 * yk);
      ctx.stroke();

      /* rýha thenaru — odděluje palcovou masu od dlaně */
      ctx.lineWidth = 0.022;
      ctx.strokeStyle = rgba(SHADE, 0.30);
      ctx.beginPath();
      ctx.moveTo(1.54, 0.04 * yk);
      ctx.quadraticCurveTo(1.32, -0.24 * yk, 1.05, -0.42 * yk);
      ctx.stroke();
    }

    /* --- nehty: bez nich je to rukavice ---------------------- */
    if (nails) {
      for (i = 0; i < 4; i++) {
        var ax2 = F[i].axis, m = ax2.length - 1;
        var t0 = ax2[m - 1], t1 = ax2[m];
        var na = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]);
        var nr = HAND_F[i].r[3] * (1 - tilt * 0.34);
        var nx2 = t1[0] - Math.cos(na) * nr * 0.85;
        var ny2 = (t1[1] - Math.sin(na) * nr * 0.85) * yk;
        ctx.save();
        ctx.translate(nx2, ny2);
        ctx.rotate(na);
        ctx.beginPath();
        ctx.ellipse(0, 0, nr * 0.62, nr * 0.46 * (1 - tilt * 0.45), 0, 0, TAU);
        ctx.fillStyle = rgba(mix(SKIN, c.PAPER, 0.55), 0.92);
        ctx.fill();
        ctx.lineWidth = 0.013;
        ctx.strokeStyle = rgba(SHADE, 0.38);
        ctx.stroke();
        ctx.restore();
      }
      /* palec má nehet taky — na hřbetu posledního článku */
      var tnC = TP(HAND_T.tipC), tnJ = TP(HAND_T.inn[0]), tnO = TP(HAND_T.out[5]);
      var tnB = [(tnJ[0] + tnO[0]) / 2, (tnJ[1] + tnO[1]) / 2];
      var tna = Math.atan2(tnC[1] - tnB[1], tnC[0] - tnB[0]);
      ctx.save();
      ctx.translate(lerp(tnB[0], tnC[0], 0.46), lerp(tnB[1], tnC[1], 0.46));
      ctx.rotate(tna);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.072, 0.054 * yk, 0, 0, TAU);
      ctx.fillStyle = rgba(mix(SKIN, c.PAPER, 0.55), 0.92);
      ctx.fill();
      ctx.lineWidth = 0.013;
      ctx.strokeStyle = rgba(SHADE, 0.38);
      ctx.stroke();
      ctx.restore();
    }

    /* --- obrys: silnější ve stínu, tenčí na světle ----------- */
    ctx.beginPath();
    ctx.moveTo(sil[0][0], sil[0][1]);
    for (i = 1; i < sil.length; i++) ctx.lineTo(sil[i][0], sil[i][1]);
    ctx.closePath();
    ctx.lineWidth = 0.030;
    ctx.strokeStyle = rgba(EDGE, 0.80);
    ctx.stroke();
    /* doběh: spodní hrana ještě jednou, aby ruka měla váhu */
    ctx.save();
    this.rawPath(sil, true);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(sil[0][0], sil[0][1]);
    for (i = 1; i < sil.length; i++) ctx.lineTo(sil[i][0], sil[i][1]);
    ctx.closePath();
    ctx.lineWidth = 0.075;
    var gr = ctx.createLinearGradient(0, -0.7 * yk, 0.4, 0.8 * yk);
    gr.addColorStop(0, rgba(EDGE, 0));
    gr.addColorStop(1, rgba(EDGE, 0.34));
    ctx.strokeStyle = gr;
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.restore();
    return this;
  };

  /* ---------- 5 · POPISKA ------------------------------------ */
  Plate.prototype.label = function (txt, x, y, opt) {
    var ctx = this.ctx;
    opt = opt || {};
    var size = (opt.size || 9) * clamp(this.S, 0.85, 1.25);
    ctx.save();
    ctx.font = "500 " + size.toFixed(1) + "px " + this.c.MONO;
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = opt.baseline || "alphabetic";
    ctx.fillStyle = rgba(opt.col || this.c.INK3, opt.alpha == null ? 0.95 : opt.alpha);
    /* Prostrkání děláme ručně: canvas letterSpacing má mizernou
       podporu a popisek musí vypadat stejně všude.            */
    var ls = opt.track == null ? 0.09 : opt.track;
    if (ls > 0) {
      var t = String(txt), total = 0, i;
      for (i = 0; i < t.length; i++) total += ctx.measureText(t[i]).width + size * ls;
      total -= size * ls;
      var px = opt.align === "center" ? x - total / 2 : opt.align === "right" ? x - total : x;
      ctx.textAlign = "left";
      for (i = 0; i < t.length; i++) {
        ctx.fillText(t[i], px, y);
        px += ctx.measureText(t[i]).width + size * ls;
      }
    } else {
      ctx.fillText(String(txt), x, y);
    }
    ctx.restore();
    return this;
  };

  /* Odkazová popiska: tečka v anatomickém bodě, vlasový svod
     a text vedle.

     Popiska se NEadresuje absolutní souřadnicí na plátně, ale
     odsazením od bodu, ke kterému patří. Absolutní souřadnice
     vypadaly dobře v jedné šířce a v jiné ulétly za okraj —
     a popisek useknutý okrajem je horší než žádný.

     Text se navíc vejde vždy: šířka se změří, poloha se ořízne
     do plochy listu a když se nevejde doprava, obrátí se
     i s celým svodem doleva.                                 */
  Plate.prototype.callout = function (opt) {
    var c = this.c, ctx = this.ctx, S = this.S;
    var a = opt.alpha == null ? 1 : opt.alpha;
    if (a <= 0.01) return this;

    var size = (opt.size || 8.6) * clamp(S, 0.85, 1.25);
    var track = 0.1;
    ctx.save();
    ctx.font = "500 " + size.toFixed(1) + "px " + c.MONO;
    var txt = String(opt.text);
    var tw = 0;
    for (var i = 0; i < txt.length; i++) tw += ctx.measureText(txt[i]).width + size * track;
    tw -= size * track;
    ctx.restore();

    var pad = 8 * S;
    var dx = opt.dx == null ? 40 * S : opt.dx;
    var dy = opt.dy == null ? -20 * S : opt.dy;
    var dir = dx >= 0 ? 1 : -1;

    var lx = opt.x + dx;
    var ly = clamp(opt.y + dy, pad + size, this.H - pad);

    /* nevejde se? obrátíme stranu, teprve pak ořízneme */
    if (dir > 0 && lx + tw > this.W - pad) {
      if (opt.x - Math.abs(dx) - tw > pad) { dir = -1; lx = opt.x - Math.abs(dx); }
      else lx = this.W - pad - tw;
    } else if (dir < 0 && lx - tw < pad) {
      if (opt.x + Math.abs(dx) + tw < this.W - pad) { dir = 1; lx = opt.x + Math.abs(dx); }
      else lx = pad + tw;
    }

    /* Svod má jeden zlom a krátký vodorovný doběh pod textem.
       Rovná diagonála přes kresbu je to, co dělá amatérský
       nákres.                                                */
    var runway = 6 * S;
    var joint = [lx - dir * runway, ly + 2.4 * S];
    this.hair([[opt.x, opt.y], [(opt.x + joint[0]) / 2, joint[1] - (joint[1] - opt.y) * 0.42], joint,
               [lx - dir * 2 * S, joint[1]]],
      0.9, opt.col || c.INK4, 0.72 * a);

    ctx.beginPath();
    ctx.arc(opt.x, opt.y, 2.4 * S, 0, TAU);
    ctx.fillStyle = rgba(opt.dot || c.TIDE, 0.95 * a);
    ctx.fill();

    this.label(txt, dir > 0 ? lx : lx - tw, ly, {
      align: "left", col: opt.textCol || c.INK3, alpha: a, size: opt.size || 8.6, track: track
    });
    return this;
  };

  /* ---------- 6 · LUPA --------------------------------------- */
  Plate.prototype.inset = function (opt) {
    var ctx = this.ctx, c = this.c;
    var a = opt.alpha == null ? 1 : opt.alpha;
    if (a <= 0.01) return this;
    var x = opt.x, y = opt.y, w = opt.w, h = opt.h;

    ctx.save();
    ctx.globalAlpha = a;

    /* svod z místa na těle do rohu panelu */
    if (opt.fromX != null) {
      var ax = opt.fromX > x + w * 0.5 ? x + w * 0.82 : x + w * 0.18;
      var ay = opt.fromY > y + h ? y + h : y + h;
      this.hair([[opt.fromX, opt.fromY], [ax, ay]], 0.9, c.INK4, 0.55, [2, 4]);
      ctx.beginPath();
      ctx.arc(opt.fromX, opt.fromY, 2.6 * this.S, 0, TAU);
      ctx.fillStyle = rgba(c.TIDE, 0.9);
      ctx.fill();
      /* kroužek lupy v místě odběru */
      ctx.beginPath();
      ctx.arc(opt.fromX, opt.fromY, 9 * this.S, 0, TAU);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(c.TIDE, 0.35);
      ctx.stroke();
    }

    /* panel */
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4); else ctx.rect(x, y, w, h);
    ctx.fillStyle = rgba(c.PAPER, 0.985);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(c.LINE, 1);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4); else ctx.rect(x, y, w, h);
    ctx.clip();
    /* jemná osnova i uvnitř lupy — je to týž papír */
    ctx.strokeStyle = rgba(c.HAIR, 0.7);
    ctx.beginPath();
    for (var gx = x + 18; gx < x + w; gx += 18) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (var gy = y + 18; gy < y + h; gy += 18) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.lineWidth = 1;
    ctx.stroke();
    opt.draw(x, y, w, h);
    ctx.restore();

    if (opt.caption) {
      this.label(opt.caption, x + w / 2, y + h - 8 * this.S,
        { align: "center", col: c.INK3, size: 8.2, alpha: 0.95 });
    }
    /* měřítko zvětšení vpravo nahoře — drobnost, která listu
       dodá důvěryhodnost přístroje                            */
    if (opt.zoom) {
      this.label(opt.zoom, x + w - 8 * this.S, y + 13 * this.S,
        { align: "right", col: c.META, size: 7.8, alpha: 0.9 });
    }
    ctx.restore();
    return this;
  };

  /* ---------- 7 · MĚŘIDLO ------------------------------------ */
  Plate.prototype.caliper = function (x1, y1, x2, y2, txt, opt) {
    opt = opt || {};
    var c = this.c, ctx = this.ctx;
    var a = opt.alpha == null ? 1 : opt.alpha;
    if (a <= 0.01) return this;
    var col = opt.col || c.INK4;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len, ear = 4 * this.S;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(col, 0.85 * a);
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.moveTo(x1 - nx * ear, y1 - ny * ear); ctx.lineTo(x1 + nx * ear, y1 + ny * ear);
    ctx.moveTo(x2 - nx * ear, y2 - ny * ear); ctx.lineTo(x2 + nx * ear, y2 + ny * ear);
    ctx.stroke();
    ctx.restore();

    if (txt) {
      this.label(txt, (x1 + x2) / 2 + nx * 9 * this.S, (y1 + y2) / 2 + ny * 9 * this.S + 3,
        { align: "center", col: opt.textCol || c.INK3, size: 8.2, alpha: a });
    }
    return this;
  };

  /* Číselný odečet u kraje listu — mono, drobně, s rámečkem. */
  Plate.prototype.readout = function (x, y, key, val, opt) {
    opt = opt || {};
    var c = this.c;
    var a = opt.alpha == null ? 1 : opt.alpha;
    if (a <= 0.01) return this;
    this.label(key, x, y, { col: c.META, size: 7.6, alpha: 0.9 * a, align: opt.align || "left" });
    this.label(val, x, y + 13 * this.S, {
      col: opt.hot ? c.TIDE : c.INK2, size: 10.5, alpha: a, align: opt.align || "left", track: 0.04
    });
    return this;
  };

  /* ---------- 8 · pomůcky pro děj ---------------------------- */

  /* Světelné pole — příliv pod kůží. Jediné povolené „svícení“. */
  Plate.prototype.glow = function (x, y, r, col, a) {
    var ctx = this.ctx;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.55, rgba(col, a * 0.34));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    return this;
  };

  /* Bod putující po dráze — vlna v pleně, signál v nervu. */
  Plate.prototype.runner = function (pts, u, opt) {
    opt = opt || {};
    var p = resample(pts, 12);
    var idx = clamp(u, 0, 1) * (p.length - 1);
    var i0 = Math.floor(idx), fr = idx - i0;
    var a = p[Math.min(i0, p.length - 1)], b = p[Math.min(i0 + 1, p.length - 1)];
    var x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr;
    var c = this.c;
    var al = opt.alpha == null ? 1 : opt.alpha;
    this.glow(x, y, (opt.r || 13) * this.S, opt.col || c.TIDE, 0.30 * al);
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, (opt.dot || 3.2) * this.S, 0, TAU);
    ctx.fillStyle = rgba(opt.col || c.WARM, 0.95 * al);
    ctx.fill();
    return [x, y];
  };

  /* Šipka s dříkem — tah, tlak, směr pohybu. */
  Plate.prototype.arrow = function (x, y, ang, len, col, a, opt) {
    opt = opt || {};
    var ctx = this.ctx, S = this.S;
    var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    var head = (opt.head || 5) * S;
    ctx.save();
    ctx.lineWidth = (opt.w || 1.3) * S;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = rgba(col, a);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(ang - 0.42) * head, ey - Math.sin(ang - 0.42) * head);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang + 0.42) * head, ey - Math.sin(ang + 0.42) * head);
    ctx.stroke();
    ctx.restore();
    return this;
  };

  /* Zaškrtnutí / přeškrtnutí — „tohle se dít nebude“. */
  Plate.prototype.cross = function (x, y, r, col, a, draw) {
    var ctx = this.ctx, S = this.S;
    draw = draw == null ? 1 : clamp(draw, 0, 1);
    ctx.save();
    ctx.lineWidth = 2.1 * S;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(col, a);
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.5, -Math.PI * 0.5 + TAU * draw);
    ctx.stroke();
    var d2 = clamp((draw - 0.55) / 0.45, 0, 1);
    if (d2 > 0) {
      var k = r * 0.62;
      ctx.beginPath();
      ctx.moveTo(x - k, y - k);
      ctx.lineTo(x - k + 2 * k * d2, y - k + 2 * k * d2);
      ctx.stroke();
    }
    ctx.restore();
    return this;
  };

  root.KJPlate = {
    create: function (ctx) { return new Plate(ctx); },
    palette: palette,
    rgba: rgba, mix: mix, lerp: lerp, clamp: clamp,
    easeOut: easeOut, easeIO: easeIO, breathe: breathe, resample: resample,
    TAU: TAU
  };
})(window);
