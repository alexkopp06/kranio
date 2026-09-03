/* ============================================================
   motion.js — pohybový systém
   Pět rodin pohybu. Jiná animace na webu není.

     1 DECH     11s smyčka, ±2–4 %      hero, sféra, aktivní stavy
     2 PŘÍLIV   zaplavení zdola, 420ms  hover, přechody, ukazatel
     3 KRESBA   stroke-dashoffset       schémata a diagramy
     4 ODKRYTÍ  maska po řádcích        veškerý text (v core.js)
     5 PROUD    částice po dráze        hero, dechová sféra

   Všechno ostatní se sem musí vejít, nebo to na web nepatří.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var D = { micro: 180, ui: 320, reveal: 700, scene: 1400, tide: 420, stagger: 60 };
  var E = { out: "cubic-bezier(.22,1,.36,1)", inOut: "cubic-bezier(.7,0,.2,1)" };

  /* ---------- 3 KRESBA --------------------------------------
     SVG se dokresluje. Od těžiště ven nebo shora dolů,
     nikdy náhodně. Pořadí určuje pořadí v DOM.                 */
  function strokables(svg) {
    return KJ.$$("path, line, polyline, circle, ellipse", svg)
      .filter(function (p) { return !p.hasAttribute("data-nodraw"); });
  }

  function draw(svg, opts) {
    opts = opts || {};
    var paths = strokables(svg);

    if (KJ.isReduced()) {
      paths.forEach(function (p) { p.style.strokeDasharray = "none"; p.style.strokeDashoffset = "0"; });
      svg.classList.add("is-drawn");
      return;
    }

    var dur = opts.duration || D.scene * 0.75;
    var stagger = opts.stagger || 40;

    paths.forEach(function (p, i) {
      var len = 0;
      try { len = p.getTotalLength ? p.getTotalLength() : 0; } catch (e) { len = 0; }
      if (!len) return;
      p.style.transition = "none";
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      /* dvojitý rAF: přinutí prohlížeč zapsat výchozí stav */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          p.style.transition = "stroke-dashoffset " + dur + "ms " + E.out + " " + (i * stagger) + "ms";
          p.style.strokeDashoffset = "0";
        });
      });
    });
    svg.classList.add("is-drawn");
  }

  /* Dokreslí se, až když je schéma vidět. Jednou. */
  function drawOnView(svg, opts) {
    if (!svg || svg.dataset.drawBound === "1") return;
    svg.dataset.drawBound = "1";
    KJ.whenVisible(svg, function () { draw(svg, opts); }, "0px 0px -10% 0px");
  }

  function undraw(svg) {
    strokables(svg).forEach(function (p) {
      var len = 0;
      try { len = p.getTotalLength ? p.getTotalLength() : 0; } catch (e) { return; }
      if (!len) return;
      p.style.transition = "none";
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    svg.classList.remove("is-drawn");
  }

  /* ---------- 1 DECH ---------------------------------------- */
  function breathe(el, opts) {
    opts = opts || {};
    if (KJ.isReduced()) return function () {};
    var amp = opts.amplitude == null ? 0.03 : opts.amplitude;   /* ±3 % */
    var prop = opts.property || "scale";
    return KJ.addTicker(function () {
      var w = KJ.breathWave();
      if (prop === "scale") el.style.transform = "scale(" + (1 + (w - 0.5) * 2 * amp) + ")";
      else if (prop === "opacity") el.style.opacity = String(1 - amp + w * amp);
    });
  }

  /* ---------- 2 PŘÍLIV -------------------------------------- */
  function tide(el, to, opts) {
    opts = opts || {};
    var dur = KJ.isReduced() ? 0 : (opts.duration || D.tide);
    var dir = opts.direction || "up";
    var from = dir === "up" ? "inset(100% 0 0 0)"
             : dir === "left" ? "inset(0 100% 0 0)"
             : "inset(0 0 0 100%)";
    el.style.transition = "none";
    if (to === 1) {
      el.style.clipPath = from;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.transition = "clip-path " + dur + "ms " + E.out;
          el.style.clipPath = "inset(0 0 0 0)";
        });
      });
    } else {
      el.style.transition = "clip-path " + dur + "ms " + E.out;
      el.style.clipPath = from;
    }
  }

  function stagger(els, cls, step) {
    step = step == null ? D.stagger : step;
    els.forEach(function (el, i) {
      setTimeout(function () { el.classList.add(cls || "is-revealed"); }, KJ.isReduced() ? 0 : i * step);
    });
  }

  /* ---------- Střídavý přechod panelu -----------------------
     Starý panel zmizí, teprve pak naskočí nový. Nikdy prolínačka
     — jinak jsou na půl sekundy vidět dva texty přes sebe.     */
  function swapPanel(oldEl, newEl, done) {
    var half = KJ.isReduced() ? 0 : 240;
    if (oldEl && oldEl !== newEl) {
      oldEl.style.transition = "opacity " + half + "ms " + E.inOut;
      oldEl.style.opacity = "0";
    }
    setTimeout(function () {
      if (oldEl && oldEl !== newEl) { oldEl.hidden = true; oldEl.style.opacity = ""; oldEl.style.transition = ""; }
      if (newEl) {
        newEl.hidden = false;
        newEl.style.transition = "none";
        newEl.style.opacity = "0";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            newEl.style.transition = "opacity " + half + "ms " + E.out;
            newEl.style.opacity = "1";
          });
        });
      }
      if (done) done();
    }, half);
  }

  /* ---------- Číslo, které doběhne k hodnotě ---------------- */
  function countTo(el, to, opts) {
    opts = opts || {};
    var from = opts.from == null ? 0 : opts.from;
    var dur = KJ.isReduced() ? 0 : (opts.duration || 900);
    var fmt = opts.format || function (v) { return Math.round(v); };
    if (!dur) { el.textContent = fmt(to); return; }
    var start = performance.now();
    var stop = KJ.addTicker(function (now) {
      var t = KJ.clamp((now - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (t >= 1) stop();
    });
  }

  window.Motion = {
    D: D, E: E,
    draw: draw, drawOnView: drawOnView, undraw: undraw,
    breathe: breathe, tide: tide,
    stagger: stagger, swapPanel: swapPanel, countTo: countTo
  };

  /* Schémata označená data-draw se dokreslí samy. */
  function autoDraw() {
    KJ.$$("[data-draw]").forEach(function (svg) {
      if (svg.closest("[data-atlas], [data-help-row]")) return;  /* ty řídí jejich modul */
      drawOnView(svg);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoDraw);
  else autoDraw();
})();
