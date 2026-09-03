/* ============================================================
   stage.js — SPOLEČNÁ 3D SCÉNA A JEJÍ MATERIÁLY

   Jeden renderer pro obě scénické sekce webu. Vlastní WebGL bez
   knihovny, protože celý web žádnou nemá a jedna scéna za to
   nestojí.

   ------------------------------------------------------------
   SVĚTLO — TŘÍBODOVÉ STUDIO

   Světla se drží KAMERY, ne scény. Ateliérový fotograf taky
   nepřestavuje světla pokaždé, když otočí modelem: postaví je
   jednou a objektem otáčí. Díky tomu má každá z deseti scén
   stejné světlo a sekce drží pohromadě, i když se kamera hýbe.

     KLÍČ    teplé, zleva shora zpředu. Dělá tvar.
     VÝPLŇ   studená, zprava. Vykreslí stín, aby nebyl mrtvý.
     OBRYS   zezadu shora, do zelena. Odděluje těleso od pozadí
             — jediná věc, kterou má každý dobrý render a žádný
             špatný.

   ------------------------------------------------------------
   MATERIÁLY

   Každý má albedo, drsnost, podpovrchový rozptyl a barvu
   zapuštění. Rozdíl mezi kostí a kůží není v odstínu, ale
   v tom, kolik světla projde skrz: kost je porcelán, kůže
   propouští teplo, plena je sklo, deka je plsť bez odlesku.

   ------------------------------------------------------------
   BAREVNÝ GRADING

   Poslední krok před zápisem. Měkká filmová křivka, zeleň do
   stínů, teplo do světel, jemná vinětace. Právě tenhle krok
   dělá z „renderu“ obraz — bez něj to je jen osvětlená síť.

   ------------------------------------------------------------
   STRÁŽCE VÝKONU

   Pod prahem fps se sníží rozlišení, pak zhasnou průhledné
   vrstvy. Když ani to nestačí, scéna se vypne a stránka se
   vrátí ke kreslené verzi. Obsah má přednost před efektem.
   ============================================================ */
(function (root) {
  "use strict";
  var KJ = root.KJ, G = root.KJGeom;
  if (!KJ || !G) return;

  var TAU = Math.PI * 2;

  /* ---------- barvy z tokenů --------------------------------- */
  function palette() {
    var cs = getComputedStyle(document.documentElement);
    function rgb(v, fb) {
      var h = (cs.getPropertyValue(v).trim() || fb).replace("#", "");
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255,
              parseInt(h.slice(4,6),16)/255];
    }
    return {
      bg:   rgb("--bg", "#F2F3EF"),
      surf: rgb("--surface", "#FFFFFF"),
      ink:  rgb("--ink-3", "#1B2521"),
      ink4: rgb("--ink-4", "#8B958D"),
      tide: rgb("--tide", "#0E6B54"),
      deep: rgb("--tide-deep", "#0A5442"),
      warm: rgb("--tide-warm", "#1E7A5B"),
      soft: rgb("--tide-soft", "#CFE6DA"),
      sand: rgb("--sand", "#EDE7DC"),
      mono: cs.getPropertyValue("--font-mono").trim() || "monospace"
    };
  }

  /* ============================================================
     MATERIÁLY

     albedo  vlastní barva
     sss     barva světla, které projde skrz (podpovrchový rozptyl)
     sssAmt  kolik ho projde — kost málo, prst hodně
     rough   drsnost: 0 lesk, 1 mat
     spec    síla odlesku
     rim     síla obrysového světla
     ink     ztmavení na odvrácené hraně (kresba, ne špína)
     occ     barva zapuštění — stín nikdy není šedý
     pass    ve které vrstvě se kreslí
     ============================================================ */
  function materials(C) {
    function blend(a, b, t) {
      return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
    }
    return {
      /* KOST — chladný porcelán se stopou slonoviny v zákoutích */
      bone: {
        albedo: [0.975, 0.966, 0.940], sss: [0.95, 0.80, 0.60], sssAmt: 0.22,
        rough: 0.40, spec: 0.36, rim: 0.80, ink: 0.34,
        occ: blend([0.50, 0.54, 0.48], C.sand, 0.32), pass: "solid"
      },
      /* KOST V POZADÍ — tišší, aby nepřebila hlavní osu */
      boneSoft: {
        albedo: [0.958, 0.956, 0.942], sss: [0.90, 0.80, 0.66], sssAmt: 0.14,
        rough: 0.56, spec: 0.18, rim: 0.44, ink: 0.18,
        occ: [0.66, 0.70, 0.65], pass: "solid", alpha: 0.62
      },
      /* CHRUPAVKA, PLOTÉNKA — mléčná, měkčí lesk, víc prosvítá */
      cartilage: {
        albedo: [0.930, 0.950, 0.926], sss: [0.72, 0.94, 0.82], sssAmt: 0.52,
        rough: 0.26, spec: 0.44, rim: 0.74, ink: 0.20,
        occ: [0.56, 0.68, 0.60], pass: "solid"
      },
      /* KŮŽE TERAPEUTKY — teplá, světlo jí prochází skrz prsty */
      skin: {
        albedo: [0.990, 0.926, 0.874], sss: [1.00, 0.50, 0.34], sssAmt: 0.70,
        rough: 0.62, spec: 0.22, rim: 0.62, ink: 0.22,
        occ: [0.74, 0.48, 0.42], pass: "solid"
      },
      /* KŮŽE KLIENTA — o stopu chladnější, aby se ruce odlišily */
      skinCool: {
        albedo: [0.978, 0.944, 0.914], sss: [0.98, 0.60, 0.46], sssAmt: 0.52,
        rough: 0.68, spec: 0.16, rim: 0.54, ink: 0.18,
        occ: [0.72, 0.56, 0.50], pass: "solid"
      },
      /* MĚKKÁ TKÁŇ, ORGÁN — sytější, do zelena */
      tissue: {
        albedo: [0.742, 0.860, 0.798], sss: [0.36, 0.86, 0.66], sssAmt: 0.78,
        rough: 0.32, spec: 0.36, rim: 0.72, ink: 0.18,
        occ: [0.36, 0.58, 0.48], pass: "solid"
      },
      /* LÁTKA — plsť. Žádný odlesk, jen chlup na hraně. */
      cloth: {
        albedo: [0.946, 0.950, 0.932], sss: [0.86, 0.90, 0.82], sssAmt: 0.30,
        rough: 0.97, spec: 0.03, rim: 0.40, ink: 0.14,
        occ: [0.64, 0.68, 0.62], pass: "solid"
      },
      /* LÁTKA V BARVĚ ZNAČKY — deka, tričko */
      clothTide: {
        albedo: [0.822, 0.892, 0.858], sss: [0.56, 0.86, 0.72], sssAmt: 0.36,
        rough: 0.96, spec: 0.04, rim: 0.44, ink: 0.14,
        occ: [0.44, 0.60, 0.52], pass: "solid"
      },
      /* LEHÁTKO — tmavší čalounění, aby postava měla o co se opřít */
      couch: {
        albedo: [0.890, 0.900, 0.878], sss: [0.80, 0.84, 0.78], sssAmt: 0.18,
        rough: 0.92, spec: 0.06, rim: 0.32, ink: 0.18,
        occ: [0.56, 0.60, 0.55], pass: "solid"
      },
      /* KOV — miska váhy, ručička. Ostrý, tmavý odlesk. */
      metal: {
        albedo: [0.742, 0.768, 0.750], sss: [0.50, 0.56, 0.52], sssAmt: 0.05,
        rough: 0.12, spec: 0.95, rim: 0.95, ink: 0.44,
        occ: [0.38, 0.42, 0.40], pass: "solid"
      },
      /* KŮŽE BOTY — matná, tmavší, aby bota nebyla porcelánový blob */
      leather: {
        albedo: [0.796, 0.784, 0.756], sss: [0.60, 0.50, 0.40], sssAmt: 0.10,
        rough: 0.70, spec: 0.22, rim: 0.40, ink: 0.32,
        occ: [0.46, 0.44, 0.40], pass: "solid"
      },

      /* --- PRŮHLEDNÉ ---------------------------------------- */
      /* KŮŽE JAKO OBAL — vidí se skrz ni dovnitř */
      shell: { tint: [0.955, 0.965, 0.945], dens: 0.045, alpha: 1.0, pass: "glass" },
      /* PLENA, BUBLINA — sklo se zeleným jádrem */
      dura:  { tint: null, dens: 0.10, alpha: 1.0, pass: "glass" },
      /* DEKA PŘES TĚLO */
      veil:  { tint: [0.900, 0.945, 0.920], dens: 0.20, alpha: 1.0, pass: "glass" },

      /* --- ZÁŘÍCÍ ------------------------------------------- */
      nerve: { pass: "glow", alpha: 0.94, hot: 0.0 },
      tide:  { pass: "glow", alpha: 1.0, hot: 0.35 }
    };
  }

  /* ---------- matice ----------------------------------------- */
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
    out[4]=0; out[5]=f; out[6]=0; out[7]=0;
    out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
    out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0;
    return out;
  }
  /* Pohled kolem cíle: orbit yaw/pitch ve vzdálenosti dist. */
  function orbit(out, yaw, pitch, dist, target) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cx = Math.cos(pitch), sx = Math.sin(pitch);
    var m = [ cy, sy*sx, -sy*cx, 0,
              0,  cx,     sx,    0,
              sy, -cy*sx, cy*cx, 0,
              0,  0,      0,     1 ];
    var t = target || [0,0,0];
    var tx = -(m[0]*t[0] + m[4]*t[1] + m[8]*t[2]);
    var ty = -(m[1]*t[0] + m[5]*t[1] + m[9]*t[2]);
    var tz = -(m[2]*t[0] + m[6]*t[1] + m[10]*t[2]);
    out.set(m);
    out[12] = tx; out[13] = ty; out[14] = tz - dist;
    return out;
  }
  function normalOf(out, v) {
    out[0]=v[0]; out[1]=v[1]; out[2]=v[2];
    out[3]=v[4]; out[4]=v[5]; out[5]=v[6];
    out[6]=v[8]; out[7]=v[9]; out[8]=v[10];
    return out;
  }

  /* ---------- společné kusy shaderů -------------------------- */
  var HEAD_VS = [
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "attribute float aAO;",
    "attribute float aKey;",
    "uniform mat4 uProj, uView, uModel;",
    "uniform mat3 uNrm;",
    "uniform float uWave, uReveal;",
    /* UKAZOVÁTKO. Tři čísla, kterými scéna řekne „mluvím o tomhle“:
       střed pásma klíče, jeho šířka a síla. Sílu si scéna
       rozbliká sama (dýchá, pulzuje), takže shader neví nic
       o čase a přesto to žije.                               */
    "uniform float uFoc, uFocW, uFocAmt;",
    "varying vec3 vN, vP;",
    "varying float vAO, vLit, vVis, vFoc;",
    /* Vlna: ostré jádro a široká zář. Jedna gaussovka je puntík,
       dvě dělají vlnoplochu — tekutinu, ne ukazovátko.       */
    "float waveAt(float s, float w) {",
    "  float d = s - w;",
    "  return exp(-d*d*180.0) + exp(-d*d*24.0) * 0.40;",
    "}",
    "void common(vec3 p) {",
    "  vec4 wp = uModel * vec4(p, 1.0);",
    "  vec4 mv = uView * wp;",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz;",
    "  vN = uNrm * mat3(uModel) * aNrm;",
    "  vAO = aAO;",
    "  vLit = waveAt(aKey, uWave);",
    /* Pásmo ukazovátka má MĚKKÝ OKRAJ. S tvrdým by se struktura
       vysekla z okolí jako nálepka; takhle se rozsvítí i to,
       co s ní bezprostředně souvisí, a oko to čte jako světlo,
       ne jako výběr v editoru.                               */
    "  float fd = (aKey - uFoc) / max(uFocW, 0.001);",
    "  vFoc = uFocAmt * exp(-fd * fd);",
    "  vVis = 1.0 - smoothstep(uReveal - 0.16, uReveal + 0.03, aKey);",
    "}"
  ].join("\n");

  var DITHER = [
    "float hash12(vec2 p) {",
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
    "  p3 += dot(p3, p3.yzx + 33.33);",
    "  return fract((p3.x + p3.y) * p3.z);",
    "}"
  ].join("\n");

  /* Světelný rám. Směry jsou v prostoru KAMERY — světla drží
     divákovi za zády, ne scéně. Proto se objekt může otáčet
     a pořád je nasvícený stejně dobře.                       */
  var RIG = [
    "const vec3 L_KEY  = vec3(-0.4243, 0.6364, 0.6444);",
    "const vec3 L_FILL = vec3( 0.8480, 0.1088, 0.5183);",
    "const vec3 L_RIM  = vec3( 0.0507, 0.4256,-0.9034);"
  ].join("\n");

  /* Poslední krok: filmová křivka, zeleň do stínů, teplo do
     světel, vinětace. Bez tohohle je to jen osvětlená síť.  */
  var GRADE = [
    "uniform vec3 uGradeS, uGradeH;",
    "uniform vec2 uRes;",
    "vec3 grade(vec3 col) {",
    "  col = col / (1.0 + col * 0.20);",
    "  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));",
    "  col = mix(col, uGradeS, (1.0 - smoothstep(0.0, 0.60, lum)) * 0.26);",
    "  col = mix(col, uGradeH, smoothstep(0.58, 1.02, lum) * 0.16);",
    "  vec2 uv = gl_FragCoord.xy / max(uRes, vec2(1.0));",
    "  float vig = smoothstep(1.30, 0.42, length((uv - 0.5) * vec2(1.10, 1.0)) * 1.42);",
    "  return col * mix(0.845, 1.0, vig);",
    "}"
  ].join("\n");

  function Stage(host, canvas) {
    this.host = host;
    this.canvas = canvas;
    this.C = palette();
    this.M = materials(this.C);
    this.ok = false;
    this.quality = 2;
    var gl = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true, antialias: true, premultipliedAlpha: false,
        depth: true, powerPreference: "default"
      }) || canvas.getContext("experimental-webgl", { alpha: true, antialias: true, depth: true });
    } catch (e) { gl = null; }
    if (!gl) return;
    this.gl = gl;
    this.extUint = gl.getExtension("OES_element_index_uint");

    if (!this._programs()) return;
    this._overlay();
    this._quads();
    this.proj = G.mat4(); this.view = G.mat4(); this.nrm3 = new Float32Array(9);
    this.ident = G.mat4();
    this.ok = true;
  }

  Stage.prototype._compile = function (vs, fs) {
    var gl = this.gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (root.console) console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    var o = { p: p, a: {}, u: {} };
    var n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < n; i++) {
      var an = gl.getActiveAttrib(p, i).name;
      o.a[an] = gl.getAttribLocation(p, an);
    }
    n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < n; i++) {
      var un = gl.getActiveUniform(p, i).name.replace("[0]", "");
      o.u[un] = gl.getUniformLocation(p, un);
    }
    return o;
  };

  Stage.prototype._programs = function () {
    /* --- 1 · POVRCH ---------------------------------------
       Jeden program pro kost, kůži, látku i kov. Liší se jen
       čísly, která přijdou zvenčí — proto mají všechny scény
       stejné světlo a přesto jiný povrch.                  */
    this.pSolid = this._compile(
      HEAD_VS + "\nvoid main() { common(aPos); }",
      [
        "precision mediump float;",
        "uniform vec3 uSky, uGround, uKeyCol, uFillCol, uRimCol;",
        "uniform vec3 uAlbedo, uSSS, uOcc, uInk, uFog, uGlow;",
        "uniform float uSSSAmt, uRough, uSpecAmt, uRimAmt, uInkAmt;",
        "uniform float uAlpha, uFogNear;",
        "varying vec3 vN, vP;",
        "varying float vAO, vLit, vVis, vFoc;",
        RIG, DITHER, GRADE,
        "void main() {",
        "  if (vVis < hash12(gl_FragCoord.xy) * 0.98 + 0.01) discard;",
        "  vec3 N = normalize(vN);",
        "  vec3 V = normalize(-vP);",
        "  if (!gl_FrontFacing) N = -N;",
        "  float ao = 1.0 - vAO * 0.95;",
        /* polokulové okolí: shora studené, zdola teplý odraz */
        "  vec3 amb = mix(uGround, uSky, N.y * 0.5 + 0.5);",
        "  float nl = dot(N, L_KEY);",
        "  float key = max(nl, 0.0);",
        /* zabalené světlo — kůže nemá ostrý terminátor */
        "  float wrap = max((nl + 0.55) / 1.55, 0.0);",
        "  float fill = max(dot(N, L_FILL) * 0.5 + 0.5, 0.0);",
        "  float rimL = pow(max(dot(N, L_RIM), 0.0), 2.2);",
        "  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);",
        /* podpovrchový rozptyl: světlo prošlé skrz tenké místo */
        "  float sssW = pow(max((nl + 0.95) / 1.95, 0.0), 1.9);",
        "  float shin = mix(5.0, 96.0, 1.0 - uRough);",
        "  vec3 H1 = normalize(L_KEY + V);",
        "  float spec = pow(max(dot(N, H1), 0.0), shin) * uSpecAmt;",
        "  vec3 H2 = normalize(L_FILL + V);",
        "  float spec2 = pow(max(dot(N, H2), 0.0), shin * 0.55) * uSpecAmt * 0.30;",

        /* VÍC KLÍČE, MÍŇ OKOLÍ. Původní poměr (0,44 okolí ku 0,50
           klíči) dělal rovnoměrně nasvícený porcelán bez stínu:
           čistý, ale plochý. Klíčové světlo teď nese o pětinu
           víc a okolí o pětinu míň — tvar má konečně stranu
           přivrácenou a odvrácenou.                          */
        "  vec3 col = uAlbedo * (amb * 0.365 * ao",
        "           + uKeyCol * (key * 0.635 + wrap * 0.255) * ao",
        "           + uFillCol * fill * 0.165 * ao);",
        "  col += uSSS * uSSSAmt * sssW * (0.13 + fres * 0.52) * ao;",
        "  col += uRimCol * rimL * uRimAmt * (0.34 + fres * 1.05);",
        "  col += vec3(spec + spec2) * (0.32 + ao * 0.68);",
        /* zapuštění není šedé — má vlastní barvu */
        "  col *= mix(uOcc, vec3(1.0), ao);",
        /* kresebný obrys jen tam, kde nesvítí obrysové světlo */
        "  col = mix(col, uInk, clamp(fres * (1.0 - rimL) * uInkAmt, 0.0, 0.55));",
        "  col = mix(col, uGlow, clamp(vLit * 0.50, 0.0, 0.56));",
        /* UKAZOVÁTKO. Nejdřív se struktura přebarví do přílivu,
           pak se k ní přidá vlastní světlo — takže nesvítí jen
           barvou, ale i jasem, a v šeru okolo se rozsvítí jako
           by měla uvnitř žárovku. Obrysové světlo dostane
           přídavek zvlášť: hrana je to, po čem oko tvar pozná. */
        "  col = mix(col, uGlow, clamp(vFoc * 0.62, 0.0, 0.72));",
        "  col += uGlow * vFoc * 0.30 * (0.55 + fres * 0.85);",
        "  col += uRimCol * vFoc * rimL * 0.55;",
        /* VZDÁLENÉ SE ROZPOUŠTÍ. Bylo to 52 %, takže daleká hrana
           podložky zůstala i po zamlžení o tón tmavší než pozadí
           — a četla se jako obzor přes celý rám. Při 82 % se
           plocha do porcelánu opravdu rozplyne a scéna se
           zároveň prohloubí: co je vzadu, ustupuje.          */
        "  float fog = clamp((-vP.z - uFogNear) / 2.20, 0.0, 1.0);",
        "  col = mix(col, uFog, fog * 0.94);",
        "  gl_FragColor = vec4(grade(col), uAlpha);",
        "}"
      ].join("\n"));

    /* --- 2 · SKLO ------------------------------------------
       Stěna je při pohledu zboku hustší než uprostřed — jediný
       důvod, proč trubka vypadá jako trubka.               */
    this.pGlass = this._compile(
      HEAD_VS + "\nvoid main() { common(aPos); }",
      [
        "precision mediump float;",
        "uniform vec3 uTint, uCore, uGlow, uFog, uRimCol;",
        "uniform float uAlpha, uDens, uFogNear;",
        "varying vec3 vN, vP;",
        "varying float vAO, vLit, vVis, vFoc;",
        RIG, GRADE,
        "void main() {",
        "  if (vVis <= 0.02) discard;",
        "  vec3 N = normalize(vN);",
        "  vec3 V = normalize(-vP);",
        "  float fres = pow(1.0 - abs(dot(N, V)), 2.1);",
        "  float rimL = pow(max(dot(N, L_RIM), 0.0), 2.4);",
        "  vec3 H = normalize(L_KEY + V);",
        "  float spec = pow(max(dot(N, H), 0.0), 74.0) * 0.42;",
        "  float nl = max(dot(N, L_KEY) * 0.5 + 0.5, 0.0);",
        /* jádro světlé, okraj sytější — hloubka materiálu */
        "  vec3 col = mix(uTint * (0.90 + nl * 0.22), uCore, fres * 0.62);",
        "  col += uRimCol * rimL * 0.42;",
        "  col = mix(col, uGlow, clamp(vLit, 0.0, 1.0));",
        "  col = mix(col, uGlow, clamp(vFoc * 0.70, 0.0, 0.80));",
        "  col += vec3(spec);",
        "  float fog = clamp((-vP.z - uFogNear) / 2.20, 0.0, 1.0);",
        "  col = mix(col, uFog, fog * 0.60);",
        /* Průhledná věc se ukazovátkem ZHUSTNE. Kdyby jen změnila
           barvu, zůstala by stejně skoro neviditelná a nikdo by
           si jí nevšiml.                                       */
        "  float a = (uDens + fres * 0.50 + rimL * 0.18 + vLit * 0.30 + vFoc * 0.34 + spec) * vVis * uAlpha;",
        "  gl_FragColor = vec4(grade(col), clamp(a, 0.0, 0.92));",
        "}"
      ].join("\n"));

    /* --- 3 · ZÁŘENÍ ----------------------------------------
       Nervy, příliv, švy. Jediné místo, kde smí být sytá
       barva — a proto se s ním musí šetřit.                */
    this.pGlow = this._compile(
      HEAD_VS + "\nvoid main() { common(aPos); }",
      [
        "precision mediump float;",
        "uniform vec3 uTint, uGlow, uFog, uRimCol;",
        "uniform float uAlpha, uHot, uFogNear;",
        "varying vec3 vN, vP;",
        "varying float vAO, vLit, vVis, vFoc;",
        RIG, GRADE,
        "void main() {",
        "  if (vVis <= 0.02) discard;",
        "  vec3 N = normalize(vN);",
        "  vec3 V = normalize(-vP);",
        "  float nl = max(dot(N, L_KEY) * 0.5 + 0.5, 0.0);",
        "  float fres = pow(1.0 - max(dot(N, V), 0.0), 1.7);",
        "  float rimL = pow(max(dot(N, L_RIM), 0.0), 2.0);",
        "  vec3 col = uTint * (0.52 + nl * 0.46);",
        "  col = mix(col, uGlow, clamp(vLit * 1.05 + uHot * 0.5, 0.0, 0.95));",
        "  col += uGlow * vFoc * 0.55;",
        "  col += uRimCol * rimL * 0.30;",
        "  col += vec3(fres * 0.22);",
        "  float fog = clamp((-vP.z - uFogNear) / 2.20, 0.0, 1.0);",
        "  col = mix(col, uFog, fog * 0.50);",
        "  gl_FragColor = vec4(grade(col), uAlpha * (0.80 + vLit * 0.20) * (1.0 + vFoc * 0.25));",
        "}"
      ].join("\n"));

    /* --- 4 · DOSEDNUTÍ ------------------------------------
       Měkký stín na podložce. Bez něj se všechno vznáší.
       Není kruhový a není šedý: má poloosy a zelenošedý tón,
       protože stín na světlém pozadí nikdy není černý.     */
    this.pShadow = this._compile([
      "attribute vec3 aPos;",
      "uniform mat4 uProj, uView, uModel;",
      "varying vec2 vUV;",
      "void main() {",
      "  vUV = aPos.xz;",
      "  gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);",
      "}"
    ].join("\n"), [
      "precision mediump float;",
      /* Varying musí být deklarovaný v OBOU shaderech. Bez téhle
         řádky fragment shader nešel zkompilovat, `_programs()`
         vrátil false a `create()` null — ale plátno už mělo
         WebGL kontext, takže kreslená verze si o něj nemohla
         říct zpátky a sekce zůstala prázdná.               */
      "varying vec2 vUV;",
      "uniform vec3 uInk;",
      "uniform float uAlpha, uSharp;",
      "void main() {",
      "  float r = length(vUV);",
      /* dvě vrstvy: tvrdé jádro u dotyku, měkký rozptyl kolem */
      "  float core = smoothstep(0.62, 0.0, r);",
      "  float soft = smoothstep(1.0, 0.05, r);",
      "  float a = mix(soft * soft, core, uSharp);",
      "  gl_FragColor = vec4(uInk, a * uAlpha);",
      "}"
    ].join("\n"));

    /* --- 5 · SVĚTELNÁ TŮŇ ---------------------------------
       Plocha za tělesem. Velmi jemný nádech barvy uprostřed
       plátna: těleso pak nesedí na prázdnu, ale v prostoru.
       Kreslí se první, bez hloubky.                       */
    this.pPool = this._compile([
      "attribute vec2 aXY;",
      "varying vec2 vUV;",
      "void main() { vUV = aXY * 0.5 + 0.5; gl_Position = vec4(aXY, 0.0, 1.0); }"
    ].join("\n"), [
      "precision mediump float;",
      "varying vec2 vUV;",
      "uniform vec3 uWarm, uCool;",
      "uniform vec2 uAt;",
      "uniform float uAmt;",
      "void main() {",
      "  vec2 d = (vUV - uAt) * vec2(1.15, 1.0);",
      "  float pool = smoothstep(0.86, 0.02, length(d));",
      "  vec3 col = mix(uCool, uWarm, smoothstep(0.0, 1.0, vUV.y));",
      "  gl_FragColor = vec4(col, pool * uAmt);",
      "}"
    ].join("\n"));

    return !!(this.pSolid && this.pGlass && this.pGlow && this.pShadow && this.pPool);
  };

  /* ---------- průhledné plátno na popisky -------------------- */
  Stage.prototype._overlay = function () {
    var o = document.createElement("canvas");
    o.setAttribute("aria-hidden", "true");
    o.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    this.canvas.parentNode.appendChild(o);
    this.ov = o;
    this.oc = o.getContext("2d");
  };

  /* ---------- pomocné plochy --------------------------------- */
  Stage.prototype._quads = function () {
    var gl = this.gl;
    /* stínová ploška v rovině xz */
    this.qShadow = this.upload((function () {
      var m = new G.Mesh(), ids = [];
      for (var i = 0; i < 4; i++) {
        ids.push(m.vert((i === 1 || i === 2) ? 1 : -1, 0, (i >= 2) ? 1 : -1, 0, 0));
      }
      m.quad(ids[0], ids[1], ids[2], ids[3]);
      return m.finish();
    })());
    /* plocha přes celé plátno */
    this.qFull = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.qFull);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  };

  /* ---------- sítě ------------------------------------------- */
  Stage.prototype.upload = function (m, prev) {
    var gl = this.gl;
    if (m.big && !this.extUint) return null;
    function buf(target, data, b) {
      b = b || gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, data, gl.DYNAMIC_DRAW);
      return b;
    }
    var g = prev || {};
    g.pos = buf(gl.ARRAY_BUFFER, m.pos, g.pos);
    g.nrm = buf(gl.ARRAY_BUFFER, m.nrm, g.nrm);
    g.ao  = buf(gl.ARRAY_BUFFER, m.ao,  g.ao);
    g.key = buf(gl.ARRAY_BUFFER, m.key, g.key);
    g.idx = buf(gl.ELEMENT_ARRAY_BUFFER, m.idx, g.idx);
    g.count = m.count;
    g.type = m.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    return g;
  };

  Stage.prototype._bind = function (prog, name, b, size) {
    var loc = prog.a[name];
    if (loc == null || loc < 0) return;
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  };

  Stage.prototype.draw = function (prog, g, model, set) {
    if (!g || !g.count) return;
    var gl = this.gl;
    gl.useProgram(prog.p);
    this._bind(prog, "aPos", g.pos, 3);
    this._bind(prog, "aNrm", g.nrm, 3);
    this._bind(prog, "aAO", g.ao, 1);
    this._bind(prog, "aKey", g.key, 1);
    gl.uniformMatrix4fv(prog.u.uProj, false, this.proj);
    gl.uniformMatrix4fv(prog.u.uView, false, this.view);
    gl.uniformMatrix4fv(prog.u.uModel, false, model || this.ident);
    if (prog.u.uNrm) gl.uniformMatrix3fv(prog.u.uNrm, false, this.nrm3);
    if (set) set(prog, gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
    gl.drawElements(gl.TRIANGLES, g.count, g.type, 0);
  };

  /* ---------- rozměry ---------------------------------------- */
  Stage.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var dpr = Math.min(root.devicePixelRatio || 1, this.quality < 2 ? 1.3 : 2);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    if (this.ov.width !== w || this.ov.height !== h) {
      this.ov.width = w; this.ov.height = h;
    }
    this.W = r.width; this.H = r.height; this.dpr = dpr;
    this.PW = w; this.PH = h;
    this.gl.viewport(0, 0, w, h);
    return true;
  };

  /* ---------- kamera ----------------------------------------- */
  Stage.prototype.camera = function (cam) {
    perspective(this.proj, cam.fov || 0.62, this.W / this.H, 0.05, 20);
    orbit(this.view, cam.yaw || 0, cam.pitch || 0, cam.dist || 3, cam.target);
    normalOf(this.nrm3, this.view);
    this._cam = cam;
  };

  /* Promítne bod scény do plátna popisků. Díky tomu drží popisek
     svého místa na tělese, i když se kamera hýbe.             */
  Stage.prototype.project = function (p, model) {
    var x = p[0], y = p[1], z = p[2];
    if (model) {
      var mx = model[0]*x + model[4]*y + model[8]*z + model[12];
      var my = model[1]*x + model[5]*y + model[9]*z + model[13];
      var mz = model[2]*x + model[6]*y + model[10]*z + model[14];
      x = mx; y = my; z = mz;
    }
    var v = this.view, pr = this.proj;
    var ex = v[0]*x + v[4]*y + v[8]*z + v[12];
    var ey = v[1]*x + v[5]*y + v[9]*z + v[13];
    var ez = v[2]*x + v[6]*y + v[10]*z + v[14];
    /* HLOUBKA V POHLEDU, NE HOMOGENNÍ W.
       Bylo tu `pr[11] * ez`, tedy −ez. Jenže test hned pod tím
       zahazuje všechno, co má cw ≥ 0 — a −ez je pro každý bod
       PŘED kamerou kladné. Projekce tedy vracela null vždycky
       a odkazové popisky se za celou dobu ani jednou
       nenakreslily; scény přišly o všechna pojmenování
       struktur. Rozhoduje pohledová hloubka ez: před kamerou
       je záporná, za ní kladná.                              */
    var cw = ez;
    if (cw >= -0.0001) return null;
    return [(pr[0]*ex / -cw * 0.5 + 0.5) * this.W,
            (0.5 - pr[5]*ey / -cw * 0.5) * this.H, -ez];
  };

  /* ============================================================
     MATERIÁLOVÉ NASTAVENÍ
     Jedno místo, kde se z popisu materiálu stanou uniformy.
     ============================================================ */
  Stage.prototype._light = function (p, gl) {
    var C = this.C;
    gl.uniform3f(p.u.uSky, 0.985, 0.992, 0.978);
    gl.uniform3f(p.u.uGround, C.sand[0] * 0.80, C.sand[1] * 0.78, C.sand[2] * 0.74);
    gl.uniform3f(p.u.uKeyCol, 1.0, 0.974, 0.930);
    gl.uniform3f(p.u.uFillCol, 0.760, 0.848, 0.872);
    gl.uniform3f(p.u.uRimCol, C.soft[0] * 0.86, C.soft[1] * 0.96, C.soft[2] * 0.90);
    /* MLHA MÁ BARVU PLÁTNA, NE STRÁNKY.
       Obě scénická plátna stojí na --surface (bílá), ne na --bg
       (porcelán). Mlha přitom mířila k porcelánu — vzdálená
       hrana podložky se tedy nikdy nerozplynula, jen se
       přebarvila do jiné světlé a v rámu zůstala jako obzor.

       ZAČÁTEK MLHY je nově až za modelem. Byl na 1,55 jednotky,
       což je blíž než kamera (2–3): mlha tedy zmlžovala samotný
       model a celá sekce vypadala vybledle. Teď začíná na 3,6
       a doběhne na 5,8 — model je z ní venku, podložka v ní
       mizí.                                                  */
    gl.uniform3f(p.u.uFog, C.surf[0], C.surf[1], C.surf[2]);
    gl.uniform1f(p.u.uFogNear, 3.60);
    gl.uniform3f(p.u.uGradeS, C.deep[0] * 1.30 + 0.12, C.deep[1] * 1.05 + 0.18, C.deep[2] * 1.0 + 0.16);
    gl.uniform3f(p.u.uGradeH, 1.0, 0.985, 0.945);
    gl.uniform2f(p.u.uRes, this.PW || 1, this.PH || 1);
  };

  /* Vrátí funkci, která programu nastaví daný materiál. */
  Stage.prototype.mat = function (name, over) {
    var self = this, C = this.C;
    var d = this.M[name] || this.M.bone;
    over = over || {};
    var albedo = new Float32Array(over.albedo || d.albedo || [1,1,1]);
    var sss = new Float32Array(d.sss || [1,1,1]);
    var occ = new Float32Array(d.occ || [0.6,0.6,0.6]);
    var tint = new Float32Array(over.tint || d.tint || C.soft);
    var core = new Float32Array(over.core || C.tide);
    return function (p, gl) {
      self._light(p, gl);
      if (d.pass === "solid") {
        gl.uniform3fv(p.u.uAlbedo, albedo);
        gl.uniform3fv(p.u.uSSS, sss);
        gl.uniform3fv(p.u.uOcc, occ);
        gl.uniform3f(p.u.uInk, C.ink[0], C.ink[1], C.ink[2]);
        gl.uniform3f(p.u.uGlow, C.warm[0], C.warm[1], C.warm[2]);
        gl.uniform1f(p.u.uSSSAmt, over.sssAmt != null ? over.sssAmt : d.sssAmt);
        gl.uniform1f(p.u.uRough, over.rough != null ? over.rough : d.rough);
        gl.uniform1f(p.u.uSpecAmt, d.spec);
        gl.uniform1f(p.u.uRimAmt, over.rim != null ? over.rim : d.rim);
        gl.uniform1f(p.u.uInkAmt, over.ink != null ? over.ink : d.ink);
        gl.uniform1f(p.u.uAlpha, over.alpha != null ? over.alpha : (d.alpha != null ? d.alpha : 1));
      } else if (d.pass === "glass") {
        gl.uniform3fv(p.u.uTint, tint);
        gl.uniform3fv(p.u.uCore, core);
        gl.uniform3f(p.u.uGlow, C.warm[0], C.warm[1], C.warm[2]);
        gl.uniform1f(p.u.uDens, over.dens != null ? over.dens : d.dens);
        gl.uniform1f(p.u.uAlpha, over.alpha != null ? over.alpha : d.alpha);
      } else {
        gl.uniform3fv(p.u.uTint, new Float32Array(over.tint || C.tide));
        gl.uniform3f(p.u.uGlow, C.warm[0], C.warm[1], C.warm[2]);
        gl.uniform1f(p.u.uAlpha, over.alpha != null ? over.alpha : d.alpha);
        gl.uniform1f(p.u.uHot, over.hot != null ? over.hot : (d.hot || 0));
      }
    };
  };

  Stage.prototype.progFor = function (name) {
    var d = this.M[name] || this.M.bone;
    return d.pass === "glass" ? this.pGlass : d.pass === "glow" ? this.pGlow : this.pSolid;
  };
  Stage.prototype.passOf = function (name) {
    return (this.M[name] || this.M.bone).pass;
  };

  /* ---------- světelná tůň ----------------------------------- */
  Stage.prototype.pool = function (at, amt) {
    var gl = this.gl, C = this.C, p = this.pPool;
    gl.useProgram(p.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.qFull);
    var loc = p.a.aXY;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3f(p.u.uWarm, C.sand[0], C.sand[1] * 0.99, C.sand[2] * 0.97);
    gl.uniform3f(p.u.uCool, C.soft[0] * 0.96, C.soft[1], C.soft[2] * 0.99);
    gl.uniform2f(p.u.uAt, at[0], at[1]);
    gl.uniform1f(p.u.uAmt, amt);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  };

  /* ---------- dosednutí -------------------------------------- */
  Stage.prototype.shadow = function (s) {
    var gl = this.gl, C = this.C;
    var m = G.mat4();
    G.mul(m, m, G.translate(s.at[0], s.at[1], s.at[2]));
    if (s.rot) G.mul(m, m, G.rotY(s.rot));
    G.mul(m, m, G.scaleM(s.rx || s.r || 0.5, 1, s.rz || s.r || 0.5));
    this.draw(this.pShadow, this.qShadow, m, function (p) {
      gl.uniform3f(p.u.uInk, C.ink[0] * 0.74, C.ink[1] * 0.80, C.ink[2] * 0.74);
      gl.uniform1f(p.u.uAlpha, s.a == null ? 0.28 : s.a);
      gl.uniform1f(p.u.uSharp, s.sharp == null ? 0.35 : s.sharp);
    });
  };

  /* ---------- stopa dotyku -----------------------------------
     RUCE NA SCÉNĚ NEJSOU. Modelovaná ruka je totiž ze všeho,
     co scéna obsahuje, nejtěžší úkol — a když se nepovede,
     strhne s sebou i dokonale postavenou kost. Místo ní se
     na těle rozsvítí MĚKKÁ SVĚTELNÁ STOPA v místě, kde dlaň
     spočine: přesně tam, přesně tak velká, a s tímtéž dechem.

     Je to táž ploška jako u dosednutí, jen kreslená přílivovou
     barvou a SČÍTACÍM mísením — světlo se přičítá, nezakrývá.
     Naklopení (tilt) ji položí i na svislou plochu, takže se
     dá posadit na týl stejně jako na chodidlo.               */
  Stage.prototype.contact = function (s) {
    var gl = this.gl, C = this.C;
    var m = G.mat4();
    G.mul(m, m, G.translate(s.at[0], s.at[1], s.at[2]));
    if (s.rot) G.mul(m, m, G.rotY(s.rot));
    if (s.tilt) G.mul(m, m, G.rotX(s.tilt));
    if (s.roll) G.mul(m, m, G.rotZ(s.roll));
    G.mul(m, m, G.scaleM(s.rx || s.r || 0.3, 1, s.rz || s.r || 0.3));
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    this.draw(this.pShadow, this.qShadow, m, function (p) {
      gl.uniform3f(p.u.uInk, C.soft[0] * 0.72, C.soft[1] * 0.86, C.soft[2] * 0.80);
      gl.uniform1f(p.u.uAlpha, s.a == null ? 0.42 : s.a);
      gl.uniform1f(p.u.uSharp, s.sharp == null ? 0.12 : s.sharp);
    });
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  };

  root.KJStage = {
    create: function (host, canvas) {
      var s = new Stage(host, canvas);
      return s.ok ? s : null;
    },
    palette: palette,
    TAU: TAU
  };
})(typeof window !== "undefined" ? window : globalThis);
