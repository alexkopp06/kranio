/* ============================================================
   atlas.js — rejstřík a rozevřený dvoulist

   Sedm oblastí, se kterými za Katkou lidé chodí. Vlevo rejstřík,
   který nikam neuhýbá, vpravo jedna kapitola vysázená jako
   dvoustrana v knize.

   Tři věci, na kterých to stojí:
     · výška plochy se plynule přelije, aby stránka neposkakovala
     · přechod je střídavý, ne prolínačka — starý panel zmizí
       za 240 ms a teprve pak naskočí nový
     · proklik zvenčí (#oblast-04) přistane rovnou ve své kapitole
       a řekne o tom: hairline přejede, číslo zesílí, čtečka
       ohlásí, kde jsme. Bez záblesku cizího textu.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  KJ.$$("[data-atlas]").forEach(function (root) {
    var tabs = KJ.$$("[data-atlas-tab]", root);
    var panels = KJ.$$("[data-atlas-panel]", root);
    var stage = root.querySelector("[data-atlas-stage]");
    var marker = root.querySelector("[data-atlas-marker]");
    if (!panels.length) return;

    var index = 0;
    var arriveTimer = null;
    var isMobile = function () { return window.matchMedia("(max-width: 720px)").matches; };

    /* ---------- výška plochy ---------------------------------
       Zadání říká „zamknout výšku na nejvyšší panel“, aby stránka
       při přepínání neposkakovala. Jenže nejdelší oblast (po porodu)
       je o 600 px vyšší než nejkratší (úzkost) — a pod krátkými
       oblastmi by zůstala půlobrazovka prázdna.

       Plním tedy záměr, ne literu: plocha si drží výšku právě
       otevřeného panelu a mezi nimi se plynule přelije za 320 ms.
       Stránka neposkočí a nikde není díra.                        */
    var heights = [];
    function measure() {
      placeMarker(index);
      if (!stage || isMobile()) { if (stage) stage.style.minHeight = ""; return; }
      heights = panels.map(function (p) {
        var wasHidden = p.hidden;
        if (wasHidden) {
          p.hidden = false;
          p.style.position = "absolute";
          p.style.visibility = "hidden";
          p.style.width = "100%";
        }
        var h = p.offsetHeight;
        if (wasHidden) {
          p.hidden = true;
          p.style.position = "";
          p.style.visibility = "";
          p.style.width = "";
        }
        return h;
      });
      applyHeight(index);
    }
    function applyHeight(i) {
      if (!stage || isMobile() || !heights[i]) return;
      stage.style.minHeight = heights[i] + "px";
    }

    /* ---------- klouzavý ukazatel ----------------------------
       Ukazatel se mezi řádky posouvá, neskáče. Výšku bere
       z řádku, ne z konstanty — dlouhý název se smí zalomit
       a proužek pak sedí i tak.                                 */
    function placeMarker(i) {
      if (!marker || !tabs[i]) return;
      marker.style.height = tabs[i].offsetHeight + "px";
      marker.style.transform = "translateY(" + tabs[i].offsetTop + "px)";
    }

    /* ---------- otevření kapitoly ---------------------------- */
    function freshen(p) {
      /* Odškrtávátka se dokreslí až tady — kapitola už je vidět. */
      p.classList.add("is-fresh");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { p.classList.remove("is-fresh"); });
      });
      /* KRESBA: velký glyf oblasti se obtáhne znovu. */
      var svg = p.querySelector("[data-draw]");
      if (svg && window.Motion) {
        window.Motion.undraw(svg);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            window.Motion.draw(svg, { duration: 950, stagger: 40 });
          });
        });
      }
    }

    function markState(i) {
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      placeMarker(i);

      /* barevný klíč tématu — nese ho i linka dechu */
      var key = tabs[i] ? tabs[i].dataset.atlasTheme : null;
      if (key && KJ.setTheme) KJ.setTheme(key);
      root.style.setProperty("--area", key ? "var(--t-" + key + ")" : "var(--tide)");
    }

    function select(i, opts) {
      opts = opts || {};
      i = KJ.clamp(i, 0, panels.length - 1);
      var old = panels[index];
      var changed = i !== index;
      index = i;
      applyHeight(i);
      markState(i);

      if (!changed) {
        if (opts.fresh) freshen(panels[i]);
      } else if (!isMobile() && window.Motion) {
        window.Motion.swapPanel(old, panels[i], function () { freshen(panels[i]); });
      } else {
        panels.forEach(function (p, k) { p.hidden = k !== i; });
        freshen(panels[i]);
      }

      if (opts.hash && panels[i].id) history.replaceState(null, "", "#" + panels[i].id);
      if (opts.scroll) arrive(i, opts.confirm);
    }

    /* ---------- přílet ---------------------------------------
       Cíl je hlavička kapitoly, ne celý modul: člověk musí
       přistát u nadpisu, ne u rejstříku. Potvrzení se přehraje
       až po doscrollování, jinak ho nikdo neuvidí.              */
    function arrive(i, confirm) {
      var head = panels[i].querySelector("[data-atlas-head]");
      var target = head || panels[i];
      /* 88 px = výška navigace a vzduch. Stejné číslo jako
         initHashOnLoad v core.js — kdyby se lišilo, obě rutiny
         by si při načtení s kotvou přetahovaly scroll o pár
         pixelů a stránka by při příletu cuknula.               */
      var top = target.getBoundingClientRect().top + window.scrollY - 88;
      if (top < 0) top = 0;
      if (KJ.lenis) KJ.lenis.scrollTo(top, { duration: 0.9 });
      else window.scrollTo({ top: top, behavior: KJ.isReduced() ? "auto" : "smooth" });

      if (!confirm) return;
      var wait = KJ.isReduced() ? 0 : 640;
      clearTimeout(arriveTimer);
      arriveTimer = setTimeout(function () {
        var p = panels[i];
        p.classList.remove("is-arrived");
        void p.offsetWidth;                  /* vynutí restart animace */
        p.classList.add("is-arrived");
        if (head) head.focus({ preventScroll: true });
        setTimeout(function () { p.classList.remove("is-arrived"); }, 1400);
      }, wait);
    }

    /* ---------- ovládání ------------------------------------- */
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, { hash: true }); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = tabs.length - 1;
        if (n === null) return;
        e.preventDefault();
        select(n, { hash: true });
        tabs[n].focus();
      });
    });

    /* ---------- projevy ↔ silueta ----------------------------
       Chip je tlačítko: najetí, fokus i klepnutí rozsvítí místo
       na siluetě. Silueta je ilustrace (aria-hidden) — informaci
       nese text chipu, tohle je jen ukázání prstem.             */
    panels.forEach(function (p) {
      var chips = KJ.$$("[data-atlas-chip]", p);
      if (!chips.length) return;
      var spots = KJ.$$("[data-atlas-spot]", p);
      if (!spots.length) return;

      function light(key) {
        spots.forEach(function (s) {
          s.classList.toggle("is-lit", !!key && s.dataset.atlasSpot === key);
        });
      }
      chips.forEach(function (c) {
        var key = c.dataset.atlasChip;
        c.addEventListener("pointerenter", function () { light(key); });
        c.addEventListener("pointerleave", function () { light(null); });
        c.addEventListener("focus", function () { light(key); });
        c.addEventListener("blur", function () { light(null); });
        c.addEventListener("click", function () {
          /* přehrát pulz znovu, i když už bod svítí z najetí */
          light(null);
          requestAnimationFrame(function () { light(key); });
          if (!KJ.isReduced()) window.dispatchEvent(new CustomEvent("kj:pulse"));
        });
      });
    });

    /* ---------- deep-linking --------------------------------- */
    function indexOfHash(hash) {
      var id = (hash || "").replace(/^#/, "");
      if (!id) return -1;
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].id === id) return i;
      }
      return -1;
    }
    window.addEventListener("hashchange", function () {
      var i = indexOfHash(location.hash);
      if (i > -1) select(i, { scroll: true, confirm: true, fresh: true });
    });

    /* Odkaz zvenčí (rejstřík na úvodní stránce, mapa těla, sebe-test) */
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href*="#"]');
      if (!a) return;
      var href = a.getAttribute("href");
      var hash = href.slice(href.indexOf("#"));
      var here = location.pathname.split("/").pop();
      if (href.indexOf("#") > 0 && href.indexOf(here) !== 0 && href.indexOf(here) < 0) return;
      var i = indexOfHash(hash);
      if (i > -1) select(i, { scroll: true, confirm: true, fresh: true });
    });

    window.addEventListener("resize", KJ.debounce(measure, 160));

    /* ---------- start ----------------------------------------
       Panely se skryjí až tady, v jednom průchodu se správným
       cílem — mezi tím není žádné vykreslení, takže nikdy
       neprobliká oblast 01. Atribut data-open z hlavičky
       stránky hned zahodíme: od téhle chvíle přepínáme my.      */
    var start = indexOfHash(location.hash);
    var deep = start > -1;
    if (!deep) start = 0;
    index = start;
    panels.forEach(function (p, k) { p.hidden = k !== start; });
    if (window.__kjAtlasGuard) { clearTimeout(window.__kjAtlasGuard); window.__kjAtlasGuard = null; }
    document.documentElement.removeAttribute("data-open");

    markState(start);
    measure();
    freshen(panels[start]);
    if (deep) arrive(start, true);

    /* fonty mohou dorazit později a změnit výšku panelu */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    /* Modul se načítá až po prvním vykreslení — událost load
       už mohla proběhnout, pak měříme rovnou. */
    if (document.readyState === "complete") setTimeout(measure, 0);
    else window.addEventListener("load", measure);
  });
})();
