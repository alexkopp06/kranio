/* ============================================================
   stillpoint.js — model sezení

   Živá křivka a tři kroky:
     01 Neklid → 02 Still point → 03 Návrat

   Během přehrávání se křivka viditelně zklidní, na chvíli
   ZASTAVÍ a vrátí se pomalejší a hlubší. Vedle běží popis toho,
   co se právě děje, a počítadlo rytmu.

   Zvuk je volitelný, výchozí stav vypnuto, nikdy autoplay.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-stillpoint]");
  if (!root) return;

  var canvas = root.querySelector("[data-still-canvas]");
  var rateEl = root.querySelector("[data-still-rate]");
  var descEl = root.querySelector("[data-still-desc]");
  var steps = KJ.$$("[data-still-step]", root);
  var playBtn = root.querySelector("[data-still-play]");
  var stepBtn = root.querySelector("[data-still-stepper]");
  var soundBtn = root.querySelector("[data-still-sound]");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var cs = getComputedStyle(document.documentElement);
  var C_TIDE = cs.getPropertyValue("--tide").trim() || "#0E6B54";
  var C_INK3 = cs.getPropertyValue("--ink-3").trim() || "#66716B";
  var C_LINE = cs.getPropertyValue("--line").trim() || "#DCDFD7";
  function hexA(hex, a) {
    hex = hex.replace("#", "");
    return "rgba(" + parseInt(hex.slice(0,2),16) + "," + parseInt(hex.slice(2,4),16) + "," + parseInt(hex.slice(4,6),16) + "," + a + ")";
  }

  /* Časová osa modelu (ms) */
  var PHASES = [
    { at: 0,     step: 0, rate: "≈ 11 cyklů / min", freq: 1.00, amp: 0.52, noise: 0.42,
      desc: "Takhle to vypadá, když se nic neděje. Rytmus je rychlejší, mělký a trochu roztřesený — tělo hlídá." },
    { at: 5200,  step: 1, rate: "zpomaluje…",       freq: 0.62, amp: 0.72, noise: 0.14,
      desc: "Pod rukama se rytmus začne prodlužovat. Amplituda roste, tělo přestává hlídat." },
    { at: 9200,  step: 1, rate: "—",                freq: 0.00, amp: 0.06, noise: 0.00,
      desc: "Still point. Rytmus se sám na chvíli zastavil. Nevynucuje se — nastane, když je bezpečně." },
    { at: 12600, step: 2, rate: "≈ 9 cyklů / min",  freq: 0.52, amp: 0.94, noise: 0.04,
      desc: "Návrat. Rytmus je pomalejší, plnější a souměrnější než na začátku. Tělo si to pamatuje." }
  ];
  var TOTAL = 17000;

  var playing = false;
  var t = 0;
  var last = performance.now();
  var cur = { freq: 1, amp: 0.52, noise: 0.42 };
  var phaseIndex = -1;
  var clock = 0;

  var audioCtx = null, osc = null, gain = null, soundOn = false;

  function phaseAt(ms) {
    var p = PHASES[0];
    for (var i = 0; i < PHASES.length; i++) if (ms >= PHASES[i].at) p = PHASES[i];
    return p;
  }
  function indexAt(ms) {
    var idx = 0;
    for (var i = 0; i < PHASES.length; i++) if (ms >= PHASES[i].at) idx = i;
    return idx;
  }

  function applyPhase(i) {
    if (i === phaseIndex) return;
    phaseIndex = i;
    var p = PHASES[i];
    if (rateEl) rateEl.textContent = p.rate;
    if (descEl) descEl.textContent = p.desc;
    steps.forEach(function (s, k) { s.setAttribute("aria-current", String(k === p.step)); });
  }

  function setPlaying(on) {
    playing = on;
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(on));
      var l = playBtn.querySelector("[data-label]");
      if (l) l.textContent = on ? "Zastavit" : (t > 0 && t < TOTAL ? "Pokračovat" : "Přehrát model");
    }
  }

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      if (playing) { setPlaying(false); return; }
      if (t >= TOTAL) { t = 0; phaseIndex = -1; applyPhase(0); }
      setPlaying(true);
    });
  }
  if (stepBtn) {
    stepBtn.addEventListener("click", function () {
      setPlaying(false);
      var i = (indexAt(t) + 1) % PHASES.length;
      t = PHASES[i].at + 1;
      applyPhase(i);
    });
  }
  steps.forEach(function (s, k) {
    s.addEventListener("click", function () {
      setPlaying(false);
      var target = 0;
      for (var i = 0; i < PHASES.length; i++) if (PHASES[i].step === k) { target = i; break; }
      t = PHASES[target].at + 1;
      applyPhase(target);
    });
  });

  /* ---------- zvuk: jen na výslovné kliknutí ---------------- */
  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      soundBtn.setAttribute("aria-pressed", String(soundOn));
      var l = soundBtn.querySelector("[data-label]");
      if (l) l.textContent = soundOn ? "Zvuk zapnutý" : "Zvuk";
      if (soundOn) {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { soundOn = false; return; }
          if (!audioCtx) {
            audioCtx = new AC();
            osc = audioCtx.createOscillator();
            gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = 108;
            gain.gain.value = 0;
            osc.connect(gain).connect(audioCtx.destination);
            osc.start();
          }
          if (audioCtx.state === "suspended") audioCtx.resume();
        } catch (e) { soundOn = false; }
      } else if (gain && audioCtx) {
        gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
      }
    });
  }

  /* ---------- kreslení --------------------------------------- */
  function frame(now) {
    var dt = Math.min(now - last, 60);
    last = now;

    if (playing && !KJ.isReduced()) {
      t += dt;
      if (t >= TOTAL) { t = TOTAL; setPlaying(false); }
      applyPhase(indexAt(t));
    }

    var target = phaseAt(t);
    cur.freq  += (target.freq  - cur.freq)  * 0.035;
    cur.amp   += (target.amp   - cur.amp)   * 0.035;
    cur.noise += (target.noise - cur.noise) * 0.05;

    clock += (dt / 1000) * cur.freq;

    if (gain && audioCtx && soundOn) {
      gain.gain.setTargetAtTime(cur.freq < 0.08 ? 0 : 0.035 * cur.amp, audioCtx.currentTime, 0.25);
      if (osc) osc.frequency.setTargetAtTime(96 + cur.freq * 26, audioCtx.currentTime, 0.4);
    }

    var size = KJ.fitCanvas(canvas, ctx);
    var W = size.w, H = size.h, mid = H / 2;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = hexA(C_LINE, 1); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();

    var amp = H * 0.34 * cur.amp;
    var cycles = 3.2;

    /* světelné pole při still pointu */
    if (cur.freq < 0.22) {
      var g = ctx.createRadialGradient(W / 2, mid, 0, W / 2, mid, W * 0.4);
      g.addColorStop(0, hexA(C_TIDE, 0.12 * (1 - cur.freq / 0.22)));
      g.addColorStop(1, hexA(C_TIDE, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    ctx.lineWidth = 1.7;
    ctx.strokeStyle = hexA(C_TIDE, 0.92);
    ctx.beginPath();
    for (var x = 0; x <= W; x += 2) {
      var ph = ((x / W) * cycles + clock) * Math.PI * 2;
      var y = mid - (Math.sin(ph) * amp
            + Math.sin(ph * 3.3 + clock * 5) * amp * cur.noise * 0.45
            + Math.sin(ph * 7.1) * amp * cur.noise * 0.22);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    /* postup modelu */
    ctx.fillStyle = hexA(C_INK3, 0.28);
    ctx.fillRect(0, H - 2, W * (t / TOTAL), 2);
  }

  var stop = null;
  KJ.visibilityGate(root, function () {
    if (!stop) { last = performance.now(); stop = KJ.addTicker(frame); }
  }, function () {
    if (stop) { stop(); stop = null; }
    if (playing) setPlaying(false);
    if (gain && audioCtx) gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  });

  applyPhase(0);
  requestAnimationFrame(function (x) { last = x; frame(x); });
})();
