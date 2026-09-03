/* ============================================================
   journey.js — Cesta k úlevě (4 fáze)
   a timeline.js chování pro Sto let jemné práce.

   Kroky se samy posouvají v klidném rytmu; najetím nebo tapem
   se cesta zastaví na tom, který návštěvníka zajímá.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  KJ.$$("[data-journey]").forEach(function (root) {
    var steps = KJ.$$("[data-journey-step]", root);
    if (!steps.length) return;

    var i = 0, timer = null, held = false;

    function show(k) {
      i = ((k % steps.length) + steps.length) % steps.length;
      steps.forEach(function (s, n) { s.classList.toggle("is-on", n === i); });
    }

    function play() {
      if (timer || KJ.isReduced()) return;
      timer = setInterval(function () { if (!held) show(i + 1); }, 3200);
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; } }

    steps.forEach(function (s, k) {
      s.addEventListener("pointerenter", function () { held = true; show(k); });
      s.addEventListener("pointerleave", function () { held = false; });
      s.addEventListener("focus", function () { held = true; show(k); });
      s.addEventListener("blur", function () { held = false; });
      s.addEventListener("click", function () { held = true; show(k); });
    });

    KJ.visibilityGate(root, play, pause);
    show(0);
    if (KJ.isReduced()) steps.forEach(function (s) { s.classList.add("is-on"); });
  });
})();
