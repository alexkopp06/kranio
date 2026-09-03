# Co se změnilo ve 3D vrstvě

Tři zadané body. Vše ověřeno renderem (headless Chrome + WebGL),
ne odhadem.

---

## DODATEK — druhá vlna změn

Text níž popisuje stav, na kterém se stavělo. Co se od té doby
změnilo:

**Ruce jsou pryč.** Ve všech deseti scénách stála modelovaná
ruka. Byla to nejsložitější věc, kterou scéna obsahovala —
osmnáct článků, nehty, šlachy — a zároveň jediná, kterou umí
posoudit každý: ruku má člověk před očima celý život. Když se
povedla kost, nikdo si nevšiml; když se nepovedla ruka, strhla
s sebou i tu kost. Místo nich se na těle rozsvítí **stopa
dotyku** (`stage.contact()`, `touch()` ve scéně): měkké světlo
přesně tam, kde dlaň spočine, přesně tak velké, se stejným
dechem. Sekce o doteku, který váží pět gramů, tak ukazuje dotek
jako světlo, ne jako maso.

**Ukazovátko** (`focus()` ve scéně, `uFoc/uFocW/uFocAmt` v
shaderech). Scéna řekne, o které struktuře zrovna mluví, a ta se
sama přihlásí: rozsvítí se přílivovou barvou, nadechne a zase
ztlumí. Ne blikání — ukázání prstem. Scéna přepážek jím putuje
zdola nahoru (pánevní dno → bránice → hrudní vstup), scéna lebky
po švech.

**Odkazové popisky se poprvé kreslí.** `Stage.project()` počítal
`cw = pr[11] * ez`, tedy −ez, a hned pod tím zahazoval všechno
s `cw ≥ 0` — jenže −ez je pro každý bod PŘED kamerou kladné.
Projekce tedy vracela `null` vždycky a `labels` se nikdy
nevykreslily. Scény tím přišly o všechna pojmenování struktur.

**Delší objektiv.** Fov 0,58 → 0,46 a kamera o kus dál. Bližší
konec tělesa se přestal nafukovat, proporce sedí a scéna vypadá
vyfotografovaná, ne vyrenderovaná.

**Mlha má barvu plátna.** Obě scénická plátna stojí na
`--surface` (bílá), mlha přitom mířila k `--bg`. Vzdálená hrana
podložky se proto nikdy nerozplynula. Mlha zároveň začínala na
1,55 jednotky — blíž než kamera — takže zmlžovala samotný model
a všechno vypadalo vybledle. Teď začíná až za modelem (3,6) a
míří k barvě plátna.

**Pozor na velikost podložky.** Musí být tak velká, aby její
hrana padla až za mlhu, a zároveň dost malá, aby se nedostala
k daleké ořezové rovině: tam už hloubkový buffer nerozezná horní
stranu desky od spodní a z celé scény je televizní sníh.
Šestnáct krát čtrnáct je mezi tím.

**Sekce „Čeho se nebát“ je celá nová.** Místo ležící figury
s rukama je v každé scéně jedna věc, kterou má člověk v hlavě,
když se bojí — a ta je vymodelovaná pořádně: složená mikina
a boty vedle, mince na makro kůži, jehla v přeškrtnutém
kolečku, bublina s řečí, která se ztiší, osmiúhelník. Nic
abstraktního: kdo se dívá bez textu, pozná, o čem to je.

---

## 1 · HERO — kříž

**Poloha spočítána, ne odhadnuta.** Postava je v ramenou nejširší
0,184 od osy. Kříž má rameno 0,30 × měřítko; při středu 0,330
a měřítku 0,34 leží jeho vnitřní hrana na 0,228 — mezi ním
a ramenem tedy zůstane 0,044, čtvrtina poloviční šířky těla.
Vnější hrana končí na 0,432; plátno hero sekce má poměr 520/908,
takže při FOV 0,72 a vzdálenosti 2,179 je vidět ±0,470. Kříž se
vejde i po nádechu a probliknutí, kdy se nafoukne o 8,5 %.

**Kdo posune kterékoli z těch čísel, musí výpočet zopakovat** —
platí v `anatomy-mesh.js` (buildCross) i `anatomy-3d.js` (CROSS).

**Probliknutí** není zhasnutí a rozsvícení, ale pruh světla, který
křížem projede zdola nahoru. Oko čte pohyb světla po tělese jako
materiál, kdežto rovnoměrné rozsvícení jako kontrolku. Náběh
90 ms, dozvuk 0,62 s. Silné při zastavení rytmu, slabé při každém
průchodu vlny.

## 2 a 3 · OBĚ SEKCE ANIMACÍ

### Materiály a světlo (`stage.js`)
Tříbodové studiové světlo, které se drží KAMERY, ne scény —
ateliérový fotograf taky nepřestavuje světla pokaždé, když otočí
modelem. Materiály mají podpovrchový rozptyl (kost, kůže,
chrupavka, tkáň, látka, kov, kůže boty), barevné zapuštění (stín
nikdy není šedý), obrysové světlo a filmový grading: měkká křivka,
zeleň do stínů, teplo do světel, vinětace.

### Anatomie (`parts.js`)
- **Hrudní koš** — nejčastější chyba je udělat z žeber šroubovici.
  Skutečný koš má u každého žebra vlastní šířku, vlastní spád
  a mezi obratlem a bokem ÚHEL, ostrý ohyb dozadu. Plus chrupavky
  a žeberní oblouk.
- **Lebka** — staví se z příčných řezů, ne z warpované koule; jen
  tak jde ohlídat, že klenba je vysoká, spánek plochý a báze
  zúžená. Švy se počítají ze STEJNÉ plochy (`skullPoint`), takže
  na lebce leží z definice.
- **Chodidlo** — mělo o polovinu menší šířku, než noha má, a jeho
  paprsky končily na 0,74 délky (přední třetina byla uvnitř
  prázdná). Obojí opraveno; klenba se zvedá jen na vnitřní straně.
- **Týlní otvor** — visel 0,047 pod klenbou a četl se jako oční
  jamka. Teď leží v bázi.
- **Kost křížová** — prohnutá ve dvou směrech, s otvory.

### Kompozice
Kamera zkalibrována empiricky: **yaw 0 = pravý bok, π/2 = zezadu,
3π/2 = zepředu.** Každá scéna má vlastní `target` a `dist`.

Ruce se staví do vlastní sítě, posadí se na místo a měkkou
podlahou (`Mesh.press`) se jim zploští bříška prstů o kůži — dotyk
je dotyk, ne průnik ani vznášení.

### Popis scény (`run3d.js`)
Scéna vrací seznam dílů: síť + materiál (+ pořadí, + matice).
Runner nemusí vědět, co ta síť představuje. Díky tomu se dá scéna
přestavět, aniž by se sáhlo do runneru.

---

# Druhá vlna úprav

## 0 · Nadpisové písmo — Newsreader

Nadpisy přešly ze Switzeru na serif. Písmo je **self-hosted**,
ne z Google CDN: staženo ze zdroje, instancováno na jednu
tloušťku (400) a jednu optickou velikost (44), ořezáno na týž
subset jako Switzer (342 znaků) a převedeno do woff2. Vyšlo
26 + 28 kB, tedy stejný řád jako zbytek `fonts/`. Licence OFL
leží vedle jako `fonts/newsreader-OFL.txt`.

Kurzíva uvnitř nadpisu je TÁŽ rodina, jen skloněný řez.
Sentient zůstává v zásobníku jako záloha, ale nadpis už
nemíchá dvě serifové rodiny v jednom řádku.

**Proklad je spočítaný, ne odhadnutý.** Na Newsreaderu je
nejvyšší bod řádku dotažnice „k“ (+0,727 em) a nejnižší ocas
„y“ (−0,249 em). Dva řádky se dotknou při 0,976 em, proto
`--lh-h1: 1`. Původních `.93` bylo pro grotesk bez háčků.
Prostrkání povoleno z −.03em na −.018em: serif se nesmí
stahovat jako grotesk, slily by se serify sousedních písmen.

## 1 · HERO — tři řádky

Nadpis „Tělo ví / kudy zpět / k rovnováze“ se stupňovitým
odsazením (.22 / .78 / 0 em). Poslední řádek stojí nejdál
vlevo — tam, kam se oko po pádu věty vrací.

Velikost je vlastní, ne z tokenu: nadpis stojí v sedmi z
dvanácti sloupců a v `--fs-h1` by mu zbývala třetina sloupce
prázdná. Strop 8rem je spočítaný z reálných šířek glyfů —
nejdelší řádek měří 4,83 em, v nejužším místě dvousloupcové
mřížky je k dispozici 780 px. Pod 820 px se mřížka sklápí
a nadpis dostane jiný násobek (11vw) i strop.

Maska řádku (`.line-mask`) je ořez; serif má pod účařím
dotažnice, takže bez `padding-bottom: .16em` by se „kudy zpět“
uřízlo o y a p.

Scény nervové soustavy se úprava nedotkla.

## 2 · POSUN → VYZNÁNÍ

Tři karty s kresbami zmizely. Mezi rejstříkem obtíží nad
sekcí a ciferníkem pod ní byl třetí ovládací panel; stránka
byla sled ovladačů bez nádechu. Zbyl velký text, který se
rozsvěcuje po slovech podle scrollu (`js/modules/creed.js`).

Tempo je sdělení: sekce tvrdí, že tělo potřebuje čas. Kdyby
naskočila naráz, tvrdila by to jen slovy.

`shift.js` a jeho CSS blok jsou smazané, ne osiřelé.

## 3 · KOLO — jen tři možnosti

Sada „momentů“ uvnitř každé části (0–5, 5–15 …) zmizela.
Kdo se ptá, co ho čeká, potřebuje tři odpovědi, ne třináct.
Obsah momentů se slil do jednoho odstavce na sloupec; mrtvé
CSS `.wbeat*` je pryč.

## 4 · JEDEN RENDERER PRO OBĚ SEKCE

Ciferník na úvodní stránce a kolo v kapitole Průběh byly dva
různé kusy kódu: kolo poctivé 3D, ciferník prstenec složený
ze šestnácti vrstev posunutých o pixel dolů. Vypadaly jinak
a značka tím ztrácela jednotu.

Renderer je teď jeden — `js/modules/wheel-core.js`, vytažený
ze `session-wheel.js` beze změny matematiky (tatáž projekce,
týž malířův algoritmus, totéž poloviční Lambertovo světlo).
`session-wheel.js` i `clock.js` jsou nad ním tenké obsluhy.

**Obměna ciferníku je záměrná a malá:**
- výseče se nevysunují, jen prosvětlují — po ploše jezdí
  ukazatel a vyskočená výseč by mu podjela pod nohama;
- popisky na podstavě nesou jména fází, ne holá čísla
  (proto má `fit()` u varianty s popisky větší okraj);
- nepřehraná část leží pod závojem, takže se kruh před očima
  zaplňuje.

`wheel-core.js` musí být v `KJ_LAZY` PŘED oběma moduly.
Poměr `.clock__dial` a `.wheel__disc` (1 / .84) drží
pohromadě s výpočtem výřezu — mění se obojí naráz.

---

# Třetí vlna úprav

Pět zadaných bodů. Jako vždycky: ověřeno renderem (headless Chromium
+ WebGL), ne odhadem. Ke každému bodu je napsané i **proč** — aby se
příště nemusela znovu hledat příčina.

## 1 · HERO — hrudní koš, záběr a kříž

### Žebra: příčina nebyla tam, kde to vypadalo

Zadání říkalo, že žebra vypadají jako pavoučí nohy. Byly to tři
nezávislé věci najednou:

1. **Chyběl úhel žebra.** Křivka měla pět bodů a vedla od obratle
   plynulým obloukem dopředu. Skutečné žebro jde z hlavičky přes krček
   **dozadu**, tam se v *angulus costae* ostře stočí a teprve pak míří
   dopředu. Ten ohyb je nejzazší bod celého koše a je to on, co dělá
   záda široká. Bez něj z koše zbude žebřík.
2. **Kreslila se s krytím 0,34 a vypnutým zápisem hloubky.** Průsvitná
   žebra se navzájem prosvítala a zbyly z nich tmavé vlasové obrysy.
   Teď je vrstva neprůhledná a hloubku zapisuje: přední žebro zakryje
   zadní. Že je to druhá struktura a ne kraniosakrální osa, se pozná
   **tónem** — o stopu chladnějším a tmavším —, ne krytím.
3. **Hlavní viník ale nebyla žebra, ale nervy.** Dvacet čtyři míšních
   kořenů vystřelovalo z páteře do stran jako rovné paprsky. Přesně to
   dělalo tu siluetu. Mezižeberní nerv přitom nikam netrčí: vyjde
   z otvoru, obtočí se pod spodní hranu žebra a běží s ním dopředu.

Tvar žebra je proto vytažený do jedné funkce **`ribShape(i, sd)`** —
používá ji hrudní koš i nervy. Nerv tak leží na kosti z definice,
ne shodou okolností. Kdo přeladí koš, přeladí i nervy.

**Co v koši přibylo:** chrupavky (prvních sedm párů na hrudní kost,
osmý až desátý do **žeberního oblouku**, poslední dva volné), lopatky
zakřivené ve dvou směrech, a přední konec dříku posunutý blíž ose.
Ten poslední bod je drobnost s velkým dopadem: u pátého žebra je konec
od hrudní kosti sotva polovina toho, co žebro měří v nejširším místě.
Když seděl dál (0,66 rozpětí), musela to chrupavka dohnat dlouhou
šikmou spojnicí a přední stěna hrudníku byla mříž křížících se tyček.

**Lopatky leží na z −0,094**, ne −0,058. Úhel žebra sahá u T7 na
z ≈ −0,082; při −0,058 deska prorazila mezi žebry dopředu a zepředu
z ní byl bílý trychtýř uprostřed hrudníku.

### Záběr je busta, ne figurka

Kamera z 2,179 na **1,56**, střed z 0,21 na **0,415**. Vidět je od
temene po kost křížovou — tedy přesně kraniosakrální osa, o které web
mluví. Hrudní koš je v ploše zhruba čtyřikrát větší.

Čísla drží pohromadě a nedají se měnit po jednom:

```
půlvýška = tan(FOV/2) · DIST = 0,3762 · 1,56 = 0,587
střed 0,415  →  vidět y od −0,172 do +1,002
temeno je 0,980, nad ním tedy zbývá 0,022 vzduchu
půlšířka = 0,587 · (680/780) = 0,512
vnější hrana kříže = 0,352 + 0,108 = 0,460   ✓ vejde se
```

Poměr **680/780 musí souhlasit s `aspect-ratio` u `.nerve`**
v `css/_l1.css`.

**Rozplynutí dolního konce** se přesunulo z −0,60/−0,34 na
**−0,20/+0,02** a hlavně přestalo jít přes zrno. Zrno patří jen
k vyvolávání scény (hrana odkrytí se má rozstříknout); u svislého
rozplynutí z něj byl na dolní hraně popel. Teď: reveal ditherem,
fade krytím.

**Porcelánová skořepina** má užší obrysové světlo (Fresnel 2,7 → 4,2).
Široký Fresnel zaplnil celou oblinu a z těla byla plná figurína; úzký
nechá svítit jen hranu a kostra uvnitř je konečně vidět. Odvrácená
stěna se navíc **na hlavě** ztlumí o 62 % — prosvítala skrz přední
a v místě obličeje z ní byl tmavý ovál.

### Kříž

- **Netočí se.** Místo rovnoměrné rotace (`T · 0,30`) se houpe ve dvou
  nesouměřitelných periodách, dohromady ±17°. Otáčející se symbol je
  logo; tenhle má stát vedle postavy a dýchat s ní.
- **Tep.** Dvojitý úder jako srdce každých 4,4 s — ostrý náběh,
  pomalé doznění. Silné probliknutí zůstává vázané na still point.
- **Hlubší** (0,075 → 0,115 měřítka). Tenká destička se při pomalém
  natáčení ztrácela do čárky.
- **Kreslí se NEPRŮHLEDNĚ a s ořezem odvrácených ploch.** Tohle byla
  nejdéle hledaná chyba: kříž byl průsvitný a kreslil se na jeden
  zátah bez řazení trojúhelníků, takže se přes čelní plochu
  prosvítala jeho vlastní zadní stěna. Na renderu z toho byla
  **hvězda paprsků vybíhajících ze středu** — vypadalo to jako vada
  plochy. Objem teď nese světlo a fazeta, ne průhlednost.
- **Radiální spád se počítá ve fragmentu, ne ve vrcholu.** Kříž má
  dvanáct rohů s velmi různým poloměrem (hrot ramene ×1, vnitřní roh
  ×0,5); interpolace `length()` mezi vrcholy dělala z plochy
  paprskovou hvězdu i bez průhlednosti.
- **Dvě světla místo jednoho.** S jediným zdrojem kříž zhasl pokaždé,
  když se odvrátil, a mezi dvěma polohami byl znatelně tmavší.

### Strážce výkonu má o stupeň navíc

Odvrácená stěna porcelánu je nejdražší vrstva scény — kreslí se přes
celou siluetu podruhé. Na slabším stroji padá jako první; teprve když
ani to nestačí, scéna se vzdá celá a zůstane statická kresba.

## 2 · ÚVODNÍ STRÁNKA — předěl místo dlouhého odstavce

Sekce „Nejde o to vydržet víc“ byla jeden odstavec velkým serifem přes
půl stránky. Poctivý, ale na výšku zabral dvě obrazovky a mezi
rejstříkem obtíží a kolem sezení to bylo zdržení.

Teď je to **jediná mělčina úvodní stránky** (`--surface-2`): nadpis
přes celou šířku, struna a pod ní tři krátké sloupce. Stejný obsah,
třetinová výška. Třídu `tide-in` musela odevzdat sekce nad ní — dva
stejné pruhy pod sebou by splynuly v jeden a předěl by zmizel.

### STRUNA (`js/modules/thread.js`)

Napjatá je inkoustová a chvěje se dvěma stojatými vlnami. Jak sekce
projíždí výřezem, povolí do měkkého průvěsu, zezelená a začne dýchat
ve sdíleném rytmu webu. **Dá se chytit a pustit** — brnknutí se
rozeběhne po struně na obě strany.

Dvě věci, které stojí za zapamatování:

**Průvěs se zadává v pixelech, ne v procentech.** U mělkého oblouku
platí `ΔL ≈ 8·d²/(3·L)`, takže „povol o 5,8 %“ znamená na 1 200 px
široké struně průvěs **176 px** — struna vytekla z plátna. Klidová
délka se proto počítá z cílové hloubky a mění se s šířkou; na mobilu
je průvěs stejně hluboký jako na monitoru.

**Není to řetěz s pevnou délkou, ale pružina k cílovému tvaru.**
Tuhá vazba by na 1 200 px potřebovala desítky iterací, aby se
nenatáhla; při osmi se protahovala tak, že průvěs stejně vytekl.
Takhle zůstane fyzika tam, kde je k něčemu — v doběhu, přehoupnutí
a v tom, jak se brnknutí rozeběhne po struně.

`creed.js` a jeho CSS blok jsou smazané, ne osiřelé.

## 3 · KOLO SEZENÍ NA ÚVODNÍ STRÁNCE

Ciferník je pryč. Měl dva problémy:

- **Rozjížděl se sám.** Kdo přišel na sekci, viděl pohyb, který si
  nevyžádal, a než přečetl první odstavec, text se pod rukama
  přepnul. Automat, který předběhne čtenáře, není ukázka.
- **Dal se chytit kdekoli.** Sedmdesát pět poloh na kruhu vypadá jako
  přesnost, ale odpovědi jsou tři.

Úvodní stránka má teď **totéž kolo jako kapitola Průběh** — týž
renderer, tři výseče, tři panely, nic se nehýbe samo. `clock.js`
i celý blok `.clock*` v `_l1.css` jsou smazané.

`session-wheel.js` umí navíc **šipky a odečet „02 / 03“**. Jsou
nepovinné (existují jen tam, kde jsou v HTML) a jejich jediná práce je
říct „tohle se přepíná a části jsou tři“ dřív, než na to člověk přijde
sám. Bez nich vypadá kolo jako obrázek. Krajní šipka nemizí, jen
zešedne a vypadne z tabulátoru — mizející tlačítko posouvá sousedy.

## 4 · STRÁNKA O MNĚ

Zadaný text je souvislé vyprávění o šesti odstavcích. Jako šest
odstavců pod sebou je to kniha; kdo si vybírá terapeuta, knihu nečte.
Každý odstavec má proto svou sekci, svůj nadpis a svůj obraz:

| Věta zadání | Sekce |
|---|---|
| „Jmenuji se Katka…“ | představení, portrét, písková plocha |
| „…sestra / Somatic Experiencing…“ | dvě desky vedle sebe se stopami |
| „…je most, který propojuje…“ | **most**, který se dokreslí |
| „…spojené nádoby… tělo si pamatuje…“ | nádoby + panel příčina → důsledek |
| „V bezpečném prostoru…“ | mělčina, jedna věta, dvě fotky |
| „Těším se na společnou cestu.“ | závěr tam, kde stránka začala |

Nic se z textu neztratilo a nic se nepřidalo. Opraveny dva překlepy
ze zdroje: `kranosakrální` → `kraniosakrální`, `Somatic experiencing`
→ `Somatic Experiencing`.

**Most se opravdu postaví.** Slovo, na kterém definice stojí, je
„most“ — tak tam stojí dva pilíře (TĚLO a MYSL) a oblouk, který se
mezi nimi dokreslí scrollem. Po oblouku přechází dotek z jedné strany
na druhou. Pozor: `cx`/`cy` toho bodu **musí být nula** — `offset-path`
posouvá celý prvek, takže vlastní souřadnice by se k dráze přičetly
a bod by odletěl mimo obrázek.

Cestou opravena stará chyba: popiska fotky ležela **uvnitř** `.photo`,
které má pevný poměr stran a `overflow: hidden`, takže text seděl přes
fotku. Přidán obal `.figure`.

## 5 · ŠEDÉ PÍSMO

`--ink-4` (#97A099) měl na základní ploše kontrast **2,41 : 1**
a přitom nesl skutečný text: číslovky 01/02/03, odečty pod koly,
popisky pod grafy. Pro tečku nebo linku je to v pořádku, pro písmeno
ne.

Přibyl token **`--ink-meta` (#4E5A55)**:

```
--bg 6,46 · --surface 7,20 · --surface-2 6,03 · --sand 5,85
```

Je záměrně **tmavší než `--ink-3`**, přestože stojí „níž“ v hierarchii:
nese nejmenší řezy na webu (0,68–0,75 rem) a drobný text potřebuje
větší kontrast, ne menší. `--ink-4` zůstává jen kresbě — tečky, linky,
ikona placeholderu.

Vedle toho: všechna vložená `color: var(--ink-3)` na celých větách
→ `--ink-2` (8,45 : 1), a **text kreslený do canvasu** na kolech
dostal `--ink-meta` — tam kontrast nikdo nespočítá, tak si ho hlídáme
sami (bylo 3,9 : 1 při 10,5 px).

**Ověřeno auditem**, který projde všech sedm stránek, spočítá kontrast
každého textového uzlu proti jeho skutečnému pozadí a nahlásí, co
neprojde AA. Všech sedm prochází.

> Poznámka pro toho, kdo bude audit psát znovu: `color-mix()` vrací
> `color(srgb 0,05 0,36 0,28)` s čísly 0–1, ne `rgb()` s 0–255. Bez
> rozlišení obou zápisů měří audit nesmysly a hlásí falešné poplachy
> na chipech.

## Smazáno, ne osiřelé

`js/modules/clock.js`, `js/modules/creed.js` a CSS bloky `.clock*`,
`.essence2`, `.triad*`, `.creed__text/__w/__aside`. K žádnému z nich
už neexistují značky ani skript. `_l1.css` se zkrátil z 849 na 490
řádků.

---

# Třetí kolo úprav

Čtyři zadané body. Vše ověřeno mimo prohlížeč (parser GLSL ES 1.0,
mock WebGL, textový diff), ne odhadem.

## 6 · PŘEDĚL NA ÚVODU — věta, kterou projde vlna

Sekce „Nejde o to vydržet víc“ byla nadpis ve dvou řádcích u levého
okraje mřížky. Fungovala, ale nebyl to okamžik — byl to mezinadpis.

**Co se změnilo:**

- Výrok stojí **přes celou šířku stránky**, mimo dvanáctisloupcovou
  mřížku a bez odsazení o pruh linky dechu. Je to jediná věc, kterou
  má člověk z předělu odnést, tak stojí sám uprostřed.
- Plocha zůstala `--surface-2`. Změnil se **způsob přechodu**: tvrdé
  hrany `1px solid var(--line)` nahradil gradientní náběh shora
  i zdola (`--band-top` / `--band-bot`, s variantou
  `.band--after-sand` pro sousedství s pískovou plochou). Platí to
  pro všechny takové sekce na webu, ne jen pro tuhle.
- Věta se rozsvěcuje **slovo po slovu podle scrollu** (rodina VLNA,
  viz DESIGN.md 6). Nejde o odložený `fade-in`: první věta po
  průchodu vlny **ztmavne zpátky** na 42 % jasu, „přestat držet“
  zůstane svítit v přílivu. Sazba udělá to, co věta tvrdí.
- Dovětek („Nic se do těla nevkládá ani neodebírá…“) přišel z patky
  nahoru a přichází až za vlnou. V patce by se na jedné obrazovce
  četl dvakrát.

**Kontrast ztlumeného slova:** `#6F7872` na `#E9ECE5` = **3,87 : 1**.
Sazba předělu má 33–85 px, tedy „large text“ — AA vyžaduje 3 : 1.

**Fail-safe:** bez skriptu, při `prefers-reduced-motion` i kdyby modul
spadl, je `--lit` rovno 1 a `--hot` nule — plný inkoust, žádný příliv.

Nový soubor: `js/modules/say.js`, `css/_l6.css`.

## 7 · HERO — kreslená verze už neproblikne

V plátně hero sekce leží dvě verze postavy: prostorová (WebGL)
a plochá kreslená (`assets/nerve-figure.svg`). Kreslená je v HTML
proto, aby stránka nikdy nebyla prázdná — jenže se stihla ukázat
dřív, než se scéna rozběhla, a návštěvník viděl na první vteřinu
jiný, jednodušší model.

Skript v `<head>` teď nasadí třídu `nerve-boot`, která kresbu skryje,
pokud je WebGL k dispozici a uživatel pohyb chce. Sundá ji:

- `giveUp()` v `anatomy-3d.js` — když WebGL selže, shader se
  nesestaví nebo scéna spadne pod hranici výkonu,
- pojistka po **6 s**, kdyby se skript vůbec nenačetl.

Šest vteřin je schválně hodně: lepší chvíli prázdné světelné pole
než dva různé modely za sebou.

## 8 · HERO — postava dostala děj

Scéna byla technicky správná a dramaturgicky mrtvá: postava se
vyvolala, dýchala a jednou za čtyřicet vteřin se zastavila. Čtyři
změny, každá řeší konkrétní výtku.

**Nájezd kamery (0,1–3,7 s).** Kamera stojí o 0,46 dál a natočená
doprava a krychlovým doběhem se usadí. Divák nevidí obrázek, který se
objevil, ale záběr, který se ustavil. Vzdálenost se smí jen
zvětšovat — rám je spočítaný na to, aby se postava právě vešla.

**Vlákno mezi hrudní kostí a křížem.** Kříž stál vedle postavy jako
druhý obrázek na témže plátně. Teď při zastavení rytmu vyjede od
hrudní kosti jiskra, za 0,62 s doletí ke kříži — **a teprve její
dopad kříž rozsvítí**. Pořadí je celý rozdíl: světlo někam *došlo*.

Vlákno je vlas o poloměru 0,004 (`buildLink` v `anatomy-mesh.js`).
Parametr `s` se po sestavení přepisuje na podíl na dráze — `Mesh.vert`
ho dopočítává z ypsilonu, což je správně pro páteř, ale ne pro skoro
vodorovné vlákno: jiskra by se rozsvítila celá naráz. Kreslí se bez
hloubkového testu, tedy přes porcelán.

**Kříž svítí zpátky na tělo.** Co svítí, musí něco osvětlovat.
Přivrácená strana těla chytá zelený odraz (`uXpos`/`uXamt`
v souřadnicích pohledu, ne scény — normály tam už jsou). Změna, které
si nikdo nevšimne a bez které to vypadá jako koláž.

**Dlaň.** Kurzor není ukazovátko — je to teplo ruky. Gaussovka
v `gl_FragCoord`, amplituda 0,22, poloměr 32 % výšky plátna. Na
dotykových zařízeních vypnutá. Jediné místo scény, kde má návštěvník
přímý vliv na tělo — a na webu o doteku je to ta správná interakce.

K tomu **vlna uvolnění**: při zastavení se od kosti křížové rozeběhne
kulová vlna a projede tělem. Podélná vlna říká „něco tudy jde“,
kulová říká „povolilo to“.

### Dramaturgie — nejdůležitější oprava

Still point byl každý třetí průchod, tedy poprvé kolem 40. vteřiny.
V hero sekci nikdo čtyřicet vteřin nesedí; **nejlepší část scény
návštěvník nikdy neviděl.**

```
 0,1–3,7 s   nájezd kamery, postava se vyvolává od temene
 9,4 s       vlna dojede ke kosti křížové → rytmus se zastaví
 9,5–10,1 s  po vlákně běží světlo ke kříži
10,1 s       kříž vzplane, haló se rozpíná, tělem jde vlna uvolnění
10,5 s       pulz se předá lince dechu u levého okraje stránky
11,5 s       rytmus se rozbíhá
36,7 s       další zastavení
```

První vlna je nad úsekem zpomalení 2,2× rychlejší, zastavení je pak
každé druhé. Zpomalení před zastavením změkčeno z 0,42 na 0,62 — při
původní hodnotě trvalo samo o sobě 8,5 s, tedy víc než celý zbytek
průchodu, a scéna v té části působila, že se zasekla.

**Haló kreslí CSS, ne plátno.** Prstenec se má rozpínat i za hranu
scény; v CSS to nestojí nic a přes Web Animations API se dá spustit
znovu. JS mu každý snímek dopočítá promítnutý střed kříže
(`--halo-x` / `--halo-y`). Světelné pole pod postavou navíc dostalo
`--nerve-bloom` (0–1), takže při zastavení se rozsvítí celý prostor
kolem postavy, ne jen model.

### Opraveno při té příležitosti

`pow((vLY - uSweep) * 3.4, 2.0)` v shaderu kříže. `pow()` je pro
záporný základ podle specifikace GLSL **nedefinovaná** a na části
ovladačů vrací nulu — pruh světla pak přeběhl jen horní půlku kříže.
Druhá mocnina se teď počítá násobením. Stejný tvar použit i ve všech
nových výrazech.

### Jak to bylo ověřeno bez prohlížeče

- **Parser GLSL ES 1.0** (`@shaderfrog/glsl-parser`) na všech
  dvanácti shaderech — projdou.
- **Kontrola `varying`**: každý, který čte fragment, deklaruje vertex,
  a se stejným typem.
- **Kontrola uniformů**: každý `uXxx` použitý v těle shaderu je
  deklarovaný.
- **Mock WebGL**: 60 s scény po 16 ms bez jediné výjimky, 37 900
  kreslicích volání, 11 vrstev ve snímku s vláknem, haló spuštěno
  dvakrát, kříž se promítá na 83,7 % šířky plátna (tedy uvnitř).

## 9 · O MNĚ — z rozsypaného čaje zpátky do sazby

Stránka měla sedm sekcí a v šesti běžela jiná hračka: dva
kardiogramy, most, který se dokresluje, spojené nádoby, do kterých se
klepe, osa s odpočítáváním let, dvě desky s certifikáty. Každá věc
byla sama o sobě obhajitelná. Dohromady to bylo šest různých návodů
k obsluze na jedné stránce o jednom člověku — a to je přesně to místo
webu, kde se čtenář rozhoduje o důvěře.

**Teď je to sazba.** Jeden rytmus, který se opakuje: text vlevo /
fotka vpravo, fotka vlevo / text vpravo (`.spread` / `.spread--flip`).
Nikde text vycentrovaný na střed. Fotky se rozestoupily tak, aby
každá stála vedle svého textu — dřív byly dvě vedle sebe v jednom
pruhu.

**Zrušeno zdvojení.** Výcviky byly na stránce dvakrát: jednou jako
měřicí osa s odpočítáváním let, podruhé jako dvě desky s certifikáty.
Čtenář to četl dvakrát a podruhé se ptal, jestli jsou to jiné. Teď je
to jedna tabulka `doba · název · popis · certifikát` (`.cv`).

**Text zůstal do posledního slova.** Ověřeno textovým diffem proti
původní verzi — 82 kontrolovaných řetězců, žádný nechybí. Zmizely jen
popisky, které patřily ke smazaným mechanismům („Klepněte do nádoby —
hladina se srovná sama“).

Smazané moduly: `js/modules/story.js`, `track.js`, `diptych.js`.
K žádnému už neexistují značky.

---

# Čtvrtá vlna úprav

Tři zadané body. Vše ověřeno renderem (headless Chromium + WebGL),
ne odhadem. Kde je v textu číslo, bylo změřené.

## 1 · HERO — z modelu se stal ZÁBĚR

### Dosvit (bloom) — `anatomy-3d.js`

Scéna se nově nekreslí na obrazovku, ale do textury. Z ní se čtyřmi
průchody vytáhne světlo, rozmaže (dvakrát, v poloviční šířce)
a přičte zpátky.

**Práh není luminance.** Plocha webu je světlá a porcelán skoro bílý —
kdyby se prahovalo jasem, rozzářilo by se celé tělo a z figury by byla
mlha. Prahují se dvě věci, které v téhle scéně opravdu svítí:

1. **odlesky** — jen to, co přeteče přes bílou porcelánu
2. **zeleň** — `max(0, g − max(r, b))`, tedy nervy, mok, vlákno, kříž;
   bílá projde nulou

Síla záře se váže na děj: `0,50 + crossPulse·0,34 + flash·0,48 +
ripAmt·0,80`. V klidu je jemná, při zastavení rytmu naplno. Přidaná je
i podpixelová chromatická aberace (0,0022) — nemá být vidět, má být cítit.

**Fail-safe:** když se cíl vykreslení nezaloží (starý ovladač, málo
paměti) nebo klesne kvalita, kreslí se rovnou na plátno a scéna přijde
jen o zář. Obsah má přednost před efektem.

### Prach ve světle — `progMote`

Jediná věc, která z renderu udělá fotografii, je vzduch. 150 zrnek ve
válci kolem postavy:

- **tři vrstvy hloubky** — blízká je větší a měkčí (náhrada hloubky
  ostrosti), daleká drobná a ostrá
- **tři nesouměřitelné periody** driftu na osu — dráha nikdy neopíše
  viditelný kruh a nikdy se nesejde do taktu
- **třpyt** s vlastní frekvencí pro každé zrnko — zrnko se natáčí
  a chytá světlo, nesvítí trvale
- při **vlně uvolnění** se rozsvítí a odplaví od kosti křížové;
  je to součást děje, ne tapeta
- naskočí až v 1,6 s — nejdřív model, pak místnost, ve které stojí

### Světlo vody — složení

Dvě pomalé vlnoplochy přes celý záběr, amplituda **2,5 % jasu**. Pod
prahem, kde by si toho někdo všiml jako efektu; nad prahem, kde je scéna
nasvícená mrtvým světlem. Násobí se krytím, takže plocha stránky se
nikdy nezakalí.

### Materiály

**Kost** dostala tříbodový ateliérový rig místo jednoho světla: klíč
zleva shora kreslí tvar, **teplá** výplň zprava otevírá stín (nikdy do
bíla — proto stín nikdy nezešedne), obrysové zezadu odlepí kost od
plochy stránky. Světla se drží kamery, ne scény. K tomu podpovrchový
rozptyl (`pow(dot(V,−L), 3.2)·0,55 + pow(wrap, 4)·0,30`) — bez něj
vypadá každý model jako sádra.

**Skořepina** dostala protisvětlo (rozptyl v ose pohledu proti klíči)
a duhovou hranu — úzký pás mezi obrysem a plochou, o krok teplejší než
mělčina.

### Lebka — proč byla zelená

Nebyla to barva materiálu. Bylo to `mix(col, uGlow, vLit·0,70)`, tedy
**vlna, která prosvítí kost zevnitř**, se stropem 72 %. Na žebru
a obratli je to správně — tenká struktura, „tudy něco jde“. Lebka je ale
největší hladká plocha ve scéně, a když se celá zbarví, nevznikne světlo
procházející kostí; vznikne zelené vejce.

Změřeno pixel po pixelu: střed lebky měl **(139, 212, 184)**, tedy
sytější zeleň než mělčina webu. Nad 0,66 výšky se proto podíl srazí na
38 % (a v porcelánu nad ní na 42 %). Po úpravě: **(211, 239, 223)** —
klenba se rozsvítí, ale zůstane porcelánová.

*Postup diagnostiky pro příště:* zdroj se našel tak, že se `uGlow`
dočasně přebarvil na červenou a scéna se vyrenderovala. Lebka
zčervenala → zdroj je glow, ne materiál ani dosvit.

### Kříž — z cedule klenot

| | dřív | teď |
|---|---|---|
| poměr šířky k délce ramene | 0,36 | **0,273** |
| poloviční hloubka | 0,115 · S | **0,098 · S** |
| fazeta (podíl z půlky ramene) | 31 % | **37 %** |
| měřítko | 0,36 | **0,335** |
| rozkyv | ±17° | **±13°**, o třetinu pomaleji |

Poměr 0,36 je proporce lékárenské cedule — tlustý plný kříž, který se
čte jako piktogram. Útlá ramena dají tvaru vzduch a hraně délku, na
které se má co odrazit.

Materiál je nově **sklo se světlem uvnitř**: jádro skoro bílé, barva
roste s tloušťkou (`smoothstep(0.10, 1.02, vR)`), plus dvě kaustické
stopy podél ramen, které se ve středu ruší — jinak by tam vznikl
přepálený bod.

**Kontrola rámu:** vnější hrana teď končí na 0,352 + 0,30·0,335 =
**0,4525**; při FOV 0,72 a vzdálenosti 1,56 je vidět **±0,512**. I po
nádechu (+3 %) a probliknutí (+5,5 %) zbývá rezerva. Vnitřní hrana leží
na 0,2515, rameno postavy končí na 0,184 — mezera **0,0675**, tedy
o polovinu víc vzduchu než dřív.

### Kompozice a kamera

- `.nerve` výška **67 → 78 svh** (strop 760 → 880 px). Postava stála
  uprostřed prázdného sloupce jako figurka na polici.
- přesah přes okraj sazby **14 → 54 px** — z „dvou sloupců vedle sebe“
  je jeden obraz s textem v něm
- `.hero` min-height 86 → **94 svh**
- třetí, širší světelné pole pod postavou (dvě úzká končila dřív než ona
  a dole vystupovala z ničeho)
- **dech v ose objektivu**: vzdálenost kamery kolísá o 0,9 %,
  v protifázi k hrudníku. Vidět to není, cítit ano.
- **dolní rozplynutí** FADE −0,20…0,02 → **−0,13…0,055**. Doběh končil
  až za spodní hranou výřezu, takže stehna byla uříznutá rovnou čarou.
  Teď se rozplynou nad ní.

## 2 · PŘEDĚL — sazba, která povolí

`js/modules/thread.js` a všechna jeho CSS pravidla jsou **smazaná, ne
osiřelá.** Struna fungovala, ale mezi rejstříkem obtíží a kolem sezení
to byl třetí ovladač a stránka se stala sledem hraček. Předěl má být
nádech.

Zbyla sazba — a ta dělá totéž, co dělala struna:

| stav | co se stane |
|---|---|
| **drží** | slovo je sevřené: `scale(.986)`, povytažené o 0,024 em nahoru, krytí 18 % |
| **rozsvítí** | čelo vlny → plný inkoust, na okamžik barva přílivu |
| **pustí** | sedne o 0,062 em, rozevře se na `scale(1.012)`, `blur(.7px)`, krytí spadne o 46 % |

Povolí jen slova první věty. *„přestat držet“* zůstane svítit. Nic z toho
nemění layout — je to transform a filtr, tedy práce pro grafickou kartu.

Pod výrokem stojí **decrescendo**: čtyři odstavce, každý o stupeň menší
a tišší. Není to hierarchie důležitosti, je to hlasitost — nervový
systém, který se usazuje. Odstavce se překrývají (rozestup 1,15 slova je
menší než šířka čela vlny), takže je to jeden plynulý výdech, ne
odpočítávání.

Celý blok navíc dýchá sdíleným rytmem webu (11 s, `KJ.breathWave`),
amplituda 0,4 %.

**Text se rozšířil** o třetí řádek („Ani být silnější.“), o předvětí,
které návštěvníkovi nejdřív dá za pravdu, a o větu, na které sekce
stojí: *„Nebezpečí dávno pominulo. Ramenům to nikdo neřekl.“*

## 3 · O MNĚ — z modulu článek

Stránka byla poctivá, ale **roztažená**: sedm sekcí, každá s odsazením
přes celý výřez, mezi nimi nakreslený most, diagram v rámečku a dvě
desky vedle sebe. Obsahu na deset obrazovek, scrollu na dvacet.

Teď je to **sazba článku**:

- čtyři kapitoly s číslicí a serifovým nadpisem
- **iniciála** na začátku každé kapitoly — jediné místo, které říká
  „tady se začíná číst“. Výška je přesně tři řádky: `font-size: 3.1em`
  × `line-height: .84` = 2,6 em, což je při prokladu 1,62 rovné tři
  řádky sazby.
- jeden sloupec textu na míru 62–68 znaků
- **vsuvky na pravém okraji** (sloupce 10–12) místo rámečků uprostřed
  textu — marginálie nepřeruší čtení a je pořád po ruce
- obrazy jako **předěly**, ne jako výplň; popisek na dvou koncích jako
  v knize
- svislý rytmus zhruba o třetinu hustší

Most i diagram „příčina → důsledek“ jsou pryč — přepsané do vět. Pohyb
zůstal jen na kapitolových hlavičkách a obrazech: kdo se rozhoduje
o důvěře, nemá si hrát, má číst.

**Chyba, která stojí za zapamatování:** výrok „Věřím, že tělo a mysl
jsou spojené nádoby“ měl `max-width: 22ch` na obálce. Jednotka `ch` se
počítá z velikosti prvku, na kterém stojí — na obálce (1 rem) z toho
vyšlo 176 px a věta se rozsypala na sedm řádků. Míra patří k písmu: na
odstavci (3,6 rem) dá týž zápis 630 px a věta stojí na třech.

---

## Smazané soubory a pravidla

- `js/modules/thread.js` — i se zápisem v `KJ_LAZY` v `index.html`
- pravidla `.thread*` v `css/_l5.css`
- pravidla `.creed__cols`, `.creed__col*`, `.creed__no`, `.creed__hint`
  v `css/_l5.css` (nahradila je `.creed__flow` / `.creed__mv`
  v `css/_l6.css`)
- sekce `.claim*` a `.mech*` už na stránce O mně nestojí; CSS zůstalo,
  protože `.claim` používá i jiná stránka
