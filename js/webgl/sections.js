/* ============================================================
   sections.js — DESET 3D SCÉN

   Nahrazuje kreslené scény v sekcích „Ruce mají svá místa“
   a „Čeho se nebát“ skutečným trojrozměrným modelem.

   HTML ani CSS se nemění. Modul si vezme totéž plátno, které
   měla kreslená verze. Když WebGL není k dispozici nebo si
   návštěvník přeje omezený pohyb, modul se nespustí a plátno
   převezme původní kreslená verze — ta zůstává jako záloha.

   ------------------------------------------------------------
   PROČ TU UŽ NEJSOU RUCE

   Ve všech deseti scénách stála ruka. Byla to nejsložitější věc,
   kterou scéna obsahovala — osmnáct článků, nehty, šlachy —
   a zároveň jediná, kterou umí posoudit úplně každý: ruku má
   člověk před očima celý život. Když se povedla kost, nikdo si
   nevšiml; když se nepovedla ruka, strhla s sebou i tu kost.

   Ruce jsou proto pryč a místo nich se na těle rozsvítí
   STOPA DOTYKU — měkké světlo přesně tam, kde dlaň spočine,
   přesně tak velké, se stejným dechem. Sekce o doteku, který
   váží pět gramů, tak ukazuje dotek jako světlo, ne jako maso.
   Je to zároveň pravdivější: co se při sezení opravdu děje,
   se neodehrává v ruce, ale pod ní.

   ------------------------------------------------------------
   ČTYŘI PRAVIDLA, KTERÁ PLATÍ PRO VŠECH DESET

   1 UKAZOVÁTKO. Každá scéna má strukturu, o které mluví text,
     a ta se musí SAMA PŘIHLÁSIT. Dělá to `focus`: struktura se
     rozsvítí přílivovou barvou, nadechne se a zase ztlumí.
     Ne blikání — ukázání prstem.

   2 KOMPOZICE. Těleso má v rámu sedět: hlavní děj ve zlatém
     řezu, ne uprostřed, a nikdy uříznutý okrajem. Proto má
     každá scéna vlastní `target` a `dist`, ne jednu společnou
     kameru.

   3 MATERIÁL NESE VÝZNAM. Kost je porcelán, tkáň je zelená,
     kůže je teplá. Návštěvník tak pozná, na co se dívá, ještě
     než přečte popisek.

   4 NIC ABSTRAKTNÍHO. Scéna „žádné jehly“ ukazuje jehlu
     v přeškrtnutém kolečku, ne metaforu. Kdo se dívá bez textu,
     musí poznat, o čem to je.

   ------------------------------------------------------------
   SOUŘADNICE

   Každá scéna má vlastní, ale drží společné pravidlo:
   +y je vzhůru, kamera obíhá kolem osy y. Jednotka je vždy
   hlavní rozměr scény (délka chodidla, délka lebky), aby
   proporce nezávisely na měřítku.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ, G = window.KJGeom, P = window.KJParts;
  if (!KJ || !G || !P) return;

  var TAU = G.TAU, lerp = G.lerp, clamp = G.clamp, curve = G.curve;
  var lump = P.lump, bone = P.bone;

  /* ============================================================
     SPOLEČNÉ POMŮCKY
     ============================================================ */

  /* Podložka pod scénou. Bez plochy, na které věc leží, nemá
     stín kde vzniknout a těleso se vznáší.                  */
  /* Podložka pod scénou. Bez plochy, na které věc leží, nemá
     stín kde vzniknout a těleso se vznáší.

     DVĚ ČÍSLA, KTERÁ SE ZDAJÍ JEDNO. Deska musí být tak velká,
     aby její vzdálená hrana padla až za mlhu (od 5,8 jednotky
     je bílá jako plátno) — jinak zůstane v rámu jako obzor.
     A zároveň nesmí být tak velká, aby se dostala k daleké
     ořezové rovině: tam už hloubkový buffer nerozezná horní
     stranu desky od spodní a z celé scény je televizní sníh.
     Šestnáct krát čtrnáct je mezi tím. Tloušťka je nad rámec
     nutného schválně — čím dál od sebe obě strany jsou, tím
     menší je šance, že se o hloubku poperou.               */
  function surface(m, y, w, d, key) {
    G.sheet(m, 16, 12, function (u, v) {
      var edge = Math.pow(Math.abs(u - 0.5) * 2, 8) + Math.pow(Math.abs(v - 0.5) * 2, 8);
      return { p: [(u - 0.5) * w, y - edge * 0.012, (v - 0.5) * d], n: [0, 1, 0],
               ao: 0.03 + edge * 0.18, key: key || 0 };
    }, 0.035);
    return m;
  }

  /* Klidné obcházení kamery. Tři nesouměřitelné periody, aby
     pohyb neměl slyšitelný takt.                            */
  function orbit(base, amp, speed) {
    return function (T) {
      return base + Math.sin(T * speed) * amp
                  + Math.sin(T * speed * 0.41 + 1.3) * amp * 0.35;
    };
  }

  /* Dech: 0 → 1 → 0 zadaným počtem cyklů za minutu. */
  function breath(T, perMin) {
    return (1 - Math.cos(T / (60 / perMin) * TAU)) / 2;
  }

  /* ------------------------------------------------------------
     UKAZOVÁTKO

     Struktura, o které scéna mluví, se rozsvítí — ale DÝCHÁ,
     nebliká. Tvrdé blikání je alarm; tohle má být prst, který
     na něco ukáže a zase ruku spustí. Náběh proto trvá,
     vrchol je krátký a doznění dlouhé.
     ------------------------------------------------------------ */
  function point(T, period, at, w, delay) {
    var p = ((T - (delay || 0)) % period) / period;
    if (p < 0) p += 1;
    var amt = Math.pow(Math.sin(Math.PI * clamp((p - 0.05) / 0.74, 0, 1)), 1.35);
    return { at: at, w: w || 0.055, amt: amt };
  }

  /* Několik struktur po sobě — každá dostane vlastní okno.
     Používá to scéna přepážek: pánevní dno, bránice, hrudní
     vstup. Pořadí je zdola nahoru, protože tak se to i děje. */
  function pointSeq(T, stations, dwell, w) {
    var n = stations.length;
    var p = (T % (n * dwell)) / dwell;
    var i = Math.floor(p), t = p - i;
    var amt = Math.pow(Math.sin(Math.PI * clamp((t - 0.07) / 0.72, 0, 1)), 1.3);
    return { at: stations[i % n], w: w || 0.05, amt: amt };
  }

  /* ------------------------------------------------------------
     LEBEČNÍ ŠVY

     Klenba lebky je hladká plocha a v renderu se z ní snadno
     stane vejce. Švy jsou to jediné, co ji rozkreslí — a jsou
     to zároveň struktury, o kterých mluví text. Používají je
     dvě scény, takže stojí tady, ne uvnitř jedné z nich.

     Nekreslí se „někam na hlavu“: počítají se ze STEJNÉ plochy
     jako klenba (`skullPoint`), takže na ní leží přesně.
     Ozubení dělá rozdíl mezi švem a nakreslenou linkou; posun
     o kousek ven brání blikání s povrchem.

     `keys` = [věnčitý, šípový, lambdový, šupinový]
     ------------------------------------------------------------ */
  function skullSutures(mesh, keys, r) {
    r = r || 0.0062;
    function suture(samples, k) {
      var pts = [];
      for (var i = 0; i < samples.length; i++) {
        var p = P.skullPoint(samples[i][0], samples[i][1]);
        var j = Math.sin(i * 2.3) * 0.0060 + Math.sin(i * 5.1) * 0.0030;
        pts.push([p[0] + j * 0.6,
                  0.100 + (p[1] - 0.100) * 1.014 + j,
                  p[2] * 1.014 + j * 0.5]);
      }
      bone(mesh, pts, function () { return [r, r]; }, 6, { key: k, dense: 2 });
    }
    var N = 22, q = [], i;
    /* věnčitý šev — přes temeno z jednoho spánku na druhý */
    for (i = 0; i <= N; i++) {
      var a = lerp(-0.15 * Math.PI, 1.15 * Math.PI, i / N);
      q.push([0.058 - Math.abs(Math.cos(a)) * 0.022, a]);
    }
    suture(q, keys[0]);
    /* šípový šev — po hřebeni dozadu k lambdě */
    q = [];
    for (i = 0; i <= 16; i++) q.push([lerp(0.056, -0.300, i / 16), Math.PI / 2]);
    suture(q, keys[1]);
    /* lambdový a šupinový šev */
    [-1, 1].forEach(function (sd) {
      var w = [], i2, t;
      for (i2 = 0; i2 <= 14; i2++) {
        t = i2 / 14;
        w.push([lerp(-0.300, -0.404, Math.pow(t, 0.7)),
                Math.PI / 2 + sd * 0.56 * Math.PI * Math.pow(t, 0.85)]);
      }
      suture(w, keys[2]);
      w = [];
      for (i2 = 0; i2 <= 14; i2++) {
        t = i2 / 14;
        w.push([lerp(0.150, -0.180, t),
                (sd > 0 ? 0 : Math.PI) + sd * (0.02 + 0.13 * Math.sin(Math.PI * t)) * Math.PI]);
      }
      suture(w, keys[3]);
    });
    return mesh;
  }

  /* ============================================================
     SEKCE A — PĚT STANIC
     ============================================================ */

  /* --- 01 · CHODIDLA A KOTNÍKY ------------------------------
     „Ruce spočinou na chodidlech a nic se neděje.“

     V rámu je jedna noha. Byly tu chvíli dvě, aby scéna
     vypadala jako člověk a ne jako preparát — jenže druhá noha
     se s první v perspektivě překryla a z obou se stala jedna
     nepřehledná hmota. Lidský rozměr nese poloha (lýtko leží,
     chodidlo míří vzhůru) a světlo dlaně, ne počet nohou.

     Ukazovátko drží hlezenní kloub: kotník je místo, kde bérec
     dosedá na nohu, a kam se u prvního hmatu opravdu sahá.
     Přílivová vlna k němu stoupá od prstů vzhůru.

     PŘEKLÍČOVÁNÍ. footBones rozdává klíče podle kostí, ne podle
     děje. Tady se přemapují tak, aby ROSTLY OD PRSTŮ K BÉRCI:
     scéna se pak vyvolává odspodu nahoru a vlna má kudy jít.  */
  function stopsFoot() {
    var bones = new G.Mesh(), shell = new G.Mesh();
    var pad = new G.Mesh(), glow = new G.Mesh();

    function footKey(k) {
      if (k > 0.90) return 0.44;   /* patní kost      */
      if (k > 0.75) return 0.60;   /* hlezenní kost   */
      if (k > 0.64) return 0.36;   /* člunková, klínové, krychlová */
      if (k > 0.58) return 0.27;   /* nártní kosti    */
      if (k > 0.50) return 0.18;   /* články prstů    */
      if (k > 0.40) return 0.63;   /* kotníkové hroty */
      return 0.76;                 /* bérec           */
    }
    /* LEŽÍCÍ ČLOVĚK, NE STOJÍCÍ.

       footBones a footShell staví nohu tak, jak stojí na zemi:
       bérec vzhůru, chodidlo naplocho. Jenže klient na lehátku
       LEŽÍ — lýtko spočívá vodorovně a chodidlo míří vzhůru.
       Otočení o 90° kolem osy z to napraví: místní +y (vzhůru
       po bérci) jde do světového −x (k hlavě), místní +x
       (ke špičkám) do světového +y. Pata pak leží nejníž
       a je na čem stát.                                      */
    function lie(m) { m.push(); m.rotZ(Math.PI / 2); return m; }

    P.footBones(lie(bones), { keyOf: footKey }); bones.pop();
    /* Obal přichází POSLEDNÍ (klíč 0,92) — kosti se poskládají
       a teprve pak se přes ně přetáhne kůže. Vyvolávání scény
       tak má směr, ne jen náběh.                            */
    P.footShell(lie(shell), { key: 0.92 }); shell.pop();

    /* Lehátko.

       POZOR NA VELIKOST. Chvíli tu byla plocha 40 × 28 jednotek,
       aby v rámu nebyla vidět její hrana. Jenže deska má horní
       i spodní stranu vzdálené 0,024 jednotky a při dohledu na
       dvacet jednotek (daleká ořezová rovina) na to hloubkový
       buffer nemá přesnost: obě strany se začaly přetahovat
       a z celé scény byl televizní sníh.

       Obzor se řeší jinak a zadarmo: SKLONEM KAMERY. Když je
       sklon větší než polovina zorného úhlu, obzor je nad
       horní hranou rámu a plocha může být malá.             */
    surface(pad, 0.014, 16.00, 14.00, 0.02);

    /* PŘÍLIV — vlna stoupá od prstů vzhůru bércem */
    bone(glow, [[-0.20, 0.24, 0.030], [-0.44, 0.246, 0.032], [-0.82, 0.244, 0.034]],
      function () { return [0.0085, 0.0085]; }, 7,
      { key: function (u) { return 0.62 + u * 0.20; }, up: [0, 1, 0] });

    return {
      parts: [
        { m: pad,   mat: "cloth",  order: 0, noFoc: true },
        { m: bones, mat: "bone",   order: 2 },
        { m: glow,  mat: "tide" },
        { m: shell, mat: "shell",  over: { dens: 0.105 }, order: 5 }
      ],
      shadows: [
        { at: [-0.42, 0.020, 0.010], rx: 0.46, rz: 0.17, a: 0.26, sharp: 0.50 }
      ],
      /* Dlaně leží na nártech — tedy na ploše, která u ležícího
         člověka míří k hlavě. Ploška je proto postavená
         nastojato (roll ≈ 90°), ne položená na zem.          */
      touch: function (T) {
        var b = 0.86 + 0.14 * breath(T, 9);
        return [
          { at: [-0.212, 0.500, 0.010], rx: 0.27, rz: 0.16, a: 0.44 * b,
            roll: 1.57, sharp: 0.10 }
        ];
      },
      focus: function (T) { return point(T, 6.4, 0.615, 0.038); },
      pool: [0.44, 0.52, 0.11],
      /* DELŠÍ OBJEKTIV. Všech deset scén mělo fov 0,58 — široký
         úhel, ve kterém se bližší konec tělesa nafoukne a vzdálený
         uteče. Teď je fov 0,46 a kamera o kus dál: kresba je
         plošší, proporce sedí a scéna vypadá vyfotografovaná,
         ne vyrenderovaná.                                      */
      cam: function (T, px, py) {
        /* Sklon musí být větší než polovina zorného úhlu (0,23),
           jinak zůstane v rámu obzor podložky a scéna se
           rozřízne vodorovným pruhem vejpůl.                */
        return { yaw: orbit(0.34, 0.12, 0.074)(T) + px * 0.20,
                 pitch: 0.425 + Math.sin(T * 0.058) * 0.026 + py * 0.08,
                 dist: 2.78, fov: 0.46, target: [-0.235, 0.360, -0.020] };
      },
      labels: [
        { p: [-0.164, 0.256, -0.106], t: "KOTNÍK", hot: true },
        { p: [-0.214, 0.500, 0.010], t: "TADY LEŽÍ DLAŇ", hot: true },
        { p: [-0.086, 0.112, 0.000], t: "PATNÍ KOST" }
      ],
      read: function (T) {
        var rel = clamp((T - 1.4) / 6.0, 0, 1);
        return [["DECH", "≈ " + Math.round(lerp(14, 9, rel)) + " / min", rel > 0.5],
                ["NÁROK", "žádný", false]];
      },
      wave: function (T) { return ((T / 6.7) % 1) * 1.3 - 0.15; }
    };
  }

  /* --- 02 · KOST KŘÍŽOVÁ A TVRDÁ PLENA ----------------------
     Klín kosti křížové se naklápí kolem osy ve druhém křížovém
     obratli — ne kolem svého středu. Proto se hrot houpe víc
     než báze; kdyby se otáčel střed, byl by to kolotoč.

     Pánev tu není a je to schválně: jako plát mezi klínem
     a kamerou jen mátla a v tomhle záběru z ní zbyly dvě
     šedé desky. Hlavní herec je klín kosti křížové, sloupec
     nad ním a světlo dlaně pod ním — nic víc do rámu nepatří. */
  function stopsSacrum() {
    var spine = new G.Mesh(), sacr = new G.Mesh();
    var dura = new G.Mesh(), glow = new G.Mesh();

    /* pět bederních obratlů s ploténkami a s lordózou */
    for (var i = 0; i < 5; i++) {
      var u = i / 4;
      var y = 0.610 - u * 0.430;
      var x = 0.010 + Math.sin(u * Math.PI) * 0.046;
      spine.push();
      spine.move(x, y, 0);
      spine.rotZ(-0.12 + u * 0.22);
      P.vertebra(spine, 0.100 + u * 0.014, { key: 0.24 + u * 0.18, lean: 0.03 });
      spine.pop();
      spine.push();
      spine.move(x + 0.012, y - 0.054, 0);
      P.disc(spine, 0.100 + u * 0.014, { key: 0.26 + u * 0.18 });
      spine.pop();
    }

    P.sacrum(sacr, { key: 0.62, keySpan: 0.20 });

    /* TVRDÁ PLENA — trubka v páteřním kanálu, končí úponem na S2 */
    bone(dura, [[-0.066, 0.860, 0], [-0.072, 0.560, 0], [-0.062, 0.320, 0],
                [-0.046, 0.110, 0], [-0.026, -0.020, 0]],
      function () { return [0.030, 0.026]; }, 12,
      { key: function (u) { return 0.22 + u * 0.56; }, up: [0, 1, 0] });
    bone(glow, [[-0.066, 0.860, 0], [-0.070, 0.470, 0], [-0.052, 0.100, 0], [-0.026, -0.020, 0]],
      function () { return [0.0085, 0.0085]; }, 7,
      { key: function (u) { return 0.22 + u * 0.56; }, up: [0, 1, 0] });

    return {
      parts: [
        { m: spine, mat: "bone",     order: 2 },
        { m: sacr,  mat: "bone",     key: "sacrum", order: 3 },
        { m: glow,  mat: "tide" },
        { m: dura,  mat: "dura", over: { dens: 0.13 } }
      ],
      models: function (T) {
        var ph = (T / (60 / 9)) % 1;
        var nut = Math.sin(ph * TAU) * 0.070;
        var m = G.mat4();
        G.mul(m, m, G.translate(0.020, 0.100, 0));
        G.mul(m, m, G.rotZ(nut));
        G.mul(m, m, G.translate(-0.020, -0.100, 0));
        return { sacrum: m };
      },
      shadows: [{ at: [-0.10, -0.320, 0], rx: 0.34, rz: 0.26, a: 0.15, sharp: 0.2 }],
      /* Dlaň leží POD křížem — světlo tedy přichází zezadu
         a je naklopené do roviny kosti, ne vodorovné.      */
      touch: function (T) {
        var b = 0.84 + 0.16 * breath(T, 9);
        return [{ at: [-0.088, -0.040, 0], rx: 0.24, rz: 0.19, a: 0.44 * b,
                  tilt: 0, roll: 1.35, sharp: 0.10 }];
      },
      focus: function (T) { return point(T, 6.8, 0.715, 0.135); },
      pool: [0.45, 0.50, 0.10],
      cam: function (T, px, py) {
        return { yaw: orbit(5.50, 0.12, 0.092)(T) + px * 0.20,
                 pitch: 0.125 + Math.sin(T * 0.076) * 0.034 + py * 0.08,
                 dist: 2.00, fov: 0.46, target: [0.000, 0.120, 0] };
      },
      labels: [
        { p: [0.052, -0.060, 0.052], t: "KOST KŘÍŽOVÁ", hot: true, key: "sacrum" },
        { p: [-0.072, 0.560, 0.030], t: "TVRDÁ PLENA" },
        { p: [-0.090, -0.040, 0], t: "TADY LEŽÍ DLAŇ", hot: true }
      ],
      read: function () { return [["NAKLOPENÍ", "≈ 9 cyklů / min", true],
                                  ["TLAK", "žádný", false]]; },
      wave: function (T) { return 0.92 - ((T / 6.7) % 1) * 1.18; }
    };
  }

  /* --- 03 · PŘÍČNÉ PŘEPÁŽKY ---------------------------------
     Text mluví o třech úžinách: pánevní dno, bránice, hrudní
     vstup. Scéna je proto ukazuje VŠECHNY TŘI a ukazovátko
     mezi nimi putuje zdola nahoru — přesně v tom pořadí, jak
     se pod rukama pouštějí.

     Hrudní koš je průsvitný, bránice uvnitř plná. Jinak by
     hlavní děj scény nebyl vidět. Pořadí kreslení je tu
     podstatné: bránice má menší `order` než koš, aby ji
     polopropustná žebra nevyřízla hloubkovým testem.        */
  function stopsDiaphragm() {
    var spine = new G.Mesh(), cage = new G.Mesh();
    var low = new G.Mesh(), hip = new G.Mesh(), mem = new G.Mesh();

    P.thoracicSpine(spine, { keyOf: function (i) { return 0.30 + i / 11 * 0.14; } });
    P.ribcage(cage, { keyOf: function (i) { return 0.34 + i / 11 * 0.16; }, key: 0.34 });

    /* bederní páteř dolů k pánvi — bez ní visí pánevní dno
       ve vzduchu a scéna se rozpadne na dva kusy           */
    for (var i = 0; i < 5; i++) {
      var u = i / 4;
      var y = 0.118 - u * 0.108;
      var x = -0.086 + Math.sin(u * Math.PI) * 0.020;
      low.push();
      low.move(x, y, 0);
      P.vertebra(low, 0.040 + u * 0.004, { key: 0.18 + u * 0.08, lean: 0.012 });
      low.pop();
    }
    hip.push();
    hip.move(-0.070, -0.010, 0);
    hip.scale(0.46);
    P.pelvis(hip, { key: 0.14 });
    hip.pop();

    /* HRUDNÍ VSTUP — blána v horní hrudní apertuře, mezi
       klíčky, prvním žebrem a prvním hrudním obratlem.     */
    P.membrane(mem, { y: 0.505, rx: 0.072, rz: 0.104, cx: 0.052,
                      sag: 0.020, key: 0.80 });
    /* PÁNEVNÍ DNO — miska mezi sedacími hrboly a kostrčí. */
    P.membrane(mem, { y: -0.062, rx: 0.078, rz: 0.070, cx: -0.048,
                      sag: 0.034, key: 0.96 });

    return {
      parts: [
        { m: hip,   mat: "boneSoft", over: { alpha: 0.26, rim: 0.60 }, order: 0, noFoc: true },
        { m: low,   mat: "bone",     order: 1 },
        { m: spine, mat: "bone",     order: 1 },
        { m: mem,   mat: "tissue",   over: { alpha: 0.90 }, order: 3 },
        { m: cage,  mat: "boneSoft", over: { alpha: 0.42, rim: 0.72 }, order: 5 }
      ],
      dyn: function (T) {
        var rel = clamp((T - 1.2) / 5.0, 0, 1);
        var br = breath(T, lerp(15, 9, rel));
        var m = new G.Mesh();
        P.diaphragm(m, br * lerp(0.55, 1, rel), { key: 0.62 });
        return [{ m: m, mat: "tissue", key: "dome", order: 2 }];
      },
      shadows: [{ at: [-0.04, -0.130, 0], rx: 0.24, rz: 0.20, a: 0.10, sharp: 0.2 }],
      /* Jedna ruka na hrudní kosti, druhá pod zády proti ní. */
      touch: function (T) {
        var rel = clamp((T - 1.2) / 5.0, 0, 1);
        var b = 0.82 + 0.18 * breath(T, lerp(15, 9, rel));
        return [
          { at: [0.172, 0.300, 0], rx: 0.13, rz: 0.14, a: 0.42 * b, roll: 1.45, sharp: 0.10 },
          { at: [-0.140, 0.300, 0], rx: 0.12, rz: 0.15, a: 0.30 * b, roll: 1.45, sharp: 0.10 }
        ];
      },
      /* Zdola nahoru: pánevní dno → bránice → hrudní vstup. */
      focus: function (T) { return pointSeq(T, [0.96, 0.62, 0.80], 4.0, 0.048); },
      pool: [0.46, 0.50, 0.10],
      cam: function (T, px, py) {
        return { yaw: orbit(5.56, 0.15, 0.084)(T) + px * 0.22,
                 pitch: 0.235 + Math.sin(T * 0.068) * 0.034 + py * 0.08,
                 dist: 1.86, fov: 0.46, target: [0.005, 0.205, 0] };
      },
      labels: [
        { p: [0.018, 0.206, -0.130], t: "BRÁNICE", hot: true },
        { p: [0.052, 0.505, -0.104], t: "HRUDNÍ VSTUP" },
        { p: [-0.048, -0.070, 0.070], t: "PÁNEVNÍ DNO" }
      ],
      read: function (T) {
        var rel = clamp((T - 1.2) / 5.0, 0, 1);
        return [["DECH", "≈ " + Math.round(lerp(15, 9, rel)) + " / min", rel > 0.5],
                ["PŘEPÁŽKY", rel > 0.5 ? "povolily" : "drží", rel > 0.5]];
      },
      wave: function (T) { return ((T / 8) % 1) * 1.3 - 0.15; }
    };
  }

  /* --- 04 · TÝLNÍ BÁZE A BLOUDIVÝ NERV ----------------------
     Prsty leží pod týlním valem a kloub dostane místo. Když se
     štěrbina mezi týlní kostí a atlasem otevře, tělo se přepne
     z pohotovosti do trávení — a to je celý příběh scény.

     Ukazovátko drží PRÁVĚ TU ŠTĚRBINU: pásmo klíče sedí mezi
     bází lebky a atlasem, takže se rozsvítí obojí naráz a je
     vidět, že jde o styk, ne o jednu kost.                  */
  function stopsOcciput() {
    var head = new G.Mesh(), base = new G.Mesh(), sut = new G.Mesh();
    var atl = new G.Mesh(), ax = new G.Mesh(), neck = new G.Mesh();
    var nerve = new G.Mesh(), organ = new G.Mesh();

    P.skull(head, { key: 0.18 });
    P.occipitalBase(base, { key: 0.36 });
    /* Švy tu nejsou hlavní herec — jsou tu proto, že bez nich
       je zátylek prázdná kupole. Klíč mají nízko a mimo pásmo
       ukazovátka, takže se rozsvítí jen s vlnou, ne s ním.  */
    skullSutures(sut, [0.10, 0.12, 0.14, 0.16], 0.0050);

    P.atlas(atl, 0.155, { key: 0.42 });
    P.axisVert(ax, 0.155, { key: 0.52 });
    for (var i = 0; i < 4; i++) {
      neck.push();
      neck.move(-0.056 + i * 0.006, -0.500 - i * 0.116, 0);
      neck.rotZ(0.04);
      P.vertebra(neck, 0.080, { key: 0.56 + i * 0.02, lean: 0.01 });
      neck.pop();
    }

    /* BLOUDIVÝ NERV — z báze lebky dolů podél krku k orgánům */
    var vag = [[0.020, -0.180, 0.104], [0.072, -0.330, 0.138],
               [0.096, -0.560, 0.150], [0.092, -0.760, 0.138],
               [0.080, -0.930, 0.120]];
    bone(nerve, vag, function (u) { return [0.014 - u * 0.004, 0.014 - u * 0.004]; }, 9,
      { key: function (u) { return 0.64 + u * 0.32; }, up: [0, 1, 0] });
    [[-0.400, 0], [-0.590, 1], [-0.770, 2]].forEach(function (q) {
      bone(nerve, [[0.092, q[0], 0.146], [0.160, q[0] - 0.014, 0.200],
                   [0.216, q[0] - 0.028, 0.234]],
        function () { return [0.0065, 0.0065]; }, 6, { key: 0.80 + q[1] * 0.05, up: [0, 1, 0] });
    });
    /* orgány, kterým nerv velí — srdce, žaludek, střevo */
    lump(organ, [0.264, -0.430, 0.254], [0.058, 0.062, 0.046], function (d) {
      return 1 + 0.20 * Math.max(0, -d[1]) * Math.max(0, -d[0]);
    }, { key: 0.86 });
    lump(organ, [0.268, -0.620, 0.238], [0.050, 0.056, 0.040], null, { key: 0.90 });
    lump(organ, [0.250, -0.800, 0.236], [0.056, 0.046, 0.040], null, { key: 0.95 });

    return {
      parts: [
        { m: head,  mat: "bone", order: 1 },
        { m: base,  mat: "bone", order: 1 },
        { m: sut,   mat: "tide", over: { alpha: 0.55, hot: 0.02 } },
        { m: atl,   mat: "bone", key: "atlas", order: 2 },
        { m: ax,    mat: "bone", key: "axis",  order: 2 },
        { m: neck,  mat: "boneSoft", order: 2 },
        { m: organ, mat: "tissue", over: { alpha: 0.92 }, order: 3 },
        { m: nerve, mat: "tide" }
      ],
      models: function (T) {
        /* Kloub dostane místo — štěrbina se otevře plynule. */
        var open = clamp((T - 1.0) / 4.6, 0, 1);
        var gap = lerp(0.014, 0.048, open);
        var a = G.mat4(); G.mul(a, a, G.translate(-0.072, -0.212 - gap, 0));
        var b = G.mat4(); G.mul(b, b, G.translate(-0.062, -0.368 - gap * 1.7, 0));
        return { atlas: a, axis: b };
      },
      shadows: [],
      /* Prsty spočinou pod týlním valem. Ploška je naklopená
         dozadu, protože týl je svah, ne stůl.              */
      touch: function (T) {
        var b = 0.82 + 0.18 * breath(T, 9);
        return [{ at: [-0.372, -0.130, 0], rx: 0.20, rz: 0.22, a: 0.46 * b,
                  roll: -0.95, sharp: 0.10 }];
      },
      focus: function (T) { return point(T, 6.6, 0.390, 0.062); },
      pool: [0.42, 0.54, 0.11],
      cam: function (T, px, py) {
        /* Boční pohled, o kousek stočený dozadu. Zezadu je
           klenba jen kupole; z boku se pozná lebka, spánek
           i to, že hlava na atlasu SEDÍ.                    */
        return { yaw: orbit(3.34, 0.11, 0.094)(T) + px * 0.20,
                 pitch: 0.145 + Math.sin(T * 0.071) * 0.026 + py * 0.07,
        /* Detail, ne portrét. Klenba lebky je hladká plocha
           a když zabere půl rámu, je z ní vejce. Rám proto
           drží STYK: týlní kost nahoře, atlas uprostřed,
           bloudivý nerv dolů — a lebka se nahoře klidně
           uřízne, protože o ni tu nejde.                   */
                 dist: 2.82, fov: 0.46, target: [-0.120, -0.245, 0.020] };
      },
      labels: [
        { p: [-0.418, 0.020, -0.120], t: "TÝLNÍ KOST" },
        { p: [-0.062, -0.248, -0.150], t: "ATLAS · C1", hot: true, key: "atlas" },
        { p: [0.096, -0.560, 0.156], t: "BLOUDIVÝ NERV", hot: true },
        { p: [-0.380, -0.135, 0.040], t: "TADY LEŽÍ PRSTY", hot: true }
      ],
      read: function (T) {
        var op = clamp((T - 1.0) / 4.6, 0, 1);
        return [["TEP", "≈ " + Math.round(lerp(78, 62, op)) + " / min", op > 0.5],
                ["STAV", op > 0.5 ? "klid a trávení" : "pohotovost", op > 0.5]];
      },
      wave: function (T) { return ((T / 4.2) % 1) * 1.5 - 0.2; }
    };
  }

  /* --- 05 · LEBKA, ŠVY A DOZNĚNÍ ----------------------------
     Klenbový hmat: obě dlaně drží lebku z boků. Švy svítí,
     protože právě ony jsou to, co se pod rukama nepatrně hýbe —
     a ukazovátko po nich jde jeden po druhém, jak je terapeutka
     pod prsty najde: věnčitý, šípový, lambdový, šupinový.

     Uprostřed smyčky přijde STILL POINT: rytmus se prodlouží,
     na půldruhé vteřiny se všechno zastaví a pak se vrátí
     pomalejší. Je to jediné místo na webu, kde se pohyb
     schválně zastaví — a je to pointa celé sekce.           */
  function stopsSkull() {
    var head = new G.Mesh(), sut = new G.Mesh();

    P.skull(head, {
      /* klíč běží zepředu dozadu, aby vlna šla po švech */
      keyOf: function (p) { return clamp(0.12 + (0.30 - p[0]) * 0.14, 0.06, 0.22); }
    });

    /* Švy nesou celý děj: jsou to struktury, které se pod
       rukama nepatrně hýbou, a ukazovátko po nich jde jeden
       po druhém tak, jak je terapeutka pod prsty najde.     */
    skullSutures(sut, [0.42, 0.58, 0.74, 0.90]);

    /* Doba jednoho kola scény. Still point leží uprostřed. */
    var LOOP = 13.5;
    function stillAt(T) {
      var p = (T % LOOP) / LOOP;
      return p > 0.44 && p < 0.60;
    }

    return {
      parts: [
        { m: head, mat: "bone", order: 1 },
        { m: sut,  mat: "tide", over: { hot: 0.18 } }
      ],
      shadows: [],
      /* Obě dlaně obejmou klenbu z boků. Ve still pointu se
         světlo ustálí — ruce se přestanou nadechovat spolu
         s tělem, protože se zastavilo i tělo.              */
      touch: function (T) {
        var still = stillAt(T);
        var b = still ? 1.06 : 0.82 + 0.18 * breath(T, 9);
        return [
          { at: [-0.150, 0.070, 0.352], rx: 0.30, rz: 0.24, a: 0.36 * b, tilt: 1.57, sharp: 0.08 },
          { at: [-0.150, 0.070, -0.352], rx: 0.30, rz: 0.24, a: 0.36 * b, tilt: 1.57, sharp: 0.08 }
        ];
      },
      /* Švy se rozsvěcují jeden po druhém. Ve still pointu
         zůstane svítit ten poslední — pauza není tma.      */
      focus: function (T) {
        if (stillAt(T)) return { at: 0.74, w: 0.10, amt: 0.92 };
        return pointSeq(T, [0.42, 0.58, 0.74, 0.90], 3.1, 0.055);
      },
      pool: [0.47, 0.52, 0.11],
      cam: function (T, px, py) {
        return { yaw: orbit(5.66, 0.17, 0.080)(T) + px * 0.22,
                 pitch: 0.225 + Math.sin(T * 0.064) * 0.036 + py * 0.08,
                 dist: 2.98, fov: 0.46, target: [-0.030, 0.030, 0] };
      },
      labels: [
        { p: [0.036, 0.500, 0], t: "VĚNČITÝ ŠEV" },
        { p: [-0.360, 0.300, 0.180], t: "LAMBDOVÝ ŠEV" },
        { p: [-0.150, 0.075, 0.352], t: "DLANĚ DRŽÍ KLENBU", hot: true }
      ],
      read: function (T) {
        var p = (T % LOOP) / LOOP;
        var still = stillAt(T);
        return [["RYTMUS", still ? "zastavil se" : (p >= 0.60 ? "≈ 6,5 / min" : "≈ 9 / min"), still],
                ["SEZENÍ", "posledních pár minut", false]];
      },
      wave: function (T) {
        var p = (T % LOOP) / LOOP;
        if (p > 0.44 && p < 0.60) return 0.62;
        return (p % 0.44) / 0.44 * 1.3 - 0.15;
      }
    };
  }

  /* ============================================================
     SEKCE B — ČEHO SE NEBÁT

     Pět scén o tom, co se NEDĚJE. Dřív v nich ležela postava
     s rukama a scéna se snažila zahrát celý výjev; jenže výjev
     s figurou musí být buď dokonalý, nebo je z něj panák.

     Teď je v každé scéně JEDNA VĚC, kterou má člověk v hlavě,
     když se bojí — a ta je vymodelovaná pořádně:

       01  složená mikina a boty vedle       zůstáváte oblečení
       02  mince položená na kůži            pět gramů
       03  jehla v přeškrtnutém kolečku      žádné jehly
       04  bublina s řečí, která se ztiší    nemusíte mluvit
       05  osmiúhelník                        kdykoli stop

     Žádný symbol není abstraktní. Kdo se dívá bez textu, pozná,
     o čem to je — a to je celý úkol téhle sekce.
     ============================================================ */

  /* --- 01 · NESVLÉKÁTE SE -----------------------------------
     Složená mikina leží na lehátku, boty stojí vedle na zemi.
     Je to jediná scéna sekce, která má dva předměty — a je to
     schválně: teprve rozdíl mezi tím, co zůstává na těle,
     a tím, co se sundá, dává větě smysl.                    */
  function calmClothed() {
    var pad = new G.Mesh(), top = new G.Mesh(), under = new G.Mesh();
    var shoeL = new G.Mesh(), shoeR = new G.Mesh();

    /* JEDNA PLOCHA, ŽÁDNÝ OBZOR. Dvě podložky nad sebou (lehátko
       a podlaha) vyrobily v rámu dvě hrany a scéna se z nich
       rozpadla na pruhy. Teď je plocha jediná a tak velká, že
       na ni nedohlédne ani kamera.                            */
    surface(pad, 0, 16.00, 14.00, 0.03);

    /* spodní kus — složené kalhoty pod mikinou */
    under.push();
    under.move(0.030, 0.004, 0.020);
    under.rotY(0.10);
    under.scale(0.90, 0.60, 0.88);
    P.foldedGarment(under, { key: 0.24, puff: 0.9 });
    under.pop();

    /* mikina navrchu */
    top.push();
    top.move(-0.020, 0.098, -0.010);
    top.rotY(-0.06);
    P.foldedGarment(top, { key: 0.56 });
    top.pop();

    /* Boty stojí vedle, na téže ploše. Jsou to jediné dva
       předměty scény, které se sundávají — proto stojí stranou
       a mají k hromádce oblečení odstup.                     */
    [[0, -1], [1, 1]].forEach(function (q, i) {
      var m = i === 0 ? shoeL : shoeR;
      m.push();
      m.move(0.700 + i * 0.060, 0.008, -0.310 + i * 0.260);
      m.rotY(-0.78 + q[1] * 0.13);
      m.scale(1.05);
      P.shoe(m, { key: 0.90 });
      m.pop();
    });

    return {
      parts: [
        { m: pad,    mat: "couch",     order: 1, noFoc: true },
        { m: under,  mat: "cloth",     key: "under", order: 2 },
        { m: top,    mat: "clothTide", key: "top", order: 3 },
        { m: shoeL,  mat: "leather",   order: 3 },
        { m: shoeR,  mat: "leather",   order: 3 }
      ],
      /* Látka se nadechuje: 1,2 % výšky v rytmu těla. Není to
         vidět, ale je to cítit — bez toho je hromádka mrtvá. */
      models: function (T) {
        var b = breath(T, 9);
        function puff(k) {
          var m = G.mat4();
          G.mul(m, m, G.scaleM(1, 1 + k * b, 1));
          return m;
        }
        return { top: puff(0.030), under: puff(0.014) };
      },
      shadows: [
        { at: [0, 0.010, 0], rx: 0.62, rz: 0.44, a: 0.22, sharp: 0.50 },
        { at: [0.830, 0.010, -0.200], rx: 0.24, rz: 0.16, a: 0.24, sharp: 0.60 },
        { at: [0.895, 0.010, 0.075], rx: 0.24, rz: 0.16, a: 0.24, sharp: 0.60 }
      ],
      /* Ukazovátko tu skoro nepracuje. Není na co ukazovat —
         hromádka oblečení JE celá scéna, a kdyby se rozsvítila,
         přebarvila by se do zelena celá. Zůstal jen dech.   */
      focus: function (T) {
        return { at: 0.62, w: 0.06, amt: 0.06 + 0.10 * breath(T, 9) };
      },
      pool: [0.46, 0.46, 0.17],
      cam: function (T, px, py) {
        return { yaw: orbit(0.62, 0.14, 0.070)(T) + px * 0.20,
                 pitch: 0.345 + Math.sin(T * 0.062) * 0.026 + py * 0.08,
                 dist: 2.95, fov: 0.46, target: [0.330, 0.070, 0.010] };
      },
      labels: [
        { p: [-0.10, 0.190, -0.10], t: "OBLEČENÍ ZŮSTÁVÁ", hot: true },
        { p: [0.830, 0.090, -0.200], t: "SUNDAJÍ SE JEN BOTY" }
      ],
      read: function () {
        return [["NEPOUŽÍVÁ SE", "olej ani krém", false],
                ["PŘIKRYTÍ", "deka, pokud chcete", true]];
      },
      wave: function () { return -1; }
    };
  }

  /* --- 02 · NIKDO DO VÁS NEBUDE TLAČIT ----------------------
     Makro kůže a mince na ní. Scéna nestojí na tom, že je vidět
     celý člověk — stojí na tom, že je vidět, jak MÁLO se pod
     pěti gramy stane: kůže se prohne o desetiny milimetru
     a rozběhne se z toho jediný kruh.

     Důlek je v síti napevno (a je opravdu mělký), pohyb nese
     mince a kruh po dosednutí. Přestavovat každý snímek plochu
     o dvou tisících čtvercích jen kvůli desetině milimetru by
     byla nejdražší neviditelná věc na webu.                 */
  function calmScale() {
    var skin = new G.Mesh(), money = new G.Mesh();

    P.skinPatch(skin, { size: 4.20, dome: 0.170, key: 0.30,
                        dent: 0.0100, rad: 0.155, at: [0, 0] });
    P.coin(money, { r: 0.128, h: 0.014, key: 0.72 });

    var LOOP = 9.0;
    /* dráha mince: přiletí, dosedne, chvíli leží, zvedne se */
    function drop(T) {
      var p = (T % LOOP) / LOOP;
      if (p < 0.22) return { y: lerp(0.62, 0.014, G.smooth(0, 1, p / 0.22)), land: 0 };
      if (p < 0.80) return { y: 0.014, land: (p - 0.22) / 0.58 };
      return { y: lerp(0.014, 0.52, G.smooth(0, 1, (p - 0.80) / 0.20)), land: 1 };
    }

    return {
      parts: [
        { m: skin,  mat: "skin", order: 1, noFoc: true },
        { m: money, mat: "metal", key: "coin", order: 3 }
      ],
      dyn: function (T) {
        /* KRUH PO DOSEDNUTÍ. Jeden jediný, pomalý — víc kruhů
           by z pěti gramů udělalo úder.                     */
        var p = (T % LOOP) / LOOP;
        var t = clamp((p - 0.22) / 0.30, 0, 1);
        var out = [];
        if (t > 0.001 && t < 0.999) {
          var m = new G.Mesh();
          m.move(0, 0.004, 0);
          P.ripple(m, lerp(0.13, 0.62, 1 - Math.pow(1 - t, 2.4)),
            { w: lerp(0.0055, 0.0016, t), key: 0.72 });
          out.push({ m: m, mat: "tide", key: "ring",
                     over: { alpha: 0.55 * Math.pow(1 - t, 1.4) }, order: 2 });
        }
        return out;
      },
      models: function (T) {
        var d = drop(T);
        var m = G.mat4();
        G.mul(m, m, G.translate(0, d.y, 0));
        G.mul(m, m, G.rotY(T * 0.05));
        return { coin: m };
      },
      shadows: function (T) {
        var d = drop(T);
        var h = clamp((d.y - 0.014) / 0.5, 0, 1);
        return [{ at: [0, 0.006, 0], rx: 0.13 + h * 0.10, rz: 0.13 + h * 0.10,
                  a: 0.30 * (1 - h * 0.7), sharp: 0.70 - h * 0.5 }];
      },
      /* Ukazovátko drží minci: „tohle je celá váha dotyku“. */
      /* Ukazovátko je tu ZÁMĚRNĚ SLABÉ. Mince má vypadat jako
         kov, ne jako svítící pastilka; stačí, aby se jí po
         hraně obtáhlo přílivové světlo.                      */
      focus: function (T) {
        var d = drop(T);
        return { at: 0.72, w: 0.05, amt: 0.10 + 0.24 * d.land };
      },
      pool: [0.50, 0.44, 0.12],
      cam: function (T, px, py) {
        return { yaw: orbit(0.62, 0.13, 0.066)(T) + px * 0.18,
                 pitch: 0.300 + Math.sin(T * 0.058) * 0.022 + py * 0.07,
                 dist: 1.16, fov: 0.44, target: [0, 0.012, 0] };
      },
      labels: [{ p: [0, 0.026, 0], t: "5 GRAMŮ NA KŮŽI", hot: true, key: "coin" }],
      read: function (T) {
        var d = drop(T);
        return [["TLAK", (d.land > 0.02 ? "5,0" : "0,0") + " g", d.land > 0.02],
                ["PRO SROVNÁNÍ", "masáž ≈ 45 g", false]];
      },
      wave: function () { return -1; }
    };
  }

  /* --- 03 · ŽÁDNÉ JEHLY, ŽÁDNÉ LUPNUTÍ ----------------------
     Jehla v přeškrtnutém kolečku. Znak se kreslí PŘED očima:
     nejdřív přiletí stříkačka, pak se kolem ní obtáhne prstenec,
     pak se přes ni přetáhne břevno — a teprve potom stříkačka
     zmizí. Kdyby tam rovnou nebyla, nebylo by co škrtnout.  */
  function calmNoNeedle() {
    var needle = new G.Mesh(), glass = new G.Mesh();

    /* Stříkačka stojí napříč znakem, mírně skloněná — ležatá
       by se v kolečku ztratila, svislá by vypadala jako sloup. */
    needle.push();
    needle.move(-0.030, 0.010, 0);
    needle.rotZ(-0.34);
    needle.scale(1.02);
    P.syringe(needle, { key: 0.60 });
    needle.pop();

    /* skleněný válec přes tělo stříkačky — kov sám o sobě
       vypadá jako hřebík                                    */
    glass.push();
    glass.move(-0.030, 0.010, 0);
    glass.rotZ(-0.34);
    var cyl = [];
    for (var i = 0; i <= 5; i++) {
      var u = i / 5, r = [];
      for (var j = 0; j < 20; j++) {
        var a = j / 20 * TAU;
        r.push([u * 0.234 - 0.117, Math.cos(a) * 0.0335, Math.sin(a) * 0.0335, 0.04, 0.60]);
      }
      cyl.push(r);
    }
    G.loft(glass, cyl, { capStart: true, capEnd: true });
    glass.pop();

    var LOOP = 10.0;
    function beatOf(T) {
      var p = (T % LOOP) / LOOP;
      return {
        /* stříkačka přiletí a nakonec se rozplyne */
        inA: G.smooth(0.00, 0.14, p) * (1 - G.smooth(0.62, 0.80, p)),
        arc: G.smooth(0.16, 0.38, p),
        cut: G.smooth(0.38, 0.52, p),
        hold: G.smooth(0.52, 0.60, p) * (1 - G.smooth(0.90, 1.00, p))
      };
    }

    return {
      parts: [
        { m: needle, mat: "metal", key: "syr", order: 2,
          over: function (T) { return { alpha: beatOf(T).inA }; } },
        { m: glass, mat: "dura", key: "syr", order: 3,
          over: function (T) { return { alpha: beatOf(T).inA * 0.9, dens: 0.06 }; } }
      ],
      dyn: function (T) {
        var b = beatOf(T);
        var m = new G.Mesh();
        P.banRing(m, { r: 0.470, w: 0.056, arc: Math.max(0.02, b.arc), cut: b.cut, key: 0.86 });
        return [{ m: m, mat: "tide", key: "ring",
                  over: { alpha: 0.94, hot: 0.20 + b.hold * 0.45 }, order: 4 }];
      },
      models: function (T) {
        var b = beatOf(T);
        var m = G.mat4();
        /* přilétá zprava a usadí se — konec dráhy je klidný */
        G.mul(m, m, G.translate(lerp(0.42, 0, b.inA), 0, lerp(-0.18, 0, b.inA)));
        return { syr: m, ring: G.mat4() };
      },
      shadows: [],
      focus: function (T) {
        var b = beatOf(T);
        return { at: 0.86, w: 0.05, amt: 0.22 + 0.62 * b.hold };
      },
      pool: [0.50, 0.50, 0.13],
      cam: function (T, px, py) {
        /* Znak leží v rovině xy, takže se na něj kamera dívá
           skoro zpříma — jen tolik ze strany, aby bylo vidět,
           že je to těleso, a ne nálepka.                    */
        return { yaw: 0.26 + Math.sin(T * 0.072) * 0.080 + px * 0.18,
                 pitch: 0.070 + Math.sin(T * 0.061) * 0.028 + py * 0.06,
                 dist: 1.98, fov: 0.46, target: [0, 0.010, 0] };
      },
      labels: [{ p: [0.332, 0.332, 0], t: "ŽÁDNÁ JEHLA", hot: true }],
      read: function () {
        return [["NEPOUŽÍVÁ SE", "jehla ani náraz", true],
                ["JEDINÝ NÁSTROJ", "dvě ruce", false]];
      },
      wave: function () { return -1; }
    };
  }

  /* --- 04 · NEMUSÍTE NIC VYPRÁVĚT ---------------------------
     Bublina s řečí a v ní zvuková stopa. Sloupečky se postupně
     srovnají do jediné klidné linky, bublina se rozplyne
     a zůstane jen ta linka. Ticho není nic — je to rovná čára,
     která svítí.                                            */
  function calmQuiet() {
    var LOOP = 11.0;
    function beatOf(T) {
      var p = (T % LOOP) / LOOP;
      return {
        p: p,
        /* hlas: nejdřív plný, pak se ztiší k nule */
        amp: 1 - G.smooth(0.20, 0.52, p),
        /* bublina: je, pak se rozplyne, pak se zase objeví */
        bub: (1 - G.smooth(0.52, 0.70, p)) * G.smooth(0.92, 1.00, p) +
             (1 - G.smooth(0.52, 0.70, p)) * (1 - G.smooth(0.90, 0.92, p)),
        quiet: G.smooth(0.56, 0.76, p)
      };
    }

    return {
      parts: [],
      dyn: function (T) {
        var b = beatOf(T);
        var out = [];
        /* BUBLINA — sklo, které se rozplyne vzhůru */
        if (b.bub > 0.01) {
          var bm = new G.Mesh();
          bm.move(0, 0.034 + (1 - b.bub) * 0.17, 0);
          P.bubbleFrame(bm, { w: 0.400, h: 0.215, r: 0.0072, tail: b.bub, key: 0.30 });
          out.push({ m: bm, mat: "tide", key: "bub",
                     over: { alpha: 0.70 * b.bub, tint: [0.34, 0.50, 0.44],
                             hot: 0.0 }, order: 5 });
        }
        /* ZVUKOVÁ STOPA — v bublině, pak sama */
        var sm = new G.Mesh();
        sm.move(0, 0.034, 0.014);
        P.soundBars(sm, b.amp, { n: 17, w: 0.545, r: 0.0086, key: 0.62 });
        out.push({ m: sm, mat: "tide", key: "bars",
                   over: { hot: 0.16 + b.quiet * 0.42 }, order: 2 });
        return out;
      },
      shadows: [],
      focus: function (T) {
        var b = beatOf(T);
        return { at: 0.66, w: 0.06, amt: 0.18 + 0.66 * b.quiet };
      },
      pool: [0.50, 0.50, 0.12],
      cam: function (T, px, py) {
        return { yaw: 0.32 + Math.sin(T * 0.068) * 0.095 + px * 0.18,
                 pitch: 0.085 + Math.sin(T * 0.055) * 0.028 + py * 0.06,
                 dist: 1.62, fov: 0.46, target: [0, 0.035, 0] };
      },
      labels: [{ p: [0.052, 0.196, 0], t: "TICHO JE V POŘÁDKU", hot: true }],
      read: function (T) {
        var b = beatOf(T);
        return [["CO ŘEKNETE", "jen to, co chcete", false],
                ["MLČENÍ", b.quiet > 0.5 ? "klidně 75 minut" : "kdykoli", b.quiet > 0.5]];
      },
      wave: function () { return -1; }
    };
  }

  /* --- 05 · KDYKOLI ŘEKNETE STOP ----------------------------
     Osmiúhelník. Tvar, který na celém světě znamená totéž
     a nepotřebuje překlad — ale postavený jako předmět
     z porcelánu, ne jako plechová značka u silnice.

     Ve chvíli „stop“ se deska rozsvítí a od ní se po podložce
     rozběhne kruh. Nic dramatického: reakce má být okamžitá
     a tichá, přesně jak to slibuje text.                    */
  function calmStop() {
    var plate = new G.Mesh();

    /* ŽÁDNÁ PODLOŽKA. Deska stojí nastojato a kamera se na ni
       dívá skoro zpříma — vodorovná plocha pod ní by v rámu
       skončila jako hrana stolu přes celou šířku. Že deska
       někde stojí, řekne dosednutí a kruh, který se po
       „stop“ rozběhne; víc není potřeba.                    */

    /* Deska stojí na hraně, čelem k divákovi. octaPlate se
       staví naležato (tloušťka podél y), takže ji stačí
       postavit otočením kolem osy x.                       */
    plate.push();
    plate.move(0, 0.020, 0);
    plate.rotX(Math.PI / 2);
    plate.rotZ(Math.PI / 8);
    P.octaPlate(plate, { r: 0.400, h: 0.052, key: 0.60 });
    plate.pop();

    var LOOP = 8.4;
    function beatOf(T) {
      var p = (T % LOOP) / LOOP;
      /* „stop“ padne ve 38 % smyčky */
      return {
        p: p,
        hit: G.smooth(0.34, 0.38, p) * (1 - G.smooth(0.38, 0.72, p)),
        ring: clamp((p - 0.38) / 0.34, 0, 1)
      };
    }

    return {
      parts: [
        { m: plate, mat: "cartilage", key: "plate", order: 2 }
      ],
      dyn: function (T) {
        var b = beatOf(T);
        var out = [];
        if (b.ring > 0.001 && b.ring < 0.999) {
          var m = new G.Mesh();
          m.move(0, -0.470, 0);
          P.ripple(m, lerp(0.34, 1.30, 1 - Math.pow(1 - b.ring, 2.2)),
            { w: lerp(0.0060, 0.0016, b.ring), key: 0.60 });
          out.push({ m: m, mat: "tide",
                     over: { alpha: 0.34 * Math.pow(1 - b.ring, 1.8) }, order: 1 });
        }
        return out;
      },
      models: function (T) {
        var b = beatOf(T);
        var m = G.mat4();
        /* deska se při „stop“ o vlásek přiblíží a zase couvne */
        var k = 1 + 0.028 * b.hit;
        G.mul(m, m, G.translate(0, 0.010 * b.hit, 0));
        G.mul(m, m, G.scaleM(k, k, k));
        return { plate: m };
      },
      shadows: function (T) {
        var b = beatOf(T);
        return [{ at: [0, -0.474, 0.020], rx: 0.36, rz: 0.16,
                  a: 0.20 + 0.06 * b.hit, sharp: 0.35 }];
      },
      focus: function (T) {
        var b = beatOf(T);
        var idle = 0.16 + 0.10 * breath(T, 9);
        return { at: 0.62, w: 0.09, amt: Math.max(idle, b.hit * 0.95) };
      },
      pool: [0.50, 0.52, 0.12],
      cam: function (T, px, py) {
        return { yaw: 3.42 + Math.sin(T * 0.066) * 0.105 + px * 0.18,
                 pitch: 0.272 + Math.sin(T * 0.052) * 0.024 + py * 0.06,
                 dist: 2.36, fov: 0.46, target: [0, -0.055, 0] };
      },
      labels: [{ p: [-0.250, 0.270, -0.055], t: "KDYKOLI STOP", hot: true, key: "plate" }],
      read: function (T) {
        var b = beatOf(T);
        return [["REAKCE", b.ring > 0.02 && b.ring < 0.9 ? "ruce pryč" : "okamžitá", b.hit > 0.2],
                ["NOVÝ DOTEK", "vždy předem ohlásím", false]];
      },
      wave: function () { return -1; }
    };
  }

  var STOPS = [stopsFoot, stopsSacrum, stopsDiaphragm, stopsOcciput, stopsSkull];
  var CALM = [calmClothed, calmScale, calmNoNeedle, calmQuiet, calmStop];

  window.KJSections = { STOPS: STOPS, CALM: CALM };
})();
