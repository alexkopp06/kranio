/* ============================================================
   core.js — navigace, scroll, odkrytí, téma sekce, utility
   Načítá se jako první. Ostatní skripty stavějí na window.KJ.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- utility --------------------------------------- */
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var isReduced = function () { return reduced.matches; };

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };

  /* Sdílený dech: 0 → 1 → 0 za --breath (11 s).
     Jeden zdroj času pro celý web, aby všechno dýchalo spolu. */
  var BREATH_MS = 11000;
  var t0 = performance.now();
  function breathPhase() { return ((performance.now() - t0) % BREATH_MS) / BREATH_MS; }
  function breathWave()  { return (1 - Math.cos(breathPhase() * Math.PI * 2)) / 2; }

  /* Jediná rAF smyčka pro celý web — místo deseti nezávislých. */
  var tickers = [];
  var rafId = null;
  var running = false;

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    for (var i = 0; i < tickers.length; i++) {
      try { tickers[i](now); } catch (e) { /* jeden padlý modul nesmí zastavit ostatní */ }
    }
  }
  function startLoop() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }
  function stopLoop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function addTicker(fn) {
    tickers.push(fn);
    startLoop();
    return function () {
      var i = tickers.indexOf(fn);
      if (i > -1) tickers.splice(i, 1);
      if (!tickers.length) stopLoop();
    };
  }

  /* Skrytá karta → nic nekreslíme */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopLoop();
    else if (tickers.length) { t0 = performance.now(); startLoop(); }
  });

  /* ---------- sledování výřezu (bez IntersectionObserveru) ---
     Proč vlastní počítání a ne IntersectionObserver:
     prohlížeč započítává clip-path do průsečíku prvku s výřezem.
     Prvek skrytý maskou `clip-path: inset(105% 0 0 0)` má proto
     průsečík nulový a IntersectionObserver ho hlásí trvale jako
     neviditelný — a to platí i pro všechno, co je uvnitř něj.
     Odkrytí, které se samo skrývá clip-path, by tedy nikdy
     nedostalo signál, že má odkrýt (a moduly uvnitř by se nikdy
     nespustily). To byla příčina „půlka webu se nezobrazí".
     getBoundingClientRect() masky neřeší, proto průsečík
     počítáme sami. Jedna smyčka pro celý web, sjednocená se
     scrollem — levnější než N pozorovatelů.                    */
  var watchers = [];
  var scanQueued = false;

  /* rootMargin ve stylu IntersectionObserveru: 1–4 hodnoty, px i % */
  function parseMargin(m) {
    var v = String(m == null ? "0px" : m).trim().split(/\s+/);
    if (v.length === 1) v = [v[0], v[0], v[0], v[0]];
    else if (v.length === 2) v = [v[0], v[1], v[0], v[1]];
    else if (v.length === 3) v = [v[0], v[1], v[2], v[1]];
    return v.slice(0, 4).map(function (s) {
      return { n: parseFloat(s) || 0, pct: s.indexOf("%") > -1 };
    });
  }

  function inRoot(el, m) {
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return false;      /* display:none, prázdný panel */
    var H = window.innerHeight || document.documentElement.clientHeight;
    var W = window.innerWidth  || document.documentElement.clientWidth;
    var top    = m[0].pct ? m[0].n * H / 100 : m[0].n;
    var right  = m[1].pct ? m[1].n * W / 100 : m[1].n;
    var bottom = m[2].pct ? m[2].n * H / 100 : m[2].n;
    var left   = m[3].pct ? m[3].n * W / 100 : m[3].n;
    return r.bottom > -top && r.top < H + bottom &&
           r.right  > -left && r.left < W + right;
  }

  function scan() {
    scanQueued = false;
    if (!watchers.length) return;

    /* Nejdřív jen čteme rozměry, teprve potom saháme na DOM.
       Kdybychom obojí střídali, každá přidaná třída by si
       vynutila nový výpočet layoutu — a při padesáti prvcích
       je to na slabším stroji znát.                           */
    var fire = [];
    var dead = false;
    for (var i = 0; i < watchers.length; i++) {
      var w = watchers[i];
      if (!w.el || w.el.isConnected === false) { w.dead = true; dead = true; continue; }
      var vis = inRoot(w.el, w.m);
      if (vis === w.inside) continue;             /* beze změny */
      w.inside = vis;
      if (vis && w.once) { w.dead = true; dead = true; }
      if (vis || w.leave) fire.push(w);
    }
    if (dead) watchers = watchers.filter(function (x) { return !x.dead; });

    for (var j = 0; j < fire.length; j++) {
      /* jeden padlý modul nesmí zastavit ostatní */
      try { if (fire[j].inside) fire[j].enter(); else fire[j].leave(); } catch (e) {}
    }
  }

  /* Sloučíme všechny podněty do jednoho výpočtu za snímek.
     Na skryté kartě rAF neběží — tam sáhneme po setTimeout,
     jinak by stránka načtená na pozadí zůstala prázdná.       */
  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    if (document.hidden) setTimeout(scan, 0);
    else requestAnimationFrame(scan);
  }

  function watch(el, margin, enter, leave, once) {
    if (!el) return function () {};
    var m = (margin && margin.length === 4 && typeof margin[0] === "object") ? margin : parseMargin(margin);
    var w = { el: el, m: m, enter: enter, leave: leave, once: !!once, inside: null };
    watchers.push(w);
    scheduleScan();
    return function () {
      var i = watchers.indexOf(w);
      if (i > -1) watchers.splice(i, 1);
    };
  }

  window.addEventListener("scroll", scheduleScan, { passive: true });
  window.addEventListener("resize", scheduleScan, { passive: true });
  window.addEventListener("orientationchange", scheduleScan);
  window.addEventListener("load", scheduleScan);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) scheduleScan();
  });
  /* Rozbalený panel, dorazivší font nebo obrázek mění výšku
     dokumentu bez scrollu — i to musí spustit přepočet.        */
  if ("ResizeObserver" in window) {
    try { new ResizeObserver(scheduleScan).observe(document.documentElement); } catch (e) {}
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleScan).catch(function () {});
  }
  [60, 200, 600, 1400, 3000].forEach(function (ms) { setTimeout(scheduleScan, ms); });

  /* Modul se inicializuje, až když je poprvé ve výřezu. */
  function whenVisible(el, fn, margin) {
    if (!el) return;
    watch(el, margin || "200px 0px", fn, null, true);
  }

  /* Modul kreslí, jen když je vidět. */
  function visibilityGate(el, onEnter, onLeave) {
    if (!el) return function () {};
    return watch(el, "120px 0px", onEnter, onLeave, false);
  }

  /* HiDPI canvas se správným měřítkem */
  function fitCanvas(canvas, ctx) {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width  * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height, dpr: dpr };
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms || 150);
    };
  }

  function prefersCoarse() { return window.matchMedia("(hover: none)").matches; }

  window.KJ = {
    $: $, $$: $$,
    isReduced: isReduced,
    clamp: clamp, lerp: lerp,
    breathPhase: breathPhase, breathWave: breathWave, BREATH_MS: BREATH_MS,
    addTicker: addTicker,
    whenVisible: whenVisible, visibilityGate: visibilityGate, watch: watch,
    fitCanvas: fitCanvas, debounce: debounce,
    prefersCoarse: prefersCoarse
  };

  /* ---------- JS je k dispozici ----------------------------- */
  document.documentElement.classList.remove("no-js");
  document.documentElement.classList.add("has-js");

  /* ---------- Lenis: jen vyhlazení, žádný scroll-jacking ---- */
  var lenis = null;
  function initLenis() {
    if (lenis) return;
    if (isReduced()) return;
    if (prefersCoarse()) return;           /* na dotyku necháváme nativní scroll */
    /* core.js běží dřív než vendor/lenis.min.js — kdyby knihovna
       ještě nebyla, zkusíme to znovu po načtení stránky. Vyhlazení
       scrollu je bonus, odkrytí textu na něj nesmí čekat.        */
    if (!window.Lenis) return;
    try {
      lenis = new window.Lenis({
        duration: 0.9,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        syncTouch: false
      });
    } catch (e) { return; }
    addTicker(function (now) { lenis.raf(now); });
    window.KJ.lenis = lenis;
  }

  /* ---------- Navigace -------------------------------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var last = window.scrollY;
    var burger = $("[data-burger]", nav);
    var menu = $("[data-menu]");
    var open = false;

    function onScroll() {
      var y = window.scrollY;
      nav.dataset.stuck = y > 12 ? "true" : "false";
      if (!open) {
        /* sklápí se při scrollu dolů, vrací se při scrollu nahoru */
        nav.dataset.hidden = (y > last && y > 220) ? "true" : "false";
      }
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (burger && menu) {
      var setOpen = function (state) {
        open = state;
        burger.setAttribute("aria-expanded", String(state));
        burger.setAttribute("aria-label", state ? "Zavřít menu" : "Otevřít menu");
        menu.dataset.open = String(state);
        menu.setAttribute("aria-hidden", String(!state));
        document.body.style.overflow = state ? "hidden" : "";
        if (state) {
          nav.dataset.hidden = "false";
          var first = $(".menu__link", menu);
          if (first) first.focus();
        } else {
          burger.focus();
        }
      };
      burger.addEventListener("click", function () { setOpen(!open); });
      menu.addEventListener("click", function (e) {
        if (e.target.closest("a")) setOpen(false);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && open) setOpen(false);
      });
      window.addEventListener("resize", debounce(function () {
        if (open && window.innerWidth >= 900) setOpen(false);
      }, 120));
    }
  }

  /* ---------- Odkrytí obsahu (rodina ODKRYTÍ) ---------------
     Text je v DOM od začátku. Animuje se jen jeho odkrytí,
     jednou, max 700 ms po vstupu do výřezu.

     Detekce jde přes watch() (viz výše), ne přes
     IntersectionObserver — maska clip-path by pozorovateli
     schovala právě ten prvek, který má odkrýt.                 */
  /* Při scrollu se obsah odkrývá kousek dřív, než na něj scroll
     dojede (spodních 10 % obrazovky si necháváme na rozjezd).
     Při načtení stránky ale platí holý výřez: co má uživatel
     před očima, nesmí zůstat prázdné.                          */
  var REVEAL_MARGIN = parseMargin("0px 0px -10% 0px");
  var FIRST_MARGIN  = parseMargin("0px");

  function revealAll() {
    $$("[data-reveal]").forEach(function (el) {
      el.classList.add("is-revealed");
      el.classList.add("is-done");
    });
  }

  function initReveal() {
    /* Pojistku z <head> přebíráme — od téhle chvíle za odkrytí
       ručí core.js. Když se sem skript vůbec nedostane, pojistka
       masky po 2 s strhne sama.                                 */
    if (window.__kjRevealGuard) {
      clearTimeout(window.__kjRevealGuard);
      window.__kjRevealGuard = 0;
    }

    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (isReduced()) { revealAll(); return; }

    var from = watchers.length;
    items.forEach(function (el) {
      watch(el, FIRST_MARGIN, function () {
        var delay = parseFloat(el.dataset.revealDelay || 0);
        var show = function () {
          el.classList.add("is-revealed");
          /* Až animace doběhne, masku zrušíme úplně. Kdyby se
             přechod z jakéhokoli důvodu zasekl v půli (přepnutá
             karta, úsporný režim, starší kompozitor), zůstal by
             text useknutý — takhle vždycky skončí celý viditelný. */
          setTimeout(function () { el.classList.add("is-done"); }, 1000);
          /* Odkrytím se mohly do výřezu dostat další prvky. */
          scheduleScan();
        };
        if (delay) setTimeout(show, delay); else show();
      }, null, true);
    });

    /* První průchod děláme hned a synchronně. Přes rAF by se
       odložil až za všechny ostatní skripty stránky — a přesně
       tomu se chceme vyhnout. Layout je v tuhle chvíli hotový. */
    var mine = watchers.slice(from);
    scan();
    /* Co zůstalo pod ohybem, už se odkrývá se scroll-marginem. */
    mine.forEach(function (w) { w.m = REVEAL_MARGIN; });

    /* Poslední pojistka: kdyby po dvou vteřinách zůstalo cokoli
       ve výřezu zamaskované, animaci zrušíme na celém dokumentu.
       Lepší web bez efektu než web bez textu.                    */
    setTimeout(function () {
      /* Stejné měřítko jako u sledování výřezu — prvek v posledních
         10 % obrazovky ještě čeká na scroll a zamaskovaný být smí. */
      var stuck = items.some(function (el) {
        return !el.classList.contains("is-revealed") && inRoot(el, REVEAL_MARGIN);
      });
      if (stuck) document.documentElement.classList.remove("js-anim");
    }, 2000);
  }

  /* ---------- Téma sekce ------------------------------------
     Sekce s data-theme-zone="migrena" přebarví --theme na celém
     dokumentu. Linka dechu, chipy i eyebrow to okamžitě vidí.  */
  function initSectionTheme() {
    var zones = $$("[data-theme-zone]");
    var root = document.documentElement;
    var current = null;

    function apply(key) {
      if (key === current) return;
      current = key;
      if (!key || key === "tide") {
        root.style.setProperty("--theme", "var(--tide)");
      } else {
        root.style.setProperty("--theme", "var(--t-" + key + ")");
      }
      window.dispatchEvent(new CustomEvent("kj:theme", { detail: { key: key || "tide" } }));
    }
    window.KJ.setTheme = apply;

    if (!zones.length) return;
    /* Zóna, která protne prostřední desetinu obrazovky, přebírá
       téma. Přes watch(), ne IntersectionObserver — ze stejného
       důvodu jako odkrytí (viz komentář nahoře).                */
    zones.forEach(function (z) {
      watch(z, "-45% 0px -45% 0px", function () { apply(z.dataset.themeZone); });
    });
  }

  /* ---------- Odkazy na kotvy s ohledem na Lenis ------------ */
  function initAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 88;
      if (lenis) lenis.scrollTo(top, { duration: 1.0 });
      else window.scrollTo({ top: top, behavior: isReduced() ? "auto" : "smooth" });
      history.replaceState(null, "", id);
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  }

  /* ---------- bfcache: stránka se nesmí vrátit zamrzlá ------ */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      t0 = performance.now();
      if (tickers.length) startLoop();
      $$("[data-reveal]").forEach(function (el) { el.classList.add("is-revealed"); });
    }
  });

  /* ---------- příchod s kotvou v adrese ----------------------
     Musí fungovat i tam, kde je requestAnimationFrame přiškrcený
     (načtení na pozadí, úsporný režim). Proto skáčeme nativně
     a Lenisu jen řekneme, kde teď jsme — kdyby to viselo na jeho
     smyčce, odkaz „prubeh-a-cenik.html#objednani“, tedy
     nejpoužívanější CTA webu, by skončil na začátku stránky.    */
  function initHashOnLoad() {
    var id = location.hash.slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;

    function jump() {
      var top = target.getBoundingClientRect().top + window.scrollY - 88;
      if (Math.abs(top - window.scrollY) < 2) return;
      try { window.scrollTo({ top: top, behavior: "instant" }); }
      catch (e) { window.scrollTo(0, top); }
      if (lenis && lenis.scrollTo) {
        try { lenis.scrollTo(top, { immediate: true, force: true }); } catch (e) {}
      }
    }

    jump();
    /* fonty, obrázky a moduly mohou výšku ještě posunout */
    setTimeout(jump, 60);
    setTimeout(jump, 300);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { setTimeout(jump, 40); });
    }
    window.addEventListener("load", function () { setTimeout(jump, 60); });
  }

  /* ---------- pozdní načtení modulů --------------------------
     Skripty vypsané v window.KJ_LAZY se načtou až po prvním
     vykreslení, ne přes <script defer>. Defer skripty totiž
     běží ještě před DOMContentLoaded a drží hlavní vlákno —
     těžká WebGL scéna (kompilace shaderů, 2400 částic, na
     slabším stroji softwarové vykreslování) tak umí odkrytí
     textu odsunout o vteřiny. Obsah má přednost před efektem.  */
  /* ---------- okamžité načtení hlavní scény ------------------
     KJ_EAGER je krátký seznam skriptů, které se mají načíst
     HNED — bez čekání na dva snímky jako zbytek modulů.
     Je v něm jediná věc: postava v hero sekci.

     Proč výjimka. Zbytek webu se dá dočíst za pochodu, protože
     leží pod ohybem: než k němu člověk doscrolluje, dávno je
     tam. Postava v hero sekci ale STOJÍ V PRVNÍM POHLEDU. Když
     se načte až po dvou snímcích a po celém zbytku fronty,
     první vteřinu je v hero sekci prázdné světelné pole a
     teprve pak se objeví tělo — a přesně to člověk vidí jako
     „web se dokresluje“.

     Skripty se přidávají dynamicky, takže NEBLOKUJÍ vykreslení:
     prohlížeč si je stáhne souběžně s tím, jak maluje text.
     V <head> na ně navíc ukazuje preload, takže stahování
     začalo dávno předtím, než sem běh dojde.                 */
  function initEagerScripts() {
    var list = window.KJ_EAGER;
    if (!list || !list.length) return;
    list.forEach(function (src) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;            /* pořadí načtení zůstává zachované */
      document.head.appendChild(s);
    });
  }

  function initLazyScripts() {
    var list = window.KJ_LAZY;
    if (!list || !list.length) return;
    var started = false;

    function begin() {
      if (started) return;
      started = true;
      var left = list.length;
      list.forEach(function (src) {
        var s = document.createElement("script");
        s.src = src;
        s.async = false;          /* pořadí načtení zůstává zachované */
        s.onload = s.onerror = function () {
          if (--left) return;
          try { initLenis(); } catch (e) {}
          scheduleScan();         /* moduly mohly změnit výšku stránky */
        };
        document.head.appendChild(s);
      });
    }

    /* dva snímky = text je odkrytý a vykreslený, teprve pak scéna */
    if (document.hidden) setTimeout(begin, 0);
    else requestAnimationFrame(function () {
      requestAnimationFrame(function () { setTimeout(begin, 0); });
    });
    setTimeout(begin, 1500);      /* karta na pozadí: rAF neběží */
  }

  /* ---------- start -----------------------------------------
     Odkrytí jde první a každý krok stojí sám za sebe. Kdyby
     spadla navigace nebo Lenis, nesmí to stáhnout s sebou text. */
  window.addEventListener("load", function () { try { initLenis(); } catch (e) {} });

  function init() {
    var steps = [initReveal, initEagerScripts, initNav, initSectionTheme, initAnchors,
                 initLenis, initHashOnLoad, initLazyScripts];
    for (var i = 0; i < steps.length; i++) {
      try { steps[i](); } catch (e) {
        if (window.console && console.warn) console.warn("KJ init:", e);
      }
    }
    scheduleScan();
  }

  /* Skript s defer se spouští, až je celý dokument rozparsovaný —
     DOM je tedy hotový, i když readyState ještě hlásí "loading"
     (na "interactive" se přepne až spolu s DOMContentLoaded, po
     doběhnutí VŠECH defer skriptů). Čekat na DOMContentLoaded by
     znamenalo čekat i na všechny ostatní skripty stránky, tedy
     odkrýt text až po nich. Proto startujeme rovnou. */
  var me = document.currentScript;
  if (document.readyState !== "loading" || (me && me.defer)) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
