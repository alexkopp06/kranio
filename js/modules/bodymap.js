/* ============================================================
   bodymap.js — Mapa těla „Kde to působí“

   Klik / tap / šipky → bod se rozsvítí, z něj se rozeběhnou
   vlnky a vedle se otevře panel.

   Multi-výběr: „Klepněte na všechna místa, kde to cítíte“ —
   dole se skládá věta a nabídne CTA. Malý moment, ale je to
   jediné místo na webu, kde návštěvník mluví o sobě.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-bodymap]");
  if (!root) return;

  var points = KJ.$$("[data-bm-point]", root);
  var tags = KJ.$$("[data-bm-tag]", root);
  var noEl = root.querySelector("[data-bm-no]");
  var nameEl = root.querySelector("[data-bm-name]");
  var textEl = root.querySelector("[data-bm-text]");
  var linkEl = root.querySelector("[data-bm-link]");
  var sentenceEl = root.querySelector("[data-bm-sentence]");
  var canvas = root.querySelector("[data-bm-ripple]");
  var glow = root.querySelector("[data-bm-glow]");
  var zones = KJ.$$("[data-bm-zone]", root);
  var tipEl = root.querySelector("[data-bm-tip]");
  var ctaEl = root.querySelector("[data-bm-cta]");
  if (!points.length) return;

  var AREAS = {
    head:   { no: "01 · Hlava", name: "Migréna a bolesti hlavy", short: "v hlavě",
      text: "Bolesti hlavy a migrény bývají spojené s dlouhodobým napětím v oblasti šíje, čelistí a lebky. Jemná práce podporuje uvolnění těchto ohnisek a obnovuje plynulé proudění tekutin.",
      href: "s-cim-pomaham.html#oblast-01", theme: "migrena", at: [120, 48] },
    neck:   { no: "02 · Šíje a čelist", name: "Napětí v šíji a čelisti", short: "v šíji",
      text: "Usazené napětí v krční páteři a čelistním kloubu ovlivňuje celou horní část těla. Jeho uvolnění často přináší úlevu od bolestí hlavy i lepší rozsah pohybu.",
      href: "s-cim-pomaham.html#oblast-01", theme: "migrena", at: [120, 101] },
    chest:  { no: "03 · Hrudník", name: "Úzkost a nervový systém", short: "v hrudníku",
      text: "U úzkosti a následků stresu propojuji kraniosakrální terapii se Somatic Experiencing. Společně rozšiřují kapacitu nervového systému a obnovují pocit bezpečí v těle.",
      href: "s-cim-pomaham.html#oblast-06", theme: "uzkost", at: [120, 160] },
    belly:  { no: "04 · Bránice a břicho", name: "Stres, vyčerpání, burnout", short: "v břiše",
      text: "Při dlouhodobém stresu zůstává tělo v pohotovosti i tam, kde už žádné nebezpečí nehrozí. Ošetření pomáhá dokončit zadržené stresové reakce a obnovit hlubší stabilitu.",
      href: "s-cim-pomaham.html#oblast-02", theme: "stres", at: [120, 208] },
    back:   { no: "05 · Záda", name: "Chronické bolesti zad", short: "v zádech",
      text: "Dlouhodobé bolesti zad často souvisejí s narušenými pohybovými vzorci a napětím ve fasciích. Práce podporuje rozpuštění těchto vzorců a návrat přirozeného pohybu.",
      href: "s-cim-pomaham.html#oblast-05", theme: "zada", at: [146, 182] },
    pelvis: { no: "06 · Pánev", name: "Po porodu a menopauza", short: "v pánvi",
      text: "Období velkých hormonálních i emočních změn. Jemná podpora nervového systému pomáhá zvládat výkyvy, zklidnit spánek a znovu najít kontakt s vlastním tělem.",
      href: "s-cim-pomaham.html#oblast-04", theme: "poporodu", at: [120, 270] }
  };

  var selected = [];
  var focusKey = null;
  var userTook = false;
  var demoTimer = null;

  /* ---------- vlnky --------------------------------------- */
  var ripples = [];
  var ctx = canvas ? canvas.getContext("2d") : null;
  /* Barva vlnky se čte AŽ PŘI KLEPNUTÍ. Načíst ji jednou při
     startu znamenalo kreslit pořád přílivovou zeleň, i když si
     mapa mezitím vzala barvu tématu.                          */
  function themeHex() {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--theme").trim();
    if (!/^#[0-9a-f]{6}$/i.test(v)) {
      v = getComputedStyle(document.documentElement).getPropertyValue("--tide").trim();
    }
    return /^#[0-9a-f]{6}$/i.test(v) ? v : "#0E6B54";
  }
  var C_TIDE = themeHex();
  function hexA(hex, a) {
    hex = hex.replace("#", "");
    return "rgba(" + parseInt(hex.slice(0,2),16) + "," + parseInt(hex.slice(2,4),16) + "," + parseInt(hex.slice(4,6),16) + "," + a + ")";
  }

  function addRipple(el) {
    if (!canvas || KJ.isReduced()) return;
    var cr = canvas.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    C_TIDE = themeHex();
    ripples.push({
      x: er.left + er.width / 2 - cr.left,
      y: er.top + er.height / 2 - cr.top,
      t: performance.now()
    });
    if (ripples.length > 6) ripples.shift();
  }

  function drawRipples(now) {
    if (!ctx) return;
    var size = KJ.fitCanvas(canvas, ctx);
    ctx.clearRect(0, 0, size.w, size.h);
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      var t = (now - r.t) / 1600;
      if (t > 1) { ripples.splice(i, 1); continue; }
      for (var k = 0; k < 3; k++) {
        var tt = t - k * 0.14;
        if (tt <= 0) continue;
        ctx.beginPath();
        ctx.strokeStyle = hexA(C_TIDE, (1 - tt) * 0.32);
        ctx.lineWidth = 1;
        ctx.arc(r.x, r.y, tt * 62, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /* ---------- panel ----------------------------------------
     quiet = naplň panel, ale nesahej na barvu tématu. Mapa se
     inicializuje až po atlasu; kdyby při startu barvu přepsala,
     přelakovala by linku dechu na migrénu i tomu, kdo přišel
     odkazem na „Období po porodu“. Barvu si mapa bere, teprve
     když je sama ve výřezu nebo když na ni někdo sáhne.        */
  function show(key, quiet) {
    var a = AREAS[key];
    if (!a) return;
    focusKey = key;
    /* Světlo i zvýraznění jdou za popisem — silueta a panel vedle
       sebe musí vždycky mluvit o téže oblasti.                   */
    if (glow && a.at) {
      glow.style.transform = "translate(" + (a.at[0] - 120) + "px," + (a.at[1] - 48) + "px)";
    }
    points.forEach(function (p) {
      p.classList.toggle("is-focus", p.dataset.bmPoint === key);
    });
    /* Teplá skvrna pod kůží se rozsvítí spolu s bodem — teprve
       ona říká „tady“ tak, že to jde ukázat prstem.          */
    zones.forEach(function (z) {
      z.classList.toggle("is-lit", z.dataset.bmZone === key);
    });
    if (noEl) noEl.textContent = a.no;
    if (nameEl) nameEl.textContent = a.name;
    if (textEl) textEl.textContent = a.text;
    if (linkEl) { linkEl.href = a.href; linkEl.hidden = false; }
    if (!quiet && KJ.setTheme) KJ.setTheme(a.theme);
  }

  function sentence() {
    if (!sentenceEl) return;
    if (!selected.length) {
      sentenceEl.hidden = true;
      return;
    }
    var parts = selected.map(function (k) { return AREAS[k].short; });
    var txt;
    if (parts.length === 1) {
      txt = "Napětí " + parts[0] + ". Tělo to obvykle drží ve vrstvách — začneme tam, kde to jde nejsnáz.";
    } else {
      var last = parts.pop();
      txt = "Napětí " + parts.join(", ") + " a " + last +
            " — tyhle oblasti spolu obvykle souvisejí. Právě proto se pracuje s celkem, ne s jedním místem.";
      parts.push(last);
    }
    sentenceEl.hidden = false;
    var t = sentenceEl.querySelector("[data-bm-sentence-text]");
    if (t) t.textContent = txt;
    /* Tlačítko slibuje hlavička modulu, ale nikdo ho nikdy
       neodkryl — [data-bm-cta] se v tomhle souboru vůbec
       nehledalo. Objeví se, jakmile má věta o čem mluvit.    */
    if (ctaEl) ctaEl.hidden = selected.length < 2;
  }

  function toggle(key, el) {
    takeOver();
    var i = selected.indexOf(key);
    if (i > -1) selected.splice(i, 1); else selected.push(key);
    sync();
    if (selected.indexOf(key) > -1) {
      show(key); addRipple(el);
    } else if (selected.length) {
      /* Odvýběr nechával na panelu viset oblast, která už není
         vybraná — text tvrdil „Hrudník“ a na siluetě nesvítilo
         nic. Panel se proto přepne na to, co ještě vybráno je. */
      show(selected[selected.length - 1]);
    }
    sentence();
  }

  function sync() {
    points.forEach(function (p) {
      p.setAttribute("aria-pressed", String(selected.indexOf(p.dataset.bmPoint) > -1));
    });
    tags.forEach(function (t) {
      t.setAttribute("aria-pressed", String(selected.indexOf(t.dataset.bmTag) > -1));
    });
  }

  function takeOver() {
    if (tipEl) tipEl.setAttribute("data-done", "");
    if (userTook) return;
    userTook = true;
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
  }

  points.forEach(function (p, i) {
    p.addEventListener("click", function () { toggle(p.dataset.bmPoint, p); });
    p.addEventListener("keydown", function (e) {
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % points.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + points.length) % points.length;
      if (n !== null) { e.preventDefault(); points[n].focus(); show(points[n].dataset.bmPoint); }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(p.dataset.bmPoint, p); }
    });
    p.addEventListener("focus", function () { if (userTook) show(p.dataset.bmPoint); });
  });

  tags.forEach(function (t) {
    t.addEventListener("click", function () {
      var el = points.filter(function (p) { return p.dataset.bmPoint === t.dataset.bmTag; })[0];
      toggle(t.dataset.bmTag, el || t);
    });
  });

  /* ---------- demo smyčka + běh ---------------------------- */
  var stop = null;
  KJ.visibilityGate(root, function () {
    if (!stop && ctx) stop = KJ.addTicker(drawRipples);
    /* teď je mapa ve výřezu — teprve teď si smí vzít barvu */
    if (focusKey && AREAS[focusKey] && KJ.setTheme) KJ.setTheme(AREAS[focusKey].theme);
    if (!userTook && !demoTimer && !KJ.isReduced()) {
      var keys = points.map(function (p) { return p.dataset.bmPoint; });
      var i = 0;
      demoTimer = setInterval(function () {
        if (userTook) { clearInterval(demoTimer); demoTimer = null; return; }
        /* `quiet` — bez něj volala smyčka KJ.setTheme každé tři
           vteřiny a přelakovala celou stránku i linku dechu.
           Ukázka má být tichá, ne blikající.                 */
        show(keys[i % keys.length], true);
        i++;
      }, 3400);
    }
  }, function () {
    if (stop) { stop(); stop = null; }
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
  });

  show("head", true);
  sentence();
})();
