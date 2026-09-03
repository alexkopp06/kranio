/* ============================================================
   wheel-core.js — prostorové kolo sezení, sdílené jádro

   Na webu jsou dvě místa, kde se 75 minut kreslí jako kruh:
   ciferník na úvodní stránce a kolo v kapitole Průběh. Dřív to
   byly dva různé kusy kódu — kolo poctivé 3D, ciferník prstenec
   složený z šestnácti vrstev posunutých o pixel. Vypadaly jinak
   a značka tím ztrácela jednotu. Tohle je ten renderer, který
   zbyl: jeden objem, jedno světlo, dvě obsluhy.

   Proč vlastní 3D a ne knihovna: scéna má tři výseče, jedno
   světlo a žádnou texturu. Celá geometrie je kruh — three.js
   by sem přinesl stovky kilobajtů kvůli tomu, co se vejde do
   dvou set řádků, a hlavně vlastní vzhled. Takhle si tón,
   ubývání světla po stěně i tloušťku nákružku řídíme sami
   a graf patří k tomuhle webu, ne do dashboardu.

   Malíř místo hloubkového bufferu: stěny se dělí na krátké
   čtyřúhelníky, odvrácené se zahodí (skalární součin normály
   se směrem k oku) a zbytek se kreslí odzadu dopředu. Na
   prstenci to stačí — výseče se v ploše nekříží.

   API:
     var w = KJ.createWheel({ canvas, disc, segs, total, colors });
     w.fit()                 přepočet výřezu (po resize)
     w.step(dt)              dorovnání animovaných hodnot
     w.draw()                jeden snímek
     w.pick(x, y)            index výseče pod kurzorem, nebo −1
     w.select(i)             vysunout výseč (varianta „výběr“)
     w.aimAt(i)              natočit kolo k výseči
     w.setHover(i)
     w.marker = null | min   ukazatel na prstenci (varianta „osa“)
     w.veilFrom = null | min závoj přes ještě nepřehranou část
     w.onCore = fn(x, y)     kam patří odečet uprostřed
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  /* ---------- rám scény -------------------------------------
     Poměry drží pohromadě s aspect-ratio prvku, na kterém kolo
     leží (.wheel__disc / .clock__dial v CSS) — mění se obojí
     naráz.                                                    */
  var R_OUT = 1.00;
  var R_IN = 0.575;          /* díra uprostřed nese odečet     */
  var H = 0.262;             /* tloušťka kotouče               */
  var R_TICK = 1.130;        /* prstenec rysek na podstavě     */
  var R_LABEL = 1.305;
  var LIFT_SEL = 0.150;      /* povysunutí vybrané výseče      */
  var LIFT_HOV = 0.055;
  var PUSH_SEL = 0.048;      /* odsunutí po ose výseče         */
  var GAP = 0.017;           /* spára mezi výsečemi, v radiánech */

  var TILT = -54 * Math.PI / 180;   /* sklopení kotouče        */
  var CAM = 6.5;                    /* vzdálenost oka          */

  /* Světlo v pohledovém prostoru: shora zleva, mírně zepředu.
     Jedno. Dvě světla dělají z grafu render, ne kresbu.       */
  var LX = -0.34, LY = 0.66, LZ = 0.67;
  (function () {
    var l = Math.sqrt(LX * LX + LY * LY + LZ * LZ);
    LX /= l; LY /= l; LZ /= l;
  })();

  /* ---------- barvy z CSS ----------------------------------- */
  var CS = getComputedStyle(document.documentElement);
  function rgbOf(name, fallback) {
    var h = (CS.getPropertyValue(name) || "").trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) h = fallback.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }

  var PAPER = rgbOf("--surface-2", "#E9ECE5");
  var BG    = rgbOf("--bg", "#F2F3EF");
  var INK   = rgbOf("--ink", "#070D0B");
  var LINE  = rgbOf("--line-strong", "#C6CBBF");
  /* Popisky na podstavě jsou kreslený text, ne HTML — kontrast
     jim nikdo nespočítá, tak si ho musíme pohlídat sami. Proto
     --ink-meta (6,46:1 na --bg), ne --ink-3 s krytím 0,8, což
     dávalo 3,9:1 a při 10,5px to bylo pod hranicí čitelnosti. */
  var INK3  = rgbOf("--ink-meta", "#202A26");
  var DEEP  = rgbOf("--tide-deep", "#0A5442");
  var WARM  = rgbOf("--tide-warm", "#1E7A5B");
  var WHITE = [255, 255, 255];
  var MONO  = (CS.getPropertyValue("--font-mono") || "monospace").trim();
  var SANS  = (CS.getPropertyValue("--font-sans") || "sans-serif").trim();

  KJ.createWheel = function (opt) {
    var canvas = opt.canvas, disc = opt.disc;
    var ctx = null;
    try { ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx || !ctx.createLinearGradient) return null;

    var SEGS = opt.segs;                 /* [{from,to,label}]  */
    var TOTAL = opt.total || 75;
    var COL = opt.colors || [
      rgbOf("--seg-1", "#6FA48C"), rgbOf("--seg-2", "#0E6B54"), rgbOf("--seg-3", "#A9C7B6")
    ];
    var TICK_EVERY = opt.tickEvery || 5;
    var TICK_AT = opt.tickAt || [0, 15, 65];
    var showLabels = !!opt.labels;       /* jména výsečí na podstavě */

    /* Nevybraná část ustoupí k papíru. Pořád je čitelná — jen
       přestane soupeřit o pozornost s tou, o které je řeč.    */
    function fade(c, k) {
      if (k < 0.004) return c;
      return [c[0] + (PAPER[0] - c[0]) * k,
              c[1] + (PAPER[1] - c[1]) * k,
              c[2] + (PAPER[2] - c[2]) * k];
    }

    /* Tón plochy. Světlo neubírá jen sytost — osvětlená strana
       jde k papíru, odvrácená k inkoustu. Rozsah je schválně
       úzký: má to být kresba tuší, ne plastový 3D graf.       */
    function tone(c, l, a) {
      var t = l < 0 ? 0 : l > 1 ? 1 : l, r, g, b;
      if (t >= 0.5) {
        var k = (t - 0.5) * 2 * 0.26;
        r = c[0] + (250 - c[0]) * k;
        g = c[1] + (252 - c[1]) * k;
        b = c[2] + (246 - c[2]) * k;
      } else {
        var d = (0.5 - t) * 2 * 0.62;
        r = c[0] + (INK[0] - c[0]) * d;
        g = c[1] + (INK[1] - c[1]) * d;
        b = c[2] + (INK[2] - c[2]) * d;
      }
      return "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + (a == null ? 1 : a) + ")";
    }

    /* ---------- promítání -----------------------------------
       Otočení kolem svislé osy (yaw) → sklopení kotouče (tilt) →
       perspektiva. Kamera se dívá po −z, +z míří k divákovi.
       offX/offY je odsunutí právě kreslené výseče po její ose. */
    var yaw = 0, cyw = 1, syw = 0;
    var ctN = Math.cos(TILT), stN = Math.sin(TILT);
    var unit = 100, ox = 0, oy = 0, focal = 650;
    var offX = 0, offY = 0;

    function proj(x, y, z, o) {
      var wx = x + offX, wy = y + offY;
      var x1 = wx * cyw - wy * syw;
      var y1 = wx * syw + wy * cyw;
      var y2 = y1 * ctN - z * stN;
      var z2 = y1 * stN + z * ctN;
      var d = CAM - z2;
      if (d < 0.5) d = 0.5;
      var k = focal / d;
      o.x = ox + x1 * k;
      o.y = oy - y2 * k;
      o.vx = x1; o.vy = y2; o.vz = z2;
      return o;
    }
    var N = { x: 0, y: 0, z: 0 };
    function nrm(nx, ny, nz) {
      var x1 = nx * cyw - ny * syw;
      var y1 = nx * syw + ny * cyw;
      N.x = x1;
      N.y = y1 * ctN - nz * stN;
      N.z = y1 * stN + nz * ctN;
      return N;
    }
    /* Odvrácená plocha: normála proti směru k oku. Počítá se
       z těžiště plošky, ne z osy pohledu — u perspektivy je to
       na okraji kotouče znát.                                 */
    function facing(n, p) {
      var vx = -p.vx, vy = -p.vy, vz = CAM - p.vz;
      var L = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      return (n.x * vx + n.y * vy + n.z * vz) / L;
    }
    /* Poloviční Lambert: tvrdý ořez světla je na světlém papíře
       nepoužitelný, odvrácená strana by spadla do díry.       */
    function lit(n, p) {
      var hl = (n.x * LX + n.y * LY + n.z * LZ) * 0.5 + 0.5;
      hl *= hl;
      var f = facing(n, p);
      var rim = Math.pow(1 - (f < 0 ? 0 : f > 1 ? 1 : f), 3) * 0.15;
      return hl * 0.88 + 0.12 + rim;
    }

    /* ---------- minuty ↔ úhel -------------------------------
       Kolo se čte jako hodiny: nula nahoře, čas po směru.     */
    function angOf(m) { return Math.PI / 2 - (m / TOTAL) * Math.PI * 2; }
    function minOf(a) {
      var f = (Math.PI / 2 - a) / (Math.PI * 2);
      return (f - Math.floor(f)) * TOTAL;
    }
    function segOfMin(m) {
      for (var i = 0; i < SEGS.length; i++) if (m >= SEGS[i].from && m < SEGS[i].to) return i;
      return SEGS.length - 1;
    }
    function bisOf(i) { return angOf((SEGS[i].from + SEGS[i].to) / 2); }

    /* ---------- stav --------------------------------------- */
    var api = {
      sel: 0, hover: -1, yaw: 0, yawT: 0,
      marker: null, veilFrom: null,
      onCore: null,
      reduced: KJ.isReduced()
    };
    var lift = [], liftT = [], push = [], pushT = [], dim = [], dimT = [];
    for (var s0 = 0; s0 < SEGS.length; s0++) {
      lift.push(0); liftT.push(0); push.push(0); pushT.push(0); dim.push(0); dimT.push(0);
    }
    var coarse = KJ.prefersCoarse();
    var STEP = coarse ? 0.072 : 0.046;   /* dělení stěn v radiánech */

    /* ---------- rozměry -------------------------------------
       Průmět kruhu je při otáčení kolem svislé osy neměnný,
       výřez se proto počítá jednou — kolo nepoposkakuje.      */
    var W = 1, Hpx = 1, dpr = 1;
    var tmp = { x: 0, y: 0, vx: 0, vy: 0, vz: 0 };

    function fit() {
      var r = disc.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width; Hpx = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = Math.round(W * dpr), ch = Math.round(Hpx * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }

      var sy = yaw, sc = cyw, ss = syw;
      yaw = 0; cyw = 1; syw = 0;
      offX = 0; offY = 0;
      focal = CAM; ox = 0; oy = 0;          /* jednotkové měřítko */
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      var probe = [[R_OUT, -H / 2], [R_OUT, H / 2 + LIFT_SEL], [R_LABEL, -H / 2]];
      for (var i = 0; i <= 72; i++) {
        var a = i / 72 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        for (var j = 0; j < probe.length; j++) {
          var p = proj(ca * probe[j][0], sa * probe[j][0], probe[j][1], tmp);
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
      }
      /* Popisky na podstavě jsou text, ne bod — kotva je střed,
         takže k obálce patří ještě polovina jejich šířky. Se
         jmény výsečí („Ošetření na lehátku“) je ta polovina
         výrazně větší než u holých čísel.                     */
      var pad = showLabels ? 0.150 : 0.055;
      minX -= pad; maxX += pad;
      if (showLabels) { minY -= 0.055; maxY += 0.055; }
      var bw = maxX - minX, bh = maxY - minY;
      unit = Math.min(W * 0.94 / bw, Hpx * 0.94 / bh);
      focal = unit * CAM;
      ox = W / 2 - (minX + bw / 2) * unit;
      oy = Hpx / 2 - (minY + bh / 2) * unit;
      yaw = sy; cyw = sc; syw = ss;
      placeCore();
    }

    /* Odečet uprostřed je HTML, ne kresba — text musí být ostrý
       a dosažitelný odečítačkou. Polohu mu píšeme podle
       promítnutého středu díry.                               */
    function placeCore() {
      offX = 0; offY = 0;
      var p = proj(0, 0, H / 2, tmp);
      if (api.onCore) api.onCore(p.x, p.y);
      else {
        disc.style.setProperty("--core-x", p.x.toFixed(1) + "px");
        disc.style.setProperty("--core-y", p.y.toFixed(1) + "px");
      }
    }

    /* ---------- ploška ------------------------------------- */
    function poly(pts, fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      /* Sousední plošky sdílejí hranu; bez dotažení stopou by
         mezi nimi prosvítal vlas pozadí (antialiasing).       */
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    /* Stěna prstence — vnější (dir = +1) nebo vnitřní (−1).   */
    function wall(radius, dir, a0, a1, z0, z1, base, out) {
      var n = Math.max(2, Math.ceil(Math.abs(a0 - a1) / STEP));
      var d = (a1 - a0) / n;
      for (var q = 0; q < n; q++) {
        var s = a0 + d * q, e = s + d * 1.05;   /* přesah zakryje šev */
        var mid = s + d * 0.5;
        var pc = proj(Math.cos(mid) * radius, Math.sin(mid) * radius, (z0 + z1) / 2, {});
        var nn = nrm(Math.cos(mid) * dir, Math.sin(mid) * dir, 0);
        if (facing(nn, pc) <= 0.002) continue;
        var l = lit(nn, pc);
        out.push({
          z: pc.vz,
          pts: [
            proj(Math.cos(s) * radius, Math.sin(s) * radius, z1, {}),
            proj(Math.cos(e) * radius, Math.sin(e) * radius, z1, {}),
            proj(Math.cos(e) * radius, Math.sin(e) * radius, z0, {}),
            proj(Math.cos(s) * radius, Math.sin(s) * radius, z0, {})
          ],
          top: l, bot: l * 0.70, base: base
        });
      }
    }

    /* Řezná plocha na kraji výseče. */
    function cut(a, sign, z0, z1, base, out) {
      var rm = (R_IN + R_OUT) / 2;
      var pc = proj(Math.cos(a) * rm, Math.sin(a) * rm, (z0 + z1) / 2, {});
      var nn = nrm(-Math.sin(a) * sign, Math.cos(a) * sign, 0);
      if (facing(nn, pc) <= 0.002) return;
      var l = lit(nn, pc);
      out.push({
        z: pc.vz,
        pts: [
          proj(Math.cos(a) * R_IN, Math.sin(a) * R_IN, z1, {}),
          proj(Math.cos(a) * R_OUT, Math.sin(a) * R_OUT, z1, {}),
          proj(Math.cos(a) * R_OUT, Math.sin(a) * R_OUT, z0, {}),
          proj(Math.cos(a) * R_IN, Math.sin(a) * R_IN, z0, {})
        ],
        top: l, bot: l * 0.74, base: base
      });
    }

    function arcPts(r, a0, a1, z, into) {
      var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.032));
      for (var q = 0; q <= n; q++) {
        var a = a0 + (a1 - a0) * (q / n);
        into.push(proj(Math.cos(a) * r, Math.sin(a) * r, z, {}));
      }
      return into;
    }

    /* ---------- podstava: rysky a popisky ------------------- */
    function drawBase() {
      offX = 0; offY = 0;
      var i, a, p, q, m, edge, rr;
      ctx.beginPath();
      for (i = 0; i <= 100; i++) {
        a = i / 100 * Math.PI * 2;
        p = proj(Math.cos(a) * R_TICK, Math.sin(a) * R_TICK, -H / 2, tmp);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(LINE, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();

      for (i = 0; i * TICK_EVERY < TOTAL; i++) {
        m = i * TICK_EVERY;
        edge = TICK_AT.indexOf(m) >= 0;
        a = angOf(m);
        rr = R_TICK + (edge ? 0.088 : 0.042);
        p = proj(Math.cos(a) * R_TICK, Math.sin(a) * R_TICK, -H / 2, {});
        q = proj(Math.cos(a) * rr, Math.sin(a) * rr, -H / 2, {});
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = edge ? rgba(INK3, 0.85) : rgba(LINE, 1);
        ctx.lineWidth = edge ? 1.4 : 1;
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (!showLabels) {
        ctx.font = "500 10.5px " + MONO;
        ctx.fillStyle = rgba(INK3, 1);
        for (i = 0; i < TICK_AT.length; i++) {
          a = angOf(TICK_AT[i]);
          p = proj(Math.cos(a) * R_LABEL, Math.sin(a) * R_LABEL, -H / 2, tmp);
          ctx.fillText(String(TICK_AT[i]), p.x, p.y);
        }
        return;
      }

      /* Varianta „osa“: u každé výseče stojí její jméno a rozsah.
         Popisek nese fázi, ne odečet — proto jméno sansem a čas
         monem, stejná dvojice jako v panelu vedle.             */
      for (i = 0; i < SEGS.length; i++) {
        a = bisOf(i);
        p = proj(Math.cos(a) * R_LABEL, Math.sin(a) * R_LABEL, -H / 2, tmp);
        var on = i === api.sel;
        ctx.font = "500 13px " + SANS;
        ctx.fillStyle = on ? rgba(DEEP, 1) : rgba(INK, 0.92);
        ctx.fillText(SEGS[i].label || "", p.x, p.y - 8);
        ctx.font = "500 10.5px " + MONO;
        ctx.fillStyle = rgba(INK3, 1);
        ctx.fillText(SEGS[i].from + "–" + SEGS[i].to + " min", p.x, p.y + 9);
      }
    }

    /* ---------- stín na podstavě --------------------------- */
    function drawShadow() {
      offX = 0; offY = 0;
      var c = proj(0, 0, -H / 2, {});
      var e = proj(R_OUT, 0, -H / 2, {});
      var rx = Math.abs(e.x - c.x) * 1.16;
      if (!(rx > 1)) return;
      var ry = rx * Math.abs(ctN);
      ctx.save();
      ctx.translate(c.x + rx * 0.035, c.y + ry * 0.13);
      ctx.scale(1, ry / rx);
      /* Stín pod prstencem je taky prstenec: dírou je vidět
         podstavu, ne šedý kotouč pod odečtem.                 */
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, "rgba(16,28,24,.035)");
      g.addColorStop(0.40, "rgba(16,28,24,.075)");
      g.addColorStop(0.66, "rgba(16,28,24,.155)");
      g.addColorStop(0.86, "rgba(16,28,24,.055)");
      g.addColorStop(1, "rgba(16,28,24,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ---------- jedna výseč -------------------------------- */
    function collect(i, faces) {
      var s = SEGS[i];
      var a0 = angOf(s.from) - GAP / 2;
      var a1 = angOf(s.to) + GAP / 2;
      var bis = bisOf(i);
      var zt = H / 2 + lift[i], zb = -H / 2 + lift[i];
      var dx = Math.cos(bis) * push[i], dy = Math.sin(bis) * push[i];
      var col = fade(COL[i % COL.length], dim[i]);

      offX = dx; offY = dy;
      wall(R_IN, -1, a0, a1, zb, zt, col, faces);
      cut(a0, 1, zb, zt, col, faces);
      cut(a1, -1, zb, zt, col, faces);
      wall(R_OUT, 1, a0, a1, zb, zt, col, faces);

      var pts = [];
      arcPts(R_OUT, a0, a1, zt, pts);
      arcPts(R_IN, a1, a0, zt, pts);
      var pc = proj(Math.cos(bis) * (R_IN + R_OUT) / 2, Math.sin(bis) * (R_IN + R_OUT) / 2, zt, {});
      var nn = nrm(0, 0, 1);
      faces.push({
        z: pc.vz + 0.006, pts: pts, top: lit(nn, pc), bot: 0, base: col,
        cap: i, capZ: zt, capDx: dx, capDy: dy
      });
      offX = 0; offY = 0;
    }

    /* Spád po horní ploše vede po směru světla, ne po ose výseče —
       jinak by u čtvrtkruhu ležel napříč a plocha by se zlomila. */
    function capGradient(pts, top, base) {
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, i;
      for (i = 0; i < pts.length; i++) {
        if (pts[i].x < minX) minX = pts[i].x;
        if (pts[i].x > maxX) maxX = pts[i].x;
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      var dx = maxX - minX, dy = maxY - minY;
      var rr = Math.max(8, Math.sqrt(dx * dx + dy * dy) / 2);
      var g = ctx.createLinearGradient(cx + LX * rr, cy - LY * rr, cx - LX * rr, cy + LY * rr);
      g.addColorStop(0, tone(base, top * 1.07));
      g.addColorStop(1, tone(base, top * 0.90));
      return g;
    }

    /* ---------- závoj přes ještě nepřehranou část -----------
       Varianta „osa“. Co ještě nepřišlo, leží pod závojem barvy
       plochy: ušlá část zůstane plná a kruh se před očima
       zaplňuje, bez jediné čáry navíc.                        */
    function drawVeil(i, z, dx, dy) {
      var m = api.veilFrom;
      if (m == null) return;
      var s = SEGS[i];
      if (m >= s.to - 0.02) return;              /* celá výseč hotová */
      var from = Math.max(m, s.from);
      offX = dx; offY = dy;
      var a0 = angOf(from), a1 = angOf(s.to) + GAP / 2;
      if (from <= s.from + 0.001) a0 -= GAP / 2;
      var pts = [];
      arcPts(R_OUT, a0, a1, z, pts);
      arcPts(R_IN, a1, a0, z, pts);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q].x, pts[q].y);
      ctx.closePath();
      ctx.fillStyle = rgba(BG, 0.6);
      ctx.fill();
      offX = 0; offY = 0;
    }

    /* ---------- ukazatel minuty ---------------------------- */
    function drawMarker() {
      var m = api.marker;
      if (m == null) return;
      var i = segOfMin(m);
      offX = Math.cos(bisOf(i)) * push[i];
      offY = Math.sin(bisOf(i)) * push[i];
      var z = H / 2 + lift[i];
      var a = angOf(m);
      var rm = (R_IN + R_OUT) / 2;
      var p = proj(Math.cos(a) * rm, Math.sin(a) * rm, z, {});
      var q = proj(Math.cos(a) * rm, Math.sin(a) * rm, z + 0.30, {});

      /* Stopka od plochy nahoru — bez ní by korálek plaval nad
         kolem a nebylo by poznat, které minuty se drží.       */
      ctx.beginPath();
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = rgba(DEEP, 0.55);
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(q.x, q.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = rgba(WARM, 0.16);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(DEEP, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(WHITE, 0.92);
      ctx.lineWidth = 2;
      ctx.stroke();
      offX = 0; offY = 0;
    }

    /* ---------- celý snímek -------------------------------- */
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hpx);

      drawShadow();
      drawBase();

      var faces = [], i, q;
      for (i = 0; i < SEGS.length; i++) collect(i, faces);
      faces.sort(function (a, b) { return a.z - b.z; });   /* odzadu dopředu */

      for (i = 0; i < faces.length; i++) {
        var f = faces[i];
        if (f.cap == null) {
          var gw = ctx.createLinearGradient(f.pts[0].x, f.pts[0].y, f.pts[3].x, f.pts[3].y);
          gw.addColorStop(0, tone(f.base, f.top));
          gw.addColorStop(1, tone(f.base, f.bot));
          poly(f.pts, gw);
          continue;
        }
        ctx.save();
        if (f.cap === api.sel && lift[f.cap] > 0.01) {
          ctx.shadowColor = "rgba(14,107,84,.28)";
          ctx.shadowBlur = 24 * (lift[f.cap] / LIFT_SEL);
          ctx.shadowOffsetY = 5;
        }
        poly(f.pts, capGradient(f.pts, f.top, f.base));
        ctx.restore();

        /* nákružek: světlá hrana na obvodu, tmavá u díry */
        var half = (f.pts.length / 2) | 0;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = tone(f.base, Math.min(1, f.top * 1.34), 0.92);
        ctx.beginPath();
        ctx.moveTo(f.pts[0].x, f.pts[0].y);
        for (q = 1; q < half; q++) ctx.lineTo(f.pts[q].x, f.pts[q].y);
        ctx.stroke();
        ctx.strokeStyle = tone(f.base, f.top * 0.58, 0.5);
        ctx.beginPath();
        ctx.moveTo(f.pts[half].x, f.pts[half].y);
        for (q = half + 1; q < f.pts.length; q++) ctx.lineTo(f.pts[q].x, f.pts[q].y);
        ctx.stroke();

        drawVeil(f.cap, f.capZ, f.capDx, f.capDy);
      }

      drawMarker();
    }

    /* ---------- hledání výseče pod kurzorem -----------------
       Zpětné promítnutí na rovinu horní plochy. Přesnější než
       hádání podle vzdálenosti od středu plátna — kotouč je
       v perspektivě a jeho střed není střed obrazu.           */
    function pick(sx, sy) {
      var u = (sx - ox) / focal;
      var v = (oy - sy) / focal;
      var den = -stN * v - ctN;
      if (Math.abs(den) < 1e-6) return -1;
      var d = (H / 2 - ctN * CAM) / den;
      if (d < 0.5) return -1;
      var y1 = ctN * (v * d) + stN * (CAM - d);
      var x1 = u * d;
      var x = x1 * cyw + y1 * syw;
      var y = -x1 * syw + y1 * cyw;
      var r = Math.sqrt(x * x + y * y);
      if (r < R_IN * 0.84 || r > R_OUT * 1.09) return -1;
      return segOfMin(minOf(Math.atan2(y, x)));
    }

    /* Minuta pod kurzorem — pro tažení po prstenci. */
    function pickMin(sx, sy) {
      var u = (sx - ox) / focal;
      var v = (oy - sy) / focal;
      var den = -stN * v - ctN;
      if (Math.abs(den) < 1e-6) return null;
      var d = (H / 2 - ctN * CAM) / den;
      if (d < 0.5) return null;
      var y1 = ctN * (v * d) + stN * (CAM - d);
      var x1 = u * d;
      var x = x1 * cyw + y1 * syw;
      var y = -x1 * syw + y1 * cyw;
      return minOf(Math.atan2(y, x));
    }

    /* Vybraná část se natočí k divákovi — dopředu je −90°.    */
    function aimYaw(i) {
      var d = (-Math.PI / 2 - bisOf(i)) - api.yawT;
      d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));   /* nejkratší cestou */
      return api.yawT + d;
    }

    /* ---------- dorovnání ---------------------------------- */
    function step(dt) {
      var kF = api.reduced ? 1 : 1 - Math.pow(0.0006, dt);
      var kS = api.reduced ? 1 : 1 - Math.pow(0.0045, dt);

      api.yaw += (api.yawT - api.yaw) * kS;
      yaw = api.yaw; cyw = Math.cos(yaw); syw = Math.sin(yaw);

      for (var i = 0; i < SEGS.length; i++) {
        var want = liftT[i] + (i === api.hover && i !== api.sel ? LIFT_HOV : 0);
        lift[i] += (want - lift[i]) * kF;
        push[i] += (pushT[i] - push[i]) * kF;
        var wd = dimT[i] * (i === api.hover ? 0.4 : 1);
        dim[i] += (wd - dim[i]) * kF;
      }

      /* DECH — kotouč se sotva znatelně naklání ve sdíleném
         rytmu. Je to dýchání sochy, ne otáčecí podstavec.     */
      var t = TILT + (api.reduced ? 0 : (KJ.breathWave() - 0.5) * 0.028);
      ctN = Math.cos(t); stN = Math.sin(t);

      placeCore();
    }

    /* Nastavení cílů. `soft` je pro variantu „osa“: fáze se
       jen prosvětlí, ale nevysunuje se — ukazatel po ní jezdí
       a vyskočená výseč by mu podjela pod nohama.             */
    function select(i, soft) {
      if (i < 0 || i >= SEGS.length) return;
      api.sel = i;
      for (var s = 0; s < SEGS.length; s++) {
        liftT[s] = (!soft && s === i) ? LIFT_SEL : 0;
        pushT[s] = (!soft && s === i) ? PUSH_SEL : 0;
        dimT[s] = s === i ? 0 : 0.16;
      }
    }

    function setYawNow(v) {
      api.yaw = api.yawT = v;
      yaw = v; cyw = Math.cos(yaw); syw = Math.sin(yaw);
    }

    api.fit = fit;
    api.draw = draw;
    api.step = step;
    api.pick = pick;
    api.pickMin = pickMin;
    api.select = select;
    api.aimAt = function (i) { api.yawT = aimYaw(i); };
    api.setYawNow = setYawNow;
    api.setHover = function (i) { api.hover = i; };
    api.segOfMin = segOfMin;
    api.angOf = angOf;
    api.snap = function () {           /* doskočit bez animace  */
      for (var i = 0; i < SEGS.length; i++) {
        lift[i] = liftT[i]; push[i] = pushT[i]; dim[i] = dimT[i];
      }
      setYawNow(api.yawT);
    };
    api.onResize = function () {
      coarse = KJ.prefersCoarse();
      STEP = coarse ? 0.072 : 0.046;
      fit();
    };

    fit();
    return api;
  };
})();
