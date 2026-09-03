/* ============================================================
   session-wheel.js — 75 minut jako prostorové kolo

   Tři části sezení (15 · 50 · 10 min). Uživatel kolem otáčí
   tažením nebo si část vybere; kolo se k vybrané výseči samo
   natočí a ta se povysune.

   Kreslení obstarává wheel-core.js — týž renderer, jaký běží
   na úvodní stránce pod ciferníkem. Tady zbyla jen obsluha:
   co dělá myš, co záložky, co se má napsat do textu vedle.

   Dřív měla každá část ještě sadu „momentů“ (0–5, 5–15 …),
   které přepínaly texty ve třech sloupcích. Zmizely: kdo se
   ptá, co ho čeká, potřebuje tři odpovědi, ne třináct. Obsah
   momentů se slil do jednoho odstavce na sloupec.

   Bez JS (nebo když canvas selže) zůstane v HTML čitelný
   seznam tří částí. Graf je vrstva navíc, ne nosič informace.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ || !KJ.createWheel) return;

  var root = document.querySelector("[data-wheel]");
  if (!root) return;

  var canvas = root.querySelector("[data-wheel-canvas]");
  var disc = root.querySelector("[data-wheel-disc]");
  var numEl = root.querySelector("[data-wheel-num]");
  var spanEl = root.querySelector("[data-wheel-span]");
  var tabs = KJ.$$("[data-wheel-tab]", root);
  var panels = KJ.$$("[data-wheel-panel]", root);
  /* Šipky a odečet „02 / 03“ jsou nepovinné. Na stránce Průběh
     stačí legenda, na úvodní stránce ne: tam je kolo první věc,
     do které chce člověk kliknout, a musí být vidět, že se
     přepíná — i kdyby na legendu vedle vůbec nedohlédl.      */
  var steps = KJ.$$("[data-wheel-step]", root);
  var countEl = root.querySelector("[data-wheel-count]");
  if (!canvas || !disc || !tabs.length || tabs.length !== panels.length) return;

  /* Minuty jsou jediný zdroj pravdy: z nich se počítají úhly
     výsečí i rysky na podstavě. Texty jsou v HTML.            */
  var SEGS = [
    { from: 0,  to: 15 },
    { from: 15, to: 65 },
    { from: 65, to: 75 }
  ];
  var TOTAL = 75;

  var wheel = KJ.createWheel({
    canvas: canvas, disc: disc, segs: SEGS, total: TOTAL,
    tickAt: [0, 15, 65]
  });
  if (!wheel) return;

  var sel = 1;                 /* těžiště sezení je na lehátku */
  var numShown = 0, numT = 0;
  var reduced = KJ.isReduced();
  var coarse = KJ.prefersCoarse();
  var dragging = false, dragX = 0, dragV = 0, dragged = false;

  /* ---------- propojení s textem ----------------------------- */
  function select(i, focus) {
    if (i < 0 || i >= SEGS.length) return;
    sel = i;
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
      if (k === i && focus) t.focus();
    });
    panels.forEach(function (p, k) {
      if (k === i) p.setAttribute("data-active", ""); else p.removeAttribute("data-active");
    });
    wheel.select(i);
    wheel.aimAt(i);
    numT = SEGS[i].to - SEGS[i].from;
    if (spanEl) spanEl.textContent = SEGS[i].from + " → " + SEGS[i].to;
    if (countEl) {
      countEl.innerHTML = "";
      var b = document.createElement("span");
      b.textContent = (i + 1 < 10 ? "0" : "") + (i + 1);
      countEl.appendChild(b);
      countEl.appendChild(document.createTextNode(" / 0" + SEGS.length));
    }
    steps.forEach(function (btn) {
      var d = parseFloat(btn.getAttribute("data-wheel-step")) || 0;
      /* Krajní šipka se nevypíná, jen zešedne a přestane\u00a0být
         cílem tabulátoru — mizející tlačítko posouvá sousedy.  */
      var dead = (d < 0 && i === 0) || (d > 0 && i === SEGS.length - 1);
      btn.setAttribute("aria-disabled", String(dead));
      btn.tabIndex = dead ? -1 : 0;
    });
  }

  /* ---------- ovládání --------------------------------------- */
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i); });
    t.addEventListener("keydown", function (e) {
      var k = e.key, n = -1;
      if (k === "ArrowRight" || k === "ArrowDown") n = (i + 1) % tabs.length;
      else if (k === "ArrowLeft" || k === "ArrowUp") n = (i + tabs.length - 1) % tabs.length;
      else if (k === "Home") n = 0;
      else if (k === "End") n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      select(n, true);
    });
  });

  steps.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = parseFloat(btn.getAttribute("data-wheel-step")) || 0;
      select(KJ.clamp(sel + d, 0, SEGS.length - 1));
    });
  });

  disc.addEventListener("pointerdown", function (e) {
    dragging = true; dragged = false; dragV = 0;
    dragX = e.clientX;
    if (disc.setPointerCapture) { try { disc.setPointerCapture(e.pointerId); } catch (er) {} }
  });
  disc.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    if (dragging) {
      var dx = (e.clientX - dragX) / Math.max(r.width, 1) * 2.4;
      if (Math.abs(e.clientX - dragX) > 3) dragged = true;
      wheel.yawT += dx;
      wheel.setYawNow(wheel.yawT);
      dragV = dx;
      dragX = e.clientX;
    } else if (!coarse) {
      var h = wheel.pick(e.clientX - r.left, e.clientY - r.top);
      wheel.setHover(h);
      disc.style.cursor = h >= 0 ? "pointer" : "grab";
    }
  });
  disc.addEventListener("pointerup", function (e) {
    if (!dragging) return;
    dragging = false;
    if (!dragged) {
      var r = canvas.getBoundingClientRect();
      var i = wheel.pick(e.clientX - r.left, e.clientY - r.top);
      if (i >= 0) select(i);
      return;
    }
    wheel.yawT += KJ.clamp(dragV * 5, -0.5, 0.5);   /* krátký doběh */
  });
  disc.addEventListener("pointercancel", function () { dragging = false; });
  disc.addEventListener("pointerleave", function () {
    wheel.setHover(-1);
    if (!dragging) disc.style.cursor = "grab";
  });

  window.addEventListener("resize", KJ.debounce(function () {
    coarse = KJ.prefersCoarse();
    wheel.onResize();
  }, 150), { passive: true });

  /* ---------- smyčka ----------------------------------------- */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    /* Při tažení si yaw řídí ruka; dorovnání by s ní zápasilo. */
    wheel.step(dragging ? 0 : dt);

    /* Číslo v díře nepřeskakuje — dopočítá se ke svému cíli.
       Odečet, který cvakne, čte oko jako přepnutí; odečet,
       který doběhne, jako pohyb téhož kola.                   */
    if (numShown !== numT) {
      var d = numT - numShown;
      numShown += Math.abs(d) < 0.5 ? d : d * (reduced ? 1 : 1 - Math.pow(0.0015, dt));
      if (numEl) numEl.textContent = String(Math.round(numShown));
    }

    wheel.draw();
  }

  /* ---------- start ------------------------------------------ */
  var stopTicker = null;
  KJ.visibilityGate(root, function () {
    if (stopTicker) return;
    wheel.fit();
    last = performance.now();
    stopTicker = KJ.addTicker(frame);
  }, function () {
    if (stopTicker) { stopTicker(); stopTicker = null; }
  });

  root.dataset.ready = "1";
  disc.style.cursor = "grab";
  select(sel);
  wheel.snap();
  numShown = numT;
  if (numEl) numEl.textContent = String(Math.round(numShown));
  wheel.fit();
  wheel.draw();
})();
