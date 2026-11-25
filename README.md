# Hlavouni

Fotbal velkých hlav v prohlížeči. Panáčci s velkými hlavami hlavičkují a kopou na nočním stadionu. Hraje se 1 v 1 nebo 2 v 2: proti počítači, ve dvou na jednom zařízení, nebo online, kdy má každý svůj telefon. Hra běží v obyčejném HTML5 canvasu a nic se neinstaluje.

## Spuštění

Stačí otevřít `index.html` v prohlížeči (skripty nejsou moduly, takže funguje i dvojklik). Pro online hru a pro hraní z mobilu je potřeba hru otevřít přes web server, například:

```sh
python3 -m http.server 8000
# potom http://localhost:8000 nebo z telefonu http://<adresa-počítače>:8000
```

## Týmy a postavy

Ve 2 v 2 se v lobby šipkami vybírají dvě ze čtyř dvojic:

| Dvojice | Postavy |
| --- | --- |
| Nelcis & Majda (růžoví) | Nelcis (blond cop), Majda (dlouhé hnědé vlasy s mašlí) |
| Marsal & Durcado (modří) | Marsal (blond patka), Durcado (vlnité hnědé vlasy) |
| Tóma & Peli (zelení) | Tóma (střapaté hnědé vlasy), Peli (krátké černé vlasy) |
| Bémič & Kiki (oranžoví) | Bémič (zrzavý ježek, pihy), Kiki (dva drdoly) |

V 1 v 1 si každý vybere libovolnou z osmi postav. Dres má barvu její dvojice. Postavy mají tělo s dresem a číslem, trenky, ruce a kopačky, běhají, při radosti mávají a po inkasovaném gólu se mračí.

## Filmové scény a stadion

- **Úvod zápasu**: kamera sjede z velké obrazovky na hřiště, hráči vyběhnou a vyjedou plakáty obou týmů s VS.
- **Gól**: kamera se přiblíží k brance, síť se zavlní, publikum vyskakuje, reklamní tabule i velká obrazovka blikají GÓL a ukazují střelce.
- **Záznam gólu**: zpomalené opakování posledních vteřin se zoomem na míč.
- **Konec zápasu**: vítězové doběhnou doprostřed, nad nimi vyjede zlatý pohár, poražení odejdou ke své brance.

Scény jdou přeskočit tlačítkem *Přeskočit* (nebo klávesou Enter). Online je ovládá hostitel a kamarádi je vidí zároveň s ním.

## Lobby (výběr hráčů)

- **Hrát** (na tomto zařízení): vyber 1 v 1 nebo 2 v 2, délku zápasu a obtížnost počítače. Klepnutím na postavu ji dáš druhému hráči na stejném zařízení, dalším klepnutím ji vrátíš počítači. V 1 v 1 se šipkami mění postava.
- **Online s kamarády**: jeden hráč dá *Založit hru* a dostane čtyřznakový kód. Ostatní dají *Připojit* a kód opíšou. V lobby si každý klepnutím vybere postavu, volná místa hraje počítač. Hostitel spustí zápas, po konci může dát odvetu nebo se vrátit do lobby.

## Ovládání

| | Hráč 1 | Hráč 2 (na stejném počítači) |
| --- | --- | --- |
| Běh | `A` `D` | `←` `→` |
| Skok | `W` | `↑` |
| Kop | `mezerník` nebo `S` | `↓` nebo `Enter` |

Když u zařízení hraje jen jeden člověk, fungují mu obě sady kláves. `Esc` nebo `P` pozastaví hru.

**Na dotykovém displeji** je joystick: kam levým palcem sáhneš, tam se objeví. Do stran se běží (čím víc vychýlíš, tím rychleji), zatlačením nahoru se skáče. Vpravo jsou tlačítka KOP a SKOK. Když hrají dva na jednom telefonu, má každý svůj joystick a kop na své straně displeje.

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
style.css       vzhled menu, lobby, joysticku
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

Hřiště má virtuální rozměr 1280 × 720 a škáluje se na velikost okna. Fyzika běží v pevném kroku 1/120 s.
