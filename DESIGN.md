# DESIGN.md — art direction

## 1. Koncept jednou větou

> **Porcelánová místnost, kterou prochází jeden dech** — světlý, skoro prázdný
> prostor, do kterého je vidět dovnitř těla, a jediná živá linka, která spojí
> úvod s patičkou a nese celý web na jednom rytmu.

Tři přívlastky, o které jde: **klidné · přesné · živé.**
Tři, kterým se web vyhýbá: **knižní · klinické · wellness‑esoterické.**

### Odkud je vzhled odvozený (a proč nevypadá jako AI default)

Nic v tomto webu nepochází z nálady „hezký minimalistický web“. Každé
rozhodnutí má fyzický zdroj v předmětu:

| Prvek webu | Fyzický zdroj |
|---|---|
| plocha `--bg` — porcelán se zeleno‑šedým spodkem | bavlněné prostěradlo na lehátku v denním světle, ne papír |
| bílé panely „plovoucí“ na ploše, spojené vlasovou linkou | membrána — tvrdá plena, pod kterou je tekutina |
| hover = **příliv zdola**, nikdy zvednutí a stín | tekutina stoupá, nezvedá se |
| radius 4 px | tkáň nemá ostré hrany, ale ani není bublina |
| mono jen u čísel, drobně, u okraje | zápis měřené hodnoty (5 g, 9 cyklů/min) |
| jediná sytá barva `--tide` | zelená mělčina — barva vody nad pískem, ne barva „značky“ |
| filmové zrno 2,8 % | světlo procházející kůží není hladké |
| **linka dechu** | primární respirace ≈ 9 cyklů/min |

---

## 2. Paleta

### Povrchy

| Token | Hex | Role | Podíl plochy |
|---|---|---|---|
| `--bg` | `#F2F3EF` | porcelán, základní plocha | ~65 % |
| `--surface` | `#FFFFFF` | panely, které mají „dýchnout“ | ~20 % |
| `--surface-2` | `#E9ECE5` | klidová mělčina, sekční předěly | ~10 % |
| `--sand` | `#EDE7DC` | **teplý protipól — vyhrazen jedinému účelu: plochám, kde jde o člověka** | < 5 % |

> **Vlastní pravidlo nad rámec zadání:** `--sand` není dekorace. Je to jediné
> místo, kde je web teplý — a je teplý přesně tam, kde je na něm člověk
> (sekce „Kdo se vás dotýká“ na úvodu, hero stránky *O mně*). Když čtenář dojde
> k pískové ploše, ví bez čtení, že už nejde o metodu, ale o Katku. Tím se
> z barvy stává informace.

### Inkoust

| Token | Hex | Role | Kontrast na `--bg` |
|---|---|---|---|
| `--ink` | `#101C18` | nadpisy, hlavní text | **15,68** AAA |
| `--ink-2` | `#3C4944` | dlouhé odstavce | **8,45** AAA |
| `--ink-3` | `#66716B` | popisky nesoucí informaci | **4,55** AA |
| `--ink-4` | `#97A099` | **pouze dekorace, nikdy text** | 2,41 ✗ |
| `--line` | `#DCDFD7` | optické předěly | 1,21 (dekorace) |
| `--line-strong` | `#C6CBBF` | rámy panelů | 1,48 (dekorace) |
| `--line-ui` | `#7E877A` | **hranice ovládacích prvků** | **3,34** ✓ WCAG 1.4.11 |

> `--line-ui` je **doplněk nad rámec zadané palety.** Důvod: `--line`
> a `--line-strong` mají na `--bg` poměr 1,21 a 1,48. To je v pořádku pro
> optický předěl, ale WCAG 1.4.11 vyžaduje ≥ 3 : 1 pro hranici ovládacího
> prvku (posuvník, přepínač, dlaždice sebe‑testu). Bez tohoto tokenu by
> moduly neprošly AA.

### Akce

| Token | Hex | Role | Kontrast |
|---|---|---|---|
| `--tide` | `#0E6B54` | CTA, aktivní stavy, linka dechu | bílý text na ní **6,46** AA · jako text na `--bg` **5,80** AA |
| `--tide-deep` | `#0A5442` | hover | bílý text **8,90** AAA |
| `--tide-soft` | `#CFE6DA` | výplně, podklad chipů | `--ink` na ní **13,31** AAA · `--tide` na ní **4,92** AA |

### Barevný klíč sedmi témat

| Téma | Hex | Na `--bg` | Na `--surface` |
|---|---|---|---|
| migréna a bolesti hlavy | `#2F6E8F` | 5,03 AA | 5,60 AA |
| stres, vyčerpání, burnout | `#9A5B2E` | 4,82 AA | 5,37 AA |
| menopauza a přechod | `#7A4B6E` | 6,16 AA | 6,86 AA |
| **období po porodu** | **`#4E6E42`** | **5,19 AA** | 5,78 AA |
| chronické bolesti zad | `#1E6455` | 6,26 AA | 6,98 AA |
| úzkost a SE | `#4E5490` | 6,29 AA | 7,01 AA |
| individuální potíže | `#5E6A64` | 5,06 AA | 5,64 AA |

> **Odchylka od zadání:** „období po porodu“ bylo `#56794A`. Na `--bg` má poměr
> **4,45**, tedy o vlásek pod AA. Ztmaveno na `#4E6E42` (**5,19**). Odstín
> zůstal, jen o dva kroky hlouběji — v sedmičce vedle sebe je rozdíl
> neviditelný, ale barva teď smí nést text. Tím **všech sedm** témat prochází
> AA jako text, což zadání připouštělo jako ideál.

### Pravidla barvy

1. Sytá barva ≤ **8 %** plochy libovolné obrazovky. Nejsytější obrazovka webu
   (otevřená oblast v Sedmi oblastech) má odhadem 6 %.
2. **Žádná terakota.** Akce je vždy `--tide`.
3. Žádné CSS gradienty, žádný glassmorphism. Jediná světelná pole jsou kreslená
   v canvasu (hero, hladina Podstaty, kolo sezení, still point, maják).
4. Filmové zrno přes celý web: SVG `feTurbulence`, `opacity .028`,
   `mix-blend-mode: multiply`, `position: fixed`. Statické — nevypíná se při
   `prefers-reduced-motion`.
5. **Web je celý světlý.** Zvažoval jsem jednu tmavou vsazenou desku pro
   Still point (`#0E1F1A`) — zavrženo, viz §7 C.

---

## 3. Typografie

| Role | Písmo | Řez | Velikost |
|---|---|---|---|
| Nadpisy, výrok, kurzíva | **Newsreader** (OFL) | statická 400 + italic | **53,4 kB** |
| Text, UI, popisky | **Instrument Sans** (Instrument, OFL) | variabilní `wght 400–700` | **37,0 kB** |
| Technický popisek | **JetBrains Mono** | statická 500 | **17,0 kB** |
| | | **na drátě** | **107,4 kB** (limit 110 kB) |
| Záložní kurzíva | **Sentient Italic** (ITF) | statická 400 | 18,6 kB — *nestahuje se* |

Sentient zůstal ve složce jako fallback v `--font-display` / `--font-italic`.
Prohlížeč stahuje jen písma, která opravdu použije, a Newsreader pokrývá
všechno — Sentient se tedy na drát nikdy nedostane. Na disku je 125,9 kB,
na drátě 107,4 kB.

### Proč Instrument Sans, a ne Switzer

Switzer byl poctivý, ale neutrální — písmo, které nic nezkazí a nic neřekne.
Vedle Newsreaderu v nadpisech z toho byla dvojice, kde jeden hlas mluví
a druhý mlčí. Instrument Sans mlčí míň:

1. **Kresba v drobném stupni.** Dvoupatrové `a` s ostrým vykrojením, `g`
   s otevřeným ocasem, `t` se šikmým seříznutím, `y` s rovnou diagonálou.
   Při 0,78 rem (popisky, číslovky) je z toho rozdíl mezi sazbou a rozhraním.
2. **Užší a kolmější tvary.** V odstavci to drží řádek pohromadě, aniž by se
   muselo sahat na prostrkání.
3. **Kroužek u `ů`.** Byl to hlavní důvod pro Switzer a Instrument Sans ho
   splňuje taky — kroužek je stejně široký jako dřík `u` a v nadpisech
   nevypadává z řádku. (Nadpisy dnes stejně běží na Newsreaderu, takže je to
   kritérium jen pro `--fs-lede` a výš.)

**Dvě věci, které si výměna vynutila** — obojí je zapsané u příslušného
předpisu, ne jen tady:

- **Škála o 4 % nahoru.** Instrument Sans má x‑výšku 0,510 em, Switzer 0,531.
  Při stejném stupni by sazba opticky zdrobněla, i když je číslo v CSS totožné.
  Sansová větev škály je proto přepočítaná na stejnou *optickou* velikost,
  měřenou na x‑výšce, ne na kuželce. Nadpisové stupně se nemění.
- **`word-spacing: .028em` na `body`.** Obě písma mají mezeru 0,200 em, jenže
  Instrument Sans má o 5 % širší písmena (`n` = 0,599 proti 0,572), takže se
  poměr mezery ke kuželce posunul a slova se začala slepovat. Výrok
  (`.say`) si mezeru vypíná zpátky na `normal`.

**Licence:** Newsreader, Instrument Sans i JetBrains Mono —
**SIL Open Font License 1.1**, texty licencí leží ve `fonts/`.
Sentient — Indian Type Foundry / Fontshare Free Font License.
Přehled je i v `README.md`.

**Subsetting:** `latin + latin‑ext + interpunkce` (342 znaků), `woff2`,
`font-display: swap`, preload textového i nadpisového řezu. Ověřeno, že
v subsetu nechybí `ĎŤŇŘŠČŽÝÁÍÉÚŮ ěščřžýáíéúůďťň ü „ “ – — ≈ ·`.

> **Šipky se v písmu nekreslí.** Instrument Sans ani Newsreader nemají
> `→ ↑ ↓`. Místo
> doplňování dalšího fontu jsou **všechny šipky na webu SVG** s jednotnou stopou
> 1,5 px — což zadání stejně vyžaduje (kap. 6.7). Omezení písma se tak stalo
> pravidlem ikonografie.

### Škála

```
h1 / hero      clamp(2.75rem, 6.2vw, 6.6rem)   lh .93    tracking -.03em
h2             clamp(2.2rem, 5.0vw, 4.4rem)    lh 1.00   tracking -.025em
h3             clamp(1.45rem, 2.4vw, 2.1rem)   lh 1.15   tracking -.015em
lede           clamp(1.15rem, 1.5vw, 1.5rem)   lh 1.50   max 46ch
body           clamp(1.0625rem, .35vw+1rem, 1.15rem)  lh 1.62   62–68ch
small          .95rem                          lh 1.55
label / mono   .75rem UPPERCASE                tracking .13em
```

> **Odchylka od zadání:** zadaná škála h1 byla `clamp(3rem, 8.2vw, 8rem)`.
> Ta je kalibrovaná na nadpis přes plnou šířku. Na tomto webu ale h1 sedí
> ve sloupcích 1–7, tedy zhruba na 52 % šířky. Při 8,2vw se na 1440 px
> hero rozlomil na pět řádků a přetekl výřez nahoru. Sníženo na
> `clamp(2.75rem, 6.2vw, 6.6rem)` — vizuální váha zůstala, kompozice drží.
> Zároveň jsem zkrátil samotný nadpis: **„Tělo ví, kudy zpět.“** je celá věta
> a je silnější než původní tříveršový nadpis. Zbytek přebral lede.

Základní text na mobilu **17 px**. Nikdy níž.

### Kurzíva — tvrdé pravidlo

Sentient Italic nese Katčin hlas a smí se objevit **maximálně 3–5 slov
na stránku**:

| Stránka | Kurzívou |
|---|---|
| `index` | *„kudy zpět“* (h1) · *„vzniknout zevnitř“* (h2 sekce o Katce) |
| `kraniosakralni-terapie` | *„vždy přítomné“* (h2) |
| `s-cim-pomaham` | *„jeden přístup“* (h2) |
| `o-mne` | *„naslouchat“* (doprovod k citaci) |
| `prubeh-a-cenik` | *„co vás čeká“* (h1) |

### Česká sazba

- Nezlomitelné mezery po `v s a k o u z i` a před `Kč min g % h ×`
  — vloženy **do zdrojového HTML**, ne za běhu. Celkem **628** vložených mezer.
- Uvozovky `„ “`. Pomlčka `–` s mezerami, `—` jen v display sazbě.
- `text-wrap: balance` na nadpisy, `pretty` na odstavce, `hyphens: none`
  na nadpisy.
- Nadpisy zalomené ručně přes `.line-mask` — každý řádek je vlastní element,
  takže nevzniká vdovec.

> **Proč jednorázový nástroj a ne JS za běhu:** kdyby mezery vkládal skript,
> byla by sazba bez JS horší a zásah do DOMu po vykreslení by způsobil posun
> layoutu (CLS). Nástroj (`typo.py`) běžel jednou a odevzdávají se hotové
> soubory. Klientka může psát obyčejné mezery — web bude fungovat, jen to bude
> o vlásek méně hezké. To je v README napsané.

---

## 4. Mřížka a tvarosloví

- **12 sloupců**, obsah max **1360 px**, gutter `clamp(16px, 2.2vw, 32px)`,
  okraj `clamp(20px, 5vw, 80px)`.
- Kompozice **asymetrická**: nadpis col 1–7, doprovodný text col 8–12,
  scény full‑bleed.
- Vertikální rytmus **8 pt**; odsazení sekcí `clamp(88px, 12vh, 180px)`.
- **Radius 4 px** na plochách, `999px` pouze chipy a štítky. Bez výjimek.
- **Stín jediný povolený:** `0 24px 60px -32px rgba(16,28,24,.18)` pod
  plovoucími moduly. Na webu není jediná karta, která se při hoveru zvedne.
- **Žádný bento grid.** Každá sekce má kompozici odvozenou od svého obsahu.

### Vlastní prvek: „vodoryska“ (waterline)

Sekce nesedí v boxech. Sedí **nad a pod vodoryskou** — vodorovným přechodem,
kde se porcelán mění v mělčinu (`--bg` → `--surface-2`). Vodoryska není linka;
je to **změna tónu s 1px hranou**. Dává webu horizont, aniž by kreslil rámečky,
a je to přesně opačný princip než „karta se stínem“.

```
┌───────────────────────────────────────────────────────────────┐
│ ░░ --bg ░░                                                     │
│   Nadpis sekce                    doprovodný text              │
│   (col 1–7)                       (col 8–12)                   │
├──────────────────────────────────── vodoryska (1px --line) ────┤
│ ▒▒ --surface-2 ▒▒        obsah, který „leží ve vodě“           │
└───────────────────────────────────────────────────────────────┘
   │
   ╿ linka dechu (fixed canvas, levý okraj)
```

### ASCII wireframy — úvodní stránka

```
01 HERO                                        ╿ linka dechu začíná tady
┌────────────────────────────────────────────────────────────┐
│ ╿  Tělo ví,                   [WebGL nervová soustava]     │
│ ╿  kudy zpět.                 inkoustová kresba,           │
│ ╿                             vlna lebka → kost křížová    │
│ ╿  lede (46ch)                každých 11 s                 │
│ ╿  [ Rezervovat termín ]  +420 776 021 297                 │
│ ╿  75 min · v oblečení · Ostrava                           │
└────────────────────────────────────────────────────────────┘

02 POZNÁVÁTE SE?                    ╿ linka převezme barvu tématu
┌────────────────────────────────────────────────────────────┐
│ ╿ Konkrétní obtíže, ne obecné fráze                        │
│ ╿ ┌──────────────────────────────────────────────────┐     │
│ ╿ │01│ Migréna a bolesti hlavy   [◐] tlak za okem …  │ ↘   │  ← příliv zleva
│ ╿ ├──────────────────────────────────────────────────┤     │
│ ╿ │02│ Stres a burnout           [◐] mělký dech …    │ ↘   │  ← ostatní na 35 %
│ ╿ └──────────────────────────────────────────────────┘     │
│ ╿                          [ Chci to probrat → ]           │
└────────────────────────────────────────────────────────────┘

04 RYTMUS                           ╿ linka se rozdvojí do tří stop
┌────────────────────────────────────────────────────────────┐
│ ╿  ♥ srdce ≈ 70/min         ▁▂▃▄▅▄▃▂▁▂▃▄▅▄▃▂  znáte        │
│ ╿  ◡ dech  ≈ 14/min         ▁▁▂▃▄▅▅▄▃▂▁▁      znáte        │
│ ╿  ○ prim. resp. ≈ 9/min    ▁▁▁▂▃▄▅▅▅▄▃▂▁     tohle neznáte│
└────────────────────────────────────────────────────────────┘

06 KDO SE VÁS DOTÝKÁ                ░░ jediná písková plocha ░░
┌────────────────────────────────────────────────────────────┐
│ ╿  [foto 4:5]     „Změna nemá být tlačena —                │
│ ╿   Katka          má vzniknout zevnitř.“                   │
│ ╿                  5 let výcviků · 75 min · 2 metody        │
│ ╿                  [ Napsat Katce ]                         │
└────────────────────────────────────────────────────────────┘

10 REZERVACE → patička              ╿ poslední výdech, linka mizí
```

---

## 5. SIGNATURE — „Jeden dech prochází celým webem“

Jedna živá vlasová linka vedená ve `position: fixed` canvasu podél levého
okraje celého dokumentu.

| Kde | Chování |
|---|---|
| všude | sinusoida, amplituda ±3,6 px, dýchá ve sdíleném rytmu `--breath: 11s` |
| všude | **vyplněná část = pozice ve scrollu**; nad ní barva tématu, pod ní `--line-strong` |
| §Poznáváte se? | při najetí na řádek převezme **barvu tématu** (plynulý přechod) |
| §Still point | rozšíří se do plné amplitudy, **zklidní se, na 1,4 s se zastaví**, pak pokračuje pomalejší a hlubší |
| hero → stránka | vlna, která v heru dojde ke kosti křížové, **vystoupí z plátna** (`kj:pulse`) a projede touto linkou dolů |
| patička | jeden pomalý výdech (amplituda → 0) a zmizí |

**Proč canvas a ne SVG:** dokument je 5 500–14 000 px vysoký. SVG path o té
délce s per‑frame přepočtem `d` znamená layout + paint celé plochy každý snímek.
Fixed canvas kreslí jen viditelný výřez a offsetuje fázi podle `scrollY` —
konstantní náklad nezávisle na délce dokumentu.

**Reduced motion:** linka zůstane, ale nedýchá — je to statická svislá křivka
s vyplněnou částí podle scrollu. Pořád nese informaci (kde jsem), jen se nehýbe.

---

## 6. Pohybový systém

```
--breath: 11s
--dur-micro: 180ms      --ease-out:    cubic-bezier(.22,1,.36,1)
--dur-ui: 320ms         --ease-in-out: cubic-bezier(.7,0,.2,1)
--dur-reveal: 700ms     --stagger: 60ms
--dur-scene: 1400ms     --motion: 1  (0 při prefers-reduced-motion)
```

**Pět rodin — jiná animace na webu není:**

| # | Rodina | Co dělá | Kde |
|---|---|---|---|
| 1 | **DECH** | 11 s smyčka, škála/opacita ±2–4 % | hero, kolo sezení, tečka u instrukcí |
| 2 | **PŘÍLIV** | zaplavení zdola/zleva, `clip-path`/`scale`, 420 ms | hover řádků a tlačítek, průzor |
| 3 | **KRESBA** | `stroke-dashoffset` 0,9–1,4 s, stagger 40 ms | všechna schémata a odškrtávací značky |
| 4 | **ODKRYTÍ** | maska po řádcích `inset(105%)` → `inset(0)`, 700 ms | veškerý text |
| 5 | **PROUD** | částice po dráze | hero, nikde jinde |
| 6 | **VLNA** | slovo po slovu podle scrollu, tón + poloha 0,09 em | jediná věta na webu (předěl na úvodu) |

Vše prochází `js/motion.js`. V CSS není jediný `transition` bez tokenu.

**Zakázáno a nepoužito:** bounce, pružiny, parallax > 12 %, scroll‑jacking,
blur‑in, shimmer, karta co se zvedne a hodí stín.

### Šestá rodina — VLNA, a proč pravidlo „žádné letter-by-letter“ padlo

Původní zákaz zněl *letter‑by‑letter*. Ten platí dál: písmeno není
jednotka významu a rozsvěcet je po jednom je efekt bez důvodu.

Co přibylo, je **slovo po slovu — a jen jednou na celém webu**, na jediné
větě, která je zároveň jediným tvrzením předělu:

> Nejde o to vydržet víc. **Jde o to přestat držet.**

Vlna, která větou projde, je **táž vlna**, co o kus výš běží postavou
(lebka → kost křížová) a o kus níž strunou. Věta se tedy nerozsvěcuje
proto, že to vypadá draze, ale proto, že v ní pokračuje pohyb, který
stránka už dvakrát ukázala.

Rozhodující je konec: **první věta po průchodu vlny ztmavne zpátky** na
42 % jasu, zatímco „přestat držet“ zůstane svítit v přílivu. Sazba udělá
to, co věta tvrdí — držení pustí, uvolnění zůstane. Bez toho by to byl
jen odložený `fade-in`.

Ověřeno na kontrast: ztlumené slovo je `#6F7872` na `#E9ECE5`, tedy
**3,87 : 1**. Sazba předělu má 33–85 px, což je „large text“ — AA
vyžaduje 3 : 1. Bez skriptu, při `prefers-reduced-motion` a kdyby modul
spadl, je `--lit` rovno 1 a věta je v plném inkoustu.

Vše prochází `js/motion.js`. V CSS není jediný `transition` bez tokenu.

**Fail‑safe odkrytí.** Text je viditelný jako výchozí stav. Skrývá se až pod
třídou `.js-anim`, kterou nasadí jednořádkový skript v `<head>` — a jen tehdy,
když prohlížeč umí `IntersectionObserver` a uživatel nemá zapnuté omezení pohybu.
Navíc: když observer do šesti vteřin ani jednou nespustí, `core.js` třídu
odstraní. **Web bez efektu je lepší než web bez textu** — u zdravotně
orientované služby to není estetická otázka.


---

## 7. Zavržené varianty — a proč

*(nejcennější část dokumentu: co jsem zkusil a zahodil)*

### Vzhledy

**A. „Termální mapa doteku“** — paleta odvozená z tepelné mapy dotyku: uhlová
plocha, oranžovo‑purpurové přechody v místech kontaktu.
*Zavrženo.* Vypadalo to skvěle na moodboardu a příšerně v kontextu. Za prvé
porušuje pravidlo max 8 % syté barvy (tepelná mapa *je* barva). Za druhé — a to
je horší — čte se to jako **scanner**. Persona C (skeptik) hledá jistotu, že to
není technologie ani ezoterika; termální mapa mu tvrdí obojí najednou.
A oranžová část škály se nebezpečně přiblížila zakázané terakotě.

**B. „Textil“** — plátno, len, přeložená deka jako oddělovač sekcí, měkké
přechody, béžová.
*Zavrženo.* Do dvou scrollů z toho byl spa resort. Je to nejbližší past
k wellness‑esoterice, protože slovník je správný (deka *na tom lehátku opravdu
je*), ale asociace je špatná. Zůstala z toho jediná věc: `--sand` jako teplý
protipól — ale jen tam, kde jde o člověka.

**C. Jedna tmavá vsazená deska pro Still point** (`#0E1F1A`, inkoustová zeleň).
*Zavrženo, i když je to nejtěžší škrt.* Kontrastně by to fungovalo (bílá na
`#0E1F1A` = 17,08) a moment ztišení by dostal vizuální ticho. Ale: (a) zadání
chce světlý web, (b) jedna tmavá deska uprostřed světlého webu je přesně to
gesto, které AI dělá, aby „to bylo zajímavé“, (c) Still point už *má* svůj
dramatický moment — zastavení linky dechu. Dva dramatické momenty na jednom
místě se navzájem přebijí.

**D. Serifový display (Sentient Regular ve velkém)** — Sentient je současný
serif, formálně by nespadal do zákazu „stará kniha“.
*Zavrženo.* Vysadil jsem hero ve 128 px a je to pořád literatura. Diagnóza
staré verze nemluví o konkrétním písmu, ale o **osobnosti**. Jakýkoli serif ve
velkém nese autoritu textu, ne autoritu přesnosti. Sentient zůstal na 3–5 slov —
tam, kde má znít hlas, ne značka.

### Kompozice a moduly

**E. Bento grid modulů na úvodu** — šest stejných karet, každá jeden
interaktivní modul.
*Zavrženo* (a zadáním zakázáno). Nezávislý důvod: bento grid tvrdí, že všechny
moduly jsou stejně důležité a stejně velké. Ale kolo 75 minut a rejstřík
obtíží nesou většinu konverze, zatímco časová osa je kontext. Mřížka to popírá.

**F. Sedm oblastí jako vodorovný scroll obsahu.**
*Zavrženo.* Vodorovný scroll na mobilu je zakázaný a na desktopu by schoval
4 ze 7 oblastí za okraj. Tohle je nejnavštěvovanější stránka webu — obsah se tu
neschovává. Zůstal rejstřík + rozevřený dvoulist se zamknutou výškou; posouvat
se dá jen **rejstřík**, ne obsah.

**G. Akordeon pro Sedm oblastí na mobilu.**
*Zavrženo po první implementaci.* Akordeon vyžaduje, aby panel byl fyzicky pod
svou hlavičkou — jenže panely musí zůstat v jednom kontejneru kvůli zámku výšky
na desktopu. Výsledkem by byl akordeon, kde se obsah otevírá pod celým seznamem.
Místo toho se rejstřík na mobilu staví na výšku a otevřená oblast se ukáže pod
ním, s doscrollováním. Jednodušší, a hlavně to nelže o tom, co se stane.

**H. Sebe‑test jako jedna dlouhá obrazovka se zaškrtávátky** (= stará verze,
jen hezčí).
*Zavrženo.* Zaškrtávací seznam nemá dramaturgii ani výstup. Jedna otázka na
obrazovku je pomalejší, ale dokončí ji víc lidí — a hlavně to umožní
**bezpečnostní větev** (červená vlajka → nejdřív lékař), která v seznamu nejde
udělat, protože uživatel vidí všechno najednou.

**I. Linka dechu jako `<svg>` přes celý `<body>`.**
*Zavrženo z výkonových důvodů* — viz §5.

**J. Popisky nervů v hero scéně** (byly ve staré verzi).
*Zavrženo.* Byly věcně nepřesné a hero není přednáška z anatomie. Hero má jednu
práci: „tohle je jiné, a je to o mém těle“.

**K. Modul „Pět gramů“ jako hold‑to‑feel** (podrž a ucítíš, jak málo to je).
*Zavrženo po prototypu* ve prospěch posuvníku. Hold‑to‑feel je krásnější, ale
nedá se ovládat klávesnicí bez nepřirozené konstrukce, na dotyku koliduje se
scrollem a **neukáže srovnání** — a smysl modulu je právě srovnání 5 g proti
5 kg. Posuvník s návratovou značkou na 5 g je méně efektní a víc srozumitelný.

**L. Rytmy těla.** Modul se třemi stopami (srdce · dech · primární
respirace) byl na stránce *O terapii*.
*Odstraněn.* Nesl jedinou informaci — že primární respirace je pomalejší než
dech — a tu už říká věta v úvodu sekce Podstata i celá pátá stanice ošetření.
Tři animované stopy vedle sebe navíc konkurovaly Still pointu, který je o pár
obrazovek níž a dělá totéž lépe: ukazuje rytmus, který se zastaví. Dva moduly
o rytmu na jedné stránce se navzájem přebíjejí.

**M. Ikona jako logo v navigaci.** Zavrženo zadáním i věcně — jméno je
srozumitelnější značka než symbol, který si nikdo nespojí s ničím.

### Technika

**N. three.js pro hero.** Zavrženo zadáním i věcně — celá scéna je několik set
až 2 400 částic po předpočítaných drahách. three.js by přidal stovky kB kvůli
funkcím, které nepoužiju.

**P. GSAP a ScrollTrigger.** Zadání je uvádí ve stacku a měly být vendorované
lokálně. *Zavrženo a ze složky odstraněno.* Celý pohybový systém stojí na
`motion.js` a jedné sdílené rAF smyčce v `core.js`; žádná stránka GSAP nenačítá.
Ponechat ve složce 115 kB mrtvého kódu, který klientka nahraje na hosting a nikdy
se nepoužije, je horší než odchýlit se od seznamu. Lenis (4,6 kB) zůstal — ten se
opravdu používá, vyhlazuje kolečko myši na desktopu.

**O. `overflow-x: clip` na `<body>`** jako pojistka proti vodorovnému přetečení.
*Zavrženo po nálezu v QA.* Když je na `<body>` `overflow-x: clip` a `overflow-y`
zůstane `visible`, prohlížeč z `<body>` udělá scroll kontejner — a tím rozbije
`IntersectionObserver` i `position: sticky`. Pojistka patří na `<html>`.
Tohle byla skutečná chyba, kterou odhalilo teprve měření, ne čtení kódu.

---

## 8. Sebekritika návrhu — kde je to default a ne volba

Otázka: *„Kdyby mi tenhle brief zadal kdokoli, došel bych ke stejnému řešení?“*

| Co bylo default | Co jsem s tím udělal |
|---|---|
| Zadání dalo paletu a já ji jen opsal. To je poslušnost, ne art direction. | Přidal jsem **pravidlo pro `--sand`** (teplá barva = tam, kde je člověk) a `--line-ui`. Barva teď nese informaci, ne náladu. Ztmavil jsem „po porodu“, aby prošla AA. |
| „Světlý minimalistický web s velkou groteskou“ je nejběžnější studiový default. | Odlišuje ho **vodoryska místo karet** a **příliv místo zvednutí a stínu**. Obojí je odvozené z tekutiny, ne z designového trendu. Na webu není jediná karta se stínem. |
| Interaktivní moduly jako „hezké hračky“ vedle textu. | Každý modul musel projít testem *„zvyšuje důvěru nebo porozumění?“*. Neprošla dekorativní částicová scéna u ceníku — škrtnuta. |
| Signature element jako ozdoba. | Linka dechu je **zároveň ukazatel scrollu** (funkce) a **zároveň nese barvu tématu** (orientace). Kdyby byla jen krásná, patřila by pryč podle vlastního pravidla. |
| Hero WebGL, protože „bylo ve staré verzi a je působivé“. | Přestavěno tak, aby mělo **děj**: dokreslení od temene ke kostrči, pak vlna lebka → kost křížová každých 11 s, a ta vlna se předává lince dechu. Bez děje by to byl spořič obrazovky. |
| Anatomie „od oka“. | Postava byla nejdřív nepoužitelná — příliš dlouhá, hlava malá, končetiny bez vnitřního obrysu (četlo se to jako sukně). Přepsáno na skutečné proporce: hlava = 1/7,5 výšky, rozkrok v polovině postavy. |

---

## 9. Doložené stavy (screenshoty)

Soubory jsou ve složce `assets/screens/`. Pořízené headless Chrome
v šířce 1440 px, vysoký výřez, aby byla vidět celá dramaturgie.

| Soubor | Co dokládá |
|---|---|
| `01-uvod.png` | úvodní stránka — hero a rejstřík šesti obtíží v klidovém stavu |
| `02-uvod-reduced.png` | `prefers-reduced-motion: reduce` — **žádný pohyb, kompozice zůstává celá a čitelná**; hero má statickou kresbu, `js-anim` se vůbec nenasadí |
| `03-uvod-bez-js.png` | **bez JavaScriptu** — všechen text viditelný, u každé obtíže rozbalený popis, statická kresba, CTA fungují |
| `04-oblasti.png` | Sedm oblastí — rejstřík, otevřený dvoulist, chipy, „v čem pomáhá“, poznámka „kdy raději k lékaři“ |
| `05-o-terapii.png` | Podstata ve třech vrstvách s hladinou, tři principy |
| `06-prubeh-cenik.png` | kolo sezení se třemi částmi, momenty a třemi sloupci |
| `07-o-mne.png` | písková plocha (jediná na webu), tři kapitoly, Maják a moře |
| `08-styleguide.png` | interní styleguide — česká diakritika ve všech velikostech, paleta s poměry |

**Co na screenshotech ověřit:**

- v `02-uvod-reduced.png` a `03-uvod-bez-js.png` **není nic useknutého**
  — to je test pojistky popsané v §6,
- v `03-uvod-bez-js.png` jsou u všech šesti obtíží vidět popisy, které
  se jinak rozbalují až při najetí,
- ve `08-styleguide.png` se háčky nedotýkají dolních dotahů řádku nad nimi.

## 10. Výkon — naměřeno

| Metrika | Limit | Stav |
|---|---|---|
| Vlastní CSS (gzip) | — | viz `README` / měření níže |
| Vlastní JS (gzip) | — | viz níže |
| Vendor (Lenis, gzip) | — | 3,6 kB |
| **CSS + JS celkem (gzip)** | **≤ 180 kB** | **~55 kB** ✓ |
| Fonty | ≤ 110 kB | **64,1 kB** ✓ |
| Nejdelší stránka | — | `s-cim-pomaham` ≈ 5 500 px na 1440 px |
| Vodorovné přetečení 320–1920 px | 0 | ověřeno automatickým auditem |

> **Poznámka k vendor knihovnám:** ve složce `vendor/` je jen **Lenis**
> (3,6 kB gzip) — vyhlazuje kolečko myši na desktopu; na dotyku a při
> `prefers-reduced-motion` se vůbec nespouští. GSAP a ScrollTrigger byly
> odstraněny, viz §7 P.

Strážce výkonu v heru: měří FPS, při < 45 fps po 2 s sníží částice na 60 %,
při dalším propadu přepne na SVG kresbu. rAF se zastaví mimo výřez i při
skryté kartě.

---

## 11. Opravy po nasazení

### 11.1 „Půlka webu se nezobrazila“ — chyba, příčina, oprava

**Příznak.** Web spuštěný přes Live Server (i z disku) vypadal z části
prázdný: nadpisy a odstavce chyběly, sekce byly bílé, moduly se
nerozběhly. V konzoli **žádná chyba** — proto se to špatně hledalo.
Na některých strojích se to projevovalo silněji než na jiných.

**Hlavní příčina — odkrytí si samo bránilo ve výhledu.**
Rodina ODKRYTÍ (§6) drží obsah schovaný pod maskou
`clip-path: inset(105% 0 0 0)` a odkrývá ho, až se dostane do výřezu.
Do výřezu se prvek hlásil přes `IntersectionObserver`.

Jenže prohlížeč **započítává `clip-path` do průsečíku prvku s výřezem**.
Prvek zamaskovaný na `inset(105%)` má průsečík nulový, takže
`IntersectionObserver` ho hlásí trvale jako neviditelný — a stejně tak
všechno, co je uvnitř něj. Ověřeno v Chromiu 151:

| prvek | `intersectionRatio` | `isIntersecting` |
|---|---|---|
| bez masky | 1 | true |
| `clip-path: inset(105% 0 0 0)` | **0** | **false** |
| `clip-path: inset(0 0 -14% 0)` (odkrytý stav) | 1 | true |
| `opacity: 0` | 1 | true |
| `visibility: hidden` | 1 | true |

Odkrytí tedy nikdy nedostalo signál, že má odkrýt. Fungovala jen
záchranná síť po 3 s (odkryla, co bylo zrovna ve výřezu) — a ta zároveň
shodila podmínku pro pojistku na 6 s, takže maska už nikdy nespadla.
Výsledek: horní kus stránky se ukázal, zbytek zůstal navždy prázdný.

Stejná past se týkala i všeho, co leželo **uvnitř** zamaskovaného prvku:
`KJ.whenVisible` a `KJ.visibilityGate` nespustily moduly, linka dechu
nepřepínala rytmus (zóny `data-breath-mode` jsou zároveň `data-reveal`),
řádky rozcestníku se na dotyku nerozsvěcely.

**Vedlejší příčina — těžké skripty držely hlavní vlákno.**
Skripty se načítaly přes `<script defer>`. Defer skripty doběhnou dřív,
než prohlížeč vůbec pustí ke slovu první vykreslení, a `js/webgl/
anatomy-3d.js` dělá při startu hodně synchronní práce (kompilace
shaderů, anatomické dráhy, až 2 400 částic; na slabším stroji navíc
softwarové vykreslování). Na pomalejším počítači to odsunulo odkrytí
textu o vteřiny. Totéž v menším dělalo `js/motion.js` (měření délek
SVG cest).

### 11.2 Co se změnilo

**1. Sledování výřezu bez `IntersectionObserveru` (`js/core.js`).**
Průsečík s výřezem si počítáme sami z `getBoundingClientRect()`, kterou
maska neovlivňuje. Jedna sdílená smyčka pro celý web, přepočet na
scroll / resize / návrat na kartu / změnu výšky dokumentu
(`ResizeObserver`) / doručení fontů. Veřejné API zůstává stejné:
`KJ.whenVisible`, `KJ.visibilityGate`, nově `KJ.watch`.
`IntersectionObserver` se v kódu webu už nepoužívá **nikde** — jinak by
past čekala na příštího, kdo přidá modul dovnitř odkrývaného bloku.

**2. Odkrytí startuje jako první a nezávisle na ostatních skriptech.**
- `init()` volá `initReveal()` na prvním místě a každý krok má vlastní
  `try/catch` — spadlá navigace nebo Lenis už nesmí stáhnout text s sebou.
- Skript s `defer` se spouští, až je dokument rozparsovaný, ale
  `document.readyState` v tu chvíli ještě hlásí `"loading"`. Čekání na
  `DOMContentLoaded` proto znamenalo čekat na **všechny ostatní skripty
  stránky**. `core.js` teď startuje rovnou.
- První průchod je synchronní, ne přes `requestAnimationFrame` — snímek
  by přišel až za ostatními skripty.
- `js/core.js` je nově **první** skript stránky; Lenis se dohledá později
  (vyhlazení scrollu je bonus, odkrytí textu na něj nesmí čekat).

**3. Co je při načtení vidět, odkryje se hned.**
Při scrollu se obsah odkrývá s marginem `-10 %` (spodní desetina
obrazovky je rozjezd). Při **prvním** průchodu platí holý výřez — nic,
co má uživatel před očima, nezůstane prázdné ani na chvíli.

**4. Pojistky.**
- V `<head>` každé stránky: sundá masku natvrdo po **2 s** (dřív 6 s).
  Funguje, i kdyby se `core.js` vůbec nenačetl. `core.js` ji převezme.
- V `initReveal()`: po 2 s zkontroluje, jestli něco ve výřezu zůstalo
  zamaskované; pokud ano, zruší animaci na celém dokumentu.
  Web bez efektu je pořád web, web bez textu není nic.

**5. Těžké moduly se načítají až po prvním vykreslení.**
Stránka vypíše seznam `window.KJ_LAZY = [...]` a `core.js` skripty
vloží do dokumentu s `async = false` (pořadí zůstává zachované) až dva
snímky po startu. V `defer` zůstává jen jádro: `core.js`, Lenis a
`breath-line.js`. Hero scéna se tím rozjede o zlomek vteřiny později —
má vlastní 1,6s nástup, takže to nikdo nepozná.

### 11.3 Čemu se vyhnout do budoucna

- **Nepoužívat `IntersectionObserver` na prvek, který může být pod
  `clip-path`** — ani na nic uvnitř něj. Používat `KJ.watch`.
- **Nedávat těžký skript do `<script defer>`.** Patří do `KJ_LAZY`.
- **Neschovávat obsah v CSS bez pojistky**, která ho po pár vteřinách
  ukáže i bez JS.

### 11.4 Ověřeno

Headless Chromium 151, statický server, škrcení procesoru
`Emulation.setCPUThrottlingRate` 4× a 6×, šířky 390 / 768 / 1440 px,
všech 5 stránek + `404` a `styleguide`:

- veškerý `[data-reveal]` obsah je odkrytý **do ~0,5 s od prvního
  vykreslení**, po průjezdu celou stránkou nezůstane skryté nic (0/49,
  0/42, 0/21, 0/31, 0/38); před opravou jich zůstávalo skrytých
  45/49, 35/42, 13/21, 25/31, 31/38 — tedy skutečně „půlka webu“;
- v konzoli žádná chyba na žádné stránce;
- hero: dokreslení od temene ke kostrči, vlna `kj:pulse` po 11 s,
  natočení kurzorem, klik = rázová vlna, statický SVG obraz bez WebGL,
  `prefers-reduced-motion` = statický hero a všechen text odkrytý;
- linka dechu žije na všech 5 stránkách a mění rytmus podle sekce
  (`flow` / `split` / `still` / `exhale`) — před opravou zůstávala
  v jednom rytmu, protože zóny leží uvnitř odkrývaných bloků;
- odolnost: chybějící `core.js`, cizí skript blokující vlákno 3 s,
  načtení na skryté kartě, příchod s kotvou `#objednani`, skok na konec
  stránky a zpět — v žádném z případů nezůstane viditelný obsah prázdný.

---

## 12. Druhá vlna — hero a dvě scénické sekce

### 12.1 Hero: porcelánová figura

Hero už není inkoustová kresba nervové soustavy. Je to **skutečná
trojrozměrná scéna** — vlastní WebGL, bez 3D knihovny:

| Soubor | Co dělá |
|---|---|
| `js/webgl/anatomy-mesh.js` | procedurální geometrie: skořepina těla, lebeční klenba se švy, 24 obratlů, kost křížová, žebra, pánev, durální tubus, nervový strom |
| `js/webgl/anatomy-3d.js` | pět shaderových programů, osvětlení, děj scény, strážce výkonu |

**Materiál je celý koncept.** Kost je matný porcelán: shora studené světlo
místnosti, zdola teplý odraz prostěradla (polokulové okolní světlo). Na obrysu,
kde se povrch odklání od diváka, ztmavne Fresnelem do inkoustu — tím se z 3D
renderu stane **anatomická rytina**, ne screenshot ze hry. Durální tubus je
sklo (uprostřed čiré, na okraji husté), nervy jsou tenké trubky, mozkomíšní
mok jsou částice, které tubem plynou.

Každý vrchol nese `aS` — podíl na kraniosakrální ose, 0 = temeno, 1 = kostrč.
Dokreslení, vlna i still point pracují s tímhle jedním číslem, ne s pěti
nezávislými časovači. Proto scéna drží pohromadě.

**Tři škrty, které stojí za zaznamenání:**

**Obličej.** Lebka měla oční důlky, nosní otvor a čelist. Skrz porcelánovou
hlavu se to četlo jako **maska** — a to je na webu, který slibuje bezpečí, to
poslední, co tam smí být. Zůstala lebeční klenba se třemi pojmenovanými švy,
tedy přesně ta část, se kterou terapie pracuje.

**Plný skelet.** Nejdřív tam byla celá kostra včetně lopatek, pažních
a stehenních kostí. Vypadalo to jako **voskový model z ordinace** — přímo
zakázaná diagnóza „klinické“ z kapitoly 1. Kostra se rozdělila na `axis`
(klenba, páteř, kost křížová — o čem web mluví) a `frame` (žebra a pánev,
kreslené tišeji). Končetiny nemají uvnitř nic než nerv.

**Dokreslení vázané na snímky.** Vlastní chyba: `reveal` se sčítal z `dt`,
které je navíc shora oříznuté. Na slabším stroji se postava nedokreslila ani
za deset vteřin. Teď je celý děj vázaný na hodiny — **nikdy nesmí záviset
na fps.**

### 12.2 Anatomický list — sdílený kabát dvou sekcí

`js/plate.js` je vykreslovací jádro pro sekce **Ruce mají svá místa**
(`stops.js`) a **Čeho se nebát** (`calm.js`). Obě mají vypadat, jako by je
kreslila jedna ruka jedním perem na jeden papír; kdyby si každá držela vlastní
kreslení, po první úpravě se rozejdou.

| Prvek | Co to je |
|---|---|
| papír | teplý list s vinětou, rohovými soutiskovými značkami a měřicí osnovou (kreslí se jednou do offscreen plátna) |
| tah | obrys s proměnnou tloušťkou — vyplněná stuha, ne `lineWidth`, aby šel tah na koncích ztenčit |
| **šrafa** | rytina pod 32°, druhá vrstva křížem ve stínu. **Jediná věc, která z plochého obrysu udělá objem.** Bez ní je kresba ikonka |
| tečkování | chrupavka, vazivo, měkká tkáň |
| popiska | tečka v anatomickém bodě + vlasový svod + mono verzálky |
| lupa | vsazený panel s vlastním výřezem a odkazovou linkou |
| měřidlo | posuvka s kótou, odečty mono u kraje |
| **ruka** | jedna ruka pro celý web, s oddělenými články prstů |

**Popisky se adresují odsazením od bodu, ne souřadnicí na plátně.** Absolutní
souřadnice vypadaly dobře v jedné šířce a v jiné ulétly za okraj. Popisek se
teď změří, poloha se ořízne do listu, a když se nevejde doprava, obrátí se
i se svodem doleva. **Useknutý popisek je horší než žádný.**

**Ruka s prsty.** První verze byla jeden obrys s rýhami. Ve zmenšení z ní byl
zelený lístek. Prsty se teď kreslí jako samostatné články — ve zmenšení je to
jediný rozdíl mezi rukou a listem.

**Měřítko každé scény se počítá z rozsahu kresby**, ne od oka. U každé scény je
v komentáři napsané, jaký rozsah v místních jednotkách zabírá — kdo bude
kompozici měnit, ví, z čeho se číslo vzalo.

### 12.3 Posun (teď → po ošetření): pryč od hoveru

Sekce se řídila hoverem. Na dotykovém displeji hover neexistuje, takže část
návštěvníků nikdy neviděla druhou polovinu sdělení — tedy přesně tu, kvůli
které sem chodí. U starší cílové skupiny je to zásadní vada, ne detail.

Teď platí: **karta se přehraje sama** při vjezdu do výřezu (IntersectionObserver,
práh 0,5, stagger 250 ms, 1 800 ms ease-in-out) a **zůstane** ve stavu „po“.
Přepnout jde kdykoli segmentovým přepínačem u karty i jedním přepínačem nad
trojicí. Hover zůstal jen jako zrychlení pro toho, kdo myš má — **nikdy není
jediná cesta ke stavu „po“.**

Vysvětlující odstavec je vidět v obou stavech. Dřív se rozvinoval pod kurzorem,
takže se při přepnutí měnila výška karty a stránka pod ní poskočila.

**Karta 02 přepracována.** Posouvající se vlnovky byly nesrozumitelné a
nesedly k linkové anatomii karet 01 a 03. Teď je to totéž tvarosloví: záda
zezadu, páteř od kosti křížové k lebce, fascie podél ní, dva uzly s popiskami
**šíje** a **kříž**. V přechodu se nejdřív objeví bod doteku s kótou ≈ 5 g,
pak uzly povolí a prameny se rozestoupí do pravidelných rozestupů.

### 12.5 Třetí vlna — hero jako scéna, ne jako smyčka

Postava byla technicky správná a dramaturgicky mrtvá. Čtyři věci to
změnily; každá řeší konkrétní výtku, ne „přidat efekt“.

**1 · Nájezd kamery (0,1–3,7 s).** Scéna nezačíná tam, kde skončí:
kamera stojí o 0,46 dál a natočená doprava a krychlovým doběhem se
usadí. Divák tak nevidí obrázek, který se objevil, ale záběr, který se
ustavil. Vzdálenost se smí jen zvětšovat — rám je spočítaný na to, aby
se postava právě vešla, takže „dál“ je vždy bezpečné.

**2 · Vlákno mezi hrudní kostí a křížem.** Kříž stál vedle postavy jako
druhý obrázek na témže plátně; nic je nespojovalo, takže se dal
odmyslet. Teď při zastavení rytmu vyjede od hrudní kosti jiskra, za
0,62 s doletí ke kříži — **a teprve její dopad kříž rozsvítí**. Pořadí je
celý rozdíl: světlo někam *došlo*. Vlákno je vlas o poloměru 0,004
a kreslí se bez hloubkového testu, tedy přes porcelán; fyzikálně je to
podvod, opticky přesně to, co má být vidět.

**3 · Kříž svítí zpátky na tělo.** Co svítí, musí něco osvětlovat.
Přivrácená strana těla chytá zelený odraz, který sílí s pulzem kříže
(`uXpos`/`uXamt` v souřadnicích pohledu). Tohle je jediná změna, které si
nikdo nevšimne a bez které to vypadá jako koláž.

**4 · Dlaň.** Kurzor není ukazovátko — je to teplo ruky. Kde se zastaví,
tam se povrch o stopu prohřeje (gaussovka v `gl_FragCoord`, amplituda
0,22, poloměr 32 % výšky plátna). Na dotykových zařízeních je vypnutá.
Je to jediné místo scény, kde má návštěvník přímý vliv na tělo — a na
webu o doteku je to ta správná interakce.

K tomu **vlna uvolnění**: při zastavení se od kosti křížové rozeběhne
kulová vlna a projede celým tělem. Podélná vlna říká „něco tudy jde“,
kulová říká „povolilo to“.

**Dramaturgie — nejdůležitější oprava.** Still point byl každý třetí
průchod, tedy poprvé kolem 40. vteřiny. V hero sekci nikdo čtyřicet
vteřin nesedí; nejlepší část scény tedy návštěvník **nikdy neviděl**.
Teď je první zastavení v **9,4 s** (první vlna je nad úsekem zpomalení
2,2× rychlejší) a pak každé druhé, s rozestupem ≈ 27 s.

```
 0,1–3,7 s   nájezd kamery, postava se vyvolává od temene
 9,4 s       vlna dojede ke kosti křížové → rytmus se zastaví
 9,5–10,1 s  po vlákně běží světlo ke kříži
10,1 s       kříž vzplane, haló se rozpíná, tělem jde vlna uvolnění
10,5 s       pulz se předá lince dechu u levého okraje stránky
11,5 s       rytmus se rozbíhá
36,7 s       další zastavení
```

**Haló kreslí CSS, ne plátno.** Prstenec se má rozpínat i za hranu
scény; v CSS to nestojí nic a přes Web Animations API se dá spustit
znovu. JS mu každý snímek jen dopočítá promítnutý střed kříže
(`--halo-x` / `--halo-y`).

**Ověřeno mimo prohlížeč.** Všech dvanáct shaderů projde parserem
GLSL ES 1.0; varying se shodují mezi vertexem a fragmentem; každý
použitý uniform je deklarovaný. Šedesát vteřin scény proběhlo v mocku
WebGL bez výjimky (37 900 kreslicích volání, 11 vrstev ve snímku
s vláknem). Opraveno přitom `pow(x, 2.0)` v shaderu kříže — pro záporný
základ je podle specifikace nedefinovaná a na části ovladačů vracela
nulu, takže pruh světla přeběhl jen horní půlku kříže.

### 12.6 Odstraněno na stránce O mně — a proč

Stránka měla sedm sekcí a v šesti běžela jiná hračka: dva kardiogramy,
most, který se dokresluje, spojené nádoby, do kterých se klepe, osa
s odpočítáváním let, dvě desky s certifikáty. Každá věc byla sama o sobě
obhajitelná. Dohromady to bylo **šest různých návodů k obsluze na jedné
stránce o jednom člověku** — a to je přesně to místo webu, kde se čtenář
rozhoduje o důvěře.

Teď je to sazba: jeden rytmus text–obraz–text–obraz, mřížka
`.spread` / `.spread--flip`, nikde text vycentrovaný na střed. Text
zůstal do posledního slova (ověřeno diffem proti původní verzi, 82
kontrolovaných řetězců). Zmizely jen mechanismy, které ho přebíjely,
a **zdvojení**: výcviky byly na stránce dvakrát, jednou jako měřicí osa
a podruhé jako dvě desky s certifikáty. Teď je to jedna tabulka
`doba · název · popis · certifikát`.

Smazané moduly: `story.js`, `track.js`, `diptych.js`.

### 12.7 Odstraněno: Rytmy těla

Modul se třemi stopami (srdce · dech · primární respirace) nesl jedinou
informaci — že primární respirace je pomalejší než dech. Tu už říká věta
v úvodu sekce Podstata i celá pátá stanice ošetření. Tři animované stopy
navíc konkurovaly Still pointu o pár obrazovek níž, který dělá totéž lépe:
ukazuje rytmus, který se zastaví. **Dva moduly o rytmu na jedné stránce se
navzájem přebijí.**

---

## 13. Třetí vlna — předěl, mapa těla, doklady, čitelnost

### 13.1 Předěl „Držení a puštění“ — jedno písmo, jeden odstavec

Předěl měl úzký výrok (17ch, 5,9 rem) a pod ním čtyři odstavce ve čtyřech
stupních. Bylo to promyšlené decrescendo — a znamenalo to **šest různých
typografických hlasů na jedné obrazovce** a sekci vysokou jako dvě.
Z předělu, který má být nádech, se stala kapitola.

Teď je to **jeden široký odstavec sázený Newsreaderem** od prvního po
poslední písmeno. Řádek má kolem pětačtyřiceti znaků, tedy skoro
dvojnásobek proti předchozí verzi, a pět takových řádků stojí uprostřed
stránky jako deska. Hierarchii nese **postup vlny**, ne velikost písma:
co už vlna minula, povolí; co ji teprve čeká, drží. Sekce spadla
z ≈ 1 600 px na 587 px.

### 13.2 Mapa těla — z rentgenu do rozhovoru

Sekce „Kde to působí“ je jediné místo webu, kde mluví návštěvník o sobě —
a byla z celého webu nejstudenější: bílá silueta s kostrou (lebka,
čtyřiadvacet obratlů s příčkami, oblouk žeber, dva tečkované sympatické
kmeny) na šedozelené desce, obtažená ocelově modrou linkou. Kdo přišel
s bolestí, dostal jako první svůj vlastní rentgen.

Tři změny:

1. **Teplo.** Deska je písková, kůže má dva teplé odstíny
   (`--skin-hi` / `--skin-lo`), obrys je zabarvený tématem. `tokens.css`
   u `--sand` říká „POUZE tam, kde je na webu člověk“ — a člověk je tady.
2. **Místa místo kostí.** Kostru nahradilo **šest rozostřených polí**
   v místech, kde to lidé cítí. Zůstal jediný anatomický prvek: proud po
   páteři, devětkrát za minutu.
3. **Je vidět, že se to dá proklikat.** Body pulzují **už v klidu**, jeden
   po druhém shora dolů, a každý má vedle sebe **jméno**. Dřív se jména
   schovávala do řádku tlačítek, jehož vlastní `aria-label` je označoval
   za „alternativní ovládání“ — hlavní ovládání bylo šest nepopsaných
   koleček s krytím 2:1.

Opraveny přitom tři věci, které nikdy nefungovaly: plátno vlnek se
jmenovalo `data-bm-trace`, ale skript hledá `data-bm-ripple` (nula vlnek
a dvě stě pixelů prázdna pod obrázkem); CTA pod skládanou větou nikdo
nikdy neodkryl; ukázková smyčka volala `KJ.setTheme` každé tři vteřiny
a přebarvovala celou stránku.

### 13.3 Certifikáty — doklad se ukazuje, ne popisuje

Na obou místech stálo „DOPLNIT: certifikát v PDF“. Doklad je přitom to
poslední, co u terapeuta rozhoduje, a jediné, co se nedá napsat o sobě.

Sekce **„Ne slovo, ale papír.“** stojí hned pod tabulkou výcviků, protože
přesně tam vzniká otázka „a čím to je?“. Karta má dvě poloviny: **náhled
skutečného papíru** a to, co se ze scanu špatně čte (vydavatel, rozsah,
datum, číslo). Papír dělá důvěru, sazba dělá srozumitelnost; ani jedno
samo nestačí. Náhled je tlačítko — plná velikost se stáhne, teprve když
si ji někdo otevře.

### 13.4 Čitelnost — konec šedé sazby

Tokeny byly černé už dřív, ale text se dal ztlumit i jinak než barvou:
**krytím**. Nalezeno a opraveno:

| kde | bylo | je |
|---|---|---|
| výrok předělu, než k němu dojde vlna | 26 % → 1,8:1 | 72 % → 7,4:1 |
| rejstřík obtíží při najetí myší | 35 % → 2,3:1 | 88 % → 10,5:1 |
| nedostupná tlačítka kola a referencí | 34 % → 2,2:1 | 82 % → 10,6:1 |
| odečet minut ve vybraném řádku kola | `--seg-3` → 1,8:1 | `--ink` → 14,8:1 |
| popisky na 3D plátnech | `--ink-4` → 2,8:1 | `--ink-meta` → 13,3:1 |
| zvýrazněné popisky v přílivu | `--tide` → 6,5:1 | `--tide-deep` → 8,9:1 |
| jmenovka vybraného místa na siluetě | `--theme` → 3,9:1 | `--ink` → 15,9:1 |

Zálohy barev v JS (`plate.js`, `stage.js`, `wheel-core.js`) byly ještě
předrefaktorové — `#3C4944`, `#5F6A64`. Při prvním snímku, než doběhne
CSS, kreslila plátna v odstínech, které web už nikde nepoužívá.

### 13.5 Tři chyby, které nikdy nikdo neviděl

- **Odkazové popisky se nikdy nenakreslily.** `Stage.project()` počítal
  `cw = pr[11] * ez`, tedy −ez, a hned pod tím zahazoval všechno
  s `cw ≥ 0` — jenže −ez je pro každý bod PŘED kamerou kladné. Všech deset
  scén přišlo o pojmenování struktur.
- **`noFoc` byl mrtvý kód.** `run3d.js` ho při kopírování dílu do bufferu
  neopisoval, takže se únikový poklop pro podložky nikdy nespustil.
- **`P.skull` bral `keyOf` jen na klenbu.** Obličej, očnice, jařmové
  oblouky i čelist braly pevný klíč — dvě třetiny lebky měly klíč 0
  a naskakovaly naráz místo postupného vyvolávání.
