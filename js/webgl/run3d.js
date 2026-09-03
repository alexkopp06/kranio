/* ============================================================
   run3d.js — POHON OBOU 3D SEKCÍ

   Vezme plátno, které měla kreslená verze, postaví na něm scénu
   a obslouží záložky. Když se WebGL nepodaří, modul mlčky
   skončí a plátno převezme původní kreslená verze — proto se
   kontext bere hned na začátku a nikde se nepředstírá úspěch.

   ------------------------------------------------------------
   POPIS SCÉNY

   Scéna vrací seznam dílů. Každý díl má síť a materiál — nic
   víc. Runner nemusí vědět, co ta síť představuje; ví jen, že
   „bone“ se kreslí v neprůhledné vrstvě a „veil“ v průhledné.
   Díky tomu se dá scéna přestavět, aniž by se sáhlo sem.

     parts    [{ m: Mesh, mat: "bone", key?: "sacrum", over?: {},
                 order?: 0, noFoc?: true }]
     dyn(T)   totéž, ale staví se každý snímek (deka, bránice)
     models(T) matice pro díly s klíčem
     shadows(T) dosednutí na podložku
     focus(T) { at, w, amt } — o které struktuře scéna mluví
     touch(T) [{ at, rx, rz, a, tilt, roll }] — stopa dotyku
     pool     kam na plátně padá světelná tůň
     labels   odkazové popisky na plátně popisků
     read(T)  odečty u pravého okraje

   ------------------------------------------------------------
   POŘADÍ VYKRESLENÍ

     1 světelná tůň                      pozadí, bez hloubky
     2 neprůhledné (kost, kůže, látka)   zapisuje hloubku
     3 dosednutí                         měkký stín na podložce
     4 zářící (nervy, vlna, švy)         čte hloubku, nezapisuje
     4b stopa dotyku                     světlo pod dlaní
     5 průhledné (plena, deka, bublina)  odzadu dopředu
     6 popisky                           druhé, ploché plátno

   Kdyby se průhledné kreslilo dřív, prosvítalo by skrz kost
   a scéna by ztratila hloubku.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ, G = window.KJGeom, ST = window.KJStage;
  if (!KJ || !G || !ST) return;

  var TAU = Math.PI * 2;
  var clamp = G.clamp;

  /* ============================================================
     VYKRESLENÍ JEDNÉ SCÉNY
     Sdílené s náhledovým nástrojem, aby nemohly rozejít.
     ============================================================ */
  function build(stage, def) {
    var g = { def: def, parts: [], dyn: {} };
    (def.parts || []).forEach(function (part) {
      var buf = stage.upload(part.m.finish());
      if (!buf) return;
      g.parts.push({ buf: buf, mat: part.mat, key: part.key,
                     over: part.over, order: part.order, noFoc: part.noFoc });
    });
    return g;
  }

  function paint(stage, g, T, px, py) {
    var gl = stage.gl, sc = g.def;
    stage.camera(sc.cam(T, px || 0, py || 0));

    var wave = sc.wave ? sc.wave(T) : -1;
    var reveal = clamp((T - 0.25) / 1.7, 0, 1.2);
    var models = sc.models ? sc.models(T) : {};
    /* UKAZOVÁTKO. Scéna řekne, o které struktuře zrovna mluví
       (`at` v jednotkách klíče), jak široké je pásmo (`w`)
       a jak silně to má prosvítat (`amt`). Sílu si scéna
       rozbliká sama, takže se dá střídat víc struktur za sebou
       jedním číslem — a shader o čase pořád neví nic.       */
    var foc = sc.focus ? sc.focus(T) : null;

    /* pohyblivé díly se přestaví a nahrají znovu. Jsou malé;
       velké sítě se hýbou maticí, ne přestavbou.            */
    var dynParts = [];
    if (sc.dyn) {
      var list = sc.dyn(T, stage) || [];
      list.forEach(function (part, i) {
        var id = part.key || ("d" + i);
        var buf = stage.upload(part.m.finish(), g.dyn[id]);
        if (!buf) return;
        g.dyn[id] = buf;
        dynParts.push({ buf: buf, mat: part.mat, key: part.key,
                        over: part.over, order: part.order, noFoc: part.noFoc });
      });
    }
    /* Pořadí v rámci vrstvy si řídí scéna. Bránice se musí
       nakreslit dřív než žebra, jinak ji polopropustný koš
       odřízne hloubkovým testem a zůstane po ní díra.     */
    var all = g.parts.concat(dynParts);
    all.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    /* 1 · světelná tůň */
    if (sc.pool) stage.pool([sc.pool[0], sc.pool[1]], sc.pool[2]);

    function drawPart(part) {
      var prog = stage.progFor(part.mat);
      /* Přepis materiálu smí být funkce času — tak se dá věc
         nechat rozplynout, aniž by se přestavovala síť.    */
      var over = typeof part.over === "function" ? part.over(T) : part.over;
      if (over && over.alpha != null && over.alpha <= 0.004) return;
      var set = stage.mat(part.mat, over);
      stage.draw(prog, part.buf, part.key ? (models[part.key] || null) : null,
        function (p, ctx) {
          ctx.uniform1f(p.u.uWave, wave);
          ctx.uniform1f(p.u.uReveal, reveal);
          if (p.u.uFoc) {
            /* `noFoc` je únikový poklop pro díly, které se
               ukazovátkem rozsvítit NEMAJÍ — podložka, lehátko,
               deka. Sdílejí totiž rozsah klíče s tělem a bez
               tohohle by se rozzářila i prostěradlo.        */
            var on = foc && !part.noFoc;
            ctx.uniform1f(p.u.uFoc, on ? foc.at : 0);
            ctx.uniform1f(p.u.uFocW, on ? (foc.w || 0.08) : 0.001);
            ctx.uniform1f(p.u.uFocAmt, on ? (foc.amt || 0) : 0);
          }
          set(p, ctx);
        });
    }

    /* 2 · neprůhledné */
    gl.depthMask(true);
    all.forEach(function (part) {
      if (stage.passOf(part.mat) === "solid") drawPart(part);
    });

    /* 3 · dosednutí */
    var shadows = typeof sc.shadows === "function" ? sc.shadows(T) : sc.shadows;
    if (shadows && shadows.length) {
      gl.depthMask(false);
      shadows.forEach(function (s) { stage.shadow(s); });
      gl.depthMask(true);
    }

    /* 4 · zářící */
    gl.depthMask(false);
    all.forEach(function (part) {
      if (stage.passOf(part.mat) === "glow") drawPart(part);
    });

    /* 4b · stopa dotyku — světlo tam, kde spočine dlaň.
       Kreslí se PO neprůhledné vrstvě, takže leží na těle,
       a před průhlednou, aby ji plena nebo deka ještě
       ztlumila.                                            */
    var touches = typeof sc.touch === "function" ? sc.touch(T) : sc.touch;
    if (touches && touches.length) {
      touches.forEach(function (t) { if (t && (t.a == null || t.a > 0.004)) stage.contact(t); });
    }

    /* 5 · průhledné */
    all.forEach(function (part) {
      if (stage.passOf(part.mat) === "glass") drawPart(part);
    });
    gl.depthMask(true);

    /* 6 · popisky */
    overlay(stage, sc, T, models);
  }

  /* ---------- popisky ----------------------------------------- */
  function overlay(stage, sc, T, models) {
    var o = stage.oc, C = stage.C, d = stage.dpr, W = stage.W, H = stage.H;
    o.setTransform(d, 0, 0, d, 0, 0);
    o.clearRect(0, 0, W, H);
    o.lineCap = "round";

    function ink(a) {
      return "rgba(" + Math.round(C.ink[0]*255) + "," + Math.round(C.ink[1]*255) +
             "," + Math.round(C.ink[2]*255) + "," + a + ")";
    }
    function tide(a) {
      return "rgba(" + Math.round(C.tide[0]*255) + "," + Math.round(C.tide[1]*255) +
             "," + Math.round(C.tide[2]*255) + "," + a + ")";
    }
    /* PÍSMO BERE TMAVŠÍ ZELEŇ NEŽ KRESBA.
       Příliv (#0E6B54) má na bílém plátně 6,46:1 — na tečku
       a odkazovou linku to stačí, na osmibodové verzálky ne.
       Hluboký příliv (#0A5442) je 8,90:1 a je to táž barva
       o odstín níž, takže se nic v identitě nehne.          */
    function deep(a) {
      return "rgba(" + Math.round(C.deep[0]*255) + "," + Math.round(C.deep[1]*255) +
             "," + Math.round(C.deep[2]*255) + "," + a + ")";
    }
    function mono(size) { return "500 " + size + "px " + C.mono; }

    /* odkazové popisky drží svůj bod na tělese */
    var used = [];
    (sc.labels || []).forEach(function (L, k) {
      var p = stage.project(L.p, L.key ? (models[L.key] || null) : null);
      if (!p) return;
      var side = p[0] > W * 0.52 ? 1 : -1;
      var lx = p[0] + side * Math.max(30, W * 0.048);
      var ly = p[1] - 13;
      lx = clamp(lx, 58, W - 58);
      ly = clamp(ly, 22, H - 30);
      /* popisky si nelezou do řádku */
      for (var i = 0; i < used.length; i++) {
        if (Math.abs(used[i] - ly) < 17) ly = used[i] + 17;
      }
      ly = clamp(ly, 22, H - 30);
      used.push(ly);

      o.strokeStyle = L.hot ? tide(0.55) : ink(0.34);
      o.lineWidth = 1;
      o.beginPath();
      o.moveTo(p[0], p[1]);
      o.lineTo(lx - side * 8, ly + 3);
      o.lineTo(lx - side * 2, ly + 3);
      o.stroke();

      o.beginPath();
      o.arc(p[0], p[1], L.hot ? 3.1 : 2.4, 0, TAU);
      o.fillStyle = L.hot ? tide(0.95) : ink(0.72);
      o.fill();
      if (L.hot) {
        o.beginPath();
        o.arc(p[0], p[1], 6.5, 0, TAU);
        o.strokeStyle = tide(0.30);
        o.stroke();
      }

      o.font = mono(Math.max(9, Math.min(11, W * 0.0098)));
      o.textAlign = side > 0 ? "left" : "right";
      o.textBaseline = "alphabetic";
      o.fillStyle = L.hot ? deep(0.98) : ink(0.88);
      o.fillText(L.t, lx, ly + 6);
    });

    /* odečty u pravého okraje */
    var rows = sc.read ? sc.read(T) : [];
    rows.forEach(function (r, k) {
      var y = H * (0.185 + k * 0.125);
      o.textAlign = "right";
      o.font = mono(Math.max(8, Math.min(9.5, W * 0.0082)));
      o.fillStyle = ink(0.88);
      o.fillText(r[0], W - 22, y);
      o.font = mono(Math.max(11, Math.min(15, W * 0.0135)));
      o.fillStyle = r[2] ? deep(0.98) : ink(0.94);
      o.fillText(r[1], W - 22, y + 20);
    });
  }

  window.KJRun3D = { build: build, paint: paint };

  /* ============================================================
     ŽIVÝ BĚH NA STRÁNCE
     ============================================================ */
  var S = window.KJSections;
  if (!S) return;
  if (KJ.isReduced()) return;
  /* Vypínač: <body data-3d="off"> vrátí obě sekce ke kreslené
     verzi. Jeden atribut, žádné mazání souborů.            */
  if (document.body && document.body.dataset && document.body.dataset["3d"] === "off") return;

  function boot(rootSel, canvasSel, tabSel, panelSel, scenes, opt) {
    opt = opt || {};
    var root = document.querySelector(rootSel);
    if (!root) return null;
    var canvas = root.querySelector(canvasSel);
    if (!canvas) return null;

    var stage = ST.create(root, canvas);
    if (!stage) return null;            /* kreslená verze převezme plátno */

    var tabs = KJ.$$(tabSel, root);
    var panels = KJ.$$(panelSel, root);
    if (!tabs.length) return null;

    root.dataset.render = "3d";

    var built = [];
    function scene(i) {
      if (!built[i]) built[i] = build(stage, scenes[i](stage));
      return built[i];
    }

    var index = -1, T = 0, elapsed = 0;
    var auto = !!opt.auto, paused = false;
    var pxW = 0, pyW = 0, px = 0, py = 0;

    if (!KJ.prefersCoarse()) {
      window.addEventListener("pointermove", function (e) {
        var r = root.getBoundingClientRect();
        pxW = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.5), -1, 1);
        pyW = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.6), -1, 1);
      }, { passive: true });
    }

    function select(i, byUser) {
      i = (i + tabs.length) % tabs.length;
      if (i === index) return;
      index = i; T = 0; elapsed = 0;
      tabs.forEach(function (b, k) {
        var on = k === index;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (panels[k]) panels[k].hidden = !on;
      });
      if (opt.onSelect) opt.onSelect(index, byUser);
    }

    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { select(i, true); if (opt.stopAuto) auto = false; });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
              : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(index + d, true);
        if (opt.stopAuto) auto = false;
        tabs[index].focus();
      });
    });
    root.addEventListener("pointerenter", function () { paused = true; });
    root.addEventListener("pointerleave", function () { paused = false; });
    select(0, false);

    var lastFrame = performance.now(), fpsAcc = 0, fpsN = 0, slowSince = 0;

    function frame(now) {
      var dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      if (!stage.resize()) return;

      /* strážce výkonu */
      if (dt > 0) {
        fpsAcc += 1 / dt; fpsN++;
        if (fpsN >= 30) {
          var fps = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
          if (fps < (stage.quality >= 2 ? 30 : 20)) {
            if (!slowSince) slowSince = now;
            else if (now - slowSince > 2500) {
              stage.quality--; slowSince = 0;
              if (stage.quality <= 0) { stop(); root.dataset.render = "off"; return; }
            }
          } else slowSince = 0;
        }
      }

      T += dt;
      if (auto && !paused) {
        elapsed += dt;
        if (opt.meter) opt.meter(index, elapsed / (opt.dwell || 9));
        if (elapsed >= (opt.dwell || 9)) select(index + 1, false);
      }

      px += (pxW - px) * Math.min(1, dt * 2.6);
      py += (pyW - py) * Math.min(1, dt * 2.6);

      paint(stage, scene(index), T, px, py);
    }

    var ticker = null;
    function stop() { if (ticker) { ticker(); ticker = null; } }
    KJ.visibilityGate(root, function () {
      if (!ticker && stage.quality > 0) { lastFrame = performance.now(); ticker = KJ.addTicker(frame); }
    }, stop);
    requestAnimationFrame(function (x) { lastFrame = x; frame(x); });
    return { select: select };
  }

  boot("[data-stops]", "[data-stops-canvas]", "[data-stops-tab]", "[data-stops-panel]",
    S.STOPS, {
      onSelect: function (i) {
        var fill = document.querySelector("[data-stops-fill]");
        if (fill) fill.style.width = ((i + 1) / S.STOPS.length * 100) + "%";
      }
    });

  var calmStamps = ["v oblečení", "≈ 5 g", "jen ruce", "ticho je v pořádku", "ruce pryč"];
  boot("[data-calm]", "[data-calm-canvas]", "[data-calm-tab]", "[data-calm-panel]",
    S.CALM, {
      auto: true, dwell: 8.5, stopAuto: true,
      onSelect: function (i) {
        var root = document.querySelector("[data-calm]");
        if (!root) return;
        var items = KJ.$$("[data-calm-item]", root);
        items.forEach(function (it, k) { it.setAttribute("aria-current", k === i ? "true" : "false"); });
        var st = root.querySelector("[data-calm-stamp]");
        if (st) st.textContent = calmStamps[i] || "";
      },
      meter: function (i, u) {
        var root = document.querySelector("[data-calm]");
        if (!root) return;
        var ms = KJ.$$("[data-calm-meter]", root);
        ms.forEach(function (m, k) { m.style.width = k === i ? (u * 100).toFixed(1) + "%" : "0%"; });
      }
    });
})();
