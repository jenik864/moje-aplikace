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

Všechny holky mají dlouhé rozpuštěné vlasy až k lopatkám, které vlají při běhu a skoku. Postavy se liší i obličejem: přivřená víčka a vážný pohled, síla obočí a výraz pusy (úsměv, klidný, úšklebek).

V 1 v 1 si každý vybere libovolnou z deseti postav. Dres má barvu její dvojice. Postavy mají tělo s dresem a číslem, trenky, ruce a kopačky, běhají, při radosti mávají a po inkasovaném gólu se mračí.

## Filmové scény a stadion

- **Úvod zápasu**: kamera sjede z velké obrazovky na hřiště, hráči vyběhnou a vyjedou plakáty obou týmů s VS. Pak vybuchne ohňostroj a z každého týmu jeden hráč v bublině hecuje soupeře (každá postava má své hlášky). Kamera se na něj přiblíží.
- **Fanoušci**: levá polovina tribun fandí týmu vlevo (má jeho barvy), pravá týmu vpravo. Každá polovina pokřikuje v bublinách jen tyhle pokřiky: KIKI KIKI, VIKY VIKY, SULI SULI, SULI TI DÁ, MAGDI MAGDI, pokřiky své dvojice (Marsal & Durcado – JIŽNÍ SUPY, CP COMPANY; Tóma & Peli – TÓMA ŽLOUTEK; Bémič & Kiki – JONY, KIKI TĚ CHCE, SKIPER; Šimša & Jenda – MÁ VO2max 67) a jména svých hráčů (ŠIMŠA ŠIMŠA). Když je někdo omráčený míčem, zazní SLAJZNUL DO BAHNA. Po gólu má 15 fanoušků týmu, který skóroval, bublinu GÓL. Tleskají do rytmu bubnu a při tyčce zklamaně zahučí.
- **Gól**: kamera se přiblíží k brance, síť se zavlní, publikum vyskakuje, reklamní tabule i velká obrazovka blikají GÓL a ukazují střelce.
- **Záznam gólu**: zpomalené opakování posledních vteřin se zoomem na míč.
- **Konec zápasu**: vítězové doběhnou doprostřed, nad nimi vyjede zlatý pohár, poražení odejdou ke své brance.

Scény jdou přeskočit tlačítkem *Přeskočit* (nebo klávesou Enter). Online je ovládá hostitel a kamarádi je vidí zároveň s ním.

## Lobby (výběr hráčů)

- **Hrát** (proti počítači): vyber 1 v 1 nebo 2 v 2, délku zápasu a obtížnost počítače. Klepnutím na postavu si vybereš, za koho hraješ, ostatní hraje počítač. V 1 v 1 se šipkami mění postava. Postavy v lobby jsou živé (dýchají, mrkají, rozhlížejí se, vybraná zamává), stojí na osvětleném pódiu, pod každou je štítek kdo za ni hraje a její superschopnost. U dvojice je její pokřik a dole popis tvé superschopnosti.
- **Turnaj** (přepínač *Zápas / Turnaj* v lobby, jen proti počítači): vybereš svůj tým, pavouk vylosuje tři soupeře. Hraje se semifinále a finále, druhé semifinále se odehraje mezi počítači. Ve finále je soupeř o stupeň těžší. Za vítězství v turnaji je +15 pohárů navíc a počítá se do profilu (Vyhrané turnaje).
- **Online s kamarády**: jeden hráč dá *Založit hru* a dostane čtyřznakový kód. Ostatní dají *Připojit* a kód opíšou. V lobby si každý klepnutím vybere postavu, volná místa hraje počítač. Hostitel spustí zápas, po konci může dát odvetu nebo se vrátit do lobby.

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
| Šimša | **VO2max 67**: nad hlavou se mu objeví bublina „MÁM VO2max 67“ a 5 s běhá 1,7× rychleji. |
| Bémič | **Tučňák**: na 3 s se promění v tučňáka (jen vzhled), brána jeho týmu zamrzne ve velkém ledovém kráteru (nejde dát gól) a fanoušci řvou SKIPER. |
| ostatní | **Superstřela** (viz dál). Vlastní schopnosti přijdou v dalších verzích. |

Počítač superschopnosti používá taky: hermelín a led, když letí míč na jeho bránu, VO2max, když je míč daleko.

Superstřela vystřelí míč skoro dvakrát rychleji s ohnivou stopou v barvě postavy. Soupeře, kterého trefí, odstřelí: s výbuchem „BUM!“ odletí točící se kus dál, po dopadu je chvíli omámený (spirálové oči, hvězdičky kolem hlavy) a nemůže hrát. Míč letí dál a může odstřelit i dalšího. Když švih mine míč, nabití zůstane.

### Poháry a ligy

Za každý zápas dostane hráč na svém zařízení poháry: za výhru +8 (proti lehkému počítači méně, proti těžkému víc, online +10), navíc za větší rozdíl skóre a za vlastní góly. Za prohru se 3 poháry ztratí. Podle pohárů postupuje ligami Nováček → Bronz → Stříbro → Zlato → Diamant → Mistr → Legenda. Liga a poháry jsou vidět vpravo nahoře v menu. Po klepnutí se ukáže profil se statistikami (zápasy, výhry, góly, superstřely, odstřelení, nejdelší série výher). Po zápase se ukáže hráč zápasu a kolik pohárů přibylo. Postup se ukládá v prohlížeči daného zařízení.

### Celá obrazovka

Hra vyplní celý displej bez černých pruhů. Na širokém telefonu je vidět víc stadionu do stran a kamera hřiště přiblíží na celou šířku. Tlačítko vpravo nahoře zapne celou obrazovku prohlížeče. Úplně bez lišt prohlížeče hra běží po *Přidat na plochu* (manifest `manifest.webmanifest` s režimem fullscreen a orientací na šířku). Na výšku hra ukáže výzvu k otočení telefonu.

V aplikaci Claude (artifact) zůstane kolem hry rámeček aplikace: horní lišta s křížkem a okraje po stranách. Ten hra odstranit nemůže. Hra si ale změří, kolik místa je opravdu vidět (bezpečné okraje displeje a případně oříznutou část okna) a podle toho zmenší rozložení obrazovek, aby nic nebylo uříznuté. Dialogy, které by se přesto nevešly, jdou posunout prstem. Bez jakýchkoli lišt hra běží jen jako webová verze přidaná na plochu (viz Zveřejnění na GitHub Pages).

## Online hra: jak funguje

Hostitel počítá celý zápas a asi 30× za sekundu posílá jeho stav ostatním. Ostatní posílají jen svoje ovládání. Když kamarád odejde, jeho hráče převezme počítač. Když odejde hostitel, hra skončí všem.

V lobby se kamarádi připojují kódem nebo odkazem s kódem (tlačítko *Pozvat*, odkaz končí `#kod-ABCD`). Každý si vybere postavu a dá *Jsem připraven*. Hostitel vidí, kolik hráčů je připraveno, a spustí zápas.

Přenos se volí podle toho, kde hra běží:

- **Na webu (GitHub Pages), pro kohokoli bez účtu**: WebRTC přes knihovnu PeerJS (přibalená v `js/vendor/`) a její veřejný server pro navázání spojení. Když přímé spojení nejde, PeerJS použije své veřejné TURN servery.
- **Na claude.ai (artifact)**: sdílená místnost artifactu. Hrát online tam můžou jen přihlášení lidé, kterým je artifact nasdílený. Ostatním hra ukáže adresu webové verze.

### Zveřejnění na GitHub Pages

GitHub Pages zdarma funguje jen pro veřejný repozitář.

1. *Settings → General → Danger Zone → Change visibility* → **Public**.
2. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, větev `claude/tender-maxwell-a4f0g0` (nebo `main` po sloučení), složka **/ (root)** → **Save**.
3. Za minutu až dvě hra poběží na `https://jenik864.github.io/moje-aplikace/`.

Pro testy lze v prohlížeči nastavit `window.HLAVOUNI_NET = 'bc'` (BroadcastChannel mezi panely) nebo `window.HLAVOUNI_PEER = { host, port, path, secure }` (vlastní server PeerJS).

## Jak funguje hra

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
js/net.js       online přenos (artifact room, PeerJS, BroadcastChannel)
js/vendor/      PeerJS 1.5.4 (licence MIT)
js/lobby.js     výběr hráčů
js/main.js      herní smyčka, průběh zápasu, obrazovky, hostitel a host
```

Hřiště má virtuální rozměr 1280 × 720. Na displeji jiného poměru stran se zobrazí víc okolí, takže nikde nejsou černé pruhy. Fyzika běží v pevném kroku 1/120 s.
