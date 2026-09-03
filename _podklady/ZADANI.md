# ZADÁNÍ — úpravy webu Katka Jüttnerová (kkl-upraveny)

> Tohle je kompletní zadání pro Claude Code. Vzniklo z `postup.docx`
> (17 obrázků: 10 screenshotů webu + 6 fotek) a z upřesnění od zadavatele.
> Vše níže je ověřené proti aktuálnímu stavu souborů — čísla řádků sedí.

---

## PRAVIDLA PRÁCE — přečti první

1. **Nic si nedomýšlej.** Používej jen texty, které jsou doslova v tomto
   zadání. Když někde chybí podklad, nech `<span class="todo">DOPLNIT: …</span>`
   tak, jak je, a napiš mi to na konci. Nevymýšlej marketingové věty.
2. **Neměň design, layout ani CSS.** Jsou to čistě textové/obsahové změny
   a vkládání fotek do už připravených rámů.
3. **Zachovej konvence projektu:** `&nbsp;` po jednopísmenných předložkách
   a spojkách (`a`, `v`, `s`, `k`, `o`, `i`, `u`, `z`), české uvozovky `„…"`,
   pomlčka `—` (em dash) tam, kde už v textu je.
4. **Zachovej komentáře v HTML** (`<!-- FOTOGRAFIE 01 — … -->`). Jsou to
   navigační značky pro majitelku webu.
5. Po každém bloku úkolů si ověř, že jsi nerozbil strukturu — otevři stránku
   v prohlížeči (dev server / preview) a zkontroluj konzoli.

---

## ČÁST A — TEXTOVÉ ZMĚNY

### A1. `index.html` — hero perex (řádky 165–168)

**NAJDI:**
```html
<p class="lede hero__lede" data-reveal data-reveal-delay="120">
  Jen potřebuje čas a&nbsp;bezpečí. Jemná podpora nervového systému pro lidi,
  kterým roky nepustí hlava, záda nebo napětí, na které nikdo nenašel důvod.
</p>
```

**NAHRAĎ ZA** (původní věta se **maže**, nová ji nahrazuje):
```html
<p class="lede hero__lede" data-reveal data-reveal-delay="120">
  Hluboká změna nepotřebuje tlak, ale čas, klid a&nbsp;bezpečný prostor.
  Dovolte své hlavě vydechnout a&nbsp;tělu se nadechnout.
</p>
```

---

### A2. `s-cim-pomaham.html` — panel „01 Migréna a bolesti hlavy" (řádky 228–250)

Přepiš **perex i oba textové bloky**. Nadpisy `<h4>` **nech beze změny**.

**A2a — perex, řádek 235.** NAJDI:
```html
<p class="atlas__perex">Když hlava roky nepustí — a&nbsp;napětí drží v&nbsp;šíji, čelistech a&nbsp;lebce.</p>
```
NAHRAĎ ZA:
```html
<p class="atlas__perex">Když hlava potřebuje „vypnout".</p>
```
> Pozn.: v podkladu byl překlep „potřenuje" → správně **potřebuje**.
> Uvozovky použij české: `„vypnout"`.

**A2b — blok „Kde se napětí drží", řádky 239–242.** Nahraď obsah `<p>`:
```html
<p>Představte si hlavu jako přetlakovaný hrnec. Stres, únava, potlačené emoce
  a&nbsp;stažené svaly krku vytvoří v&nbsp;těle obrovské napětí. Výsledek je
  pulzující bolest, citlivost na světlo a&nbsp;sevření.</p>
```

**A2c — blok „Co klienti popisují", řádky 245–247.** Nahraď obsah `<p>`:
```html
<p>Pravidelná péče uvolňuje blokády kolem páteře a&nbsp;hlavy. Přináší jasnou
  mysl — bez pocitu těžkosti a&nbsp;více životní energie, která dříve odcházela
  na boj s&nbsp;bolestí.</p>
```
> Pozn.: v podkladu bylo „Přináší jasnou --- bez pocitu…" → zadavatel doplnil
> slovo **„mysl"** a tři pomlčky nahraď em dashem `—`.

**Nemaž** boční panel (`atlas__side`) — siluetu, chipy „Projevy", seznam
„V čem pomáhá", patičku panelu. Ty zůstávají.

---

### A3. Adresa v patičce — VŠECHNY stránky

Patička je duplikovaná v pěti souborech. Uprav ji **identicky ve všech**:

| Soubor | řádek `DOPLNIT: adresa` | řádek `DOPLNIT: IČO, sídlo…` |
|---|---|---|
| `index.html` | 850 | 870 |
| `kraniosakralni-terapie.html` | 731 | 750 |
| `o-mne.html` | 667 | 686 |
| `prubeh-a-cenik.html` | 682 | 701 |
| `s-cim-pomaham.html` | 1189 | 1208 |

**A3a — adresa.** NAJDI:
```html
<span style="color: var(--ink-2)">Osobně, po domluvě</span>
<span class="todo">DOPLNIT: adresa</span>
```
NAHRAĎ ZA:
```html
<span style="color: var(--ink-2)">Osobně, po&nbsp;domluvě</span>
<span>Prostor na&nbsp;čas</span>
<span>Seifertova 22, 638&nbsp;00 Brno-sever-Lesná</span>
```

**A3b — IČO a sídlo ÚPLNĚ ODSTRAŇ.** NAJDI:
```html
  ale nenahrazuje lékařskou péči ani stanovenou léčbu.
  <span class="todo">DOPLNIT: IČO, sídlo, formulace „Nejsem poskytovatel zdravotních služeb…"</span>
</p>
```
NAHRAĎ ZA (celý `<span class="todo">` smaž, disclaimer nech):
```html
  ale nenahrazuje lékařskou péči ani stanovenou léčbu.
</p>
```
> Zadavatel výslovně řekl: *„To ičo a sídlo tam úplně odstraň."*
> Nedoplňuj tam žádnou náhradní právní formulaci.

---

### A4. `prubeh-a-cenik.html` — sekce „Cesta k lehátku" (řádky 605–648)

Vyplň všech pět `DOPLNIT` v seznamu `<dl class="place__list">`:

**Adresa** (řádky 620–626) — NAJDI:
```html
<address>
  <span class="todo">DOPLNIT: adresa / město / patro</span><br>
  Zatím platí: <strong style="color: var(--ink)">osobně, po domluvě</strong>.
</address>
```
NAHRAĎ ZA:
```html
<address>
  Prostor na&nbsp;čas<br>
  Seifertova 22, 638&nbsp;00 Brno-sever-Lesná<br>
  Přízemí
</address>
```

**Parkování** (řádek 629):
```html
<dd>Využijte možnost parkování na parkovacích místech na hlavní ulici Seifertova.
  Obvykle je zde dostatek volných míst a&nbsp;parkování je v&nbsp;současné době
  bez modrých zón. K&nbsp;Prostoru na&nbsp;čas to pak máte pár kroků.</dd>
```
> Podklad byl psaný tykáním („máš"). Web vyká — proto **„Využijte" / „máte"**.

**MHD** (řádek 633):
```html
<dd>Zastávka Blažkova (linka 46 a&nbsp;81) — v&nbsp;těsné blízkosti,
  150&nbsp;m od Prostoru na&nbsp;čas.</dd>
```

**Patro a bezbariérovost** (řádek 637):
```html
<dd>Přízemí.</dd>
```
> Podklad říká jen „Přízemí". **Nedomýšlej** výtah ani bezbariérovost.

**Jak poznáte dveře** (řádek 641):
```html
<dd>Při příchodu zazvoňte na zvonek <strong style="color: var(--ink)">Prostor na&nbsp;čas</strong>.</dd>
```

**Mapa** (řádky 606–616) — NAJDI blok `<div class="place__map">` s `DOPLNIT: statická mapa`.
Zadavatel chce Google Maps. Udělej to **bez cookies třetích stran a bez iframe**
(tak, jak to popisuje původní placeholder) — statický obrázek/dlaždice není
k dispozici, takže:

- odstraň `<span class="todo">DOPLNIT: statická mapa bez cookies třetích stran</span>`
- odstraň větu „Až bude adresa známá, přibude sem statický obrázek mapy…"
- ponech ikonu špendlíku a **přidej odkaz**:

```html
<a class="link" href="https://www.google.com/maps/search/?api=1&amp;query=Seifertova+22%2C+638+00+Brno-sever-Lesn%C3%A1"
   target="_blank" rel="noopener">Otevřít v&nbsp;Google Mapách</a>
<p class="small" style="color: var(--ink-2); max-width: 34ch">
  Prostor na&nbsp;čas, Seifertova 22, Brno-Lesná.
</p>
```

> **DŮLEŽITÉ:** nevkládej `<iframe>` Google Maps. Nahrával by cookies třetích
> stran a web žádnou cookie lištu nemá. Pokud si myslíš, že je iframe nutný,
> **zeptej se mě nejdřív**, sám ho nevkládej.

---

### A5. Ostrava → Brno (rozhodnuto zadavatelem)

Web má na sedmi místech „Ostrava" jako místo praxe. Adresa je ale v Brně.
**Přepiš tato místa na Brno:**

| Soubor:řádek | Co je tam teď | Na co změnit |
|---|---|---|
| `index.html:6` | `<title>Kraniosakrální terapie Ostrava — …` | `Kraniosakrální terapie Brno — …` |
| `index.html:7` | meta description `…Ostrava a okolí.` | `…Brno a okolí.` |
| `index.html:84` | `"areaServed": { "@type": "City", "name": "Ostrava" }` | `"name": "Brno"` |
| `index.html:179` | `<li>Ostrava</li>` | `<li>Brno</li>` |
| `o-mne.html:135` | `<span class="chip">Ostrava</span>` | `<span class="chip">Brno</span>` |
| `o-mne.html:237` | `<span>Pracovna — Ostrava</span>` | `<span>Pracovna — Brno</span>` |
| `o-mne.html:600` | `<span>Ostrava a&nbsp;okolí</span>` | `<span>Brno a&nbsp;okolí</span>` |

**NEMĚŇ** tato místa — tam Ostrava zůstává, protože jde o místo výcviku:
- `o-mne.html:54` → `"alumniOf": { "@type": "Organization", "name": "Body Inteligence, Ostrava" }`
- kdekoli text `BODY INTELIGENCE · OSTRAVA` v tabulce výcviků a v sekci Certifikáty

Zkontroluj i `sitemap.xml`, `404.html` a JSON-LD v ostatních stránkách,
jestli tam „Ostrava" jako lokalita není taky (grep `Ostrav`), a stejným
klíčem to oprav. Soubory `README.md`, `OBSAH.md`, `DESIGN.md`, `ZMENY-3D.md`
jsou dokumentace — ty **neupravuj**, jen `README.md` viz úkol C1.

---

## ČÁST B — FOTOGRAFIE

### Jak fotky vypadají a kam patří

Náhledy fotek (nízké rozlišení, jen pro identifikaci) jsou ve složce
`_podklady/nahledy/`. Ostré originály dodá zadavatel do `assets/`.

| Náhled | Co je na fotce | Cílový soubor | Kde se objeví |
|---|---|---|---|
| `A--katka-portret.png` | Katka v zahradě, sedí, ruce přeložené na koleni, levandule | `assets/katka-portret.jpg` | `index.html` — sekce „Změna nemá být tlačena" |
| `B--katka-portret-omne.png` | Katka v zahradě, drží v ruce bílé květy | `assets/katka-portret-omne.jpg` | `o-mne.html` — hero nahoře |
| `C--ruce-detail.png` | Katka za lehátkem, dívá se do objektivu, makramé v pozadí (na šířku) | `assets/ruce-detail.jpg` | `o-mne.html` — dvojice obrazů, **vlevo** |
| `D--rozhovor.png` | Katka stojí za lehátkem, dívá se dolů na klientku (na výšku) | `assets/rozhovor.jpg` | `o-mne.html` — dvojice obrazů, **vpravo** |
| `E--mistnost.png` | Detail dvou rukou na tváři klientky, deka (na šířku) | `assets/mistnost.jpg` | `o-mne.html` — široký pás za I. kapitolou |
| `F--ruce-prace.png` | Ruce držící hlavu klientky shora (na výšku) | `assets/ruce-prace.jpg` | `o-mne.html` — vedle II. kapitoly |

### B0. Stav — fotky už v repozitáři jsou

Pět z šesti fotek je **nasazených a připravených** v `assets/` (zmenšené na
2000 px delší strany, JPEG q85):

| Soubor | Rozměr | Velikost |
|---|---|---|
| `assets/katka-portret.jpg` | 1333×2000 | 391 KB |
| `assets/mistnost.jpg` | 2000×1333 | 394 KB |
| `assets/ruce-detail.jpg` | 2000×1333 | 428 KB |
| `assets/rozhovor.jpg` | 1333×2000 | 307 KB |
| `assets/ruce-prace.jpg` | 1333×2000 | 359 KB |

**Chybí `assets/katka-portret-omne.jpg`** (Katka v zahradě s bílými květy).

Než začneš, ověř to:
```bash
ls -la assets/*.jpg
```

Pro každou fotku, která v `assets/` **není**, nech placeholder beze změny
a napiš mi to na konec reportu. **Neodkazuj na neexistující soubor** — rozbil
by se tím obrázek na produkci. Konkrétně: pokud `katka-portret-omne.jpg`
pořád chybí, nech placeholder v `o-mne.html:146` být a **nesahej po
`katka-portret.jpg` jako náhradě** — to je rozhodnutí zadavatele, ne tvoje.

### B1. Vložení fotky — postup

Rámy jsou v HTML připravené. Vždycky nahraď **jen vnitřek** `<div class="photo__ph">…</div>`
(nebo celý `photo__ph`) za `<img>`. Komentář `<!-- FOTOGRAFIE nn — … -->` nech nad tím.

Vzor:
```html
<figure class="photo photo--4x5">
  <!-- FOTOGRAFIE 01 — portrét 4:5 → assets/katka-portret.jpg. Brief v README.md. -->
  <img src="assets/katka-portret.jpg"
       alt="Kateřina Jüttnerová sedí v zahradě mezi kvetoucími keři"
       width="1200" height="1500" loading="lazy" decoding="async">
</figure>
```

Pravidla:
- `alt` piš popisně česky (co je na fotce), ne „portrét" nebo „foto".
- `width`/`height` uveď v poměru rámu (4:5 → 1200×1500, 3:2 → 1500×1000,
  16:7 → 1600×700). Slouží jen k rezervaci místa, nemusí sedět na pixel.
- `loading="lazy"` u všech kromě fotky, která je vidět hned po načtení.
- Pokud je rám zabalený v `<figure class="figure">` s popiskou pod ním
  (o-mne — dvojice obrazů, široké pásy), měň **jen vnitřek `<div class="photo …">`**
  a `<figcaption>` nech být.

### B2. Konkrétní místa

| # | Soubor:řádek | Obal | Třída rámu (poměr) | Fotka |
|---|---|---|---|---|
| 01 | `index.html:593` | `<figure class="photo photo--4x5">` | 4:5 | `assets/katka-portret.jpg` (náhled A) |
| 01 | `o-mne.html:146` | `<div class="photo photo--4x5">` | 4:5 | `assets/katka-portret-omne.jpg` (náhled B) ⚠ viz B3 |
| 02 | `o-mne.html:225` | `<div class="photo photo--wide">` | 16:7 (na mobilu 3:2) | `assets/mistnost.jpg` (náhled E) |
| 03 | `o-mne.html:263` | `<div class="photo photo--4x5">` | 4:5 | `assets/ruce-prace.jpg` (náhled F) |
| 04 | `o-mne.html:319` | `<div class="photo photo--3x2">` | 3:2 | `assets/ruce-detail.jpg` (náhled C) |
| 05 | `o-mne.html:333` | `<div class="photo photo--3x2">` | 3:2 | `assets/rozhovor.jpg` (náhled D) |

> Existující třídy jsou `photo--4x5`, `photo--3x2` a `photo--wide`
> (`css/components.css:275–276`, `css/_l5.css:558`). **Žádnou novou třídu
> nevytvářej.** Poměr rámu drží `aspect-ratio`, obrázek `object-fit: cover`
> (`css/components.css:270`).

**Bez podkladu — placeholder NECH BÝT:**
- `kraniosakralni-terapie.html:135` → `assets/ruce-hlava.jpg` (FOTOGRAFIE 02)
- `o-mne.html:588` → `assets/katka-pracovna.jpg` (FOTOGRAFIE 06)

### B3. ⚠ Dvě různé fotky, jeden název — musíš přidat nový soubor

Původně měl `index.html` i `o-mne.html` používat **stejný** portrét
`assets/katka-portret.jpg`. Zadavatel ale dodal **dva různé** portréty.
Proto:

- `index.html:594` → `assets/katka-portret.jpg` (náhled A — ruce na koleni)
- `o-mne.html:147` → `assets/katka-portret-omne.jpg` (náhled B — s květy)

Uprav taky komentář nad rámem v `o-mne.html:147` z
`→ assets/katka-portret.jpg` na `→ assets/katka-portret-omne.jpg`.

### B4. ⚠ Poměry stran nesedí — jen zaznamenej, neřeš sám

Dodané fotky mají jiný poměr, než jaký rám očekává:

| Rám | Očekává | Fotka je | Dopad |
|---|---|---|---|
| `o-mne:225` mistnost | 16:7 (velmi široký) | ~3:2 | Ořízne se dost shora a zdola |
| `o-mne:333` rozhovor | 3:2 (na šířku) | na výšku ~2:3 | Ořízne se výrazně — fotka je otočená proti rámu |
| `o-mne:263` ruce-prace | 4:5 | ~2:3 | Mírný ořez, v pohodě |

Rámy mají `object-fit: cover`, takže se nic nerozbije — jen se fotka ořízne.
**Neměň CSS ani poměry rámů.** Do závěrečného reportu napiš, že u `rozhovor.jpg`
by bylo lepší dodat fotku na šířku, nebo změnit rám na 4:5.

---

## ČÁST C — CO UŽ JE HOTOVÉ (jen ověř, needituj)

### C1. Certifikáty jako samostatná sekce

V `postup.docx` byl požadavek: *„Ty certifikáty ještě vyloženě udělat jako
sekci samostatnou."* — **Tohle už v repozitáři hotové je.** Ověř a nech být:

- `o-mne.html:484` → `<section class="section--tight" id="certifikaty">` — samostatná sekce
- `o-mne.html:443, 456` → odkazy z tabulky výcviků `href="#certifikaty"`
- `assets/certifikaty/` → `bi-diplom.jpg`, `bi-diplom-nahled.jpg`, `ease-sep.jpg`, `ease-sep-nahled.jpg`
- `o-mne.html:573` → lightbox `certbox__frame`

Screenshot v dokumentu byl z **starší verze** (`ukazka-one.vercel.app`),
kde sekce ještě chyběla. **Nic tady nepřepisuj.** Jen zkontroluj, že
odkazy z tabulky výcviků na `#certifikaty` fungují a že se lightbox otevře.

### C2. README.md — aktualizuj tabulku fotek

V `README.md` (řádky 105–116) je tabulka „Kam nahrát fotky". Doplň do ní
nový řádek pro `assets/katka-portret-omne.jpg` a oprav popis u
`assets/katka-portret.jpg`, aby tam nestálo „Úvod + stránka O mně",
ale jen „Úvod". Nic jiného v README neměň.

---

## ZÁVĚREČNÁ KONTROLA

Po dokončení spusť a nahlas výsledek:

```bash
grep -rn "DOPLNIT" --include=*.html . | grep -v styleguide.html
```

Očekávaný zbytek (a nic víc):
- `kraniosakralni-terapie.html:135` — ruce na hlavě klienta (chybí fotka)
- `o-mne.html:588` — Katka v pracovně 16:7 (chybí fotka)

```bash
grep -rn "Ostrav" --include=*.html --include=*.xml .
```
Očekávaný zbytek: pouze `Body Inteligence, Ostrava` (místo výcviku).

Pak otevři preview a projdi všech pět stránek — zkontroluj konzoli na chyby
a že se fotky načítají (žádné 404 v Network).

**V reportu mi napiš:**
1. Které fotky chyběly v `assets/` a placeholder tam zůstal.
2. Kde jsi musel něco odhadovat, i kdyby to bylo maličké.
3. Které `DOPLNIT` placeholdery zbyly a proč.
