/* ============================================================
   timeline.js — Sto let jemné práce

   1899 Still → 1930 Sutherland → 1970 Upledger → dnes biodynamika

   Uzly se odkrývají scrollem (rodina ODKRYTÍ) a jejich schémata
   se dokreslují (rodina KRESBA). Osa se zároveň napojí na linku
   dechu: dokud jsme v ní, linka drží klidný proud.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-timeline]");
  if (!root) return;

  var nodes = KJ.$$("[data-tl-node]", root);
  if (!nodes.length) return;

  if (KJ.isReduced() || !KJ.watch) {
    nodes.forEach(function (n) { n.classList.add("is-revealed"); });
    return;
  }

  /* Přes KJ.watch, ne IntersectionObserver — uzly mohou ležet
     uvnitř zamaskovaného [data-reveal] (viz core.js).           */
  nodes.forEach(function (node, i) {
    KJ.watch(node, "0px 0px -18% 0px", function () {
      setTimeout(function () {
        node.classList.add("is-revealed");
        var svg = node.querySelector("[data-draw]");
        if (svg && window.Motion) window.Motion.draw(svg, { duration: 1100, stagger: 45 });
      }, Math.max(0, i * 90));
    }, null, true);
  });
})();
