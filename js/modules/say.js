/* ============================================================
   say.js — SAZBA, KTERÁ UDĚLÁ TO, CO VĚTA ŘÍKÁ

   Předěl úvodní stránky tvrdí: „Nejde o to vydržet víc. Ani být
   silnější. Jde o to přestat držet.“ Tenhle modul to nepřečte —
   provede.

   Celá sekce je teď sázená JEDNÍM PÍSMEM (Newsreader). Není
   v ní grotesk ani mono, žádná linka, žádný rámeček. Zbyla
   sazba a voda pod ní — a všechno, co sekce dělá, dělá těmi
   dvěma věcmi.

   ------------------------------------------------------------
   1 · VLNA JDE PO PÍSMENECH, NE PO SLOVECH

   Dřív se rozsvěcovalo celé slovo naráz. Bylo to čitelné, ale
   skokové: dvanáct schodů místo náběhu. Teď je nositelem vlny
   PÍSMENO — čelo přejíždí sazbu spojitě, slovo se rozsvěcuje
   zleva doprava tak, jak se čte.

   Rozdělení na písmena dělá skript, ne HTML. Bez skriptu je
   v kódu normální věta a přístupnost se nemění: obsah prvku
   zůstává týž řetězec, jen je poskládaný z inline-block spanů.

   ------------------------------------------------------------
   2 · TŘI STAVY JEDNOHO SLOVA

     DRŽÍ      než k němu vlna dojde, je slovo sevřené: o vlásek
               stažené, povytažené nahoru a světlejší.
               Není to „ještě neanimované“ — je to napětí.

     ROZSVÍTÍ  čelo vlny písmeno zvedne do plného inkoustu
               a na okamžik mu dá barvu přílivu.

     PUSTÍ     a pak — jen u slov PŘED pointou — slovo POVOLÍ:
               sedne si níž, rozevře se, ztratí ostrost,
               nepatrně se pootočí. Přesně to dělá rameno,
               které si přestane hlídat.

   Co zůstane svítit, je „přestat držet“ a všechno, co po něm
   následuje. Věta udělá to, co říká.

   POZOR NA JEDNU VĚC: povolené slovo se ZTMÍ JEN MÁLO.
   Dřív ubíralo 46 % krytí a věta po průchodu vlny zešedla —
   vypadalo to jako vybledlý text, ne jako uvolněné rameno.
   Teď ubírá 12 %; puštění nese ROZOSTŘENÍ A POSUN, ne barva.
   Text zůstane černý, jak má — a i než k němu vlna dojde,
   drží 52 % krytí, tedy pořád čitelnou černou.

   ------------------------------------------------------------
   3 · KAŽDÉ PUŠTĚNÉ SLOVO UDĚLÁ KRUH NA VODĚ

   To je nová vrstva a je to důvod, proč sekce existuje.
   Pod sazbou leží plátno s klidnou hladinou. Ve chvíli, kdy
   slovo povolí, spadne v jeho místě do vody kapka a rozběhne
   se z ní kruh — zpomalující, tenčící, mizející.

   Věta tedy neběží po ploše; PADÁ DO NÍ. Kdo dočte
   „přestat držet“, má pod textem sedm dokruhů, které se
   potkávají a překrývají — obraz nervového systému, který se
   po letech napětí vyrovnává.

   Kruhy jsou zploštělé (ry ≈ 0,42 rx), aby to byla hladina
   viděná pod úhlem, ne terč. Kreslí se přílivovou barvou
   při krytí pod deseti procenty: mají se poznat, ne dívat se.

   Do toho jde jeden POMALÝ KRUH ZE STŘEDU každých ~7 s —
   ten, který sekci drží živou i když se nescrolluje.

   ------------------------------------------------------------
   4 · JEDEN ODSTAVEC, ŽÁDNÉ DECRESCENDO

   Pod výrokem stály čtyři odstavce, každý o stupeň menší
   a tišší. Bylo to hezky myšlené, ale znamenalo to šest
   typografických hlasů na jedné obrazovce a sekci vysokou
   jako dvě — z předělu se stala kapitola.

   Teď je celý výrok JEDEN ŠIROKÝ ODSTAVEC v jednom stupni.
   Hierarchii nese postup vlny, ne velikost písma: co už vlna
   minula, povolí; co ji teprve čeká, drží. Krok `[data-say-step]`
   proto v HTML není a smyčka pro něj běží naprázdno — zůstala
   pro případ, že by se pod výrok někdy zase něco přidalo.

   ------------------------------------------------------------
   5 · DECH

   Celý blok se nadechuje sdíleným rytmem webu (11 s,
   KJ.breathWave). Amplituda je 0,4 % — pod prahem vědomého
   vnímání, nad prahem, kde je sazba mrtvá. Je to táž vlna,
   která o obrazovku výš rozpíná hrudník v hero sekci.

   ------------------------------------------------------------
   6 · FAIL-SAFE

   Bez skriptu, při omezeném pohybu nebo když modul spadne je
   --lit 1, --rel 0 — tedy plný inkoust, nic nepovolené, žádné
   plátno. Věta je vždycky celá čitelná; pohyb je bonus,
   ne nosič.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-say]");
  if (!root) return;

  var words = KJ.$$(".say__w", root);
  if (!words.length) return;

  var section = root.closest(".band") || root.parentNode;
  var wrap = root.closest(".say-wrap") || section;
  var steps = KJ.$$("[data-say-step]", section);

  if (KJ.isReduced()) return;

  /* ============================================================
     ROZDĚLENÍ NA PÍSMENA

     Rekurzivně, protože klíčová slova mají uvnitř <em>. Mezery
     (včetně nezlomitelné) zůstávají textovým uzlem — kdyby se
     z nich staly inline-block spany, směl by se řádek zlomit
     uprostřed „o to“.
     ============================================================ */
  function splitInto(node, bucket) {
    var kids = Array.prototype.slice.call(node.childNodes), i, k;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      if (k.nodeType === 3) {
        var txt = k.nodeValue;
        if (!txt) continue;
        var frag = document.createDocumentFragment();
        for (var j = 0; j < txt.length; j++) {
          var ch = txt.charAt(j);
          if (ch === " " || ch === "\u00A0" || ch === "\n" || ch === "\t") {
            frag.appendChild(document.createTextNode(ch));
          } else {
            var s = document.createElement("span");
            s.className = "say__c";
            s.textContent = ch;
            frag.appendChild(s);
            bucket.push(s);
          }
        }
        node.replaceChild(frag, k);
      } else if (k.nodeType === 1) {
        splitInto(k, bucket);
      }
    }
  }

  /* Pro každé slovo: jeho písmena, zda je klíčové, zda povoluje. */
  var W = [], chars = [], i, j;

  for (i = 0; i < words.length; i++) {
    var bucket = [];
    splitInto(words[i], bucket);
    if (!bucket.length) continue;
    W.push({
      el: words[i],
      from: chars.length,
      to: chars.length + bucket.length - 1,
      key: words[i].classList.contains("say__w--key"),
      letGo: false,
      rippled: false,
      x: 0, y: 0
    });
    for (j = 0; j < bucket.length; j++) chars.push(bucket[j]);
  }
  if (!W.length || !chars.length) return;

  var NW = W.length, NC = chars.length;

  /* Které slovo po průchodu vlny povolí a které zůstane svítit.
     Klíčová slova („přestat“, „držet“) si drží plný jas i barvu
     přílivu — jsou to dvě slova, kvůli kterým sekce existuje.
     Slova za posledním klíčovým (tečka apod.) taky nepovolí.   */
  var lastKey = -1;
  for (i = 0; i < NW; i++) if (W[i].key) lastKey = i;
  for (i = 0; i < NW; i++) {
    W[i].letGo = !W[i].key && i < lastKey;
    /* Třída, ne jen vlastnost: podle ní CSS pozná, komu vůbec
       nasadit filtr. Slovo bez ní nemá blur(0px), a tedy ani
       vrstvu v kompozitoru navíc.                            */
    if (W[i].letGo) W[i].el.classList.add("say__w--let");
  }

  /* Ke kterému slovu patří které písmeno. */
  var owner = new Array(NC);
  for (i = 0; i < NW; i++)
    for (j = W[i].from; j <= W[i].to; j++) owner[j] = i;

  /* ---------- ladění vlny ------------------------------------
     Všechno v jednotkách PÍSMEN: věta se pak smí přepsat
     a rytmus zůstane.

     A protože se přepsala důkladně — z třicetiznakového výroku
     je dvousetznakový odstavec — jsou čísla POMĚRNÁ k délce
     textu, ne pevná. S pevnými by čelo vlny široké pět a půl
     písmene přejelo dvě stě znaků jako světlomet: ostrá hrana
     místo náběhu. Spodní meze drží původní hodnoty, takže
     na krátkém textu se nic nezměnilo.                        */
  var LEAD  = Math.max(30, Math.round(NC * 0.17));   /* přesah vlny za konec */
  var RAMP  = Math.max(5.5, NC * 0.052);             /* šířka čela           */
  var HOT   = Math.max(7.5, NC * 0.070);             /* doznění přílivu      */
  var HOLD  = Math.max(12.0, NC * 0.115);            /* svit, než povolí     */
  var EASE  = Math.max(10.0, NC * 0.100);            /* jak pozvolna povoluje */

  var shown = 0, last = performance.now();

  function progress() {
    var r = root.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    /* Doběh je vysoko — výrok má být přečtený dřív, než se pod
       ním rozsvítí první odstavec. Ty dvě věci mají jít po
       sobě, ne přes sebe.                                     */
    var start = vh * 1.00;
    var end   = vh * 0.32;
    if (start <= end) return 1;
    return KJ.clamp((start - r.top) / (start - end), 0, 1);
  }

  /* ============================================================
     HLADINA — plátno pod sazbou

     Vzniká ve skriptu, ne v HTML. Kdo nemá JS nebo nechce
     pohyb, nedostane prázdný <canvas> do stránky; dostane
     čistou sazbu, což je celý fail-safe téhle sekce.
     ============================================================ */
  var cv = document.createElement("canvas");
  cv.className = "say__water";
  cv.setAttribute("aria-hidden", "true");
  wrap.insertBefore(cv, wrap.firstChild);
  var ctx = cv.getContext ? cv.getContext("2d") : null;

  var rings = [], box = { w: 0, h: 0 };
  var tide = [14, 107, 84];

  (function readTide() {
    var v = getComputedStyle(document.documentElement)
              .getPropertyValue("--tide").trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v);
    if (m) {
      var n = parseInt(m[1], 16);
      tide = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
  })();

  /* Poloha slov na plátně. Měří se jednou po rozložení a pak
     už jen při změně velikosti okna — ne každý snímek, to by
     byl layout thrash na dvanácti prvcích.                    */
  function measure() {
    if (!ctx) return;
    var m = KJ.fitCanvas(cv, ctx);
    box.w = m.w; box.h = m.h;
    var cr = cv.getBoundingClientRect();
    for (var i = 0; i < NW; i++) {
      var r = W[i].el.getBoundingClientRect();
      W[i].x = r.left - cr.left + r.width / 2;
      /* Účaří, ne střed: kapka padá tam, kde slovo stojí. */
      W[i].y = r.top - cr.top + r.height * 0.72;
    }
  }

  function ripple(x, y, strength, life, maxR) {
    if (rings.length > 26) rings.shift();
    rings.push({
      x: x, y: y,
      born: performance.now(),
      life: life,
      maxR: maxR,
      amp: strength
    });
  }

  var lastBreathRing = 0;

  function drawWater(now) {
    if (!ctx || !box.w) return;
    ctx.clearRect(0, 0, box.w, box.h);

    /* Pomalý kruh ze středu — sekce zůstane živá i když se
       nehýbe scroll. Sedmivteřinový rozestup je pod frekvencí,
       kterou oko čte jako „opakování“.                        */
    if (now - lastBreathRing > 7000) {
      lastBreathRing = now;
      ripple(box.w / 2, box.h * 0.42, 0.55, 11000, box.w * 0.44);
    }

    for (var i = rings.length - 1; i >= 0; i--) {
      var g = rings[i];
      var age = (now - g.born) / g.life;
      if (age >= 1) { rings.splice(i, 1); continue; }

      /* Kruh na vodě zpomaluje. Lineární by byl radar. */
      var r = g.maxR * (1 - Math.pow(1 - age, 2.6));
      /* Rychle se objeví, dlouho mizí. */
      var a = Math.min(1, age * 9) * Math.pow(1 - age, 1.7) * g.amp * 0.085;
      if (a < 0.002 || r < 1) continue;

      ctx.beginPath();
      ctx.ellipse(g.x, g.y, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + tide[0] + "," + tide[1] + "," + tide[2] + "," + a.toFixed(4) + ")";
      ctx.lineWidth = Math.max(0.6, 1.5 - age * 1.0);
      ctx.stroke();
    }
  }

  /* ============================================================
     KRESBA SAZBY
     ============================================================ */
  var prevLit = new Float32Array(NC);
  var prevHot = new Float32Array(NC);
  var prevRel = new Float32Array(NC);
  var prevWRel = new Float32Array(NW);
  var prevWLit = new Float32Array(NW);
  var first = true;

  function paint(now) {
    var head = shown * (NC + LEAD);
    var ci, d, lit, hot, rel, w, wi;

    for (ci = 0; ci < NC; ci++) {
      wi = owner[ci];
      d = head - ci;                          /* jak daleko za písmenem je čelo */
      lit = KJ.clamp(d / RAMP, 0, 1);
      hot = lit * Math.exp(-Math.max(0, d - RAMP) / HOT);
      rel = 0;

      if (W[wi].key) {
        /* Klíčová slova příliv nepouštějí. */
        hot = Math.max(hot, lit * 0.92);
      } else if (W[wi].letGo) {
        rel = KJ.clamp((d - HOLD) / EASE, 0, 1);
        /* Doběh krychlí — slovo dosedne, nedopadne. */
        rel = 1 - Math.pow(1 - rel, 3);
      }

      /* Zapisujeme jen to, co se opravdu hnulo. Bez tohohle
         je to 144 zápisů do stylu na snímek.                 */
      if (first || Math.abs(lit - prevLit[ci]) > 0.004) {
        chars[ci].style.setProperty("--lit", lit.toFixed(3));
        prevLit[ci] = lit;
      }
      if (first || Math.abs(hot - prevHot[ci]) > 0.004) {
        chars[ci].style.setProperty("--hot", hot.toFixed(3));
        prevHot[ci] = hot;
      }
      if (first || Math.abs(rel - prevRel[ci]) > 0.004) {
        chars[ci].style.setProperty("--rel", rel.toFixed(3));
        prevRel[ci] = rel;
      }
    }

    /* Slovo jako celek: rozostření a pootočení. Filtr na dvanácti
       slovech je levnější než na padesáti písmenech — a je i
       správnější: měkne SLOVO, ne litera.                    */
    for (wi = 0; wi < NW; wi++) {
      w = W[wi];
      var mid = (w.from + w.to) / 2;
      var wr = 0;
      if (w.letGo) {
        wr = KJ.clamp((head - mid - HOLD) / EASE, 0, 1);
        wr = 1 - Math.pow(1 - wr, 3);
      }
      if (first || Math.abs(wr - prevWRel[wi]) > 0.004) {
        w.el.style.setProperty("--wrel", wr.toFixed(3));
        prevWRel[wi] = wr;
      }
      /* Svit pod klíčovými slovy se váže na příchod vlny —
         jinak by pointa svítila dřív, než se k ní věta dostane. */
      if (w.key) {
        var wl = KJ.clamp((head - mid) / RAMP, 0, 1);
        if (first || Math.abs(wl - prevWLit[wi]) > 0.006) {
          w.el.style.setProperty("--wlit", wl.toFixed(3));
          prevWLit[wi] = wl;
        }
      }
      /* KAPKA. Jednou za slovo, ve chvíli, kdy se pouští
         nejrychleji — ne až doletí, to už by kruh přišel pozdě. */
      if (!w.rippled && wr > 0.16) {
        w.rippled = true;
        ripple(w.x, w.y, 1, 6400, Math.max(130, box.w * 0.21));
      }
      if (w.rippled && wr === 0) w.rippled = false;   /* scroll zpět */
    }

    /* DECRESCENDO. Odstavce se PŘEKRÝVAJÍ — rozestup (6 písmen)
       je menší než šířka náběhu (9). Kdyby čekaly na sebe, bylo
       by to odpočítávání; takhle je to jeden plynulý výdech.

       Čísla musí sedět na LEAD: poslední odstavec potřebuje
       doběhnout dřív, než vlna dojede. 3 × 6 + 9 + 1 = 28 ≤ 30. */
    for (i = 0; i < steps.length; i++) {
      var s = KJ.clamp((head - NC - 1 - i * 6) / 9, 0, 1);
      s = 1 - Math.pow(1 - s, 3);
      steps[i].style.setProperty("--step", s.toFixed(3));
    }

    first = false;
  }

  var stopped = true, stop = null, ro = null;

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var want = progress();
    /* Doběh: vlna scroll sleduje, ale nepředbíhá ani neskáče.
       Kdyby písmena visela přímo na poloze scrollu, byl by
       z toho posuvník: kolečko nahoru, sazba zhasne.         */
    shown += (want - shown) * Math.min(1, dt * 5.2);
    if (Math.abs(want - shown) < 0.0006) shown = want;
    paint(now);
    drawWater(now);
    /* Sdílený dech webu. Píše se na sekci, ne na písmena —
       jedna vlastnost místo padesáti.                        */
    if (section && section.style) {
      section.style.setProperty("--bw", KJ.breathWave().toFixed(3));
    }
  }

  /* Než na sekci dojde scroll, je věta ztlumená — ale nikdy ne
     neviditelná: --lit 0 dává 26 % krytí, tedy čitelný obrys.
     Nastavíme to hned, aby text neblikl z plného inkoustu.    */
  measure();
  shown = progress();
  paint(performance.now());

  var remeasure = KJ.debounce(function () {
    for (var i = 0; i < NW; i++) W[i].rippled = false;
    rings.length = 0;
    measure();
  }, 180);
  window.addEventListener("resize", remeasure, { passive: true });

  /* Přetečení řádku po doběhnutí písma posune slova; bez
     přeměření by kruhy padaly vedle nich. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); });
  }

  KJ.visibilityGate(root, function () {
    if (!stopped) return;
    stopped = false;
    measure();
    last = performance.now();
    stop = KJ.addTicker(frame);
  }, function () {
    if (stopped) return;
    stopped = true;
    if (stop) { stop(); stop = null; }
  });
})();
