/* ============================================================
   voices.js — Slova klientů

   POZOR: sekce je záměrně VYPNUTÁ, dokud nebudou k dispozici
   skutečné reference se souhlasem klientů. Falešné reference na
   webu zdravotně orientované služby jsou eticky i právně problém.

   Jak sekci zapnout, až reference budou:
     1) v HTML odkomentujte blok <section data-voices> …
     2) vyplňte skutečné citace, jméno (klidně křestní + iniciála)
        a téma
     3) hotovo — tenhle skript se sám najde a rozběhne

   Návod pro klientku je v README.md, kapitola „Reference“.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-voices]");
  if (!root) return;                       /* sekce není na stránce → konec */

  var track = root.querySelector("[data-voices-track]");
  var counter = root.querySelector("[data-voices-counter]");
  var prev = root.querySelector("[data-voices-prev]");
  var next = root.querySelector("[data-voices-next]");
  var items = KJ.$$("[data-voice]", root);
  if (!track || !items.length) return;

  var index = 0;

  function go(i) {
    index = KJ.clamp(i, 0, items.length - 1);
    var target = items[index];
    track.scrollTo({
      left: target.offsetLeft - track.offsetLeft,
      behavior: KJ.isReduced() ? "auto" : "smooth"
    });
    sync();
  }

  function sync() {
    if (counter) counter.textContent = String(index + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0");
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === items.length - 1;
  }

  if (prev) prev.addEventListener("click", function () { go(index - 1); });
  if (next) next.addEventListener("click", function () { go(index + 1); });

  track.addEventListener("scroll", KJ.debounce(function () {
    var mid = track.scrollLeft + track.clientWidth / 2;
    var best = 0, bestD = Infinity;
    items.forEach(function (it, i) {
      var c = it.offsetLeft - track.offsetLeft + it.offsetWidth / 2;
      var d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    index = best; sync();
  }, 120), { passive: true });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  });

  /* tažení myší */
  var down = false, sx = 0, sl = 0;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch") return;
    down = true; sx = e.clientX; sl = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", function (e) {
    if (!down) return;
    track.scrollLeft = sl - (e.clientX - sx);
  });
  track.addEventListener("pointerup", function () { down = false; });
  track.addEventListener("pointercancel", function () { down = false; });

  sync();
})();
