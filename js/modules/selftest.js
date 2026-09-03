/* ============================================================
   selftest.js — „Je to pro mě?“

   Hlavní konverzní modul. Ne zaškrtávací seznam, ale krátký
   průvodce se skutečným výstupem: jedna otázka na obrazovku,
   pak shrnutí, 1–3 doporučené oblasti, doporučený rozsah a dvě
   akce — objednat se, nebo poslat výsledek Katce e-mailem.

   BEZPEČNOSTNÍ VĚTEV: když někdo označí červenou vlajku
   (čerstvý úraz hlavy či páteře, stav po operaci, horečka),
   výsledek NEJDŘÍV doporučí lékaře a teprve pak nabídne kontakt.

   Nic se nikam neodesílá a nic se neukládá.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-selftest]");
  if (!root) return;

  var steps = KJ.$$("[data-st-step]", root);
  var result = root.querySelector("[data-st-result]");
  var bar = root.querySelector("[data-st-bar]");
  var again = root.querySelector("[data-st-again]");
  if (!steps.length || !result) return;

  /* Otázky. Poslední tři jsou bezpečnostní. */
  var Q = [
    { id: "spanek",  areas: ["stres"] },
    { id: "hlava",   areas: ["migrena"] },
    { id: "vycerpani", areas: ["stres"] },
    { id: "napeti",  areas: ["zada"] },
    { id: "zmena",   areas: ["menopauza", "uzkost"] },
    { id: "poporodu", areas: ["poporodu"] },
    { id: "zastavit", areas: ["uzkost"] },
    { id: "vlajka",  flag: true }
  ];

  var AREA_META = {
    migrena:   { name: "Migréna a bolesti hlavy",  href: "s-cim-pomaham.html#oblast-01", note: "napětí v šíji, čelistech a lebce" },
    stres:     { name: "Stres, vyčerpání, burnout", href: "s-cim-pomaham.html#oblast-02", note: "tělo zůstalo v pohotovosti" },
    menopauza: { name: "Menopauza a přechod",       href: "s-cim-pomaham.html#oblast-03", note: "nový vnitřní rytmus" },
    poporodu:  { name: "Období po porodu",          href: "s-cim-pomaham.html#oblast-04", note: "regenerace pánve, ošetření miminka" },
    zada:      { name: "Chronické bolesti zad",     href: "s-cim-pomaham.html#oblast-05", note: "usazené napětí ve fasciích" },
    uzkost:    { name: "Úzkost a Somatic Experiencing", href: "s-cim-pomaham.html#oblast-06", note: "kapacita nervového systému" }
  };

  var answers = new Array(Q.length).fill(null);
  var index = 0;

  function showStep(i) {
    index = KJ.clamp(i, 0, steps.length);
    steps.forEach(function (s, k) { s.hidden = k !== index; });
    result.hidden = index < steps.length;
    if (bar) bar.style.width = Math.round(((index) / steps.length) * 100) + "%";
    if (index < steps.length) {
      var focusable = steps[index].querySelector("button");
      if (focusable && document.activeElement !== document.body) focusable.focus();
    }
  }

  function answer(i, yes) {
    answers[i] = yes;
    var btns = KJ.$$("[data-st-choice]", steps[i]);
    btns.forEach(function (b) {
      b.dataset.chosen = String((b.dataset.stChoice === "yes") === yes);
    });
    if (i + 1 < steps.length) setTimeout(function () { showStep(i + 1); }, KJ.isReduced() ? 0 : 180);
    else setTimeout(finish, KJ.isReduced() ? 0 : 180);
  }

  steps.forEach(function (step, i) {
    KJ.$$("[data-st-choice]", step).forEach(function (btn) {
      btn.addEventListener("click", function () { answer(i, btn.dataset.stChoice === "yes"); });
    });
    var back = step.querySelector("[data-st-back]");
    if (back) back.addEventListener("click", function () { showStep(i - 1); });
  });

  /* ---------- výsledek -------------------------------------- */
  function finish() {
    var flagged = false;
    var score = {};
    Q.forEach(function (q, i) {
      if (!answers[i]) return;
      if (q.flag) { flagged = true; return; }
      (q.areas || []).forEach(function (a) { score[a] = (score[a] || 0) + 1; });
    });

    var ranked = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; }).slice(0, 3);
    var yesCount = answers.filter(function (a, i) { return a && !Q[i].flag; }).length;

    var flagBox = result.querySelector("[data-st-flag]");
    var mainBox = result.querySelector("[data-st-main]");
    var listBox = result.querySelector("[data-st-areas]");
    var scopeBox = result.querySelector("[data-st-scope]");
    var noneBox = result.querySelector("[data-st-none]");
    var mailLink = result.querySelector("[data-st-mail]");

    if (flagBox) flagBox.hidden = !flagged;

    if (!yesCount) {
      if (mainBox) mainBox.hidden = true;
      if (noneBox) noneBox.hidden = false;
    } else {
      if (noneBox) noneBox.hidden = true;
      if (mainBox) mainBox.hidden = false;
      if (listBox) {
        listBox.innerHTML = "";
        ranked.forEach(function (key) {
          var m = AREA_META[key];
          if (!m) return;
          var a = document.createElement("a");
          a.className = "selftest__area";
          a.href = m.href;
          a.style.setProperty("--area", "var(--t-" + key + ")");
          a.innerHTML = '<span><b>' + m.name + '</b><span>' + m.note + '</span></span>' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
            '<path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          listBox.appendChild(a);
        });
      }
      if (scopeBox) {
        scopeBox.textContent = yesCount >= 4
          ? "Podle toho, co jste označili, jde spíš o dlouhodobější téma. U takových se účinek prohlubuje postupně — proto existují zvýhodněné balíčky. Po prvním sezení si řekneme, co dává smysl."
          : "U akutních obtíží často stačí 1–3 sezení. Po prvním si společně řekneme, co dává smysl dál. První návštěva vás k ničemu nezavazuje.";
      }
    }

    /* mailto s předvyplněnou osnovou — nic se nikam neodesílá */
    if (mailLink) {
      var lines = [];
      Q.forEach(function (q, i) {
        if (!answers[i]) return;
        var label = steps[i] ? (steps[i].querySelector("[data-st-q]") || {}).textContent : null;
        if (label) lines.push("· " + label.trim());
      });
      var body = "Dobrý den,\n\nvyplnila jsem na vašem webu sebe-test. Týká se mě:\n" +
        (lines.length ? lines.join("\n") : "· zatím nic konkrétního, jen si chci popovídat") +
        "\n\n" + (flagged
          ? "Zároveň jsem označila, že jsem po nedávném úrazu nebo operaci — ráda bych se poradila, jestli je terapie teď vhodná.\n\n"
          : "") +
        "Ráda bych se objednala na první sezení. Vyhovoval by mi termín:\n\n\nDěkuji,\n";
      mailLink.href = "mailto:katkajuttnerova@seznam.cz" +
        "?subject=" + encodeURIComponent("Objednání — podle sebe-testu na webu") +
        "&body=" + encodeURIComponent(body);
    }

    showStep(steps.length);
    var h = result.querySelector("h3");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  if (again) {
    again.addEventListener("click", function () {
      answers = new Array(Q.length).fill(null);
      KJ.$$("[data-st-choice]", root).forEach(function (b) { b.dataset.chosen = "false"; });
      showStep(0);
    });
  }

  showStep(0);
})();
