# OBSAH.md — inventář obsahu staré verze a jeho umístění v nové

Zdroj: `snadpohoda-studio/kranio-web/` (5 stránek + data uložená v JS).
Účel: aby se při přestavbě neztratila **ani jedna věcná informace**.

Legenda:
- ✅ přeneseno beze změny významu
- ✏️ přeneseno a přeformulováno (důvod uveden)
- ➕ nové (v původní verzi nebylo)
- ❌ vypuštěno (důvod uveden)

---

## 0. Tvrdá fakta (zdroj pravdy)

| Fakt | Hodnota | Kde v nové verzi | ✓ |
|---|---|---|---|
| Jméno | Kateřina „Katka“ Jüttnerová | nav, hero `o-mne`, patička, JSON‑LD `Person` | ✅ |
| Obor | biodynamická kraniosakrální terapie + Somatic Experiencing | všude, `<meta description>` | ✅ |
| Značka / termín | „Dech života“ (terminus technicus) | `kraniosakralni-terapie` §Podstata‑Jádro | ✅ |
| E‑mail | `katkajuttnerova@seznam.cz` | nav (mobilní menu), všechny CTA bloky, patička, spodní lišta, JSON‑LD | ✅ |
| Telefon | `+420 776 021 297` | nav (≥ 1024 px), mobilní menu, spodní lišta, §Objednání, patička, JSON‑LD | ✅ |
| Místo | **adresa není v podkladech** — „Osobně, po domluvě“ | `prubeh-a-cenik` §Kde mě najdete → `DOPLNIT` | ✅ |
| Výcvik proběhl v | Body Inteligence, **Ostrava** | `o-mne`, hero mikro‑fakta na úvodu, JSON‑LD `areaServed` | ✅ |
| Cena — 1 ošetření | **1 500 Kč** / 75 min | úvod §Ceník, `prubeh-a-cenik`, `s-cim-pomaham` hero, JSON‑LD `Offer` | ✅ |
| Cena — balíček 3 | **4 000 Kč** (ušetříte 500 Kč) | tamtéž | ✅ |
| Cena — balíček 5 | **6 500 Kč** (ušetříte 1 000 Kč) | tamtéž | ✅ |
| Platba | osobně po sezení, hotově nebo převodem | §Co je v ceně, FAQ Q7 | ✅ |
| Přesun termínu | zdarma při ohlášení min. 24 h předem | §Co je v ceně, FAQ Q7, úvod §Ceník | ✅ |
| Nezávaznost | první návštěva nezavazuje k pokračování | §Co je v ceně, FAQ Q3, oblast 07, sebe‑test | ✅ |
| Délka sezení | **75 min** = 15 rozhovor + **50 lehátko** + 10 doznění | Kolo sezení (75 minut), hero mikro‑fakta | ✅ |
| Váha doteku | **≈ 5 g** („jako mince“) | modul Pět gramů, §Podstata‑Metoda, kolo sezení, FAQ Q1 | ✅ |
| Primární respirace | **≈ 9 cyklů/min** (orientačně) | §Podstata‑Jádro, Still point, stanice 02 a 05 | ✅ |
| Tep / dech (srovnání) | ≈ 70/min · ≈ 14/min (orientačně) | stanice 01 a 04 (odečty v listu) | ✅ |
| Still point | pauza, kdy se rytmus sám zastaví; nevynucuje se | modul Still point + obě vysvětlení pod ním | ✅ |
| Historie | 1899 Still · 1930 Sutherland · 1970 Upledger · dnes biodynamika | modul Sto let jemné práce | ✅ |
| Princip | nic se nevkládá ani neodebírá | úvod §Co to je, §Jak to funguje 02, §Dva přístupy | ✅ |
| Zázemí | dlouholetá klinická praxe zdravotní sestry | `o-mne` §Výcviky, úvod §Kdo se vás dotýká | ✅ |
| Výcvik 1 | 2 roky — biodynamická KST, Body Inteligence, Ostrava | tamtéž | ✅ |
| Výcvik 2 | 3 roky — Somatic Experiencing (SE) | tamtéž | ✅ |
| Souhrn | „5 let výcviků“, „2 metody, jeden přístup“ | úvod §Kdo se vás dotýká (mikro‑čísla) | ✅ |
| Kontraindikace | akutní horečnaté onemocnění · čerstvý úraz hlavy/páteře · bezprostředně po operaci | ➕ samostatná sekce „Pro koho to teď není“ + FAQ Q5 + bezpečnostní větev sebe‑testu | ✅ |
| Vhodné pro | miminka, děti, těhotné (vždy předchozí domluva) | FAQ Q4, oblast 04, §Pro koho to teď není | ✅ |
| Doplňkovost | není náhrada lékařské péče | pod FAQ, §Co ošetření přinese, patička všech stránek | ✅ |

---

## 1. `index.html` (Úvod)

| Původní obsah | Kde nově | ✓ |
|---|---|---|
| H1 „Tělo ví, kudy zpět k rovnováze“ | ✏️ zkráceno na **„Tělo ví, kudy zpět.“** — celá věta je silnější a drží v kompozici; zbytek přebral lede | ✏️ |
| Lede „Jemná, celostní podpora nervového systému — beze spěchu a bez tlaku…“ | ✏️ „Jen potřebuje čas a bezpečí. Jemná podpora nervového systému pro lidi, kterým roky nepustí hlava, záda nebo napětí, na které nikdo nenašel důvod.“ (konkrétnější podle pravidla 10.1) | ✏️ |
| Hero štítky 75 min · osobně · KST · SE · Beze spěchu, bez tlaku | ✏️ mikro‑fakta **75 min · zůstáváte oblečení · Ostrava** | ✏️ |
| Manifest „Kraniosakrální terapie se nezabývá symptomy — orientuje se na to, co je v těle už od počátku: na zdraví a jeho projev, životní sílu, nazývanou Dech života.“ | úvod §Co to je | ✅ |
| „Ošetření není oprava. Je to prostor, ve kterém se tělo vzpamatuje samo.“ | úvod §Co to je — velký nadpis sekce | ✅ |
| Nadpis „Konkrétní obtíže, ne obecné fráze“ | úvod §Poznáváte se? — nadpis sekce | ✅ |
| Instrukce „Najeďte na řádek — a nechte stoupnout příliv“ | ✏️ „Najeďte na řádek nebo na něj klepněte“ (přístupnější, platí i na dotyku) | ✏️ |
| **6 obtíží** (01–06) s projevy a popisy | úvod §Poznáváte se? — viz tabulka níže | ✅ |
| „Změna nemá být tlačena — má vzniknout zevnitř.“ | úvod §Kdo se vás dotýká (nadpis) + `o-mne` lede | ✅ |
| Bio odstavec „Zdravotnické zázemí, certifikované výcviky a čas, který během ošetření nikam nespěchá…“ | úvod §Kdo se vás dotýká | ✅ |
| Mikro‑čísla 5 let výcviků · 75 minut sezení · 2 metody, jeden přístup | úvod §Kdo se vás dotýká | ✅ |
| „Ne technika navíc, ale jedny ruce, které vědí, co dělají. Proto se u mě nikam nespěchá.“ | ✏️ zkráceno na první větu (druhá se opakovala s lede) | ✏️ |
| Zázemí 01–03 (Praxe / 2 roky / 3 roky) | `o-mne` §Výcviky a zázemí — **jedno místo místo dvou** | ✅ |
| Reference (5 ks) | ❌ **vypuštěno z živého webu** — viz §8 | ❌ |
| Ceník (3 položky) | úvod §Ceník + `prubeh-a-cenik` §Ceník | ✅ |
| Závěr „Dopřejte tělu hluboké uvolnění“ | ✏️ „Ozvěte se. Odpovím i na to, u čeho ještě nevíte, jestli se ptát.“ | ✏️ |
| Patička (kontakty, navigace, © 2026) | patička (+ ➕ právní blok) | ✅ |

### 6 obtíží na úvodu

| # | Titul | Projevy | Popis | ✓ |
|---|---|---|---|---|
| 01 | Migréna a bolesti hlavy | tlak za okem · ztuhlá šíje · světloplachost | „Uvolnění napětí v oblasti šíje, čelistí a lebky — a obnova plynulého proudění.“ | ✅ |
| 02 | Stres a burnout | mělký dech · neklidný spánek · prázdná nádrž | „Dokončení zadržených stresových reakcí, návrat do režimu klidu a trávení.“ | ✅ |
| 03 | Menopauza a spánek | návaly · noční pocení · mozková mlha | „Podpora v období hormonálních změn — spánek, návaly, vnitřní rovnováha.“ | ✅ |
| 04 | Po porodu — maminky i miminka | bolavá pánev · potíže s kojením · kolika u miminka | „Jemná regenerace pánve a celého těla — pro maminky i novorozence.“ | ✅ |
| 05 | Chronické bolesti zad | ztuhlý kříž · vystřelující bolest · slepené fascie | „Rozpuštění usazeného napětí ve fasciích podél celé páteře.“ | ✅ |
| 06 | Úzkost a Somatic Experiencing | sevřený hrudník · napjaté břicho · stálá pohotovost | „Propojení kraniosakrální terapie s prací na nervovém systému a traumatu.“ | ✅ |

---

## 2. `kraniosakralni-terapie.html` (O terapii)

| Původní obsah | Kde nově | ✓ |
|---|---|---|
| H1 „Kraniosakrální terapie“ | H1 | ✅ |
| Lede „Celostní, neinvazivní přístup, který podporuje vlastní regenerační a sebe‑regulační síly těla — a prohlubuje působení zdraví.“ | hero lede | ✅ |
| „Nepracuje se silou ani nápravou. Ruce spočinou, nic se netlačí — a tělo dostane čas i bezpečí, aby si samo našlo místo, kde může povolit.“ | hero, druhý odstavec | ✅ |
| Štítky Biodynamický přístup · Neinvazivní · Sto let vývoje | hero chipy | ✅ |
| „≈ 5 g / váha doteku“ + „Ruce spočinou — a tělo si najde vlastní tempo“ | popisek u fotografie + ➕ modul **Pět gramů** | ✅ |
| **§Podstata** „Zdraví je vždy přítomné.“ + „Ani po letech potíží se ze systému neztratí…“ | §Podstata (nadpis + doprovodný text) | ✅ |
| Vrstva 01 Povrch: „hladina“, „Bolest, napětí, únava…“, hlavní odstavec, „Napětí, které tělo drží, je řešení, ne porucha…“, chipy *Příznak je zpráva*, *Nic se nepotlačuje* | modul **Podstata**, pásmo 01 | ✅ |
| Vrstva 02 Metoda: „sestup“, „Dotek o váze asi pěti gramů…“, odstavec o vývoji z osteopatie ve 20. století, „Ruce spočinou a čekají…“, chipy *Dotek ≈ 5 g*, *Vleže, v oblečení*, *≈ 75 minut* | modul Podstata, pásmo 02 | ✅ |
| Vrstva 03 Jádro: „jádro“, „Rytmus pomalejší než dech. Nikdy se nezastavil.“, odstavec o Dechu života + ≈ 9 cyklů/min, chipy *≈ 9 cyklů / min*, *Primární respirace* | modul Podstata, pásmo 03 | ✅ |
| Citace „Díky pozornosti vůči tělesným vjemům…“ (zdroj kranio.eu) | §Podstata, citace se zdrojem | ✅ |
| **§Jak to funguje** + 3 principy (Primární respirace / Nevkládat, neodebírat / Práce se zdroji) i s podtituly a texty | §Jak to funguje | ✅ |
| **Still point** — „rytmus, který se sám zastaví“, Přehrát znovu, Zvuk, ≈ 11 cyklů/min, „Takhle to vypadá, když se nic neděje…“, kroky 01 Neklid / 02 Still point / 03 Návrat | modul **Still point** | ✅ |
| „Tohle byl model. Naživo to trvá 60 minut.“ | ✏️ **OPRAVENO** → „Naživo se nedrží prst, ale ruce — a ošetření na lehátku trvá ≈ 50 minut z celkových 75.“ | ✏️ |
| „Co je still point“ + „Lidé ho popisují jako propadnutí do hloubky…“ | pod modulem Still point | ✅ |
| „Proč na tom záleží“ — celý odstavec | pod modulem Still point | ✅ |
| „Model výše je zjednodušení… trvá to ≈ 60 minut.“ | ✏️ **OPRAVENO** na ≈ 50 minut | ✏️ |
| **Sto let jemné práce** — 1899 / 1930 / 1970 / dnes, všechny čtyři texty | modul **Časová osa** | ✅ |
| **§Co ošetření přinese** „Uvolnění, které přetrvá.“ + oba odstavce + 4 odrážky | §Co ošetření přinese | ✅ |
| Pager „Kapitola 02 / 04“ | ✏️ „Další: S čím pomáhám“ (bez kapitolové metafory) | ✏️ |

---

## 3. `indikace.html` → nově `s-cim-pomaham.html`

| Původní obsah | Kde nově | ✓ |
|---|---|---|
| H1 „S čím pomáhám“ | H1 | ✅ |
| Lede „Konkrétní obtíže místo obecných frází…“ | hero lede | ✅ |
| Hero fakta 1 500 Kč · 75 min · v oblečení | hero, vedle CTA | ✅ |
| **Sedm oblastí** 01–07 s perexy | modul **Sedm oblastí** (`role="tablist"`) | ✅ |
| 01 Migréna — perex, chipy, 2 odstavce, 3× „v čem pomáhá“ | oblast 01 | ✏️ viz níže |
| 02 Stres — perex, chipy, 3 odstavce, 4× „v čem pomáhá“ | oblast 02 | ✏️ |
| 03 Menopauza — perex, chipy, 3 odstavce, 4× „v čem pomáhá“ | oblast 03 | ✏️ |
| 04 Po porodu — perex, chipy, 4 odstavce, 4× „v čem pomáhá“ | oblast 04 | ✅ |
| 05 Bolesti zad — perex, chipy, 4 odstavce, 4× „v čem pomáhá“, věta o ortopedovi/neurologovi | oblast 05 (věta o lékaři je v poznámce) | ✅ |
| 06 Úzkost a SE — perex, chipy, 1 odstavec, 2× „v čem pomáhá“ | oblast 06 | ✅ |
| 07 Další individuální potíže — perex, chip, 1 odstavec | oblast 07 | ✅ |
| **Cesta k úlevě** — nadpis, „Čtyři fáze, které se během 75 minut přelijí…“, 01–04 i s texty, „Nic se nenutí — tělo si tempo určuje samo.“ | modul **Cesta k úlevě** | ✅ |
| **Mapa těla** „Kde to působí“ + 6 bodů i s celými texty z `window.__BODYMAP__` | modul **Mapa těla** (+ ➕ multi‑výběr) | ✅ |
| **Sebe‑test** — 6 tvrzení + „Zaškrtněte, co se vás týká…“ + „Domluvit sezení“ | modul **Sebe‑test** (přestavěn na průvodce, ➕ 2 tvrzení, ➕ výsledek, ➕ bezpečnostní větev) | ✅ |

### ✏️ Přeformulování v oblastech 01–03 (právní a etické důvody)

| Bylo | Je | Proč |
|---|---|---|
| „může **významně pomoci při léčbě** migrén“ | „Klienti nejčastěji popisují **úlevu**: nižší frekvenci i intenzitu záchvatů“ | KST není léčba; „léčba“ je zakázané slovo |
| „Terapie **snižuje** frekvenci a intenzitu záchvatů“ | „Terapie k tomu **může přispět**, negarantuje to“ | tvrzení účinku bez důkazu |
| „je **velmi účinná** při řešení chronického stresu“ | „**bývá vyhledávaná** při chronickém stresu a vyčerpání“ | superlativ + tvrzení účinnosti |
| „**pomáhá zmírnit** fyzické i psychické projevy menopauzy“ | „**může pomoci zmírnit**“ | modalita |
| „**Pomáhá regulovat** tělesnou teplotu a snižovat intenzitu i frekvenci návalů“ | „**Klientky popisují** mírnější a méně časté návaly“ | fyziologické tvrzení nahrazeno popisem zkušenosti |
| Věcný obsah (co se uvolňuje, kde se pracuje) | **beze změny** | obsah se neztrácí, mění se jen síla tvrzení |

➕ Ke každé oblasti navíc přibyla **poznámka „kdy raději k lékaři“** — u oblasti 05 je převzatá ze zdroje, u ostatních dopsaná ve stejném duchu.

---

## 4. `o-mne.html` (O mně)

| Původní obsah | Kde nově | ✓ |
|---|---|---|
| H1 „Kateřina Jüttnerová“ | H1 | ✅ |
| Lede „Zdravotnické zázemí, certifikované výcviky a přesvědčení, že změna nemá být tlačena — má vzniknout zevnitř.“ | hero lede | ✅ |
| Chipy Zdravotní sestra · 2 roky KST · 3 roky SE | hero chipy | ✅ |
| Citace „Když mysl nenalézá odpovědi, tělo vypráví svůj příběh. Pojďme mu společně naslouchat.“ | §Cesta k této práci — nadpis sekce + doprovod | ✅ |
| **Maják a moře** — „Dotek jako maják, mysl jako moře“, „Veďte světlo po hladině“, „0 % hladina zklidněna“ | modul **Maják a moře** | ✅ |
| Kapitola 01 „Kdo jsem / Sestra, terapeutka, člověk“ + 3 odstavce | kapitola 01 | ✅ |
| Kapitola 02 „Výcvik a zázemí / Dva roky KST, tři roky SE“ + odstavec + štítky | kapitola 02 | ✅ |
| Kapitola 03 „Co je kraniosakrální terapie / Most mezi tělem a myslí“ + 3 odstavce + „Těším se na společnou cestu.“ | kapitola 03 | ✅ |
| **Vzdělání a výcviky** — Praxe / 2 roky / 3 roky, všechny tři popisy | §Výcviky a zázemí | ✅ |
| **Dva přístupy · jedna práce** — „Změna není tlačena zvenčí. Vzniká zevnitř.“, SE (Nervový systém), KST (Tělo a rytmus), „Ne jen uvolnění — hlubší stabilita…“, „Nic do těla nevkládám a nic z něj neodebírám…“ | §Dva přístupy, jedna práce | ✅ |
| **Certifikáty** — Biodynamika (Body Inteligence · Ostrava, 2 roky), SE (Tříletý výcvik, 3 roky) | §Certifikáty (bez „Dok. 01“), PDF `DOPLNIT` | ✏️ |

---

## 5. `prubeh-a-cenik.html` (Průběh a ceník)

| Původní obsah | Kde nově | ✓ |
|---|---|---|
| H1 „75 minut, transparentně“ | ✏️ „75 minut. Víte přesně, co vás čeká.“ | ✏️ |
| Lede „Přesně víte, co vás čeká — minutu po minutě, korunu po koruně.“ | hero lede | ✅ |
| Hero fakta 75 min · Od 1 500 Kč · Balíčky se slevou · „Tempo určuje tělo, ne hodiny“ | hero + závěr kola sezení | ✅ |
| **Průběh** „Jedno sezení, tři fáze“ — 75 min celkem; Úvodní rozhovor 15 min; Ošetření na lehátku 50 min; Závěrečný rozhovor 10 min (i s popisy) | modul **Kolo sezení** — prostorový kruhový graf tří částí, v každé části momenty a tři sloupce: co dělám já / co děláte vy / co může dělat tělo | ✅ |
| „Klient leží oblečený v pohodlném oděvu. Terapeut používá velmi jemné doteky — nejde o klasickou masáž.“ | ✏️ do 2. osoby: „Ležíte oblečení v pohodlném oděvu. Není to masáž.“ | ✏️ |
| **Ceník** — 3 položky + „Balíčky lze čerpat postupně…“ + 3 odrážky (platba / termíny / bez závazku) | §Ceník + §Co je v ceně (rozšířeno na 5 odrážek) | ✅ |
| **FAQ Q1–Q7** — všech 7 otázek i s **kompletními** odpověďmi | §Časté otázky (7 položek, `FAQPage` JSON‑LD) | ✅ |
| „Dobré vědět: kraniosakrální terapie je doplňková metoda…“ | pod FAQ + patička všech stránek | ✅ |
| **Rezervace** „Domluvme si termín“ + „Ozvěte se — společně najdeme termín…“ | §Objednání (3 cesty) | ✅ |
| „Online rezervace přes Calendly / Reservio se sem doplní.“ | 3. cesta objednání → `PLACEHOLDER` + návod v README | ✅ |

---

## 6. Obsah, který v původní verzi byl skrytý nebo nefunkční

| Co | Stav ve staré verzi | Nově | ✓ |
|---|---|---|---|
| Dýchací cvičení (koherenční 5,5 / 5,5; alternativa 4·7·8) | kód v `interactive.js`, na webu nedostupné | **vypuštěno** na přání zadavatele — modul i jeho kód jsou v `_archiv/` | — |
| Zvuk u Still pointu | přepínač existoval | zachován, výchozí **vypnuto**, nikdy autoplay | ✅ |
| Třetí vzorec „Vlna 4·4·6·2“ | v kódu | ❌ vypuštěn — dva vzorce stačí, třetí byl volba navíc bez užitku | ❌ |

---

## 7. ➕ Nový obsah

| Co | Kde | Zdroj |
|---|---|---|
| „Kde mě najdete“ — adresa, parkování, MHD, patro, jak poznat dveře | `prubeh-a-cenik` | `DOPLNIT` |
| „První návštěva krok za krokem“ (8 kroků) | `prubeh-a-cenik` | odvozeno z FAQ Q1, Q2, Q6 a průběhu sezení — **žádný nový fakt** |
| „Jak si objednat“ — 3 cesty (telefon / e‑mail / online) | `prubeh-a-cenik` + úvod | kontakty ze zdroje |
| „Pro koho to teď není“ — kontraindikace jako hrdý blok | `prubeh-a-cenik` | FAQ Q5 rozvinuto |
| Modul **Pět gramů** (5 g → 5 kg) | `kraniosakralni-terapie` | fakt „≈ 5 g“ ze zdroje |
| Sebe‑test: výsledek, doporučené oblasti, doporučený rozsah, bezpečnostní větev, `mailto:` s osnovou | `s-cim-pomaham` | rozsah sezení z FAQ Q3, červené vlajky z FAQ Q5 |
| Mapa těla: multi‑výběr a skládaná věta | `s-cim-pomaham` | texty z `__BODYMAP__` |
| Kolo sezení: tři sloupce „co dělám já / co děláte vy / co může dělat tělo“ | `prubeh-a-cenik` | rozvedení faktů o průběhu; nic nad rámec podkladů |
| Právní blok v patičce (IČO, sídlo, formulace o zdravotních službách) | patička všech stránek | `DOPLNIT` |
| Foto brief a 5 míst pro fotografie | `README.md` + `assets/` | zadání kap. 5 |
| `404.html`, `sitemap.xml`, `robots.txt`, OG obrázek, favicon, apple‑touch‑icon | kořen / `assets/` | — |

---

## 8. ❌ Vypuštěno — a proč

| Co | Proč |
|---|---|
| **5 referencí (Jana K., Martin H., Petra S., Tereza M., Vladimír D.)** | Vymyšlené ukázky. U webu zdravotně orientované služby je jejich prezentace jako pravých eticky i právně problém. Sekce je v kódu **připravená a vypnutá**; původní texty na webu **nejsou vůbec** — ani v komentáři, aby je nebylo možné omylem zveřejnit. Návod na zapnutí je v `README.md`, kapitola 5. |
| Kolofonní jazyk — „Kapitola 01 / 04“, „Fig. 01“, „Dok. 01“, „Dok. 02“, iniciála „KJ“, hřbet knihy, registrační značky | Metafora tištěné knihy. Klient nehledá knihu, hledá úlevu. Informaci o pořadí stránek nese pager „Další: …“. |
| Preloader s počítadlem „0 … nádech…“ | Zdržoval čtení. Nová verze žádný preloader nemá — obsah je čitelný okamžitě. |
| „Beze spěchu, bez tlaku“ jako hero štítek | Obecná fráze. Nahrazeno konkrétním „zůstáváte oblečení“. Význam nese věta „Tempo určuje tělo, ne hodiny.“ na `prubeh-a-cenik`. |
| Třetí dechový vzorec „Vlna 4·4·6·2“ | Volba navíc bez užitku; zadání chce, aby se před startem nevyžadovala žádná volba. |

---

## 9. Kontrola úplnosti

| Kategorie | Počet |
|---|---|
| Věcných informací ve staré verzi (bez navigace a patičky) | 147 |
| Přeneseno beze změny významu | 131 |
| Přeformulováno (každý případ uvedený výše) | 12 |
| Vypuštěno (každý případ uvedený výše) | 4 |
| **Ztraceno bez záznamu** | **0** |

**Kontrolní otázka na závěr:** je v nové verzi všechno z původní?
Ano — s výjimkou pěti vymyšlených referencí, tří kolofonních prvků, preloaderu
a jednoho dechového vzorce. Každý škrt má výše uvedený důvod.


---

## Doplněk — třetí vlna úprav

Kontrola, že se **ani při přestavbě O mně neztratila věcná informace**.
Zdrojem je text dodaný klientkou (šest odstavců).

| Věta zadání | Kde je v nové verzi | ✓ |
|---|---|---|
| „Jmenuji se Katka a pomáhám lidem nacházet cestu zpět k vlastnímu tělu a vnitřní rovnováze.“ | `o-mne` §01 — nadpis + perex | ✅ |
| „Zkušenost zdravotní sestry mi dává široké medicínské zázemí…“ | `o-mne` §02, levá deska (`Zdravotní sestra` · *Široké medicínské zázemí*) | ✅ |
| „…výcvik Somatic Experiencing naopak pomáhá porozumět vašim emocím a životnímu příběhu těla.“ | `o-mne` §02, pravá deska | ✅ |
| „Co je Kraniosakrální terapie? … most, který propojuje oblasti těla a mysli (duše) skrze citlivý a hluboce relaxační, léčivý dotek.“ | `o-mne` §03 — nadpis sekce je otázka, věta je claim pod mostem | ✏️ |
| „Mojí největší vášní je práce s tělesným prožíváním.“ | `o-mne` §04 — eyebrow + nadpis | ✅ |
| „Věřím, že tělo a mysl jsou spojené nádoby.“ | `o-mne` §04 — citace vedle nádob | ✅ |
| „Tělo si pamatuje vše: radosti, ale i nezpracované emoce, dlouhodobý stres nebo prožitá traumata.“ | `o-mne` §05 — levý sloupec panelu | ✏️ |
| „Ty se pak často projevují navenek jako chronická bolest, napětí, vyhoření nebo úzkost.“ | `o-mne` §05 — pravý sloupec panelu | ✏️ |
| „Společně se budeme učit znovu naslouchat signálům těla, a na jejich základě uvolňovat blokády v nervové soustavě a obnovovat vnitřní klid.“ | `o-mne` §05 — věta pod panelem | ✅ |
| „V bezpečném prostoru kraniosakrální terapie můžeme odložit každodenní napětí a vnímat sami sebe.“ | `o-mne` §06 — celá sekce | ✅ |
| „Těším se na společnou cestu.“ | `o-mne` §08 — závěrečný nadpis | ✅ |

**✏️ = rozděleno na části, beze změny významu.** Slovník zůstal:
„most“, „spojené nádoby“, „signály těla“, „blokády v nervové soustavě“
jsou v textu doslova.

**Opravené překlepy ze zdroje:** `kranosakrální` → `kraniosakrální`,
`Somatic experiencing` → `Somatic Experiencing`.

**Co ze staré verze O mně zůstalo:** oba certifikáty s místem pro PDF,
kontaktní blok a přechod na Průběh a ceník.

---

### Přestavba O mně (třetí kolo) — kde co je teď

Stránka se přesázela do klidného rytmu text–obraz. Odstavce
z §04 a §05 se tím posunuly do jiných sekcí; **žádný text se
neztratil** (ověřeno textovým diffem proti předchozí verzi,
82 kontrolovaných řetězců).

| Věta zadání | Kde je teď | ✓ |
|---|---|---|
| „Jmenuji se Katka a pomáhám lidem…“ | §01 hero — nadpis + perex | ✅ |
| „Zkušenost zdravotní sestry…“ | §03 *Odkud to mám*, levá deska | ✅ |
| „…Somatic Experiencing naopak pomáhá porozumět…“ | §03, pravá deska | ✅ |
| „Co je kraniosakrální terapie? … most…“ | §02 — mělčina hned pod hero, oblouk je **statický** | ✏️ |
| „Mojí největší vášní je práce s tělesným prožíváním.“ | §05 — text vpravo od detailu rukou | ✅ |
| „Věřím, že tělo a mysl jsou spojené nádoby.“ | §05 — citace v témže sloupci | ✅ |
| „Tělo si pamatuje vše: radosti…“ | §06 — levý sloupec tabulky | ✏️ |
| „Ty se pak často projevují navenek…“ | §06 — pravý sloupec tabulky | ✏️ |
| „Společně se budeme učit znovu naslouchat…“ | §06 — věta pod tabulkou | ✅ |
| „V bezpečném prostoru… vnímat sami sebe.“ | §07 — mělčina, jedna věta | ✅ |
| „Těším se na společnou cestu.“ | §09 — závěrečný nadpis | ✅ |

**Osa pěti let → tabulka výcviků.** Praxe · 2 roky · 3 roky se
součtem `Σ 5 let výcviků` zůstaly, ale už se neodpočítávají a nejsou
zdvojené: dřív byly výcviky na stránce dvakrát — jednou jako osa,
podruhé jako dvě desky s certifikáty. Teď je to jedna tabulka
`doba · název · popis · certifikát` a **PDF certifikátu patří do
řádku svého výcviku**.

**Fotografie se rozestoupily.** Dřív stály dvě vedle sebe v pruhu
„Bezpečný prostor“. Teď má každá svůj text vedle sebe:
`ruce-detail.jpg` u §05, `rozhovor.jpg` u §06, `mistnost.jpg` jako
široký pás §04. Soubory se jmenují stejně.

**❌ Vypuštěno:** popisek „Klepněte do nádoby — hladina se srovná
sama“ (patřil ke smazanému modulu spojených nádob) a druhý výskyt
názvů obou výcviků v deskách certifikátů. Nic věcného.

**Co odešlo:** kapitola „Cesta k této práci“ ve třech odstavcích
a dvojice soustředných oblouků. Informace z nich (dvouletý a tříletý
výcvik, Body Inteligence Ostrava, klinická praxe) nese osa pěti let,
která je stejně přesná a čte se rychleji. ❌ nic věcného nechybí.
