# FIFA67

Fotbal velkých hlav v prohlížeči (neoficiální hra kamarádů, nemá nic společného s organizací FIFA ani se sérií her FIFA). Panáčci s velkými hlavami hlavičkují a kopou na nočním stadionu. Hraje se 1 v 1 nebo 2 v 2 proti počítači, nebo online s kamarády. Na jednom zařízení hraje vždy jen jeden člověk: spoluhráči i soupeři mají každý svůj telefon. Hra běží přes celou obrazovku na šířku, v obyčejném HTML5 canvasu, a nic se neinstaluje.

## Spuštění

Stačí otevřít `index.html` v prohlížeči (skripty nejsou moduly, takže funguje i dvojklik). Pro online hru a pro hraní z mobilu je potřeba hru otevřít přes web server, například:

```sh
python3 -m http.server 8000
# potom http://localhost:8000 nebo z telefonu http://<adresa-počítače>:8000
```

## Týmy a postavy

Ve 2 v 2 se v lobby šipkami vybírají dvě z pěti dvojic:

| Dvojice | Postavy |
| --- | --- |
| Nelcis & Majda (růžoví) | Nelcis (dlouhé blond vlasy, ofina na stranu, růžová sponka), Majda (dlouhé hnědé vlasy s mašlí, piercing v nose) |
| Marsal & Durcado (modří) | Marsal (blond vlny, vysoký – má delší nohy), Durcado (objemné vlny vyčesané nahoru, kudrna do čela, modrošedé oči) |
| Tóma & Peli (zelení) | Tóma (střapaté hnědé vlasy), Peli (tmavé vlasy s pěšinkou) |
| Bémič & Kiki (oranžoví) | Bémič (černý buzzcut), Kiki (dlouhé vlnité vlasy, špinavý blond, ofina a čelenka) |
| Šimša & Jenda (fialoví) | Šimša (krátké tmavé kudrny, vystříhané strany, číslo 87), Jenda (střapaté hnědé vlasy s ofinou) |
| Bémič Š. & Berry | Bémič Š. (č. 41, tmavé vlasy na stranu), Berry (králík – mazlíček: dlouhé uši, růžový čumáček, vousky, zoubky, č. 1); odemkne 10. úroveň kampaně Točná |
| Petr Kuba & Milan (černí) | dva rozhodčí: Petr Kuba (č. 45, starší, holohlavý se šedivým věncem, lehce šedivé vousy, vrásky) a Milan; odemkne 5. úroveň kampaně Petr Kuba (Milan pak jde hrát i bez úkolu 15 zápasů) |
| Nikol & Luďan | Nikol (č. 22, dlouhé vlnité hnědé vlasy s ofinou na obě strany, úsměv), Luďan (č. 77, holá hlava, plnovous do zrzava, světlé oči); odemkne 17. úroveň kampaně Točná |

Všechny holky mají dlouhé rozpuštěné vlasy až k lopatkám, které vlají při běhu a skoku. Postavy se liší i obličejem: přivřená víčka a vážný pohled, síla obočí a výraz pusy (úsměv, klidný, úšklebek).

V 1 v 1 si každý vybere libovolnou z deseti postav. Dres má barvu její dvojice. Postavy mají tělo s dresem a číslem, trenky, ruce a kopačky, běhají, při radosti mávají a po inkasovaném gólu se mračí.

## Filmové scény a stadion

- **Úvod zápasu**: kamera sjede z velké obrazovky na hřiště, hráči vyběhnou a vyjedou plakáty obou týmů s VS. Následuje rozcvička (titulek ROZCVIČKA): každý hráč dělá něco jiného – žongluje s vlastním míčem, skáče s rozpažováním, protahuje se, nebo sprintuje ke středu a zpátky – a tribuny pokřikují. Pak kamera najede na rozhodčího uprostřed hřiště s titulkem „Rozhodčí dnešního zápasu: MILAN VORAČKA“, ten zapíská a odběhne (během hry na hřišti není, aby nepřekážel). Potom vybuchne ohňostroj a z každého týmu jeden hráč v bublině hecuje soupeře (každá postava má své hlášky). Kamera se na něj přiblíží.
- **Fanoušci**: levá polovina tribun fandí týmu vlevo (má jeho barvy), pravá týmu vpravo. Každá polovina pokřikuje v bublinách jen tyhle pokřiky: KIKI KIKI, VIKY VIKY, SULI SULI, SULI TI DÁ, MAGDI MAGDI, pokřiky své dvojice (Marsal & Durcado – JIŽNÍ SUPY, CP COMPANY; Tóma & Peli – TÓMA ŽLOUTEK; Bémič & Kiki – JONY, KIKI TĚ CHCE, SKIPER; Šimša & Jenda – MÁ VO2max 67) a jména svých hráčů (ŠIMŠA ŠIMŠA). Když je někdo omráčený míčem, zazní SLAJZNUL DO BAHNA. Po gólu má 15 fanoušků týmu, který skóroval, bublinu GÓL. Tleskají do rytmu bubnu a při tyčce zklamaně zahučí.
- **Gól**: střelec slaví – skluz po kolenou k vlastním fanouškům (s odletující trávou) nebo „letadlo“ s rozpaženýma rukama, spoluhráči skáčou. Kamera ho sleduje, síť se zavlní, publikum vyskakuje, reklamní tabule i velká obrazovka blikají GÓL a ukazují střelce.
- **Záznam gólu**: zpomalené opakování posledních vteřin se zoomem na míč.
- **Konec zápasu**: vítězové doběhnou doprostřed, nad nimi vyjede zlatý pohár, poražení odejdou ke své brance.

Scény jdou přeskočit tlačítkem *Přeskočit* (nebo klávesou Enter). Online je ovládá hostitel a kamarádi je vidí zároveň s ním.

## Sponzoři

Partneři hry HOT PEPPERS a RADEGAST jsou na každé druhé reklamní tabuli kolem hřiště (s ikonkou chilli papričky a hvězdy), střídají se na velké obrazovce v menu, na začátku úvodu zápasu je na obrazovce „Zápas vám přináší HOT PEPPERS, RADEGAST“, poločas přináší HOT PEPPERS a hráče zápasu RADEGAST. V menu jsou pod tlačítky. Jsou to jen nápisy ve stylu hry, bez log značek.

## Čas a poločasy

Zápas má dva poločasy po 45 sekundách. Hodiny ukazují čas jako ve fotbale: první poločas 0:00 → 45:00, druhý 45:00 → 90:00 (1 sekunda hry = 1 minuta na hodinách). Pod hodinami je, který poločas se hraje. O poločase rozhodčí zapíská, hráči se vrátí na místa a ukáže se přestávka se skóre, rozhodčím a statistikami, druhý poločas začne tlačítkem *Druhý poločas* (online ho spouští hostitel). Při remíze po 90. minutě rozhodnou penalty.

### Penalty

Když je po 90. minutě remíza, následuje penaltový rozstřel: týmy se střídají, každý kope 5 penalt, pak náhlá smrt. Střílí všichni hráči týmu postupně, chytá brankář soupeře (když je v týmu člověk, chytá on).

Penalty mají vlastní pohled jako ve FIFĚ: kamera je za střelcem (vidíš ho zezadu se jménem a číslem na dresu), před ním brána v perspektivě se sítí, za ní tribuny a reklamní tabule a v bráně brankář zepředu v zeleném dresu s rukavicemi.

- **Střelec**: joystickem (šipkami / WASD) míříš terčíkem kamkoli do brány, STŘELA (mezerník) = kop. Terčík se trochu chvěje, takže trefit přesně roh je riskantní; mimo bránu (červeně) je to vedle nebo tyčka. Po 6 s se vystřelí samo. Terčík vidí jen střelec.
- **Brankář**: joystickem skočíš do strany (nahoru = vysoko, dolů = nízko), SKOK = vysoko doprostřed. Skočit jde i před kopem (tip), ale střelec to uvidí. Chytíš, když jsi tam, kam míč letí.
- Pod skóre jsou tečky s výsledky penalt (zelená = gól, červená = neproměněná), po gólu se zavlní síť.
- Počítač kope spíš do rohů a občas mine, brankář počítače si tipuje (těžký častěji správně). Proti počítači padne zhruba 6 penalt z 10.

Statistiky (o poločase i na konci zápasu u výsledku): góly, držení míče, střely, střely na bránu, hlavičky, použité superschopnosti a odstřelení.

## Lobby (výběr hráčů)

- **Hrát** (proti počítači): vyber 1 v 1 nebo 2 v 2 a obtížnost počítače (zápas trvá vždy 2 × 45 s). Klepnutím na postavu si vybereš, za koho hraješ, ostatní hraje počítač. V 1 v 1 se šipkami mění postava. Postavy v lobby jsou živé (dýchají, mrkají, rozhlížejí se, vybraná zamává), stojí na osvětleném pódiu, pod každou je štítek kdo za ni hraje a její superschopnost. Nahoře je jen nadpis (online i kód hry a kdo je připojený), dole v jednom řádku nastavení (Zápas/Turnaj, 1 v 1 / 2 v 2, obtížnost) a tlačítko Hrát.
- **Aréna** (tlačítko dole v lobby, klepnutím se přepíná; platí i online a pro turnaj). Každá mění, jak se hraje, a pod odpočtem před výkopem připomene, co je jinak:
  - 🏟️ **Stadion** – normální tráva.
  - ❄️ **Sníh** – led: hráči se pomalu rozjíždějí, dlouho dojíždějí a těžko mění směr, míč po ledu skoro nebrzdí, padá sníh.
  - 🏖️ **Pláž** – písek: běhá se o 20 % pomaleji, míč v písku rychle zastaví a skoro neodskakuje; západ slunce a palmy.
  - 🌙 **Měsíc** – nízká gravitace: skáče se asi o polovinu výš a déle se letí, míč se vznáší; tmavý vesmír, hvězdy a Země.
  - 🌪️ **Vichřice** – vítr tlačí míč (ve vzduchu hodně, po zemi méně) a každých 6–10 s otočí směr; šipka pod tabulí ukazuje, kam fouká, a při otočení se ukáže „VÍTR ➜“; bouřka a poletující listí.
- **Turnaj** (tlačítko *Turnaj* v hlavním menu nebo přepínač *Zápas / Turnaj* v lobby, i online): oba týmy z lobby (i s lidmi, co za ně hrají) a dva vylosované týmy počítače. Semifinále: levý tým proti 3. týmu, pravý proti 4. týmu, takže se kamarádi můžou potkat ve finále. Zápasy bez lidí se odehrají „vedle“. Online spouští zápasy hostitel, kamarádi vidí pavouka a hrají své zápasy na svém telefonu (cizí zápas sledují). Ve finále je soupeř o stupeň těžší. Za vítězství v turnaji je +15 pohárů navíc a počítá se do profilu (Vyhrané turnaje).

## Příběh

Tlačítko *Příběh* v hlavním menu – je odemčený pro všechny (dřív byl zamčený kódem). Otevře úvodní obrazovku kampaní: čtyři velké karty **Páv & Suli** (původní příběh, popsaný níž), **Výzva Vietnam** (viz níž), **Točná** (18 úrovní) a **Petr Kuba** (7 úrovní). Na každé kartě jsou postavy kampaně, postup (např. 6 / 10 s ukazatelem), další úroveň, odměny (✓ u získaných) a štítek *Nová / Pokračovat / Dokončeno / Zamčeno*. Klepnutím na kartu se otevře mapa úrovní té kampaně, šipka zpět vede na kampaně. Každá kampaň má vlastní postup; naposledy otevřená kampaň se pamatuje. Tlačítkem *Mám kód* v okně Úkoly jde zadat **hlavní kód**, který odemkne úplně všechno (všechny úrovně Příběhu splněné, Moncler-Jenda, Kiki v bikinách, Michael Bémič, Tlustej páv & Suli, Milan); v kódu se nekontrolují velká/malá písmena, mezery ani háčky. Kód je jen jednoduchý zámek v prohlížeči – kdo umí číst zdrojový kód, obejde ho.

10 úrovní, každá je jeden zápas proti počítači – některé 1 v 1, některé 2 v 2 (spoluhráče máš z tvé dvojice, hraje za něj počítač). Vybereš si svého hráče a postupně odemykáš další úrovně (splněné jde hrát znovu, zamčené si můžeš prohlédnout). Každá úroveň má úkol, bez jeho splnění se nepostoupí; úkol je vidět i během zápasu pod tabulí:

| Úroveň | Zápas | Soupeř | Obtížnost | Úkol | Odměna |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 v 1 | Tóma | lehká | vyhraj | |
| 2 | 1 v 1 | Peli | lehká, +5 % rychlost | vyhraj o 2 góly | |
| 3 | 2 v 2 | Tóma & Peli | střední | vyhraj | |
| 4 | 1 v 1 | Kiki | střední, +5 % | vyhraj a dostaň nejvýš 1 gól (bonus: nedostaň žádný) | ⭐ bonus **True Gold Kiki** |
| 5 | 2 v 2 | Bémič & Kiki | střední, +10 % | vyhraj o 3 góly | **skin Moncler-Jenda** |
| 6 | 1 v 1 | Durcado | těžká | vyhraj a dej aspoň 3 góly | |
| 7 | 2 v 2 | Marsal & Durcado | těžká, +5 % | vyhraj o 2 góly | |
| 8 | 1 v 1 | Šimša | těžká, +10 % | vyhraj o 3 góly | |
| 9 | 2 v 2 | Nelcis & Majda | těžká, +12 % | vyhraj o 3 góly | |
| 10 | 1 v 1 | BOSS Milan Voračka | těžká, +15 % | vyhraj o 5 gólů | **dvojice Tlustej páv & Suli** |

Některé úrovně se hrají ve speciální aréně: 2 na pláži, 5 na ledu, 6 ve vichřici a 8 na Měsíci.

Klepnutím na úroveň s dárkem 🎁 a pak na tlačítko odměny uvidíš náhled, co za ni dostaneš.

- **Moncler-Jenda**: skin jen pro Jendu – bílá péřová bunda s prošíváním, černé brýle, zlatý řetěz, diamant v uchu, černé tepláky a bílé tenisky (bez loga značky). Zapíná se tlačítkem *Moncler* u Jendy v lobby nebo v Příběhu a platí i online.
- **True Gold Kiki**: bonus za 4. úroveň – na postup musíš vyhrát a dostat nejvýš jeden gól, a když nedostaneš žádný, získáš skin Kiki celé ze zlata (zlatá kůže, vlasy i dres) se zlatou korunkou s drahokamy a třpytem. Když bonus nevyjde, výsledek napíše, co je potřeba, a úroveň jde hrát znovu.
- Postava s víc skiny (Kiki: bikiny a True Gold) je přepíná tlačítkem u postavy dokola: žádný → první → druhý → žádný.
- **Tlustej páv & Suli**: nová dvojice (Páv č. 99 – špinavý blond, lehké vousy, pořádné bříško; Suli č. 17 – dlouhé blond vlasy, výrazná postava). Ve výběru hráčů jsou vidět od začátku, ale mají zámeček a hrát za ně (ani proti nim) nejde, dokud nesplníš 10. úroveň.

### Kampaň Točná

18 úrovní, pravidla stejná jako v Páv & Suli (úkol musíš splnit, jinak se nepostoupí):

| Úroveň | Název | Zápas | Soupeř | Obtížnost | Úkol | Odměna |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hřiště u lesa | 1 v 1 | Tóma | lehká | vyhraj | |
| 2 | Pole za vsí | 1 v 1 | Peli | lehká, +5 % | vyhraj o 2 góly | |
| 3 | Místní derby | 2 v 2 | Tóma & Peli | lehká, +5 % | vyhraj | |
| 4 | Zamrzlý rybník | 1 v 1 | Kiki | střední, led | vyhraj | |
| 5 | Trojky u stodoly | 1 v 1 | Marsal | střední | vyhraj a dej aspoň 2 góly | |
| 6 | Vítr nad Točnou | 2 v 2 | Bémič & Kiki | střední, +5 %, vichřice | vyhraj | |
| 7 | Hermelínový zápas | 1 v 1 | Nelcis | střední, +5 % | vyhraj bez inkasovaného gólu | |
| 8 | Písečná jáma | 1 v 1 | Majda | střední, +10 %, pláž | vyhraj | |
| 9 | Holky z Točné | 2 v 2 | Nelcis & Majda | střední, +10 % | vyhraj o 2 góly | |
| 10 | Bémičův dvůr | 1 v 1 | Bémič | těžká | vyhraj o 2 góly | **dvojice Bémič Š. & Berry** |
| 11 | Noc na Měsíci | 1 v 1 | Durcado | těžká, +5 %, Měsíc | vyhraj | |
| 12 | Jižní supi na Točné | 2 v 2 | Marsal & Durcado | těžká, +5 % | vyhraj | |
| 13 | JENDA PRIME | 1 v 1 | Jenda | těžká, +10 % | vyhraj o 2 góly | |
| 14 | Běh do kopce | 1 v 1 | Šimša | těžká, +10 %, vichřice | vyhraj a dej aspoň 3 góly | |
| 15 | Šimša a Jenda | 2 v 2 | Šimša & Jenda | těžká, +12 % | vyhraj o 2 góly | |
| 16 | Rozhodčí na ledě | 1 v 1 | Milan | těžká, +15 %, led | vyhraj o 3 góly | |
| 17 | Páv a Suli | 2 v 2 | Tlustej páv & Suli | těžká, +15 % | vyhraj o 2 góly | **dvojice Nikol & Luďan** |
| 18 | BOSS: Velké finále na Točné | 2 v 2 | Nikol & Luďan | těžká, +20 % | vyhraj o 3 góly | |

Nové dvojice jsou ve výběru hráčů vidět od začátku se zámečkem („Odemkni v Příběhu“) a hrát za ně jde po splnění dané úrovně. Zatím mají obyčejnou superstřelu. Hlavní kód odemkne i celou Točnou a obě dvojice.

### Kampaň Petr Kuba

7 úrovní:

| Úroveň | Název | Zápas | Soupeř | Obtížnost | Úkol | Odměna |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Píšťalka na krku | 1 v 1 | Peli | lehká | vyhraj | |
| 2 | Bez faulu | 1 v 1 | Jenda | střední | vyhraj a dej aspoň 2 góly | |
| 3 | Nastavený čas | 2 v 2 | Šimša & Jenda | střední, +5 %, vichřice | vyhraj o 2 góly | |
| 4 | Kolega Milan | 1 v 1 | Milan | těžká, +5 %, led | vyhraj | |
| 5 | Petr Kuba hraje | 1 v 1 | Petr Kuba | těžká, +10 % | vyhraj o 2 góly | **hráč Petr Kuba** + dvojice **Petr Kuba & Milan** |
| 6 | Videorozhodčí | 2 v 2 | Tlustej páv & Suli | těžká, +12 %, Měsíc | vyhraj a dostaň nejvýš 1 gól | |
| 7 | BOSS: Dva rozhodčí | 2 v 2 | Petr Kuba & Milan | těžká, +18 % | vyhraj o 3 góly | **skin Petr Kuba MS** |

- **Petr Kuba** má schopnost **Žlutá karta**: soupeři 5 s běhají asi o polovinu pomaleji a skáčou míň (nad hlavou mají žlutou kartu, na konci bliká). JENDA PRIME ji ustojí.
- **Petr Kuba MS**: rozhodčí z mistrovství světa – svítivě žlutý dres, sluchátko s mikrofonem a zlatý odznak. Zapíná se tlačítkem *MS* u Kuby v lobby.

Soupeři jsou pevní – když hraješ za stejnou postavu nebo dvojici jako soupeř, hraje se zrcadlový zápas (třeba Tóma proti Tómovi; soupeřova dvojice má dres v jiné barvě). Postup se ukládá v prohlížeči (`hlavouni.pribeh`, Točná `hlavouni.tocna`, Petr Kuba `hlavouni.kuba`, vybraná kampaň `hlavouni.kampan`, odemčené věci `hlavouni.odemceno`) a s účtem se synchronizuje.
- **Online s kamarády**: jeden hráč dá *Založit hru* a dostane čtyřznakový kód. Ostatní dají *Připojit* a kód opíšou. V lobby si každý klepnutím vybere postavu, volná místa hraje počítač. Hostitel spustí zápas, po konci může dát odvetu nebo se vrátit do lobby.

## FIFAgram

Tlačítko *📸 FIFAgram* v hlavním menu otevře sociální síť hráčů FIFA67 (vlastní, ne Instagram). Každý hráč má profil se svou postavou (nejhranější) a přezdívkou ze žebříčku, kterou si jde nastavit přímo v profilu.
- *Příspěvky*: fotky vyfocené ve hře (📸 v klubu Hot Peppers – po vyfocení tlačítko *📲 Na FIFAgram*, posledních 12 fotek se ukládá do galerie) nebo textové příspěvky s barevným pozadím; ke všemu popisek. Fotky z galerie telefonu nahrát nejde – jen to, co vznikne ve hře.
- *Feed* (🏠) se všemi příspěvky od všech hráčů, nejnovější nahoře; *lajk* srdíčkem nebo dvojitým klepnutím na fotku, *komentáře*, smazání vlastního příspěvku.
- *Profil* (👤): počet příspěvků, lajků a komentářů a mřížka příspěvků; klepnutím na jméno u příspěvku se otevře profil toho hráče. Odznak na ikoně profilu ukazuje nové lajky a komentáře.
- Data jsou uložené zprávy na stejných MQTT serverech jako žebříček (`fifa67/gram/v1/…`): příspěvky `p/<hráč>/<id>`, lajky `l/<příspěvek>/<hráč>`, komentáře `c/<příspěvek>/<id>`. Fotky se posílají zmenšené (JPEG do ~140 kB).

## Klub Hot Peppers

Tlačítko *🌶️ Hot Peppers 18+* dole v hlavním menu otevře strip club pro dospělé – při prvním vstupu se potvrzuje věk 18+. Nejdřív si vybereš, za koho jdeš – do klubu chodí jen kluci. Zamčené postavy mají zámeček. Pak *Vstoupit* a v klubu chodíš joystickem (kdekoli na levé části obrazovky; na počítači šipky nebo WASD) – pohled shora jako v Brawl Stars. U obsluhy se objeví velké tlačítko vpravo dole (na počítači E, mezerník nebo Enter).

V klubu se **utrácí poháry** (ubydou z profilu, takže klesne i liga a místo v žebříčku):

| Kde | Co | Cena | Co to udělá |
| --- | --- | --- | --- |
| Bar | Točený pivo / Panák tuzemáku / Zelená / Kýbl | 2 / 3 / 3 / 10 🏆 | +0,4 / +0,7 / +0,6 / +1,4 ‰ |
| Bar | Pepper shot | 5 🏆 | 10 s chrlíš oheň (+0,5 ‰) |
| Bar | Limo Hlavička | 3 🏆 | 12 s běháš rychleji (bublinky), −0,5 ‰ |
| Bar | Neonový koktejl | 8 🏆 | 15 s záříš v barvách |
| DJ pult | Pustit hit | 15 🏆 | 20 s rychlejší hudba, lasery, dým, strobo, konfety a celý klub tančí |
| DJ pult | Styl hudby: House / Techno / Hip-hop / Reggaeton | zdarma | každý styl má vlastní rytmus a tempo (122 / 132 / 92 / 96 BPM) |
| Ochranka u VIP | Vstup do VIP | 60 🏆 | natrvalo otevře VIP (vířivka, VIP bar, soukromá show, separé, zlatý VIP odznak) |
| VIP bar | Šampus s prskavkami | 30 🏆 | lahev s prskavkami na VIP stůl, pak postříkáš VIP šampusem a klub šílí |
| VIP bar | VIP ohňostroj | 50 🏆 | ohňostroj pod stropem, CO2 výtrysky z pódií a od DJe, konfety |
| VIP bar | Déšť pohárků | 25 🏆 | 8 s na tebe prší zlaté poháry |
| Šatna | Černé brýle / Zlatý řetěz / Koruna | 20 / 35 / 120 🏆 | natrvalo v klubu, v šatně se nasazují a sundávají |

Ze hry jsou v klubu jen klučičí postavy (barman, DJ, ochranka, tanečníci a lidi, co se procházejí). K nim je tu 8 holek, které ve hře nejsou – jen hosté klubu: dospělé ženy v upnutých minišatech na podpatcích (flitry, ramínka, šněrování), s rtěnkou, očními stíny a náušnicemi. Dvě tancují na pódiích, další na parketu, u baru, ve VIP a jedna je šatnářka. Když k nim přijdeš, prohodí něco („Ahoj fešáku“, „Zatančíš si?“), když tančíš poblíž, posílají srdíčka, a tlačítkem *Zatančit spolu* jde holka 25 s s tebou (chodí za tebou a tančí). Nic explicitního – jen tanec a flirt.

Na tanečním parketu jde zdarma *Tančit*; dalším klepnutím se mění pohyb (Pohupování, Robot, Točení, Skoky).

**Fotka** – tlačítko 📸 vlevo nahoře (nebo budka *FOTO* vlevo dole) vyfotí skutečnou scénu z klubu kolem tebe jako z opravdového foťáku: ty s holkou, se kterou tančíš (nebo s tou nejbližší), lidi a světla kolem, blesk, rozmazané pozadí, zrno, viněta, lehce nakřivo a oranžové datum v rohu jako na digitálu. Každá fotka je jiná. Jde *Uložit* nebo *Poslat* (sdílení v telefonu).

Klub je vyvedený jako prémiový strip club: černá lesklá mramorová podlaha s odlesky neonů, stěna z prošívané kůže se zlatou lištou a LED páskem, rampa se světly, nápis *Hot Peppers · Gentlemen's Club* v neonové kurzívě, bar z černého mramoru se zlatými lamelami a podsvícenými policemi, kožené boxy u stolků, tmavé skleněné dlaždice na parketu, pódia s LED okrajem a zrcadlem, ve VIP černý koberec se zlatým vzorem, zlaté panely a křišťálový lustr. Výběr postavy, obchody a tlačítka jsou černozlaté.

**Jízda do klubu** – po *Vstoupit* se objevíš v autě v nočním městě a jedeš do Hot Peppers podle navigace. Kamera je za autem (3D perspektiva). Tvoje auto je kabriolet bez střechy, takže zezadu vidíš svou postavu za volantem (dres se jménem a číslem, ruce na volantu, při zatáčení se nakloní). Auto má tvarovanou karoserii s lakem, kola s disky, koncová a brzdová světla, SPZ, výfuky s kouřem, sportovní auta spoiler a podsvícení podvozku. Ve městě jsou domy s okny po patrech (paneláky, cihla, sklo, štuk), výlohy s markýzami a neonovými cedulemi, reklamy a antény na střechách, lampy a semafory s odlesky na mokré silnici, obrubníky, zebry, taxíky a policie, noční obloha s mraky a panoramatem; na silnici plynou modré šipky trasy. Nahoře šipka a „Za 650 m doleva“ s vzdáleností do cíle, vpravo minimapa, vpravo dole kruhový tachometr. Když hra seká, scéna se sama kreslí v nižším rozlišení. Ovládání: joystick nahoru = plyn, dolů = brzda/couvání, do stran = zatáčení (na počítači šipky). Ve městě jezdí auta (srážky zpomalí), klub září obřím neonem a reflektory do nebe, cíl ukazuje růžový sloup světla. Na parkovišti před Hot Peppers zaparkuješ a jde se dovnitř. *Přeskočit jízdu* tě pustí rovnou do klubu.

**Garáž** (🚗 tlačítko ve výběru postavy): Rezavý hatchback (zdarma), Tuned kombi (150 🏆), Černé SUV (300), Sportovní kupé (600), Zlaté superauto (1200) a Bílá limuzína (2000). Liší se rychlostí, zrychlením, zatáčením a vzhledem; koupená auta se ukládají a synchronizují s účtem.

**VIP (prémium)** – VIP je větší (sahá až dolů k fotokoutku) a má:
- *Vířivku* se dvěma exkluzivními VIP holkami v plavkách (Diamond a Rubi – nejsou nikde jinde). Tlačítkem *Vířivka* do ní vlezeš, ve vodě je vidět jen to nad hladinou, bublinky, pára, srdíčka a holky kecají („Voda je teplá“, „VIP život“). *Vylézt* tě vrátí ven.
- *Šampus s prskavkami* a *VIP ohňostroj* ve VIP baru (viz tabulka), *soukromou show* a *separé*.
- Zlatý odznak „TY · VIP“ nad postavou a ochranka tě zdraví „Vítejte, pane!“.

**Strip club**
- *Opilost*: každé pití přidá promile (ukazuje se nahoře). Od ~0,5 ‰ se obraz houpe, od 1 ‰ vidíš dvojitě, joystick ujíždí, postava se motá a škytá. Promile pomalu klesají.
- Od 2,5 ‰ se **pozvracíš** (zelená louže zůstane na podlaze) a ochranka si pro tebe dojde a **vyhodí tě** – zákaz vstupu 20 s.
- *Strčit*: do kluka jde strčit – zapotácí se a někdy ránu vrátí. Po druhé strkanici ochranka varuje, po třetí letíš ven.
- *Tanečnice u tyče*: na pódiích jsou chromové tyče, holky v třpytivém topu a kraťáskách se kolem nich točí a vyšvihují. *Hodit 5 🏆* – poháry letí na pódium, tanečnice se rozjede a na 2 s flashne jako Suli (záblesk, poprsí zakryté mozaikou).
- *Show*: zhruba každou minutu DJ ohlásí tanečnici („SHOW · LOLA“), na pódium svítí reflektory a kluci se seběhnou fandit. Ve finále tanečnice odhodí top – poprsí zakrývá mozaika (stejně jako u Suliiny schopnosti).
- *Soukromá show* ve VIP (VIP bar, 40 🏆): kamera se přiblíží na VIP pódium s tyčí, zbytek klubu potemní a tanečnice tančí jen pro tebe s péřovými vějíři a třpytkami. Během show jde *Hodit 5 🏆*; ve vyvrcholení odhodí top (cenzura mozaikou).
- *Soukromý tanec* v separé ve VIP: s holkou, která jde s tebou (*Zatančit spolu*) – 25 🏆. Zatáhne se závěs a je vidět jen její stín.
- *Dealer* u záchodů (WC vedle východu) prodává vymyšlené drogy, které jsou jen ve hře: *Pepřák* (15 🏆, 20 s jízda – duhové barvy, rychlost, tanec samo, pak 15 s šedý dojezd a zpomalení) *Smajlík* (10 🏆, 25 s růžová láska a srdíčka všude, pak únava), *Kouzelná houbička* (12 🏆, 25 s se celý obraz vlní a přelévá v barvách, pak 15 s ovládání naruby), *Zelenáč* (8 🏆, 30 s zpomalený čas, zelený opar a kouř, pak se klíží oči) a *Turbo* (12 🏆, 15 s rychlost ×2,4 s duchy za postavou, pak třes a zpomalení). Ochranka tě u dealera může načapat (vyhazov) a dvě dávky naráz = kolaps a vyhazov.
- Nic explicitního se ve hře neukazuje – odhalená místa jsou vždy zakrytá mozaikou.

Klub má disco kouli nad parketem s odlesky po podlaze, dým, reflektory a při hitu lasery z DJ pultu. Hudbu klub skládá sám ve Web Audio (u vchodu je slyšet jen přes zeď). Koupené věci a VIP se ukládají v prohlížeči (`hlavouni.klub`) a synchronizují s účtem.

## Účet s heslem (víc zařízení)

Tlačítko *Účet* dole v hlavním menu. Napíšeš přezdívku a heslo (aspoň 8 znaků) a dáš *Vytvořit účet*; na jiném telefonu se stejnými údaji dáš *Přihlásit*. Synchronizuje se všechen postup: poháry a statistiky, Příběh, odemčené hráče a skiny (i který je zapnutý), úkoly, výzva Vietnam, přátelé a stejné id v žebříčku. Postup ze dvou zařízení se sloučí (odemčené věci a počty se sčítají, poháry podle novějšího). Synchronizace běží sama po spuštění, po zápase, každých 30 s v menu a při zavření aplikace; jde i ručně tlačítkem *Synchronizovat*. Na tlačítku v menu je pak vidět přezdívka účtu.

Jak to funguje: hra nemá vlastní server. Uložená hra se v prohlížeči zašifruje heslem (PBKDF2 se 150 000 opakováními + AES-256-GCM) a uloží jako uložená zpráva na stejných veřejných MQTT serverech jako online hra (téma `fifa67/ucty/v1/<otisk přezdívky>`). Heslo se nikam neposílá a bez něj uloženou hru nikdo nepřečte. Omezení: kdo zná přezdívku, nemůže účet přečíst, ale mohl by ho na veřejném serveru přepsat (a veřejné servery můžou uložené zprávy po restartu ztratit – další synchronizace je nahraje znovu); proto nedávej heslo, které používáš jinde. Zapomenuté heslo nejde obnovit.

## Žebříček, profily a přátelé

Tlačítko *Žebříček* dole v hlavním menu. Nahoře si nastavíš přezdívku (stejné jméno se používá i v online hře) a uložíš ji – tím se objevíš v žebříčku. Hráči jsou seřazení podle pohárů (🥇🥈🥉 pro první tři). Klepnutím na hráče se otevře jeho profil: liga, poháry, místo v žebříčku, zápasy, výhry, úspěšnost, góly, turnaje, postup v Příběhu, za koho nejčastěji hraje (i se skinem) a kdy naposledy hrál. Tlačítkem *Přidat do přátel* si ho přidáš; záložka *Přátelé* ukáže jen tvoje přátele a tebe.

Jak to funguje: hra nemá vlastní server, profily se ukládají jako uložené (retained) zprávy na stejných veřejných MQTT serverech, které se používají pro online hru (téma `fifa67/zebricek/v1/<id hráče>`). Profil se pošle po uložení přezdívky, po každém zápase (nejvýš jednou za 20 s) a při otevření žebříčku. Ve hře je jen přezdívka a herní statistiky, nic dalšího. Omezení: veřejné servery nic neslibují (uložené zprávy můžou po restartu serveru zmizet – po dalším zápase se profil pošle znovu) a nejsou tam účty ani hesla, takže kdo by chtěl podvádět, mohl by si poháry upravit. Přátelé se ukládají jen v tomto zařízení. Profily starší než půl roku se nezobrazují.

## Výzva Vietnam

Záložka *Vietnam* v okně Příběh. Pro všechny se otevře 27. 11. 2026 ve 12:00 (do té doby je tam zámek s odpočtem; dřív jde odemknout tajným kódem přes *Mám kód*). 5 zápasů 2 v 2 proti vietnamské reprezentaci (10 hráčů v červených dresech), každý těžší – 2. zápas ve vichřici (monzun), 3. na pláži. Hraje se **jen s parťákem online**: hostitel tlačítkem *Založit hru s parťákem* založí online hru, kamarád se připojí kódem a sedne si na volné místo v jeho týmu. Dokud v týmu nejsou dva lidé, hrát nejde (počítač za parťáka nehraje). Soupeř, formát, obtížnost i aréna jsou dané zápasem. Postup se ukládá oběma hráčům; za 5. zápas se odemkne nový hráč **Tráňa** (č. 88, černé rovné vlasy s ofinou, světle šedý dres).

## Úkoly a skiny

Tlačítko *Úkoly* dole v hlavním menu. Postup se počítá ze všech zápasů (i online a v Příběhu) a ukládá se v zařízení:

| Úkol | Odměna |
| --- | --- |
| Odehraj 15 zápasů | hráč **Milan Voračka** (do té doby je ve výběru se zámečkem „Úkol: 15 zápasů“) |
| Dej 15 gólů v jednom zápase | skin **Kiki v bikinách** (sportovní dvoudílné plavky v barvě týmu a sluneční brýle s bílou obroučkou) |
| Dej 30 gólů za Bémiče | skin **Michael Bémič** (Bémič s tmavou kůží a holou hlavou, červený basketbalový dres bez rukávů s číslem 23, dlouhé trenky) |

Skiny (Moncler-Jenda, Kiki v bikinách, Michael Bémič) se zapínají v Úkolech, v Příběhu nebo tlačítkem přímo na kartě své postavy v lobby a platí i online.

## Ovládání

**Na telefonu** (na šířku, přes celou obrazovku):

- **Joystick vlevo** pro levý palec: kam sáhneš, tam se objeví. Do stran se běží (čím víc vychýlíš, tím rychleji), zatlačením nahoru se skáče.
- **Vpravo tlačítko Střela** (velké zlaté) a nad ním **Super** s ikonou a názvem superschopnosti tvé postavy. Kolem tlačítka Super se plní kroužek v barvě tvé postavy. Když je plný, tlačítko svítí a superschopnost je připravená.
- Tlačítkem *Joystick vlevo / vpravo* v menu (nebo v pauze) se strany prohodí.

**Na počítači:**

| | Klávesy |
| --- | --- |
| Běh | `A` `D` nebo `←` `→` |
| Skok | `W` nebo `↑` |
| Střela | `mezerník`, `S`, `↓` nebo `Enter` |
| Superschopnost | `E`, `Q` nebo `Shift` |
| Pauza | `Esc` nebo `P` |

### Superschopnosti

Nabíjí se časem (asi 15 s) a každým kopem do míče. Každá postava má svou:

| Postava | Superschopnost |
| --- | --- |
| Nelcis | **Obří hermelín**: do brány jejího týmu spadne obří hermelín s nápisem HERMELÍN a na 3 s ji úplně zablokuje, gól nejde dát. |
| Šimša | **VO2max 67**: nad hlavou se mu objeví bublina „MÁM VO2max 67“ a 5 s běhá 2× rychleji. |
| Marsal | **Trojka**: když je u míče, míč se změní v basketbalový, Marsal řekne „STŘÍLIM TY TROJKY“, chytí ho nad hlavu a hodí vysoký oblouk. Nad bránou soupeře se objeví basketbalový koš, míč jím propadne rovnou do brány. Chytit se dá jen před košem (hlavičkou nebo výskokem), hermelín a led ho zastaví. |
| Bémič | **Skiper**: na 3 s se promění v tučňáka (jen vzhled), brána jeho týmu zamrzne ve velkém ledovém kráteru (nejde dát gól) a fanoušci řvou SKIPER. |
| Jenda | **JENDA PRIME**: na 5 s se promění v hráče Realu Madrid – bílý dres se zlatým lemováním, zlatá záře a nápis JENDA PRIME. Běhá 1,5× rychleji, skáče výš, kope o 40 % silněji, silnější hlavičky, odstrčí soupeře a superstřela ho neodstřelí. |
| Tráňa | **Obří sushi**: „JEDEEEM!“ – pod Tráňou vyroste obří nigiri (rýže, plátek lososa, pásek nori), Tráňa na něm stojí, kymácí se a sushi s ním asi 2,6 s jede dopředu na bránu soupeře (zastaví u brankové čáry). Každý soupeř, kterého srazí, odletí a je omráčený („SLAJZNUL DO BAHNA“); míč před sushi tlačí před sebou. Může na něm i skákat. |
| Majda | **Gumové ruce**: „TOHLE JE MOJE!“ – ruce se jí natáhnou přes půl hřiště (dosah 760 px), chytí míč, ať je kdekoli (ve vzduchu, u soupeře), a přitáhnou ho k nohám. Ukradne i Marsalovu trojku (míč nad hlavou i v letu) a míč z Durcadova tryskáče („UKRADENO Z TRYSKÁČE!“ – tryskáč pak nic neshodí). Když je míč moc daleko, schopnost se nevyplýtvá („MOC DALEKO!“). |
| Durcado | **Byznysman**: v oblaku se převlékne do tmavého obleku s bílou košilí a červenou kravatou („BYZNYSMAN!“), přiletí soukromý tryskáč DURCADO AIR, nabere ho na provazový žebřík („JEDU NA MEETING“) a míč se mu zázračně dostane k nohám. Tryskáč přeletí nad hřištěm a těsně před bránou soupeře míč shodí („DORUČENO!“) – padá pod břevno do brány, takže je velká šance na gól, nebo si ho soupeř srazí do vlastní brány; brankář ho ale může vyrazit. Pak Durcado seskočí v soupeřově polovině a tryskáč odletí. Kamera se během letu oddálí. V testu proti počítači padl gól v 87–97 % případů na lehkého a v 43–70 % na těžkého. |
| Tlustej páv | **Obří páv**: na 3 s se zvětší a ztloustne (větší i pro míč a soupeře). Kdo do něj narazí, odletí a je omráčený. |
| Suli | **Flash**: „PŘEDPLAŤ SI MĚ!“, vyhrne triko (místo detailů kreslená cenzura – mozaika), záblesk přes obrazovku a soupeři na 3 s ztuhnou s vyvalenýma očima (JENDA PRIME to ustojí). |
| Milan (boss Příběhu) | **Červená karta**: písknutí, nápis ČERVENÁ KARTA a všichni soupeři na 2 s ztuhnou (JENDA PRIME a tučňák ji ustojí). |
| Petr Kuba | **Žlutá karta**: písknutí, nápis ŽLUTÁ KARTA a všichni soupeři na 5 s zpomalí (asi na polovinu) a skáčou míň, nad hlavou mají žlutou kartu (JENDA PRIME ji ustojí). |
| ostatní | **Superstřela** (viz dál). Vlastní schopnosti přijdou v dalších verzích. |

Počítač superschopnosti používá taky: hermelín a led, když letí míč na jeho bránu, VO2max, když je míč daleko, trojku, když je u míče, JENDA PRIME, když jde o míč.

Superstřela vystřelí míč skoro dvakrát rychleji s ohnivou stopou v barvě postavy. Soupeře, kterého trefí, odstřelí: s výbuchem „BUM!“ odletí točící se kus dál, po dopadu je chvíli omámený (spirálové oči, hvězdičky kolem hlavy) a nemůže hrát. Míč letí dál a může odstřelit i dalšího. Když švih mine míč, nabití zůstane.

### Poháry a ligy

Za každý zápas dostane hráč na svém zařízení poháry podle obtížnosti počítače (online proti kamarádovi zvlášť). Bonus za rozdíl skóre (od 2 gólů) i bonus za vlastní góly je omezený podle obtížnosti; při prohře jeden vlastní gól ubere ztrátu o 1:

| Obtížnost | Výhra | Bonus za rozdíl / vlastní góly (max) | Prohra | Vyhraný turnaj |
| --- | --- | --- | --- | --- |
| Lehký | +3 | +1 / +1 | −4 | +5 |
| Střední | +8 | +2 / +2 | −3 | +15 |
| Těžký | +14 | +4 / +4 | −1 | +30 |
| Online proti kamarádovi | +10 | +3 / +3 | −3 | +20 |

Výhra na lehkou tak dá 3–5 pohárů, na těžkou 14–22; prohra s lehkým počítačem stojí nejvíc. Podle pohárů postupuje ligami Nováček → Bronz → Stříbro → Zlato → Diamant → Mistr → Legenda. Liga a poháry jsou vidět vpravo nahoře v menu. Po klepnutí se ukáže profil se statistikami (zápasy, výhry, góly, superstřely, odstřelení, nejdelší série výher). Po zápase se ukáže hráč zápasu a kolik pohárů přibylo. Postup se ukládá v prohlížeči daného zařízení.

### Celá obrazovka

Hra vyplní celý displej bez černých pruhů. Na širokém telefonu je vidět víc stadionu do stran a kamera hřiště přiblíží na celou šířku. Tlačítko vpravo nahoře zapne celou obrazovku prohlížeče. Úplně bez lišt prohlížeče hra běží po *Přidat na plochu* (manifest `manifest.webmanifest` s režimem fullscreen a orientací na šířku). Na výšku hra ukáže výzvu k otočení telefonu.

V aplikaci Claude (artifact) zůstane kolem hry rámeček aplikace: horní lišta s křížkem a okraje po stranách. Ten hra odstranit nemůže. Hra si ale změří, kolik místa je opravdu vidět (bezpečné okraje displeje a případně oříznutou část okna) a podle toho zmenší rozložení obrazovek, aby nic nebylo uříznuté. Dialogy, které by se přesto nevešly, jdou posunout prstem. Bez jakýchkoli lišt hra běží jen jako webová verze přidaná na plochu (viz Zveřejnění na GitHub Pages).

## Online hra: jak funguje

Hostitel počítá celý zápas a asi 30× za sekundu posílá jeho stav ostatním. Ostatní posílají jen svoje ovládání. Když kamarád odejde, jeho hráče převezme počítač. Když odejde hostitel, hra skončí všem.

V lobby se kamarádi připojují kódem nebo odkazem s kódem (tlačítko *Pozvat*, odkaz končí `#kod-ABCD`). Každý si vybere postavu a dá *Jsem připraven*. Hostitel vidí, kolik hráčů je připraveno, a spustí zápas.

Přenos se volí podle toho, kde hra běží:

- **Na webu (GitHub Pages), pro kohokoli bez účtu**: nejdřív přímé spojení WebRTC přes knihovnu PeerJS (přibalená v `js/vendor/`), její veřejný server a veřejné STUN/TURN servery. Když přímé spojení nejde (typicky mobilní data 5G/LTE nebo přísná firemní síť), kamarád se automaticky připojí přes záložní přenos: veřejný MQTT server přes zabezpečený WebSocket (HiveMQ, EMQX nebo Mosquitto, zkouší se postupně), který projde téměř každou sítí. Hostitel naslouchá na obou cestách zároveň.
- Hostitel i kamarádi musí mít hru otevřenou na stejné adrese – buď všichni na webu, nebo všichni na claude.ai.
- **Na claude.ai (artifact)**: sdílená místnost artifactu. Hrát online tam můžou jen přihlášení lidé, kterým je artifact nasdílený. Ostatním hra ukáže adresu webové verze.

### Zveřejnění na GitHub Pages

GitHub Pages zdarma funguje jen pro veřejný repozitář.

1. *Settings → General → Danger Zone → Change visibility* → **Public**.
2. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, větev `claude/tender-maxwell-a4f0g0` (nebo `main` po sloučení), složka **/ (root)** → **Save**.
3. Za minutu až dvě hra poběží na `https://jenik864.github.io/moje-aplikace/`.

Pro testy lze v prohlížeči nastavit `window.HLAVOUNI_NET = 'bc'` (BroadcastChannel mezi panely), `window.HLAVOUNI_PEER = { host, port, path, secure }` (vlastní server PeerJS) nebo `window.HLAVOUNI_RELAY = ['ws://…']` (vlastní MQTT server pro záložní přenos).

## Jak funguje hra

**Kop je shovívavý:** míč se trefí kopačkou nebo kdekoli kousek před hráčem od výšky hlavy po trávník (i volej). Když hráč zmáčkne Střelu o chvilku dřív, než míč doletí, noha počká až 0,18 s a vykopne, jakmile je míč v dosahu. Lidským hráčům se kop směrem na bránu soupeře jemně natočí, aby míč letěl pod břevno (počítač tuhle pomoc nemá). Míč je větší (poloměr 24) a hlavičky posílají míč víc dopředu.

- Kop: kopačka se švihne dopředu a nahoru. Čím později ve švihu trefí míč, tím vyšší je lob. Když stojí soupeř těsně před tebou, kop ho přeloží obloučkem.
- Hlavička: míč se odráží od hlavy podle toho, kam hráč běží a skáče. Tělo a nohy míč zastaví a dá se s ním vést.
- Na břevno se dá vyskočit. Míč, který zůstane sevřený mezi dvěma hráči, vyskočí nahoru.
- Gól platí, když celý míč přejde brankovou čáru pod břevnem. Při remíze po skončení času se hraje na zlatý gól.
- Počítač odhaduje dráhu míče, chodí si za míč, vyskakuje na hlavičky, přeskakuje míč i soupeře a vrací se bránit. Obtížnost mění rychlost, reakce, přesnost a ochotu bránit.

## Struktura

```
index.html      stránka, obrazovky a panely
style.css       vzhled menu, lobby, dialogů, joysticku a tlačítek
manifest.webmanifest, icons/   instalace na plochu (fullscreen, na šířku)
js/config.js    rozměry hřiště, fyzika, týmy, postavy, obtížnosti
js/audio.js     zvuky skládané ve Web Audio (bez souborů)
js/input.js     klávesnice, joystick a dotyková tlačítka
js/ai.js        počítačový hráč
js/physics.js   míč, hráči, kolize, góly
js/render.js    stadion, postavy, míč, efekty, výsledková tabule, portréty
js/penalty.js   penalty pohledem za střelcem (3D brána, brankář zepředu)
js/net.js       online přenos (artifact room, PeerJS, BroadcastChannel)
js/vendor/      PeerJS 1.5.4 (licence MIT)
js/lobby.js     výběr hráčů
js/club.js      noční klub Hot Peppers (pohled shora, joystick, obchod za poháry, hudba)
js/main.js      herní smyčka, průběh zápasu, obrazovky, hostitel a host
```

Hřiště má virtuální rozměr 1280 × 720. Na displeji jiného poměru stran se zobrazí víc okolí, takže nikde nejsou černé pruhy. Fyzika běží v pevném kroku 1/120 s.

## Trailer

Odkaz https://jenik864.github.io/moje-aplikace/?trailer (když hra není pozastavená obrazovkou STOP) přehraje 28s trailer přímo ve hře (tlačítkem *Pustit trailer*, se zvukem): nová dvojice Tlustej páv & Suli se schopnostmi, skiny Moncler-Jenda / Kiki v bikinách / Michael Bémič, Příběh s 10 zápasy a bossem Milanem, Úkoly a gól ve 2 v 2. Scénář je v `js/trailer.js` (skutečné zápasy ve hře, kamera, titulky a syntetizovaná hudba). Hotové video je v `trailer.mp4`; vyrábí se nahráním `?trailer=rec` snímek po snímku a složením přes ffmpeg.

## Verze

Na GitHub Pages si hra při spuštění, po návratu do aplikace a každých 5 minut stáhne `version.json`. Když je tam novější verze a hráč je v hlavním menu, stránka se sama načte znovu (`?v=…`, aby telefon nepoužil starou kopii); během zápasu počká do návratu do menu. Při vydání nové verze je potřeba změnit číslo v `js/config.js` (GAME_VERSION), v `version.json` a v `?v=` u souborů v `index.html`.

Aktuální verze je vidět dole v rohu hlavního menu.

- 1.71 – jízda do klubu s kamerou za autem (3D město), přehlednější úvodní obrazovka (karty Hot Peppers a FIFAgram, menší odkazy)
- 1.72 – vymazlená grafika jízdy: kabriolety bez střechy (zezadu je vidět tvoje postava za volantem, dres se jménem a číslem, ruce na volantu), tvarovaná karoserie s lakem, koly a disky, koncová a brzdová světla, SPZ, výfuky, spoiler a podsvícení podvozku; domy s okny po patrech, výlohami, markýzami a neonovými cedulemi, reklamy a antény na střechách, lampy a semafory s odlesky na mokré silnici, obrubníky, krajnice, zebry, šipky navigace, mraky a panorama, kouř z výfuku a smyky, kruhový tachometr a nová minimapa; když hra seká, scéna se sama kreslí v nižším rozlišení
- 1.70 – FIFAgram: profily hráčů, fotky z klubu a textové příspěvky, lajky a komentáře od ostatních
- 1.69 – jízda autem po nočním městě do Hot Peppers s navigací a provozem, garáž se 6 auty za poháry; kód na +500 pohárů
- 1.68 – prémiový vzhled klubu Hot Peppers (mramor, kůže, zlato, neon, lustr, černozlaté menu); Příběh začíná úvodní obrazovkou s kartami kampaní
- 1.67 – pryč taneční souboj a čísla od holek; VIP prémium: větší VIP, vířivka s VIP holkami, šampus s prskavkami, VIP ohňostroj, zlatý VIP odznak
- 1.66 – mozaika u tanečnic je větší a kreslí se úplně navrch (přes hlavu i ruce), takže je vždycky vidět
- 1.65 – za každý hod 5 pohárů tanečnice na chvilku flashne (záblesk a mozaika)
- 1.64 – soukromá show ve VIP (vlastní pódium, vějíře, reflektor), finále show s odhozeným topem a mozaikou
- 1.63 – tři další vymyšlené drogy (houbička, Zelenáč, Turbo) s vlastními efekty; fotka z klubu jako opravdový snímek z foťáku (tlačítko 📸 kdekoli)
- 1.62 – klub je strip club: show na stage, soukromý tanec v separé, dealer s vymyšlenými drogami (jízda a dojezd); pryč krknutí a drsné hlášky
- 1.61 – klub v hovado režimu: chlast a promile, blití a vyhazov ochrankou, strkání, krkání, tanečnice u tyče s házením pohárů, separé, drsnější hlášky
- 1.60 – klub: taneční souboj (rytmická minihra, výhra = poháry a číslo), kontakty 0/8 s korunou, fotokoutek, styly hudby u DJe, taneční pohyby, disco koule, lasery a dým
- 1.59 – klub Hot Peppers je 18+: potvrzení věku, NPC ze hry jen kluci, 8 nových holek (šaty, podpatky, pódia), flirt a společný tanec
- 1.58 – noční klub Hot Peppers: výběr kluka, chození joystickem po klubu, bar, DJ, VIP a šatna za poháry
- 1.57 – blokace znovu pro všechny (nový tajný kód, dřívější odemknutí přestala platit); blokace se už nedá obejít adresou s ?trailer
- 1.56 – kampaň Petr Kuba (7 úrovní): nový hráč Petr Kuba se schopností Žlutá karta, dvojice Petr Kuba & Milan a skin Petr Kuba MS
- 1.55 – blokace znovu pro všechny: nový tajný kód a odemknutí platí jen v daném zařízení (nepřenáší se přes účet)
- 1.54 – Příběh má kampaně (záložky Páv & Suli, Vietnam, Točná); nová kampaň Točná s 18 úrovněmi, nové dvojice Bémič Š. & Berry (králík) za 10. úroveň a Nikol & Luďan za 17. úroveň
- 1.53 – trojité rychlé klepnutí na hlavu rozhodčího na obrazovce STOP otevře pole pro tajný kód; se správným kódem jde na tom zařízení hrát dál. Pod blokací hra neběží (šetří baterii)
- 1.52 – hra pozastavená: po otevření výzva „Není normální trávit volný čas hraním FIFA67“ s odkazem na Úřad práce (vypíná se v js/config.js: GAME_BLOCKED)
- 1.51 – heslo k účtu musí mít aspoň 8 znaků (kvůli hádání hrubou silou)
- 1.50 – plynulá jízda na sushi (Tráňa už nepadá a necuká, surfařský postoj, rozpažené ruce, zrnka rýže)
- 1.49 – Tráňa má schopnost Obří sushi
- 1.48 – online: menší snímky hry pro kamaráda (méně dat, plynulejší hlavně ve 2 v 2 a ve výzvě Vietnam)
- 1.47 – účet s heslem a synchronizace postupu mezi zařízeními
- 1.46 – nový design výzvy Vietnam (cesta 5 zápasů, karta odměny, info o dalším zápase)
- 1.45 – okno výzvy Vietnam přes celou obrazovku
- 1.44 – výzva Vietnam (5 zápasů 2 v 2 jen s parťákem online, od 12:00), nový hráč Tráňa; přepínač joysticku je jen v pauze
- 1.43 – 4. úroveň Příběhu: postup s nejvýš jedním obdrženým gólem, bez gólu bonus skin True Gold Kiki
- 1.41 – vyvážené poháry podle obtížnosti (lehký dává málo, těžký hodně)
- 1.40 – oprava: Majda se po Gumových rukou už neotočí zády k bráně
- 1.39 – Majda má schopnost Gumové ruce (přitáhne míč, ukradne trojku i tryskáč)
- 1.38 – Durcado má schopnost Byznysman (oblek a soukromý tryskáč, který shodí míč před bránu soupeře)
- 1.37 – Příběh odemčený pro všechny bez kódu
- 1.36 – nové arény Pláž, Měsíc a Vichřice (každá mění fyziku hry), některé úrovně Příběhu se hrají v nich
- 1.35 – lobby má stálou velikost (bez nápovědy dole), v Příběhu jsou soupeři pevní (i zrcadlové zápasy)
- 1.34 – žebříček hráčů podle pohárů, přezdívky, profily hráčů a přátelé; tlačítko Kód je v Úkolech
- 1.33 – sněžná aréna (led, všichni kloužou), zvuky hry se na iPhonu smíchají s hudbou ze Spotify
- 1.32 – trailer k updatu (`?trailer`, video `trailer.mp4`)
- 1.31 – hratelnost: větší míč, shovívavější kop (i volej a míč ve výšce hlavy), kop zmáčknutý o chvilku dřív počká na míč, pomoc s mířením na bránu, silnější hlavičky
- 1.30 – Kiki v bikinách má sluneční brýle
- 1.29 – Michael Bémič v červeném basketbalovém dresu s číslem 23
- 1.28 – Úkoly (Milan za 15 zápasů, skiny Kiki v bikinách a Michael Bémič), Sully přejmenována na Suli
- 1.27 – automatická aktualizace na GitHub Pages (hra se sama obnoví, když je venku novější verze)
- 1.26 – přehlednější hlavní menu (dlaždice Online / Turnaj / Příběh, sponzoři v jednom řádku), tlačítko Kód a hlavní kód na odemčení všeho
- 1.25 – přehlednější lobby (nastavení dole v jednom řádku), schopnosti Obří páv a Flash, nový vzhled Páva a Sully
- 1.24 – Příběh: úrovně 1 v 1 i 2 v 2 s úkoly, skin Moncler-Jenda, nová dvojice Tlustej páv & Sully, náhled odměn
- 1.23 – Příběh (10 úrovní, zamčený kódem), zlatý dres, nový hráč Milan, turnaj i pro více hráčů a online
- 1.22 – rozcvička na začátku zápasu
- 1.21 – penalty pohledem za střelcem na 3D bránu
- 1.20 – tlačítko Turnaj v hlavním menu
- 1.19 – penaltový rozstřel při remíze
- 1.16–1.18 – spolehlivější a plynulejší online hra
