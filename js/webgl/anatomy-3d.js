/* ============================================================
   anatomy-3d.js — HERO: POSTAVA, KTERÁ DÝCHÁ

   Vlastní WebGL bez 3D knihovny. Na plátně stojí skutečný
   trojrozměrný model: lebka, dvacet čtyři obratlů, dvanáct
   párů žeber, pánev, durální tubus a nervový strom. Není to
   kresba natočená do prostoru — má to objem, normály a světlo.

   ------------------------------------------------------------
   MATERIÁL: „porcelán s inkoustovým obrysem“

   Kost není šedý plast. Je to matný porcelán, do kterého shora
   svítí studené světlo místnosti a zespodu se odráží teplý tón
   prostěradla (polokulové okolní světlo). Na obrysu, kde se
   povrch odklání od diváka, ztmavne do inkoustu — přesně to
   dělá z 3D renderu anatomickou rytinu a ne screenshot z hry.

   Durální tubus je sklo: skoro průhledné uprostřed, husté na
   okraji (Fresnel). Nervy jsou tenké trubky, které chytají
   světlo vlny. Mozkomíšní mok jsou částice, které tubem plynou.

   ------------------------------------------------------------
   DĚJ

     0,0–0,4 s   bod světla na temeni
     0,4–2,2 s   model se vyvolává od temene ke kostrči
                 (rozptylem, jako když se vyvolává fotografie)
     2,2–3,2 s   naběhne proud moku a nervy se rozsvítí
     dál        vlna projede lebka → kost křížová každých 11 s;
                hrudník se rozpíná v tempu primární respirace
     každý 3.   STILL POINT — vlna se zpomalí, na 1,4 s se
                všechno zastaví, pak se pulz předá lince dechu
                u levého okraje stránky a rytmus jde hlouběji

   Postava se přitom celou dobu pomalu otáčí (±13°) a reaguje
   na kurzor. Nikdy se nezastaví na plocho: vždycky je vidět,
   že je to těleso.

   ------------------------------------------------------------
   STRÁŽCE VÝKONU

   Pod 45 fps po dvou vteřinách → zhasnou částice a haló.
   Pořád málo → scéna se vypne a zůstane statická kresba.
   Obsah má přednost před efektem.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ, AM = window.AnatomyMesh;
  if (!KJ || !AM) return;

  var host = document.querySelector("[data-nerve]");
  if (!host) return;
  var canvas = host.querySelector("canvas");
  if (!canvas) return;

  /* Návrat ke kreslené verzi. Musí sundat i třídu `nerve-boot`,
     kterou nasadil skript v <head> — ta kresbu schovává, dokud
     se scéna nerozběhne. Bez toho by po selhání WebGL zůstalo
     v hero sekci prázdné místo.                               */
  function giveUp() {
    host.dataset.mode = "static";
    document.documentElement.classList.remove("nerve-boot");
    if (window.__kjNerveGuard) { clearTimeout(window.__kjNerveGuard); window.__kjNerveGuard = 0; }
  }

  /* Omezený pohyb → statická kresba, která musí být krásná
     sama o sobě. WebGL vůbec nespouštíme.                    */
  if (KJ.isReduced()) { giveUp(); return; }

  var gl = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true, antialias: true, premultipliedAlpha: false,
      depth: true, powerPreference: "default"
    }) || canvas.getContext("experimental-webgl", { alpha: true, antialias: true, depth: true });
  } catch (e) { gl = null; }
  if (!gl) { giveUp(); return; }

  var extUint = gl.getExtension("OES_element_index_uint");

  /* ---------- rám záběru -------------------------------------
     Čísla drží pohromadě s poměrem stran v css/_l1.css.
     Kdo je změní tady, musí je změnit i tam.                 */
  var FOV = 0.72;
  /* ZÁBĚR JE BUSTA, NE FIGURKA.
     Dřív kamera stála na 2,179 a v plátně stála celá postava
     od temene po kolena. Anatomie tím byla nečitelná — hrudní
     koš zabíral pětinu plochy a nohy dvě pětiny, přestože se
     na nich nic neděje. Teď je záběr od temene po kost
     křížovou: přesně kraniosakrální osa, o které je řeč.

     Čísla drží pohromadě, nedají se měnit po jednom:
       půlvýška záběru = tan(FOV/2) · DIST = 0,3762 · 1,56 = 0,587
       střed 0,415  →  vidět y od −0,172 do +1,002
       temeno je 0,980, takže nad ním zbývá 0,022 vzduchu
       půlšířka = 0,587 · (680/780) = 0,512
       vnější hrana kříže je 0,352 + 0,108 = 0,460  ✓ vejde se
     Poměr 680/780 musí souhlasit s aspect-ratio .nerve
     v css/_l1.css.                                          */
  var DIST = 1.56;
  var PIVOT_Y = 0.45;
  var CENTER_Y = 0.415;
  /* Pánev a stehna se rozplynou do světla. Doběh je nad dolní
     hranou záběru (−0,172), takže se nic neuřízne rovnou
     čarou — tělo dole končí, ne že by bylo oříznuté.        */
  var FADE_A = -0.13, FADE_B = 0.055;
  /* Střed kříže. Musí souhlasit s buildCross() v anatomy-mesh.js. */
  var CROSS = [0.352, 0.545, 0.030];
  var CROSS_ARM = 0.30 * 0.335;  /* poloviční rameno — musí sedět s buildCross() */

  /* ---------- barvy z tokenů --------------------------------- */
  var cs = getComputedStyle(document.documentElement);
  function rgb(v, fb) {
    var h = (cs.getPropertyValue(v).trim() || fb).replace("#", "");
    return [parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255];
  }
  var C_BG    = rgb("--bg", "#F2F3EF");
  var C_INK   = rgb("--ink", "#101C18");
  var C_INK3  = rgb("--ink-3", "#5F6A64");
  var C_TIDE  = rgb("--tide", "#0E6B54");
  var C_WARM  = rgb("--tide-warm", "#1E7A5B");
  var C_SOFT  = rgb("--tide-soft", "#CFE6DA");
  var C_SAND  = rgb("--sand", "#EDE7DC");

  /* ---------- matice (bez knihovny) -------------------------- */
  function mat4() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
    out[4]=0; out[5]=f; out[6]=0; out[7]=0;
    out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
    out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0;
    return out;
  }
  var _t = new Float32Array(16);
  function multiply(out, a, b) {
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      _t[i*4+j] = a[j]*b[i*4] + a[4+j]*b[i*4+1] + a[8+j]*b[i*4+2] + a[12+j]*b[i*4+3];
    }
    out.set(_t); return out;
  }
  /* Pohled otáčený kolem hrudní kosti, ne kolem počátku —
     jinak se postava houpe za nohy.                          */
  function viewOf(out, rx, ry, ty, tz) {
    var cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    out[0]=cy;  out[1]=sy*sx;  out[2]=-sy*cx; out[3]=0;
    out[4]=0;   out[5]=cx;     out[6]=sx;     out[7]=0;
    out[8]=sy;  out[9]=-cy*sx; out[10]=cy*cx; out[11]=0;
    out[12]=0;  out[13]=ty - cx*PIVOT_Y; out[14]=tz - sx*PIVOT_Y; out[15]=1;
    return out;
  }
  /* Normálová matice = rotační část pohledu (bez posunu). */
  function normalOf(out, v) {
    out[0]=v[0]; out[1]=v[1]; out[2]=v[2];
    out[3]=v[4]; out[4]=v[5]; out[5]=v[6];
    out[6]=v[8]; out[7]=v[9]; out[8]=v[10];
    return out;
  }

  /* ---------- společné kusy shaderů -------------------------- */
  /* Dech: hrudník se rozpíná podle `aExp`. Lebka má nulu, žebra
     jedničku — proto dýchá to, co dýchat má.                  */
  var COMMON_VS = [
    "vec3 breathe(vec3 p, float e, float b) {",
    "  float k = 1.0 + b * e * 0.026;",
    "  p.x *= k; p.z *= mix(1.0, k, 0.72);",
    "  p.y += b * e * 0.006;",
    "  return p;",
    "}",
    /* Vlna: ostré jádro + široká zář. Jedna gaussovka je puntík,
       dvě dělají vlnoplochu — tekutinu, ne ukazovátko.       */
    "float waveAt(float s, float w) {",
    "  float d = s - w;",
    "  return exp(-d * d * 170.0) + exp(-d * d * 22.0) * 0.42;",
    "}"
  ].join("\n");

  /* Rozptylové vyvolávání: hrana odkrytí je rozstříknutá do
     zrna. Vypadá to jako vyvolávaná fotografie a hlavně to
     funguje s hloubkovým bufferem — na rozdíl od průhlednosti. */
  var DITHER_FS = [
    "float hash12(vec2 p) {",
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
    "  p3 += dot(p3, p3.yzx + 33.33);",
    "  return fract((p3.x + p3.y) * p3.z);",
    "}"
  ].join("\n");

  function compile(vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;

    var o = { p: p, a: {}, u: {} };
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < na; i++) {
      var an = gl.getActiveAttrib(p, i).name;
      o.a[an] = gl.getAttribLocation(p, an);
    }
    var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < nu; i++) {
      var un = gl.getActiveUniform(p, i).name.replace("[0]", "");
      o.u[un] = gl.getUniformLocation(p, un);
    }
    return o;
  }

  /* ============================================================
     PROGRAM 1 — KOST
     ============================================================ */
  var progBone = compile([
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "attribute float aS;",
    "attribute float aExp;",
    "uniform mat4 uProj, uView;",
    "uniform mat3 uNrm;",
    "uniform float uBreath, uWave, uReveal, uDim;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit, vFade, vHead;",
    COMMON_VS,
    "void main() {",
    "  vec3 p = breathe(aPos, aExp, uBreath);",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz;",
    "  vN = uNrm * aNrm;",
    "  vS = aS;",
    "  vLit = waveAt(aS, uWave) * uDim;",
    "  vFade = smoothstep(" + FADE_A.toFixed(3) + ", " + FADE_B.toFixed(3) + ", aPos.y);",
    "  vHead = smoothstep(0.66, 0.90, aPos.y);",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uSky, uGround, uKeyCol, uInk, uFog, uGlow;",
    "uniform float uReveal, uAlpha;",
    /* Tři světla navíc, o kterých scéna dřív nevěděla:
       uXpos/uXamt  odraz od kříže (v souřadnicích pohledu)
       uRip/uRipP   kulová vlna uvolnění z kosti křížové
       uPtr/uPtrAmt teplo pod kurzorem, v pixelech plátna     */
    "uniform vec3 uXpos, uRip, uPtr;",
    "uniform vec2 uRipP;",
    "uniform float uXamt, uPtrAmt;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit, vFade, vHead;",
    DITHER_FS,
    "void main() {",
    /* Vyvolávání odshora dolů. Zrno patří JEN sem: hrana
       odkrytí se má rozstříknout. Svislé rozplynutí pánve
       naopak zrnit nesmí — z dolního okraje byl pak popel.
       Proto reveal ditherem, fade krytím.                  */
    "  float vis = 1.0 - smoothstep(uReveal - 0.13, uReveal + 0.02, vS);",
    "  if (vis < hash12(gl_FragCoord.xy) * 0.98 + 0.01) discard;",
    "  if (vFade < 0.012) discard;",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(-vP);",
    "  if (!gl_FrontFacing) N = -N;",
    /* světlo místnosti: shora studené, zdola teplý odraz od prostěradla */
    "  vec3 amb = mix(uGround, uSky, N.y * 0.5 + 0.5);",
    /* TŘI SVĚTLA, JAKO V ATELIÉRU.
       Jedno světlo dělá polovinu tělesa mrtvou. Ateliérový
       fotograf staví klíč, výplň a obrysové — a přesně to
       odděluje render od fotografie:
         L  klíč zleva shora   — kreslí tvar
         L2 výplň zprava       — otevře stín, nikdy do bíla
         L3 obrys zezadu       — odlepí kost od plochy stránky
       Světla se drží KAMERY, ne scény: postava se otáčí,
       ateliér ne.                                            */
    "  vec3 L  = normalize(vec3(-0.42, 0.78, 0.62));",
    "  vec3 L2 = normalize(vec3( 0.80, 0.14, 0.34));",
    "  vec3 L3 = normalize(vec3( 0.08, -0.30, -0.94));",
    "  float ndl = max(dot(N, L), 0.0);",
    "  float wrap = max(dot(N, L) * 0.5 + 0.5, 0.0);",  /* měkký přechod do stínu */
    "  float fill = max(dot(N, L2) * 0.5 + 0.5, 0.0);",
    "  float rimL = pow(max(dot(N, L3), 0.0), 2.4);",
    "  vec3 H = normalize(L + V);",
    "  float spec = pow(max(dot(N, H), 0.0), 34.0) * 0.20",
    "             + pow(max(dot(N, H), 0.0), 130.0) * 0.16;",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.3);",
    "  vec3 col = amb * 0.60 + uKeyCol * (ndl * 0.38 + wrap * 0.22) + vec3(spec);",
    /* Výplň je TEPLÁ (odraz prostěradla), ne bílá — tím stín
       nikdy nezešedne. To je celý rozdíl mezi „šedý plast“
       a „porcelán v denním světle“.                         */
    "  col += uGround * fill * 0.17;",
    "  col += uKeyCol * rimL * 0.15;",
    /* PODPOVRCHOVÝ ROZPTYL. Kost není kámen: v tenkých místech
       (žeberní chrupavka, klenba lebky, trny obratlů) jí světlo
       projde a vystoupí na odvrácené straně. Bez toho vypadá
       každý model jako sádra.                                */
    "  float sss = pow(max(0.0, dot(V, -L)), 3.2) * 0.55 + pow(wrap, 4.0) * 0.30;",
    "  col += uGround * sss * 0.22;",
    /* inkoustový obrys — z 3D se tím stane rytina */
    "  col = mix(col, uInk, clamp(fres * 0.62, 0.0, 0.74) * mix(1.0, 0.62, vHead));",
    /* VLNA PROSVÍTÍ KOST ZEVNITŘ — ale ne stejně všude.
       Na žebru a obratli je to tenká struktura a 72 % zeleně
       se čte správně: „tudy něco jde“. Na LEBCE je to naopak
       největší hladká plocha ve scéně, a když se celá zbarví,
       nevznikne světlo procházející kostí — vznikne zelené
       vejce. Nad 0,66 výšky se proto podíl srazí na 38 %:
       klenba se rozsvítí, ale zůstane porcelánová.          */
    "  col = mix(col, uGlow, clamp(vLit * 0.70, 0.0, 0.72) * mix(1.0, 0.38, vHead));",
    /* ODRAZ OD KŘÍŽE. Kříž není nálepka vedle postavy — svítí,
       a co svítí, musí něco osvětlovat. Přivrácená strana těla
       proto chytá zelený odraz a sílí přesně tehdy, když se
       kříž rozsvítí. Bez toho jsou to dva obrázky na jednom
       plátně, ne jedna scéna.                                */
    "  vec3 Lx = uXpos - vP;",
    "  float xd = dot(Lx, Lx);",
    "  float nx = max(dot(N, Lx * inversesqrt(max(xd, 0.0001))), 0.0);",
    "  col += uGlow * nx * uXamt / (1.0 + 5.0 * xd);",
    /* VLNA UVOLNĚNÍ. Podélná vlna říká „něco tudy jde“. Tahle
       je kulová, vychází z kosti křížové a projede celým tělem
       ve chvíli zastavení — říká „povolilo to“. Pozor: pow()
       je pro záporný základ v GLSL nedefinovaná, druhá mocnina
       se proto počítá násobením.                             */
    "  float rr = (length(vP - uRip) - uRipP.x) * 5.0;",
    "  col += uGlow * exp(-rr * rr) * uRipP.y;",
    /* DLAŇ. Kurzor není ukazovátko — je to teplo ruky. Kde se
       zastaví, tam se povrch o stopu prohřeje. Je to jediné
       místo scény, kde má návštěvník přímý vliv na tělo.     */
    "  float pd = length(gl_FragCoord.xy - uPtr.xy) / max(uPtr.z, 1.0);",
    "  col += uGlow * exp(-pd * pd * 1.7) * uPtrAmt;",
    /* hloubková mlha: co je vzadu, splývá s plochou stránky */
    "  float fog = clamp((-vP.z - 1.72) / 1.05, 0.0, 1.0);",
    "  col = mix(col, uFog, fog * 0.62);",
    "  float a = uAlpha * vFade * mix(0.86, 1.0, 1.0 - fog);",
    "  gl_FragColor = vec4(col, a);",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 2 — DURÁLNÍ TUBUS (sklo)
     ============================================================ */
  var progDura = compile([
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "attribute float aS;",
    "attribute float aExp;",
    "uniform mat4 uProj, uView;",
    "uniform mat3 uNrm;",
    "uniform float uBreath, uWave, uDim;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit;",
    COMMON_VS,
    "void main() {",
    "  vec3 p = breathe(aPos, aExp, uBreath);",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz; vN = uNrm * aNrm; vS = aS;",
    "  vLit = waveAt(aS, uWave) * uDim;",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uSoft, uTide, uGlow;",
    "uniform float uReveal, uFlow;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit;",
    "void main() {",
    "  float vis = 1.0 - smoothstep(uReveal - 0.13, uReveal + 0.02, vS);",
    "  if (vis <= 0.01) discard;",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(-vP);",
    /* Membrána je při pohledu zboku hustší než uprostřed —
       jediný důvod, proč trubka vypadá jako trubka.        */
    "  float fres = pow(1.0 - abs(dot(N, V)), 2.1);",
    "  vec3 col = mix(uSoft, uGlow, clamp(vLit, 0.0, 1.0));",
    "  float top = smoothstep(0.02, 0.20, vS);",
    "  float a = (0.055 + fres * 0.40 + vLit * 0.34) * vis * uFlow * (0.30 + 0.70 * top);",
    "  gl_FragColor = vec4(col, clamp(a, 0.0, 0.72));",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 3 — NERVY
     ============================================================ */
  var progNerve = compile([
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "attribute float aS;",
    "attribute float aExp;",
    "uniform mat4 uProj, uView;",
    "uniform mat3 uNrm;",
    "uniform float uBreath, uWave, uDim;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit, vFade;",
    COMMON_VS,
    "void main() {",
    "  vec3 p = breathe(aPos, aExp, uBreath);",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz; vN = uNrm * aNrm; vS = aS;",
    "  vLit = waveAt(aS, uWave) * uDim;",
    "  vFade = smoothstep(" + FADE_A.toFixed(3) + ", " + FADE_B.toFixed(3) + ", aPos.y);",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uBase, uGlow, uInk, uFog;",
    "uniform float uReveal, uAlpha;",
    "varying vec3 vN, vP;",
    "varying float vS, vLit, vFade;",
    DITHER_FS,
    "void main() {",
    "  float vis = 1.0 - smoothstep(uReveal - 0.13, uReveal + 0.02, vS);",
    "  if (vis < hash12(gl_FragCoord.xy + 7.3) * 0.98 + 0.01) discard;",
    "  if (vFade < 0.012) discard;",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(-vP);",
    "  if (!gl_FrontFacing) N = -N;",
    "  vec3 L = normalize(vec3(-0.42, 0.78, 0.62));",
    "  float ndl = max(dot(N, L) * 0.5 + 0.5, 0.0);",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 1.8);",
    "  vec3 col = uBase * (0.52 + ndl * 0.50);",
    "  col = mix(col, uInk, fres * 0.42);",
    "  col = mix(col, uGlow, clamp(vLit * 0.95, 0.0, 0.92));",
    "  float fog = clamp((-vP.z - 1.72) / 1.05, 0.0, 1.0);",
    "  col = mix(col, uFog, fog * 0.55);",
    "  gl_FragColor = vec4(col, uAlpha * vFade * (0.72 + vLit * 0.28));",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 4 — ČÁSTICE MOKU A GANGLIA
     ============================================================ */
  var progPoint = compile([
    "attribute vec3 aPos;",
    "attribute float aS;",
    "attribute float aSeed;",
    "uniform mat4 uProj, uView;",
    "uniform float uBreath, uWave, uReveal, uSize, uT, uKind;",
    "varying float vLit, vA;",
    COMMON_VS,
    "void main() {",
    "  vec3 p = aPos;",
    /* Mok neplyne rovně: postupuje po ose a mírně krouží. */
    "  if (uKind < 0.5) {",
    "    float f = fract(aSeed + uT * 0.055);",
    "    p.y -= f * 0.06;",
    "    p.x += sin(uT * 0.7 + aSeed * 24.0) * 0.004;",
    "  }",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  float vis = 1.0 - smoothstep(uReveal - 0.13, uReveal + 0.02, aS);",
    "  float w = waveAt(aS, uWave);",
    "  vLit = w;",
    "  vA = vis * (uKind < 0.5 ? (0.16 + w * 0.62) : (0.34 + w * 0.60));",
    "  float depth = clamp((mv.z + 2.6) / 0.7, 0.0, 1.0);",
    "  gl_PointSize = uSize * (0.7 + depth * 0.55) * (1.0 + w * 1.15);",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uBase, uGlow;",
    "varying float vLit, vA;",
    "void main() {",
    "  vec2 q = gl_PointCoord - vec2(0.5);",
    "  float r = length(q);",
    "  if (r > 0.5) discard;",
    "  float core = smoothstep(0.5, 0.05, r);",
    "  float halo = smoothstep(0.5, 0.0, r) * 0.32;",
    "  vec3 c = mix(uBase, uGlow, clamp(vLit * 1.15, 0.0, 1.0));",
    "  gl_FragColor = vec4(c, clamp((core * 0.78 + halo) * vA, 0.0, 1.0));",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 5 — PORCELÁNOVÁ SKOŘEPINA
     Matné sklo, kterým je vidět dovnitř. Uprostřed skoro čiré,
     na obrysu husté — to je Fresnel a je to jediný důvod, proč
     se povrch čte jako hmota a ne jako fólie.
     ============================================================ */
  var progShell = compile([
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "attribute float aS;",
    "attribute float aExp;",
    "uniform mat4 uProj, uView;",
    "uniform mat3 uNrm;",
    "uniform float uBreath, uWave, uDim;",
    "varying vec3 vN, vP;",
    "varying float vLit, vFade, vY, vS;",
    COMMON_VS,
    "void main() {",
    "  vec3 p = breathe(aPos, aExp, uBreath);",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz; vN = uNrm * aNrm;",
    "  vLit = waveAt(aS, uWave) * uDim;",
    "  vFade = smoothstep(" + FADE_A.toFixed(3) + ", " + FADE_B.toFixed(3) + ", aPos.y);",
    "  vY = aPos.y; vS = aS;",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uSkin, uRim, uGlow, uFog;",
    "uniform float uReveal, uAlpha, uFace;",
    "uniform vec3 uXpos, uRip, uPtr;",
    "uniform vec2 uRipP;",
    "uniform float uXamt, uPtrAmt;",
    "varying vec3 vN, vP;",
    "varying float vLit, vFade, vY, vS;",
    DITHER_FS,
    "void main() {",
    "  float vis = (1.0 - smoothstep(uReveal - 0.16, uReveal + 0.04, vS)) * vFade;",
    "  if (vis < 0.02) discard;",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(-vP);",
    "  if (!gl_FrontFacing) N = -N;",
    "  vec3 L = normalize(vec3(-0.42, 0.78, 0.62));",
    "  float ndl = max(dot(N, L) * 0.5 + 0.5, 0.0);",
    /* Obrysové světlo je UŽŠÍ než dřív (2,7 → 4,2). Široký
       Fresnel zaplnil celou oblinu a z těla se stala plná
       figurína; úzký nechá svítit jen hranu, takže tělo
       vypadá jako obrys ze světla a kostra uvnitř je
       konečně vidět.                                      */
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.2);",
    "  float wide = pow(1.0 - max(dot(N, V), 0.0), 1.7);",
    /* HLAVA NENÍ ZELENÁ.
       Obrysová barva porcelánu je odvozená od mělčiny, a to je
       na trupu správně: tam se pod kůží něco děje. Na LEBCE
       ale ta zeleň zaplnila celou klenbu — hlava se přestala
       číst jako hlava a začala se číst jako svítící vejce.
       Nad 0,66 výšky se proto obrysová barva přelévá zpět do
       porcelánu; zelená zůstane jen jako náznak na samé hraně. */
    "  float head = smoothstep(0.66, 0.90, vY);",
    "  vec3 rimC = mix(uRim, uSkin * vec3(1.00, 0.995, 0.975), head * 0.80);",
    /* Odlesk je úzký a jen jeden — porcelán, ne plast. */
    "  vec3 H = normalize(L + V);",
    "  float spec = pow(max(dot(N, H), 0.0), 70.0) * 0.34 * uFace;",
    "  vec3 col = mix(uSkin * (0.92 + ndl * 0.14), rimC, wide * mix(0.62, 0.46, head));",
    "  col += vec3(spec);",
    /* PROTISVĚTLO. Kůže je tenká a světlo jí prochází. Zezadu
       nasvícený člověk má prosvícený obrys — ucho, prsty,
       rameno. Tady se to počítá jako rozptyl v ose pohledu
       proti klíčovému světlu; je to jediná věc, po které
       porcelán přestane být sklo a začne být tělo.          */
    "  float sss = pow(max(0.0, dot(V, -L)), 3.0);",
    "  col += uGlow * sss * 0.20 * (1.0 - head * 0.55);",
    /* DUHOVÁ HRANA. Tenká vrstva nad zakřiveným povrchem barvu
       rozkládá. Je to úzký pás mezi obrysem a plochou —
       o jeden krok teplejší než mělčina. Kdyby byl široký,
       byl by z toho olej na vodě; v jednom procentu plochy
       je to jen důvod, proč hrana nevypadá vyříznutá.       */
    "  float iri = smoothstep(0.30, 0.88, wide) * (1.0 - fres);",
    "  col = mix(col, rimC * vec3(1.10, 1.03, 0.96), iri * 0.30);",
    "  col = mix(col, uGlow, clamp(vLit * 0.38, 0.0, 0.44) * mix(1.0, 0.42, head));",
    /* Hřeben vlny na povrchu — světlo, které po těle přejede. */
    "  col += uGlow * pow(clamp(vLit, 0.0, 1.0), 3.0) * 0.42 * (1.0 - head * 0.60);",
    /* Porcelán chytá odraz kříže i vlnu uvolnění jako první —
       je to povrch, tedy to, co je na těle vidět.            */
    "  vec3 Lx = uXpos - vP;",
    "  float xd = dot(Lx, Lx);",
    "  float nx = max(dot(N, Lx * inversesqrt(max(xd, 0.0001))), 0.0);",
    "  col += uGlow * nx * uXamt / (1.0 + 5.0 * xd);",
    "  float rr = (length(vP - uRip) - uRipP.x) * 5.0;",
    "  col += uGlow * exp(-rr * rr) * uRipP.y;",
    "  float pd = length(gl_FragCoord.xy - uPtr.xy) / max(uPtr.z, 1.0);",
    "  col += uGlow * exp(-pd * pd * 1.7) * uPtrAmt;",
    "  float fog = clamp((-vP.z - 1.78) / 1.05, 0.0, 1.0);",
    "  col = mix(col, uFog, fog * 0.50);",
    /* Nad lebkou je porcelán hustší. Prosvítající oční důlky
       působily jako maska — a to je poslední věc, kterou má
       tenhle web na klienta vyslat.                         */
    /* Nad lebkou je porcelán hustší (0,24 → 0,36). Lebka je
       hladké těleso bez vnitřní kresby: čím víc je jí vidět,
       tím spíš se čte jako maska. Pod hustším porcelánem
       zůstane klenba jen náznakem — a hlava se čte jako hlava. */
    "  float a = (0.024 + fres * 0.74 + wide * 0.10 + spec",
    "           + vLit * 0.12 + head * 0.36) * vis * uAlpha;",
    /* ODVRÁCENÁ STĚNA HLAVY. Zadní polovina porcelánu prosvítala
       skrz přední a v místě obličeje z ní byl tmavý ovál — hlava
       vypadala jako maska. Na trupu je ta druhá stěna k užitku
       (dělá objem), na hlavě ne: uvnitř není nic, co by měla
       ukazovat. uFace ji rozliší — 0,25 je průchod s odvrácenou
       stěnou, 1,0 s přivrácenou.                             */
    "  float back = 1.0 - step(0.5, uFace);",
    "  a *= 1.0 - back * head * 0.62;",
    "  gl_FragColor = vec4(col, clamp(a, 0.0, 0.82));",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 6 — ZDRAVOTNICKÝ KŘÍŽ
     Sklo se zeleným jádrem. Uvnitř skoro čiré, na hranách husté
     — a fazety chytají ostrý odlesk, který z tvaru udělá
     předmět. Vlna, která projede postavou, projede i křížem.
     ============================================================ */
  var progCross = compile([
    "attribute vec3 aPos;",
    "attribute vec3 aNrm;",
    "uniform mat4 uProj, uView;",
    "uniform mat3 uNrm;",
    "uniform float uSpin, uBreath, uRise;",
    /* uPulse čte i fragment shader, kde je výchozí přesnost
       mediump. GLSL ES vyžaduje u sdíleného uniformu shodnou
       přesnost v obou shaderech — bez „mediump“ se program
       nesestaví (link error) a kříž se mlčky nevykreslí.   */
    "uniform mediump float uPulse;",
    "uniform mediump float uFlash, uSweep;",
    "varying vec3 vN, vP;",
    "varying vec2 vL;",
    "void main() {",
    "  vec3 p = aPos - vec3(" + CROSS[0].toFixed(3) + ", " + CROSS[1].toFixed(3) + ", " + CROSS[2].toFixed(3) + ");",
    /* dech: kříž se nadechne s hrudníkem */
    "  p *= 1.0 + uBreath * 0.030 + uPulse * 0.055;",
    /* otáčení kolem svislé osy */
    "  float c = cos(uSpin), s = sin(uSpin);",
    "  p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);",
    /* Podíl, ne délka. Prahy v fragment shaderu jsou
       bezrozměrné, takže se kříž smí zvětšit i zmenšit, aniž
       by ztratil barvu — přesně to se stalo, když se zmenšil
       z 0,50 na 0,34.                                       */
    /* Poloha, ne poloměr. Kdyby se `length()` počítal tady,
       interpoloval by se mezi vrcholy obrysu — a protože kříž
       má dvanáct rohů s velmi různým poloměrem (hrot ramene
       ×1, vnitřní roh ×0,5), rozběhly by se z jeho středu
       viditelné paprsky. Odmocnina patří do fragmentu.      */
    "  vL = p.xy / " + CROSS_ARM.toFixed(4) + ";",
    "  p += vec3(" + CROSS[0].toFixed(3) + ", " + CROSS[1].toFixed(3) + " + uRise, " + CROSS[2].toFixed(3) + ");",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  vP = mv.xyz;",
    "  vec3 n = aNrm;",
    "  n = vec3(n.x * c + n.z * s, n.y, -n.x * s + n.z * c);",
    "  vN = uNrm * n;",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uSkin, uTide, uGlow, uFog;",
    "uniform float uAlpha, uPulse, uFlash, uSweep;",
    "varying vec3 vN, vP;",
    "varying vec2 vL;",
    "void main() {",
    "  vec3 N = normalize(vN);",
    "  vec3 V = normalize(-vP);",
    "  if (!gl_FrontFacing) N = -N;",
    "  float vR = length(vL);",
    "  float vLY = vL.y;",
    /* DVĚ SVĚTLA, ne jedno. Kříž se pomalu natáčí; s jediným
       zdrojem zhasl pokaždé, když se odvrátil, a mezi dvěma
       polohami byl znatelně tmavší. Druhé, slabší světlo
       zprava zezadu drží spodní hranici jasu ve všech úhlech
       a přidá druhou hranu odlesku — přesně to dělá ateliér
       se skleněným předmětem.                              */
    "  vec3 L  = normalize(vec3(-0.42, 0.78, 0.62));",
    "  vec3 L2 = normalize(vec3( 0.66, 0.20, -0.30));",
    "  float ndl = max(dot(N, L) * 0.5 + 0.5, 0.0);",
    "  float fill = max(dot(N, L2) * 0.5 + 0.5, 0.0);",
    "  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.1);",
    "  vec3 H  = normalize(L + V);",
    "  vec3 H2 = normalize(L2 + V);",
    /* úzký hlavní odlesk + slabší protiodlesk — sklo, ne plast */
    "  float spec = pow(max(dot(N, H), 0.0), 78.0) * 0.55",
    "             + pow(max(dot(N, H2), 0.0), 42.0) * 0.18;",
    /* ZELENÉ SKLO, ne bílá deska se zeleným lemem. Dřív se
       jádro drželo u --skin až do poloviny ramene, takže na
       čelní ploše seděla velká mléčná skvrna. Teď je bílý jen
       úzký střed a zbytek je příliv; jas nese odlesk a hrana,
       ne plocha.                                            */
    /* SKLO, NE DESKA.
       Drive se plocha vyplnila prilivem a jas nesl odlesk.
       Zelena plocha o velikosti dlane se ale cte jako
       piktogram, ne jako predmet -- a presne to z krize delalo
       lekarenskou ceduli.

       Ted je uvnitr SVETLO. Jadro je skoro bile a odtud se
       barva prohlubuje k hranam, kde je skla nejvic -- presne
       jako v brousenem telese, kterym prosvita okno. Plocha
       tedy nese svetlo a barvu nese tloustka.               */
    "  float thick = smoothstep(0.10, 1.02, vR);",
    "  vec3 pale = mix(uSkin, uTide, 0.30);",
    "  vec3 core = mix(pale, uTide * 0.98, thick);",
    "  vec3 col = core * (0.84 + ndl * 0.28 + fill * 0.15);",
    /* KAUSTIKA. Svetlo, ktere projde brousenou hranou, se
       uvnitr sklada do uzkych pruhu. Dva pruhy podel ramen
       staci -- treti by z toho udelal ozdobu.               */
    "  float cx = exp(-vL.x * vL.x * 30.0);",
    "  float cy = exp(-vL.y * vL.y * 30.0);",
    "  col += vec3(0.86, 1.0, 0.93) * (cx * (1.0 - cy) + cy * (1.0 - cx)) * 0.26;",
    /* Hrana. U průhledného tělesa ji dělalo krytí; u plného ji
       musí udělat světlo — sytější příliv na obrysu a k tomu
       tenký světlý lem, který obtáhne tvar proti pozadí.     */
    "  col = mix(col, uTide * 0.80, fres * 0.44);",
    "  col += vec3(0.78, 0.92, 0.84) * pow(fres, 2.4) * 0.52;",
    /* Zář zevnitř: sytější u středu, kde je sklo nejtlustší. */
    "  col += uGlow * uPulse * (0.26 + (1.0 - smoothstep(0.0, 1.0, vR)) * 0.16);",
    /* PROBLIKNUTÍ. Není to zhasnutí a rozsvícení — je to pruh
       světla, který kříž projede odspoda nahoru. Oko čte pohyb
       světla po tělese jako materiál, kdežto rovnoměrné
       rozsvícení jako změnu barvy. Proto sweep, ne blik.   */
    /* Druhá mocnina násobením: pow(x, 2.0) je pro x < 0 podle
       specifikace GLSL nedefinovaná a na části ovladačů vrací
       nulu — pruh světla pak přeběhl jen horní půlku kříže. */
    "  float bd = (vLY - uSweep) * 3.4;",
    "  float band = exp(-bd * bd);",
    "  float edge = smoothstep(0.20, 1.05, vR);",
    "  col = mix(col, uGlow, clamp(uFlash * 0.60, 0.0, 0.72));",
    "  col += uGlow * band * uFlash * (0.55 + edge * 0.75);",
    "  col += vec3(0.90, 1.0, 0.94) * band * band * uFlash * 0.42;",
    "  col += vec3(spec);",
    "  float fog = clamp((-vP.z - 1.78) / 1.05, 0.0, 1.0);",
    "  col = mix(col, uFog, fog * 0.40);",
    "  gl_FragColor = vec4(col, uAlpha);",
    "}"
  ].join("\n"));

  /* ============================================================
     PROGRAM 7 — PRACH VE SVĚTLE

     Jediná věc, která z renderu udělá FOTOGRAFII, je vzduch.
     Dokud kolem tělesa nic není, dívá se člověk na model ve
     vakuu — čistý, ale mrtvý. Jakmile se mezi kamerou a modelem
     vznáší prach, který se v protisvětle rozsvítí, mozek přepne
     do režimu „tohle je záběr z místnosti“.

     Prach není náhodný šum. Má tři vrstvy hloubky (blízká je
     větší a rozostřená, daleká drobná a ostrá), stoupá o něco
     rychleji, než klesá — teplý vzduch nad tělem —, a při vlně
     uvolnění se na okamžik rozsvítí a odplaví od kosti křížové.
     Tím se stane součástí děje, ne tapetou.
     ============================================================ */
  var progMote = compile([
    "attribute vec3 aPos;",
    "attribute float aSeed;",
    "attribute float aDepth;",
    "uniform mat4 uProj, uView;",
    "uniform float uT, uSize, uRipR, uRipA, uIn;",
    "varying float vA, vSoft, vHot;",
    "void main() {",
    "  float sd = aSeed * 6.2831;",
    /* Tři nesouměřitelné periody na osu — dráha nikdy neopíše
       viditelný kruh a nikdy se nesejde do taktu.            */
    "  vec3 p = aPos;",
    "  p.x += sin(uT * 0.083 + sd) * 0.030 + sin(uT * 0.211 + sd * 2.3) * 0.010;",
    "  p.y += sin(uT * 0.061 + sd * 1.7) * 0.024 + fract(aSeed * 7.31 + uT * 0.0075) * 0.10 - 0.05;",
    "  p.z += sin(uT * 0.097 + sd * 3.1) * 0.026;",
    /* Vlna uvolnění prach odplaví — směrem OD kosti křížové. */
    "  vec3 d = p - vec3(0.0, 0.10, 0.0);",
    "  float dl = length(d) + 0.0001;",
    "  float rr = (dl - uRipR) * 3.0;",
    "  float hit = exp(-rr * rr) * uRipA;",
    "  p += d / dl * hit * 0.16;",
    "  vec4 mv = uView * vec4(p, 1.0);",
    "  gl_Position = uProj * mv;",
    "  float dist = -mv.z;",
    /* Blízké zrnko je větší a měkčí — náhrada hloubky ostrosti. */
    "  vSoft = clamp((1.62 - dist) * 1.7, 0.0, 1.0) * 0.85 + aDepth * 0.15;",
    "  vHot = hit * 2.2;",
    /* Třpyt: zrnko se natáčí a chytá světlo, nesvítí trvale. */
    "  float tw = 0.55 + 0.45 * sin(uT * (0.7 + aSeed * 1.3) + sd * 4.1);",
    "  vA = (0.10 + 0.34 * aDepth) * tw * uIn;",
    "  gl_PointSize = uSize * (0.55 + aDepth * 1.35) * (1.0 + vSoft * 1.5) * (1.0 + hit * 1.4);",
    "}"
  ].join("\n"), [
    "precision mediump float;",
    "uniform vec3 uBase, uGlow;",
    "varying float vA, vSoft, vHot;",
    "void main() {",
    "  vec2 q = gl_PointCoord - vec2(0.5);",
    "  float r = length(q) * 2.0;",
    "  if (r > 1.0) discard;",
    /* Rozostřené zrnko je celé měkké, ostré má jádro. */
    "  float core = pow(1.0 - r, mix(4.5, 1.35, vSoft));",
    "  vec3 c = mix(uBase, uGlow, clamp(vHot, 0.0, 0.9));",
    "  gl_FragColor = vec4(c, core * vA);",
    "}"
  ].join("\n"));

  /* ============================================================
     DOSVIT (bloom) — čtyři průchody přes plátno

     Scéna se nekreslí rovnou na obrazovku, ale do textury.
     Z ní se vytáhne to, co SVÍTÍ, rozmaže se to nadvakrát
     (vodorovně a svisle, v poloviční šířce) a přičte zpátky.

     Práh není luminance. Plocha webu je světlá a porcelán je
     skoro bílý — kdyby se prahovalo jasem, rozzářilo by se
     celé tělo a z figury by byla mlha. Prahují se dvě věci,
     které v téhle scéně opravdu svítí:

       1  ODLESKY — jen to, co přeteče přes bílou porcelánu
       2  ZELEŇ   — všechno, co je sytější v zeleném kanálu než
                    v ostatních; tedy nervy, mok, vlákno, kříž

     Díky tomu se rozzáří přesně to, co je v příběhu scény
     zdrojem světla, a porcelán zůstane porcelánem.
     ============================================================ */
  var QUAD_VS = [
    "attribute vec2 aQ;",
    "varying vec2 vUv;",
    "void main() { vUv = aQ * 0.5 + 0.5; gl_Position = vec4(aQ, 0.0, 1.0); }"
  ].join("\n");

  var progBright = compile(QUAD_VS, [
    "precision mediump float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uPx;",
    "varying vec2 vUv;",
    "void main() {",
    /* Čtyřnásobný odběr už tady = polovina rozmazání zdarma. */
    "  vec4 c = texture2D(uTex, vUv + vec2( uPx.x,  uPx.y));",
    "  c += texture2D(uTex, vUv + vec2(-uPx.x,  uPx.y));",
    "  c += texture2D(uTex, vUv + vec2( uPx.x, -uPx.y));",
    "  c += texture2D(uTex, vUv + vec2(-uPx.x, -uPx.y));",
    "  c *= 0.25;",
    "  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));",
    "  float hi = smoothstep(0.985, 1.16, luma);",
    /* Zeleň měřená proti oběma zbylým kanálům — bílá projde nulou. */
    "  float grn = max(0.0, c.g - max(c.r, c.b));",
    "  vec3 b = c.rgb * hi * 1.15 + vec3(0.42, 1.0, 0.74) * grn * grn * 3.6;",
    "  gl_FragColor = vec4(b, 1.0);",
    "}"
  ].join("\n"));

  var progBlur = compile(QUAD_VS, [
    "precision mediump float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uDir;",
    "varying vec2 vUv;",
    "void main() {",
    /* Devítistopý gauss složený z pěti lineárních odběrů. */
    "  vec3 s = texture2D(uTex, vUv).rgb * 0.2270;",
    "  s += texture2D(uTex, vUv + uDir * 1.3846).rgb * 0.3162;",
    "  s += texture2D(uTex, vUv - uDir * 1.3846).rgb * 0.3162;",
    "  s += texture2D(uTex, vUv + uDir * 3.2308).rgb * 0.0702;",
    "  s += texture2D(uTex, vUv - uDir * 3.2308).rgb * 0.0702;",
    "  gl_FragColor = vec4(s, 1.0);",
    "}"
  ].join("\n"));

  var progComp = compile(QUAD_VS, [
    "precision mediump float;",
    "uniform sampler2D uScene, uBloom;",
    "uniform float uAmt, uCa, uT;",
    "varying vec2 vUv;",
    "void main() {",
    "  vec4 s = texture2D(uScene, vUv);",
    /* Objektiv rozkládá barvu na okraji záběru. Posun je pod
       jeden pixel — nemá být vidět, má být cítit.            */
    "  vec2 off = (vUv - 0.5) * uCa;",
    "  float br = texture2D(uBloom, vUv + off).r;",
    "  float bg = texture2D(uBloom, vUv).g;",
    "  float bb = texture2D(uBloom, vUv - off).b;",
    "  vec3 bl = vec3(br, bg, bb) * uAmt;",
    /* Krytí roste jen tam, kde dosvit něco přinesl — jinak by
       se plátno zakalilo přes celou plochu.                  */
    "  float a = s.a + dot(bl, vec3(0.34)) * 0.85;",
    "  vec3 c = s.rgb + bl;",
    /* SVĚTLO VODY. Dvě pomalé, nesouměřitelné vlnoplochy přes
       celý záběr. Amplituda je 2,5 % jasu — pod prahem, kde
       by si toho někdo všiml jako efektu, a nad prahem, kde
       přestane být scéna nasvícená mrtvým světlem. Násobí se
       krytím, takže se plocha stránky nikdy nezakalí.       */
    "  float w1 = sin((vUv.x * 2.30 + vUv.y * 1.70) * 3.1 - uT * 0.150);",
    "  float w2 = sin((vUv.x * -1.40 + vUv.y * 2.60) * 4.3 + uT * 0.097);",
    "  float caust = (w1 * 0.5 + w2 * 0.5) * 0.5 + 0.5;",
    "  c *= 1.0 + (caust * caust - 0.33) * 0.052 * s.a;",
    "  gl_FragColor = vec4(c, min(a, 1.0));",
    "}"
  ].join("\n"));

  if (!progBone || !progDura || !progNerve || !progPoint || !progShell) { giveUp(); return; }

  /* ---------- cíle vykreslení -------------------------------- */
  var bloomOK = !!(progBright && progBlur && progComp);
  var quadBuf = null, rtScene = null, rtA = null, rtB = null, rtW = 0, rtH = 0;
  if (bloomOK) {
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  }

  function makeRT(w, h, depth) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var rb = null;
    if (depth) {
      rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    }
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) return null;
    return { fb: fb, tex: tex, rb: rb, w: w, h: h };
  }
  function dropRT(rt) {
    if (!rt) return;
    gl.deleteTexture(rt.tex);
    gl.deleteFramebuffer(rt.fb);
    if (rt.rb) gl.deleteRenderbuffer(rt.rb);
  }

  /* Cíle se přestavují jen při změně rozměru plátna. */
  function syncTargets(w, h) {
    if (!bloomOK) return false;
    if (rtScene && rtW === w && rtH === h) return true;
    dropRT(rtScene); dropRT(rtA); dropRT(rtB);
    rtScene = rtA = rtB = null;
    var hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
    rtScene = makeRT(w, h, true);
    rtA = makeRT(hw, hh, false);
    rtB = makeRT(hw, hh, false);
    if (!rtScene || !rtA || !rtB) { bloomOK = false; return false; }
    rtW = w; rtH = h;
    return true;
  }

  function fullscreen(prog, setup) {
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    var loc = prog.a.aQ;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    setup(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---------- sítě do bufferů -------------------------------- */
  var A;
  try { A = AM.build(); } catch (e) { giveUp(); return; }

  if ((A.bone.big || A.nerve.big) && !extUint) { giveUp(); return; }

  function buf(data, target) {
    var b = gl.createBuffer();
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
    gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }
  function makeGeom(m) {
    return {
      pos: buf(m.pos), nrm: buf(m.nrm), s: buf(m.s), exp: buf(m.exp),
      idx: buf(m.idx, gl.ELEMENT_ARRAY_BUFFER),
      count: m.count,
      type: m.big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT
    };
  }
  var gBone = makeGeom(A.bone);
  var gDura = makeGeom(A.dura);
  var gNerve = makeGeom(A.nerve);
  var gShell = makeGeom(A.shell);
  var gCross = A.cross ? makeGeom(A.cross) : null;
  var gLink  = A.link  ? makeGeom(A.link)  : null;
  var gFrame = makeGeom(A.frame);
  var gGirdle = makeGeom(A.girdle);

  var flowPos = new Float32Array(A.flowCount * 3);
  var flowS = new Float32Array(A.flowCount);
  var flowSeed = new Float32Array(A.flowCount);
  for (var i = 0; i < A.flowCount; i++) {
    flowPos[i * 3] = A.flow[i * 5];
    flowPos[i * 3 + 1] = A.flow[i * 5 + 1];
    flowPos[i * 3 + 2] = A.flow[i * 5 + 2];
    flowS[i] = A.flow[i * 5 + 3];
    flowSeed[i] = A.flow[i * 5 + 4];
  }
  var bFlowPos = buf(flowPos), bFlowS = buf(flowS), bFlowSeed = buf(flowSeed);

  var gangPos = new Float32Array(A.gangliaCount * 3);
  var gangS = new Float32Array(A.gangliaCount);
  var gangSeed = new Float32Array(A.gangliaCount);
  for (i = 0; i < A.gangliaCount; i++) {
    gangPos[i * 3] = A.ganglia[i * 4];
    gangPos[i * 3 + 1] = A.ganglia[i * 4 + 1];
    gangPos[i * 3 + 2] = A.ganglia[i * 4 + 2];
    gangS[i] = AM.sOf(A.ganglia[i * 4 + 1]);
    gangSeed[i] = i / A.gangliaCount;
  }
  var bGangPos = buf(gangPos), bGangS = buf(gangS), bGangSeed = buf(gangSeed);

  /* ---------- prach ve vzduchu -------------------------------
     Rozmístění je deterministické (týž generátor jako u moku),
     aby scéna vypadala na každém načtení stejně. Zrnka stojí
     ve VÁLCI kolem postavy, ne v kouli: mají zaplnit záběr,
     ne obalit model. Blízká vrstva (aDepth → 1) je hustší
     vpředu, aby přes tělo přeletělo pár velkých rozostřených
     bodů — přesně to dělá objektiv otevřený na clonu 1,4.  */
  var MOTES = 150;
  var motePos = new Float32Array(MOTES * 3);
  var moteSeed = new Float32Array(MOTES);
  var moteDepth = new Float32Array(MOTES);
  (function () {
    var s = 987654321;
    function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (var i = 0; i < MOTES; i++) {
      var a = r() * Math.PI * 2;
      var rad = 0.16 + Math.sqrt(r()) * 0.52;
      var near = r();
      motePos[i * 3]     = Math.cos(a) * rad;
      motePos[i * 3 + 1] = -0.10 + r() * 1.20;
      /* Vpřed od osy až o 0,42 — tam vzniká rozostřená vrstva. */
      motePos[i * 3 + 2] = Math.sin(a) * rad * 0.55 + (near - 0.35) * 0.46;
      moteSeed[i] = r();
      moteDepth[i] = 0.25 + r() * 0.75;
    }
  })();
  var bMotePos = buf(motePos), bMoteSeed = buf(moteSeed), bMoteDepth = buf(moteDepth);

  function bindAttr(prog, name, buffer, size) {
    var loc = prog.a[name];
    if (loc == null || loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  /* ---------- rozměry ---------------------------------------- */
  var W = 0, H = 0, dpr = 1, PW = 0, PH = 0;
  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    /* Na slabším stroji radši menší plátno než trhaný pohyb. */
    dpr = Math.min(window.devicePixelRatio || 1, quality < 2 ? 1.35 : 2);
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    W = r.width; H = r.height; PW = w; PH = h;
    gl.viewport(0, 0, w, h);
    return true;
  }

  /* ---------- stav scény ------------------------------------- */
  var proj = mat4(), view = mat4(), mvp = mat4();
  var nrm3 = new Float32Array(9);

  var t0 = performance.now();
  var T = 0;                  /* čas scény v sekundách */
  var reveal = 0;             /* 0 → 1,15 dokreslení   */
  var flowIn = 0;             /* náběh moku a nervů    */
  var wavePos = -0.25;
  var cycles = 0;
  var stillT = -1;            /* > 0 = běží still point */
  var pulseSent = false;
  var quality = 2;            /* 2 plná · 1 bez částic · 0 konec */
  var crossPulse = 0;         /* pomalá zář kříže při zastavení    */
  /* PROBLIKNUTÍ KŘÍŽE
     Dvě síly, jedna křivka. Silné probliknutí přijde v okamžiku,
     kdy se rytmus zastaví — to je ta věta, kterou scéna říká.
     Slabé doprovází každý průchod vlny, aby kříž nebyl mrtvý
     mezi zastaveními. Obálka má rychlý náběh a dlouhý dozvuk;
     symetrický blik vypadá jako kontrolka, ne jako světlo.  */
  var flashT = 99, flashAmp = 0, waveCycle = -1;

  /* KDY SE RYTMUS ZASTAVÍ.
     Dřív každý třetí průchod vlny, tedy poprvé zhruba ve
     čtyřicáté vteřině. Jenže still point je vrchol celé scény —
     vlákno, kříž, vlna uvolnění, předání pulzu stránce — a
     v hero sekci nikdo čtyřicet vteřin nesedí. Návštěvník tak
     nejlepší část nikdy neviděl.

     Teď se zastaví hned po PRVNÍM průchodu (≈ 14 s, tedy právě
     když dočte nadpis a perex) a pak každý druhý. Rozestup
     ≈ 27 s je dost dlouhý na to, aby to nebyla smyčka, a dost
     krátký na to, aby to člověk zažil.                       */
  function stillAt(c) { return c % 2 === 1; }

  /* PŘEDÁNÍ PULZU. Vlákno mezi hrudní kostí a křížem ožije jen
     při zastavení rytmu: objeví se, přeběhne po něm jiskra a
     zase zmizí. `linkHead` je poloha jiskry na dráze (0 = hrudní
     kost, 1 = kříž), `linkAmt` je krytí celého vlákna.        */
  var linkHead = -0.3, linkAmt = 0, linkFired = false;

  /* VLNA UVOLNĚNÍ — kulová, z kosti křížové. Poloměr v jednotkách
     scény, tedy zhruba „půlka postavy = 0,5“.                 */
  var RIP_ORIGIN = [0.0, 0.055, -0.015];
  var ripR = 0, ripAmt = 0;

  /* Světlo kříže dopadající na tělo. Sleduje `crossPulse`
     a probliknutí, ale s vlastním doběhem — odražené světlo
     nezhasne ve stejný okamžik jako zdroj.                    */
  var xAmt = 0;

  /* HALO KOLEM KŘÍŽE. Kreslí ho CSS, ne plátno: prstenec se má
     rozpínat i za hranu scény a v CSS to nic nestojí. JS mu jen
     každý snímek řekne, kde kříž právě je.                    */
  var haloEl = host.querySelector("[data-nerve-halo]");

  /* DLAŇ — poloha kurzoru v pixelech plátna. gl_FragCoord má
     počátek vlevo DOLE, proto se ypsilon obrací.              */
  var ptrPx = new Float32Array([-9999, -9999, 1]);
  var ptrAmt = 0, ptrWant = 0;

  /* jednorázová vyrovnávací pole, ať se v každém snímku
     nealokuje                                                 */
  var vXpos = new Float32Array(3);
  var vRip = new Float32Array(3);
  var vRipP = new Float32Array(2);

  /* Bod scény do souřadnic pohledu. `view` je po sloupcích,
     stejně jako ho čte uniformMatrix4fv.                      */
  function toView(out, x, y, z) {
    out[0] = view[0] * x + view[4] * y + view[8]  * z + view[12];
    out[1] = view[1] * x + view[5] * y + view[9]  * z + view[13];
    out[2] = view[2] * x + view[6] * y + view[10] * z + view[14];
    return out;
  }

  /* kurzor: parallax s dojezdem */
  var pxWant = 0, pyWant = 0, px = 0, py = 0;
  var pointerOn = !KJ.prefersCoarse();
  if (pointerOn) {
    window.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      pxWant = KJ.clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.5), -1, 1);
      pyWant = KJ.clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.6), -1, 1);
      /* Teplo dlaně. Souřadnice se počítají v pixelech plátna,
         protože v shaderu je čte gl_FragCoord — a ten má počátek
         vlevo DOLE, takže ypsilon jde obráceně.               */
      if (r.width && r.height) {
        ptrPx[0] = (e.clientX - r.left) * dpr;
        ptrPx[1] = (r.height - (e.clientY - r.top)) * dpr;
        ptrPx[2] = Math.max(1, r.height * dpr * 0.32);
        ptrWant = 1;
      }
    }, { passive: true });
    window.addEventListener("pointerleave", function () { pxWant = 0; pyWant = 0; ptrWant = 0; });
  }

  /* ---------- kreslení --------------------------------------- */
  function drawMesh(prog, g, extra) {
    gl.useProgram(prog.p);
    bindAttr(prog, "aPos", g.pos, 3);
    bindAttr(prog, "aNrm", g.nrm, 3);
    bindAttr(prog, "aS", g.s, 1);
    bindAttr(prog, "aExp", g.exp, 1);
    gl.uniformMatrix4fv(prog.u.uProj, false, proj);
    gl.uniformMatrix4fv(prog.u.uView, false, view);
    if (prog.u.uNrm) gl.uniformMatrix3fv(prog.u.uNrm, false, nrm3);
    extra(prog);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idx);
    gl.drawElements(gl.TRIANGLES, g.count, g.type, 0);
  }

  function drawPoints(prog, pos, s, seed, count, kind, size, base, glow) {
    gl.useProgram(prog.p);
    bindAttr(prog, "aPos", pos, 3);
    bindAttr(prog, "aS", s, 1);
    bindAttr(prog, "aSeed", seed, 1);
    gl.uniformMatrix4fv(prog.u.uProj, false, proj);
    gl.uniformMatrix4fv(prog.u.uView, false, view);
    gl.uniform1f(prog.u.uBreath, breath);
    gl.uniform1f(prog.u.uWave, wavePos);
    gl.uniform1f(prog.u.uReveal, reveal);
    gl.uniform1f(prog.u.uSize, size * dpr);
    gl.uniform1f(prog.u.uT, T);
    gl.uniform1f(prog.u.uKind, kind);
    gl.uniform3fv(prog.u.uBase, base);
    gl.uniform3fv(prog.u.uGlow, glow);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  var breath = 0;

  /* Odstíny světla. Sky je studený porcelán, ground teplý odraz
     prostěradla — právě ten rozdíl dělá povrch živý.          */
  var SKY    = new Float32Array([0.985, 0.990, 0.975]);
  var GROUND = new Float32Array([C_SAND[0] * 0.86, C_SAND[1] * 0.84, C_SAND[2] * 0.80]);
  var FRAMEGND = new Float32Array([C_SAND[0] * 0.60, C_SAND[1] * 0.60, C_SAND[2] * 0.58]);
  var KEY    = new Float32Array([1.0, 0.995, 0.965]);
  var INKV   = new Float32Array(C_INK3);
  /* Nosná kostra má měkčí obrys — jinak kreslí přes osu. */
  var FRAMEINK = new Float32Array([
    C_INK3[0] * 0.94 + 0.02, C_INK3[1] * 0.94 + 0.02, C_INK3[2] * 0.94 + 0.02]);
  /* O stopu chladnější a tmavší porcelán. Tímhle rozdílem — ne
     krytím — se hrudní koš odliší od kraniosakrální osy.     */
  var FRAMESKY = new Float32Array([0.770, 0.786, 0.756]);
  var FRAMEKEY = new Float32Array([0.806, 0.796, 0.750]);
  var FOGV   = new Float32Array([C_BG[0] * 0.99, C_BG[1] * 0.99, C_BG[2] * 0.985]);
  var GLOWV  = new Float32Array(C_WARM);
  var SOFTV  = new Float32Array(C_SOFT);
  var TIDEV  = new Float32Array(C_TIDE);
  var NBASE  = new Float32Array([C_TIDE[0] * 1.25, C_TIDE[1] * 1.12, C_TIDE[2] * 1.10]);
  /* Skořepina má o stopu teplejší tón než pozadí — jinak by
     splynula s plochou stránky a figura by zmizela.         */
  var SKIN   = new Float32Array([0.982, 0.985, 0.972]);
  var RIM    = new Float32Array([C_SOFT[0] * 0.72, C_SOFT[1] * 0.76, C_SOFT[2] * 0.74]);
  /* Prach je bílý s náznakem písku — je to světlo místnosti,
     ne barva značky. Zelený je jen ve chvíli, kdy jím projde
     vlna uvolnění.                                          */
  var MOTE   = new Float32Array([1.0, 0.995, 0.965]);

  /* Prstenec kolem kříže. Web Animations API, ne CSS třída:
     animace se musí dát spustit ZNOVU při každém zastavení
     a přehazování tříd si vynucuje reflow. Když ho prohlížeč
     neumí, prostě nebude — scéna na něm nestojí.            */
  function ring() {
    if (!haloEl || !haloEl.animate || quality < 2) return;
    try {
      haloEl.animate([
        { opacity: 0,   transform: "translate(-50%, -50%) scale(.18)" },
        { opacity: .9,  transform: "translate(-50%, -50%) scale(.55)", offset: .16 },
        { opacity: .34, transform: "translate(-50%, -50%) scale(1.02)", offset: .48 },
        { opacity: 0,   transform: "translate(-50%, -50%) scale(1.65)" }
      ], { duration: 2000, easing: "cubic-bezier(.22, 1, .36, 1)" });
    } catch (e) {}
  }

  var lastFrame = performance.now();
  var slowSince = 0, fpsAcc = 0, fpsN = 0;

  function frame(now) {
    var dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!resize()) return;

    /* --- strážce výkonu ------------------------------------- */
    if (dt > 0) {
      fpsAcc += 1 / dt; fpsN++;
      if (fpsN >= 30) {
        var fps = fpsAcc / fpsN;
        fpsAcc = 0; fpsN = 0;
        /* Dva stupně: nejdřív zhasnou částice, teprve když je
           to pořád málo, scéna se vypne. Práh je shovívavý —
           integrovaná grafika běžně jede 40–55 fps a to je
           pro tuhle scénu naprosto v pořádku.               */
        var floor = quality >= 2 ? 32 : 22;
        if (fps < floor) {
          if (!slowSince) slowSince = now;
          else if (now - slowSince > 2500) {
            quality--;
            slowSince = 0;
            if (quality <= 0) { giveUp(); stop(); return; }
          }
        } else slowSince = 0;
      }
    }

    T = (now - t0) / 1000;

    /* --- dokreslení a náběh ---------------------------------
       Vázané na hodiny, ne na snímky. Kdyby se sčítalo `dt`
       (které je navíc shora oříznuté), trvalo by dokreslení na
       slabším stroji desítky vteřin a návštěvník by viděl
       rozpadlou postavu. Děj scény nesmí záviset na fps.    */
    reveal = KJ.clamp((T - 0.30) / 1.75, 0, 1.15);
    flowIn = KJ.clamp((T - 1.90) / 1.10, 0, 1);

    /* --- dech: sdílený rytmus webu, 11 s -------------------- */
    /* Dech není sinus. Nádech je kratší než výdech, a mezi
       nimi je krátká pauza — proto se křivka ohne mocninou.  */
    var bph = (T / 11) % 1;
    breath = bph < 0.42
      ? Math.pow(Math.sin(bph / 0.42 * Math.PI * 0.5), 1.35)
      : Math.pow(Math.cos((bph - 0.42) / 0.58 * Math.PI * 0.5), 0.85);

    /* --- vlna a still point ---------------------------------
       Vlna běží od lebky ke kosti křížové. Každý třetí průchod
       se místo návratu zastaví: nervový systém dojde k závěru,
       že se nic nechystá, a povolí. Pulz se pak předá lince
       dechu u levého okraje stránky — jeden dech prochází
       celým webem, tohle je místo, kde vzniká.               */
    if (stillT >= 0) {
      stillT += dt;
      /* Pořadí je děj, ne náhoda: vlna dojede ke kosti křížové →
         tělo se zastaví → po vlákně přeběhne světlo ke kříži →
         kříž se rozsvítí → a teprve TEHDY se pulz předá lince
         dechu u levého okraje stránky. Jeden dech prochází celým
         webem a tohle je místo, kde vzniká.                    */
      if (!pulseSent && stillT > 1.05) {
        pulseSent = true;
        try { window.dispatchEvent(new CustomEvent("kj:pulse")); } catch (e) {}
      }
      if (stillT > 2.1) { stillT = -1; wavePos = -0.25; }
    } else {
      var speed = 1 / 11;
      /* PRVNÍ VLNA JE RYCHLEJŠÍ. Ne z netrpělivosti — z pořadí:
         než se vlna poprvé dostane ke kosti křížové, má už být
         dočtený nadpis a perex. Zrychluje se jen úsek nad
         zpomalením, takže „nádech před zastavením“ zůstane
         přesně takový, jaký byl.                              */
      if (cycles === 0 && wavePos < 0.72) speed *= 2.2;
      /* před zastavením se vlna zpomalí — rytmus se prodlouží.
         Bylo 0,42; při té hodnotě trvalo samotné zpomalení
         8,5 s, tedy víc než celý zbytek průchodu, a scéna
         v té části působila, že se zasekla.                   */
      if (stillAt(cycles + 1) && wavePos > 0.72) speed *= 0.62;
      wavePos += dt * speed * 1.35;
      if (wavePos > 1.16) {
        cycles++;
        if (stillAt(cycles)) { stillT = 0; pulseSent = false; wavePos = 1.02; }
        else wavePos = -0.25;
      }
    }

    /* --- předání pulzu po vlákně ----------------------------
       Jiskra vyjde od hrudní kosti krátce po zastavení a doletí
       ke kříži za 0,62 s. Teprve její dopad kříž rozsvítí —
       proto se probliknutí spouští tady, ne v okamžiku
       zastavení. Rozdíl je slyšet: světlo někam DOŠLO.       */
    if (stillT >= 0) {
      linkHead = -0.18 + KJ.clamp((stillT - 0.10) / 0.62, 0, 1.25) * 1.34;
      linkAmt = KJ.clamp((stillT - 0.06) / 0.20, 0, 1)
              * (1 - KJ.clamp((stillT - 1.05) / 0.45, 0, 1));
      if (!linkFired && stillT > 0.70) {
        linkFired = true;
        flashT = 0; flashAmp = 1;
        ring();
      }
      /* Kulová vlna uvolnění vychází z kosti křížové ve chvíli,
         kdy kříž vzplane, a projede tělem během 1,1 s.        */
      var rt = KJ.clamp((stillT - 0.68) / 1.10, 0, 1);
      ripR = rt * 1.55;
      ripAmt = Math.sin(rt * Math.PI) * 0.30;
    } else {
      linkAmt += (0 - linkAmt) * Math.min(1, dt * 5);
      linkFired = false;
      ripAmt += (0 - ripAmt) * Math.min(1, dt * 4);
    }

    /* --- kříž: rozsvítí se, když se rytmus zastaví ---------
       Pulz nenaskočí ani nezhasne skokem — nabíhá a dohasíná,
       jinak by to bylo blikátko, ne dech.                  */
    var wantPulse = stillT >= 0 ? 1 : (wavePos > 0.86 ? 0.30 : 0);
    crossPulse += (wantPulse - crossPulse) * Math.min(1, dt * 2.2);

    /* TEP. Kříž nesmí být mezi zastaveními mrtvý předmět, ale
       nesmí ani blikat jako kontrolka. Proto dvojitý úder —
       silný a hned za ním slabší, jako srdce — každých 4,4 s.
       Obálka je ostrá na náběhu a pomalá na doznění.        */
    var bp = (T / 4.4) % 1;
    function thump(x, w) {
      if (x < 0) return 0;
      var e = x / w;
      return e > 6 ? 0 : (1 - Math.exp(-e * 7.0)) * Math.exp(-e);
    }
    var beat = thump(bp, 0.070) * 0.85 + thump(bp - 0.135, 0.085) * 0.42;

    /* Slabé probliknutí doprovází každý průchod vlny, aby kříž
       nebyl mezi zastaveními mrtvý předmět. Silné spouští až
       dopad jiskry po vlákně (viz výše).                      */
    if (cycles !== waveCycle && wavePos > 0.5 && stillT < 0) {
      waveCycle = cycles; flashT = 0; flashAmp = 0.42;
    }
    flashT += dt;
    /* náběh 90 ms, dozvuk 1,7 s */
    var flash = flashT < 2.4
      ? flashAmp * (1 - Math.exp(-flashT / 0.09)) * Math.exp(-flashT / 0.62)
      : 0;
    /* pruh světla stoupá od paty kříže k vrcholu a kus za něj */
    var sweep = -1.5 + KJ.clamp(flashT / 0.72, 0, 1.35) * 2.6;

    /* --- kamera ---------------------------------------------
       Pomalé otáčení, do kterého se přimíchá kurzor. Postava
       se nikdy nezastaví na plocho — pořád je vidět, že je to
       těleso, ne obrázek.                                    */
    px += (pxWant - px) * Math.min(1, dt * 2.6);
    py += (pyWant - py) * Math.min(1, dt * 2.6);
    /* Postava se nesmí kývat jako výloha. Do pomalého otáčení
       se proto míchají tři nesouměřitelné periody — pohyb pak
       nemá slyšitelný takt a působí jako dýchající těleso,
       ne jako animace ve smyčce.                           */
    var idle = Math.sin(T * 0.115) * 0.170
             + Math.sin(T * 0.047) * 0.072
             + Math.sin(T * 0.213 + 1.7) * 0.026;
    var ry = idle + px * 0.22;
    var rx = Math.sin(T * 0.083) * 0.034
           + Math.sin(T * 0.151 + 0.6) * 0.012
           + py * 0.058;
    /* při still pointu se otáčení skoro zastaví */
    if (stillT >= 0) {
      var q = Math.min(1, stillT / 0.5);
      ry = ry * (1 - q * 0.85);
      rx = rx * (1 - q * 0.85);
    }

    /* NÁJEZD. Scéna nezačíná tam, kde skončí: kamera je na
       začátku o kus dál a natočená doprava, a během 3,6 s se
       usadí. Dokreslení postavy od temene běží pod tím —
       divák tedy nevidí „obrázek, který se objevil“, ale
       záběr, který se ustavil. Doběh je krychlový, takže
       poslední vteřina je skoro nehybná a přechod do klidného
       kolébání není znát.

       Vzdálenost se smí zvětšit, ne zmenšit: rám záběru
       (viz DIST nahoře) je spočítaný na to, aby se postava
       právě vešla. Dál = menší, tedy vždy bezpečně.          */
    var intro = KJ.clamp((T - 0.10) / 3.60, 0, 1);
    var ie = 1 - Math.pow(1 - intro, 3);
    /* DECH V OSE OBJEKTIVU.
       Kamera se s postavou nepatrně přiblíží a oddálí — 0,9 %
       vzdálenosti, tedy asi šest pixelů na měřítku scény.
       Vidět to není; cítit ano. Je to rozdíl mezi „model se
       hýbe“ a „dívám se na něco živého“. Fáze je opačná než
       u hrudníku: když se tělo rozpíná, záběr se otevírá.  */
    var dist = DIST * (1 + (0.5 - breath) * 0.018) + (1 - ie) * 0.46;
    ry += (1 - ie) * 0.30;
    rx += (1 - ie) * 0.05;

    var aspect = W / H;
    perspective(proj, FOV, aspect, 0.1, 12);
    /* Pozor na pořadí: viewOf odečítá otočný bod, takže střed
       záběru se musí předat jako PIVOT_Y − CENTER_Y. Bez toho
       je záběr o 0,45 výš a postavě chybí spodek.           */
    viewOf(view, rx, ry, PIVOT_Y - CENTER_Y, -dist);
    normalOf(nrm3, view);

    /* --- odvozená světla ------------------------------------
       Kříž i kost křížová se do shaderu předávají v souřadnicích
       POHLEDU, protože normály tam už jsou. Kdyby se posílaly
       ve scéně, muselo by se ve fragmentu otáčet zpátky.     */
    var crossRise = Math.sin(T * 0.34) * 0.015 + Math.sin(T * 0.13) * 0.006;
    toView(vXpos, CROSS[0], CROSS[1] + crossRise, CROSS[2]);
    toView(vRip, RIP_ORIGIN[0], RIP_ORIGIN[1], RIP_ORIGIN[2]);
    vRipP[0] = ripR;
    vRipP[1] = ripAmt;

    /* Odražené světlo kříže. Dohání zdroj, ale doznívá pomaleji —
       odraz nezhasne ve stejný okamžik jako lampa.            */
    var xWant = 0.10 + crossPulse * 0.34 + flash * 0.52;
    xAmt += (xWant - xAmt) * Math.min(1, dt * 3.4);

    ptrAmt += (ptrWant - ptrAmt) * Math.min(1, dt * 3.0);

    /* --- co o scéně ví CSS ----------------------------------
       Světelné pole pod postavou a haló kolem kříže kreslí
       stylopis, ne plátno. Dostane dvě čísla: jak moc scéna
       právě svítí a kde na plátně kříž stojí.                */
    host.style.setProperty("--nerve-bloom",
      (KJ.clamp(crossPulse * 0.55 + flash * 0.75 + ripAmt * 1.2, 0, 1)).toFixed(3));
    if (haloEl) {
      var cw = proj[0] * vXpos[0];
      var chh = proj[5] * vXpos[1];
      var cww = -vXpos[2];
      if (cww > 0.05) {
        haloEl.style.setProperty("--halo-x", (50 + (cw / cww) * 50).toFixed(2) + "%");
        haloEl.style.setProperty("--halo-y", (50 - (chh / cww) * 50).toFixed(2) + "%");
      }
    }

    /* světlo pod kůží jde s postavou */
    host.style.setProperty("--nerve-shift", (ry * -46).toFixed(1) + "px");

    /* --- kreslení ------------------------------------------- */
    /* Scéna jde do textury, ne na obrazovku — z ní se pak
       vytáhne dosvit. Když se cíl nepodaří založit (starý
       ovladač, málo paměti), kreslí se rovnou a scéna přijde
       jen o zář. Obsah má přednost před efektem.            */
    var post = quality >= 2 && bloomOK && syncTargets(PW, PH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? rtScene.fb : null);
    gl.viewport(0, 0, PW, PH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    var dim = stillT >= 0 ? 1.25 : 1;

    /* Tři světla, která má společná kost i porcelán. Váha `k`
       je tam kvůli skořepině: kreslí se nadvakrát (odvrácená
       a přivrácená stěna), takže by jinak dostala všechno
       dvojmo.                                                */
    function lights(p, k) {
      gl.uniform3fv(p.u.uXpos, vXpos);
      gl.uniform1f(p.u.uXamt, xAmt * k);
      gl.uniform3fv(p.u.uRip, vRip);
      gl.uniform2f(p.u.uRipP, vRipP[0], vRipP[1] * k);
      gl.uniform3fv(p.u.uPtr, ptrPx);
      gl.uniform1f(p.u.uPtrAmt, ptrAmt * 0.22 * k);
    }

    /* 1 · kost — neprůhledná, zapisuje hloubku */
    gl.depthMask(true);
    drawMesh(progBone, gBone, function (p) {
      gl.uniform1f(p.u.uBreath, breath);
      gl.uniform1f(p.u.uWave, wavePos);
      gl.uniform1f(p.u.uReveal, reveal);
      gl.uniform1f(p.u.uDim, dim);
      gl.uniform1f(p.u.uAlpha, 1);
      gl.uniform3fv(p.u.uSky, SKY);
      gl.uniform3fv(p.u.uGround, GROUND);
      gl.uniform3fv(p.u.uKeyCol, KEY);
      gl.uniform3fv(p.u.uInk, INKV);
      gl.uniform3fv(p.u.uFog, FOGV);
      gl.uniform3fv(p.u.uGlow, GLOWV);
      lights(p, 1);
    });

    /* 2 · HRUDNÍ KOŠ, PÁNEV, LOPATKY.
       Dřív se kreslily s krytím 0,34 a vypnutým zápisem
       hloubky. Průsvitná žebra se navzájem prosvítala a z koše
       zbyla změť tenkých obloučků — odtud ten dojem pavoučích
       nohou. Teď je vrstva NEPRŮHLEDNÁ a hloubku zapisuje:
       přední žebro zakryje zadní, koš dostane objem a vejde se
       do něj stín. Že je to druhá struktura a ne osa, se pozná
       tónem — o stopu chladnějším a tmavším —, ne krytím.   */
    drawMesh(progBone, gFrame, function (p) {
      gl.uniform1f(p.u.uBreath, breath);
      gl.uniform1f(p.u.uWave, wavePos);
      gl.uniform1f(p.u.uReveal, reveal);
      gl.uniform1f(p.u.uDim, dim * 0.62);
      gl.uniform1f(p.u.uAlpha, 1);
      gl.uniform3fv(p.u.uSky, FRAMESKY);
      gl.uniform3fv(p.u.uGround, FRAMEGND);
      gl.uniform3fv(p.u.uKeyCol, FRAMEKEY);
      gl.uniform3fv(p.u.uInk, FRAMEINK);
      gl.uniform3fv(p.u.uFog, FOGV);
      gl.uniform3fv(p.u.uGlow, GLOWV);
      lights(p, 0.7);
    });

    /* 2b · PÁNEV — jen ukotvení dolního konce osy, ne stavba.
       Zůstává průsvitná a hloubku nezapisuje: kdyby byla plná
       jako koš, dvě velké lopaty by v dolní třetině přebily
       kost křížovou, kvůli které tam vůbec jsou.             */
    gl.depthMask(false);
    drawMesh(progBone, gGirdle, function (p) {
      gl.uniform1f(p.u.uBreath, breath);
      gl.uniform1f(p.u.uWave, wavePos);
      gl.uniform1f(p.u.uReveal, reveal);
      gl.uniform1f(p.u.uDim, dim * 0.4);
      gl.uniform1f(p.u.uAlpha, 0.34);
      gl.uniform3fv(p.u.uSky, FRAMESKY);
      gl.uniform3fv(p.u.uGround, FRAMEGND);
      gl.uniform3fv(p.u.uKeyCol, FRAMEKEY);
      gl.uniform3fv(p.u.uInk, FRAMEINK);
      gl.uniform3fv(p.u.uFog, FOGV);
      gl.uniform3fv(p.u.uGlow, GLOWV);
      lights(p, 0.5);
    });
    gl.depthMask(true);

    /* 3 · nervy — tenké, ale hmotné */
    drawMesh(progNerve, gNerve, function (p) {
      gl.uniform1f(p.u.uBreath, breath);
      gl.uniform1f(p.u.uWave, wavePos);
      gl.uniform1f(p.u.uReveal, reveal);
      gl.uniform1f(p.u.uDim, dim);
      gl.uniform1f(p.u.uAlpha, (0.46 + 0.36 * flowIn));
      gl.uniform3fv(p.u.uBase, NBASE);
      gl.uniform3fv(p.u.uGlow, GLOWV);
      gl.uniform3fv(p.u.uInk, INKV);
      gl.uniform3fv(p.u.uFog, FOGV);
    });

    /* 4 · durální tubus — sklo, hloubku čte, ale nezapisuje */
    gl.depthMask(false);
    drawMesh(progDura, gDura, function (p) {
      gl.uniform1f(p.u.uBreath, breath);
      gl.uniform1f(p.u.uWave, wavePos);
      gl.uniform1f(p.u.uReveal, reveal);
      gl.uniform1f(p.u.uDim, dim);
      gl.uniform1f(p.u.uFlow, 0.35 + 0.65 * flowIn);
      gl.uniform3fv(p.u.uSoft, SOFTV);
      gl.uniform3fv(p.u.uTide, TIDEV);
      gl.uniform3fv(p.u.uGlow, GLOWV);
    });

    /* 5 · ganglia a mok */
    if (quality >= 2 && flowIn > 0.02) {
      drawPoints(progPoint, bFlowPos, bFlowS, bFlowSeed, A.flowCount, 0,
        2.6 + breath * 0.5, SOFTV, GLOWV);
    }
    if (flowIn > 0.02) {
      drawPoints(progPoint, bGangPos, bGangS, bGangSeed, A.gangliaCount, 1,
        3.4, TIDEV, GLOWV);
    }

    /* 6 · porcelánová skořepina — přes všechno ostatní.
       Nejdřív odvrácená stěna, pak přivrácená: sklo má dvě
       stěny a bez té zadní vypadá jako nálepka.            */
    function shellPass(face, alpha) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(face);
      drawMesh(progShell, gShell, function (p) {
        gl.uniform1f(p.u.uBreath, breath);
        gl.uniform1f(p.u.uWave, wavePos);
        gl.uniform1f(p.u.uReveal, reveal);
        gl.uniform1f(p.u.uDim, dim);
        gl.uniform1f(p.u.uAlpha, alpha);
        gl.uniform1f(p.u.uFace, face === gl.BACK ? 1 : 0.25);
        gl.uniform3fv(p.u.uSkin, SKIN);
        gl.uniform3fv(p.u.uRim, RIM);
        gl.uniform3fv(p.u.uGlow, GLOWV);
        gl.uniform3fv(p.u.uFog, FOGV);
        lights(p, face === gl.BACK ? 0.62 : 0.30);
      });
      gl.disable(gl.CULL_FACE);
    }
    /* Odvrácená stěna je nejdražší vrstva scény — kreslí se přes
       celou siluetu podruhé. Na slabším stroji padá jako první;
       teprve když ani to nestačí, scéna se vzdá celá. Bez ní má
       porcelán o něco tenčí obrys, ale postava zůstane.      */
    if (quality >= 2) shellPass(gl.FRONT, 0.55);
    shellPass(gl.BACK, 1.0);

    /* 6b · VLÁKNO SVĚTLA — hrudní kost → kříž.
       Kreslí se BEZ hloubkového testu, tedy přes porcelán.
       Fyzikálně to je jednoduchý podvod, opticky je to přesně
       to, co má být vidět: světlo, které jde skrz. Kdyby se
       testovalo, půlka dráhy by se schovala do hrudníku
       a z předání by zbyl konec.                            */
    if (gLink && progNerve && linkAmt > 0.004) {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      drawMesh(progNerve, gLink, function (p) {
        gl.uniform1f(p.u.uBreath, 0);
        gl.uniform1f(p.u.uWave, linkHead);
        gl.uniform1f(p.u.uReveal, 3);      /* nic se neodkrývá — je celé */
        gl.uniform1f(p.u.uDim, 1.7);
        gl.uniform1f(p.u.uAlpha, linkAmt * 0.85);
        gl.uniform3fv(p.u.uBase, SOFTV);
        gl.uniform3fv(p.u.uGlow, GLOWV);
        gl.uniform3fv(p.u.uInk, SOFTV);    /* vlákno nemá mít inkoustový obrys */
        gl.uniform3fv(p.u.uFog, FOGV);
      });
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
    }

    /* 7 · KŘÍŽ — symbol uzdravení vedle postavy.
       Naběhne až po ní: nejdřív tělo, teprve pak znamení.  */
    if (gCross && progCross) {
      var cIn = KJ.clamp((T - 2.4) / 1.4, 0, 1);
      if (cIn > 0.01) {
        gl.depthMask(true);
        /* KŘÍŽ SE KRESLÍ NEPRŮHLEDNĚ a s ořezem odvrácených
           ploch. Dřív byl průsvitný a kreslil se na jeden zátah
           bez řazení trojúhelníků, takže se přes čelní plochu
           prosvítala jeho vlastní zadní stěna i vnitřek fazety.
           Na renderu z toho byla hvězda paprsků vybíhajících ze
           středu — vypadalo to jako vada plochy, ne jako sklo.
           Objem teď nese světlo a fazeta, ne průhlednost.    */
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        drawMesh(progCross, gCross, function (p) {
          /* Kříž se neotáčí, jen se houpe. Otáčející se symbol
             je logo na hlavní stránce autobazaru; tenhle má
             stát vedle postavy a dýchat s ní. Dvě nesouměřitelné
             periody, dohromady ±17°.                          */
          /* Kříž se neotáčí, jen se houpe — otáčející se symbol
             je logo na hlavní stránce autobazaru. Tempo je ale
             pomalejší než dřív (0,21 → 0,138) a rozkyv menší
             (±17° → ±13°): zavěšené sklo se v klidné místnosti
             sotva pohne. Rychlejší kýv působil jako výloha.  */
          gl.uniform1f(p.u.uSpin,
            Math.sin(T * 0.138) * 0.180 + Math.sin(T * 0.061 + 1.1) * 0.052 + px * 0.34);
          gl.uniform1f(p.u.uBreath, breath);
          gl.uniform1f(p.u.uPulse, crossPulse + beat * 0.55);
          gl.uniform1f(p.u.uFlash, flash);
          gl.uniform1f(p.u.uSweep, sweep);
          gl.uniform1f(p.u.uRise, Math.sin(T * 0.34) * 0.015 + Math.sin(T * 0.13) * 0.006);
          gl.uniform1f(p.u.uAlpha, cIn * (1 - cIn * 0.0));
          gl.uniform3fv(p.u.uSkin, SKIN);
          gl.uniform3fv(p.u.uTide, TIDEV);
          gl.uniform3fv(p.u.uGlow, GLOWV);
          gl.uniform3fv(p.u.uFog, FOGV);
        });
        gl.disable(gl.CULL_FACE);
      }
    }

    /* 8 · PRACH. Až úplně nakonec: zrnka jsou v místnosti,
       tedy před vším i za vším. Hloubku čtou (za žebrem se
       schovají), ale nezapisují — jinak by si navzájem
       vyřezávala čtverečky.                                */
    if (progMote && quality >= 2) {
      gl.depthMask(false);
      gl.useProgram(progMote.p);
      bindAttr(progMote, "aPos", bMotePos, 3);
      bindAttr(progMote, "aSeed", bMoteSeed, 1);
      bindAttr(progMote, "aDepth", bMoteDepth, 1);
      gl.uniformMatrix4fv(progMote.u.uProj, false, proj);
      gl.uniformMatrix4fv(progMote.u.uView, false, view);
      gl.uniform1f(progMote.u.uT, T);
      gl.uniform1f(progMote.u.uSize, 3.1 * dpr);
      gl.uniform1f(progMote.u.uRipR, ripR);
      gl.uniform1f(progMote.u.uRipA, ripAmt * 3.2);
      /* Vzduch se objeví až po postavě — nejdřív model, pak
         místnost, ve které stojí.                          */
      gl.uniform1f(progMote.u.uIn, KJ.clamp((T - 1.6) / 2.6, 0, 1));
      gl.uniform3fv(progMote.u.uBase, MOTE);
      gl.uniform3fv(progMote.u.uGlow, SOFTV);
      gl.drawArrays(gl.POINTS, 0, MOTES);
      gl.depthMask(true);
    }

    gl.depthMask(true);

    /* --- dosvit ---------------------------------------------
       Tři průchody v poloviční šířce: výtah světla, rozmazání
       vodorovně, rozmazání svisle. Čtvrtý průchod skládá scénu
       a dosvit na obrazovku — a je to jediné místo, kde se
       kreslí do plátna, které vidí stránka.                 */
    if (post) {
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, rtA.fb);
      gl.viewport(0, 0, rtA.w, rtA.h);
      fullscreen(progBright, function (p) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rtScene.tex);
        gl.uniform1i(p.u.uTex, 0);
        gl.uniform2f(p.u.uPx, 0.5 / rtScene.w, 0.5 / rtScene.h);
      });

      gl.bindFramebuffer(gl.FRAMEBUFFER, rtB.fb);
      fullscreen(progBlur, function (p) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rtA.tex);
        gl.uniform1i(p.u.uTex, 0);
        gl.uniform2f(p.u.uDir, 1 / rtA.w, 0);
      });

      gl.bindFramebuffer(gl.FRAMEBUFFER, rtA.fb);
      fullscreen(progBlur, function (p) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rtB.tex);
        gl.uniform1i(p.u.uTex, 0);
        gl.uniform2f(p.u.uDir, 0, 1 / rtB.h);
      });

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, PW, PH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      fullscreen(progComp, function (p) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rtScene.tex);
        gl.uniform1i(p.u.uScene, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, rtA.tex);
        gl.uniform1i(p.u.uBloom, 1);
        /* Zář sílí s dějem: v klidu jemná, při zastavení rytmu
           a probliknutí kříže naplno. Scéna tím „nadechne“
           světlem, ne jen tvarem.                            */
        gl.uniform1f(p.u.uAmt, 0.50 + crossPulse * 0.34 + flash * 0.48 + ripAmt * 0.8);
        gl.uniform1f(p.u.uCa, 0.0022);
        gl.uniform1f(p.u.uT, T);
        gl.activeTexture(gl.TEXTURE0);
      });

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
    }

    if (host.dataset.mode !== "live" && reveal > 0.12) {
      host.dataset.mode = "live";
      /* Scéna běží — kreslená verze se už neukáže a pojistka
         z <head> nemá co hlídat.                             */
      if (window.__kjNerveGuard) { clearTimeout(window.__kjNerveGuard); window.__kjNerveGuard = 0; }
    }
  }

  /* ---------- běh -------------------------------------------- */
  var stopTicker = null;
  function stop() { if (stopTicker) { stopTicker(); stopTicker = null; } }

  KJ.visibilityGate(host, function () {
    if (!stopTicker && quality > 0) {
      lastFrame = performance.now();
      stopTicker = KJ.addTicker(frame);
    }
  }, stop);

  /* První snímek hned — než scroll cokoli spustí, ať už je
     na temeni vidět bod světla.                              */
  requestAnimationFrame(function (x) { lastFrame = x; frame(x); });

  window.addEventListener("resize", KJ.debounce(function () { resize(); }, 120), { passive: true });
})();
