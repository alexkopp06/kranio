/* ============================================================
   breath-line.js — SIGNATURE

   Jedna živá vlasová linka vedená podél levého okraje celého
   dokumentu. Dělá šest věcí najednou:

     · dýchá ve sdíleném rytmu 11 s
     · je ukazatel scrollu (vyplněná část = kde jsem)
     · přebírá barvu tématu sekce, kterou právě projíždíte
     · v Rytmech těla se rozdvojí do tří stop
     · ve Still pointu se zklidní, ZASTAVÍ a vrátí se pomalejší
     · v patičce jednou vydechne a zmizí

   Proč canvas a ne SVG: dokument je 8–14 tisíc px vysoký.
   Fixed canvas kreslí jen viditelný výřez — konstantních
   ~0,4 ms/snímek nezávisle na délce stránky.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var canvas = document.querySelector("[data-breathline]");
  if (!canvas) return;

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  var W = 0, H = 0;

  /* ---------- barvy ------------------------------------------
     --theme je odkaz na jinou proměnnou, takže ji nepřečteme
     přímo. Sonda s color: var(--theme) nám vrátí spočtenou
     hodnotu — jeden zdroj pravdy zůstává v CSS.               */
  var probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;color:var(--theme)";
  document.body.appendChild(probe);

  function readTheme() {
    var c = getComputedStyle(probe).color;
    var m = c.match(/(\d+(?:\.\d+)?)/g);
    return m ? [ +m[0], +m[1], +m[2] ] : [ 14, 107, 84 ];
  }
  var themeRGB = readTheme();
  var targetRGB = themeRGB.slice();
  window.addEventListener("kj:theme", function () { targetRGB = readTheme(); });

  var restRGB = [ 198, 203, 191 ];   /* --line-strong: kam jsem ještě nedošel */

  function rgba(c, a) {
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + a + ")";
  }

  /* ---------- stav -------------------------------------------- */
  var mode = "flow";        /* flow | split | still | exhale */
  var modeT = 1;
  var stillStart = 0;
  var slowFactor = 1;
  var exhale = 1;
  var progress = 0;
  var progressEased = 0;
  var pulses = [];

  var AMP_BASE = 3.6;
  var WAVELENGTH = 210;     /* px dokumentu na jednu vlnu */

  function resize() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", KJ.debounce(resize, 120), { passive: true });

  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress = max > 0 ? KJ.clamp(window.scrollY / max, 0, 1) : 0;
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  /* ---------- režimy podle sekce ------------------------------ */
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    modeT = 0;
    canvas.dataset.breath = next;      /* aktuální rytmus je vidět v DOM */
    if (next === "still") stillStart = performance.now();
  }
  KJ.setBreathMode = setMode;

  /* Rytmus linky řídí sekce, která zrovna drží prostřed obrazovky.
     Sledujeme přes KJ.watch, ne IntersectionObserver: zóny bývají
     zároveň [data-reveal] a maska clip-path je pozorovateli skryje
     (viz core.js). Linka by pak celý web dýchala jedním rytmem.  */
  var zones = KJ.$$("[data-breath-mode]");
  if (zones.length && KJ.watch) {
    var pick = function () {
      var active = null;
      for (var i = 0; i < zones.length; i++) {
        var r = zones[i].getBoundingClientRect();
        if (r.top < window.innerHeight * 0.62 && r.bottom > window.innerHeight * 0.38) {
          active = zones[i].dataset.breathMode;
          break;
        }
      }
      setMode(active || "flow");
    };
    /* pásmo watcheru odpovídá testu výše, aby se události kryly */
    zones.forEach(function (z) { KJ.watch(z, "-38% 0px -38% 0px", pick, pick, false); });
    pick();
  }

  /* Rázová vlna z hero scény — vlna, která dojde ke kosti křížové,
     vystoupí z plátna a pokračuje jako tahle linka.              */
  window.addEventListener("kj:pulse", function () {
    if (KJ.isReduced()) return;
    if (pulses.length > 3) return;
    pulses.push({ t: performance.now(), life: 2600 });
  });

  /* ---------- kreslení ---------------------------------------- */
  var cx = 0;

  function amplitudeAt(y, now) {
    var a = AMP_BASE;

    if (mode === "still") {
      var el = now - stillStart;
      if (el < 900) {                       /* 1. rozšíření do plné amplitudy */
        a = AMP_BASE + (AMP_BASE * 2.4) * (el / 900);
      } else if (el < 2100) {               /* 2. zklidnění */
        a = (AMP_BASE * 3.4) * (1 - ((el - 900) / 1200) * 0.94);
      } else if (el < 3500) {               /* 3. ZASTAVENÍ — 1,4 s ticha */
        a = AMP_BASE * 0.18;
      } else {                              /* 4. návrat, pomalejší a hlubší */
        a = AMP_BASE * 1.55;
        slowFactor = 0.72;
      }
    }

    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var pt = (now - p.t) / p.life;
      if (pt > 1) continue;
      var head = pt * (H + 260) - 130;
      var d = Math.abs(y - head);
      if (d < 150) a += (AMP_BASE * 2.6) * (1 - d / 150) * (1 - pt);
    }

    return a * exhale;
  }

  function drawTrack(offsetX, waveLen, ampScale, alpha, colorTop, colorBottom, now, phaseShift, withHead) {
    var scroll = window.scrollY;
    var breath = KJ.isReduced() ? 0.5 : KJ.breathWave();
    var boundary = progressEased * H;
    var drift = KJ.isReduced() ? 0 : (now / 5200);

    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";

    /* dva průchody: nad hranicí barva tématu, pod ní klidová */
    for (var pass = 0; pass < 2; pass++) {
      var y0 = pass === 0 ? 0 : boundary;
      var y1 = pass === 0 ? boundary : H;
      if (y1 - y0 < 0.5) continue;

      ctx.beginPath();
      ctx.strokeStyle = pass === 0 ? rgba(colorTop, alpha) : rgba(colorBottom, alpha * 0.85);

      var step = 3;
      for (var y = y0; y <= y1 + step; y += step) {
        var yy = Math.min(y, y1);
        var amp = amplitudeAt(yy, now) * ampScale;
        var wob = KJ.isReduced() ? 0 : (breath - 0.5) * 0.5;
        var phase = ((yy + scroll) / waveLen) * Math.PI * 2 * slowFactor + phaseShift + drift;
        var x = cx + offsetX + Math.sin(phase) * amp * (1 + wob);
        if (yy === y0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    /* hlava = kde právě jsem */
    if (withHead && exhale > 0.05) {
      var hy = boundary;
      var hAmp = amplitudeAt(hy, now) * ampScale;
      var hPhase = ((hy + scroll) / waveLen) * Math.PI * 2 * slowFactor + phaseShift + drift;
      var hx = cx + Math.sin(hPhase) * hAmp;
      var pulse = KJ.isReduced() ? 1 : (0.75 + KJ.breathWave() * 0.45);

      ctx.beginPath();
      ctx.fillStyle = rgba(colorTop, 0.14 * exhale);
      ctx.arc(hx, hy, 7.5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = rgba(colorTop, 0.95 * exhale);
      ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    cx = W * 0.5;

    for (var i = 0; i < 3; i++) themeRGB[i] += (targetRGB[i] - themeRGB[i]) * 0.06;
    progressEased += (progress - progressEased) * 0.14;
    modeT = Math.min(1, modeT + 0.02);

    var wantExhale = (mode === "exhale") ? 0 : 1;
    exhale += (wantExhale - exhale) * 0.03;

    if (mode !== "still") slowFactor += (1 - slowFactor) * 0.01;
    if (exhale < 0.02) return;

    if (mode === "split") {
      /* Tři stopy — 70/min · 14/min · 9/min. Sekce, která
         režim zapínala, na webu už není; kód zůstává, protože
         se zapíná atributem data-breath-mode="split" a nestojí
         nic, dokud ho někdo nepoužije. */
      var spread = Math.min(W * 0.3, 9);
      drawTrack(-spread, WAVELENGTH * 0.30, 0.55, 0.55 * modeT + 0.2, themeRGB, restRGB, now, 0,   false);
      drawTrack(0,       WAVELENGTH * 0.75, 0.80, 0.75,               themeRGB, restRGB, now, 1.7, true);
      drawTrack(spread,  WAVELENGTH * 1.35, 1.15, 0.55 * modeT + 0.2, themeRGB, restRGB, now, 3.1, false);
    } else {
      drawTrack(0, WAVELENGTH, 1, 0.9, themeRGB, restRGB, now, 0, true);
    }

    if (pulses.length) {
      pulses = pulses.filter(function (p) { return now - p.t < p.life; });
    }
  }

  KJ.addTicker(frame);

  /* Reduced motion: linka zůstane a pořád nese informaci
     (kde jsem), jen se nehýbe.                                 */
})();
