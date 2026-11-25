# Hlavouni

Fotbal velkých hlav v prohlížeči. Panáčci s velkými hlavami hlavičkují a kopou na nočním stadionu. Hraje se 1 v 1 nebo 2 v 2: proti počítači, ve dvou na jednom zařízení, nebo online, kdy má každý svůj telefon. Hra běží v obyčejném HTML5 canvasu a nic se neinstaluje.

## Spuštění

Stačí otevřít `index.html` v prohlížeči (skripty nejsou moduly, takže funguje i dvojklik). Pro online hru a pro hraní z mobilu je potřeba hru otevřít přes web server, například:

```sh
python3 -m http.server 8000
# potom http://localhost:8000 nebo z telefonu http://<adresa-počítače>:8000
```

## Týmy a postavy

Ve 2 v 2 hrají dva pevné týmy:

| Tým | Hráči |
| --- | --- |
| Nelcis & Majda (růžoví) | Nelcis (blond cop), Majda (dlouhé hnědé vlasy s mašlí) |
| Marsal & Durcado (modří) | Marsal (blond patka), Durcado (vlnité hnědé vlasy) |

V 1 v 1 si každý vybere jednu z těchto čtyř postav. Postavy mají tělo s dresem a číslem, trenky, ruce a kopačky, běhají, při radosti mávají a po inkasovaném gólu se mračí.

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

Hostitel počítá celý zápas a asi 30× za sekundu posílá jeho stav ostatním. Ostatní posílají jen svoje ovládání. U kamarádů se pohyb vyhlazuje, takže jejich vlastní hráč reaguje s malým zpožděním (podle sítě zhruba 0,1–0,3 s). Když kamarád odejde, jeho hráče převezme počítač. Když odejde hostitel, hra skončí všem.

Přenos se volí podle toho, kde hra běží:

- **Na claude.ai (artifact)**: používá se sdílená místnost artifactu. Kamarádi musí být přihlášení na claude.ai a mít k artifactu přístup (sdílení přes tlačítko Share). Kdo stránku otevře nepřihlášený nebo přes veřejný odkaz, online hrát nemůže.
- **Na vlastním webu (např. GitHub Pages)**: používá se WebRTC přes knihovnu PeerJS a jejich veřejný server pro navázání spojení. Funguje pro kohokoli s odkazem. Na některých mobilních sítích se ale spojení nemusí podařit navázat. Pak pomůže být na stejné Wi-Fi.

Pro testy lze v prohlížeči nastavit `window.HLAVOUNI_NET = 'bc'`. Online hra pak běží přes BroadcastChannel mezi panely jednoho prohlížeče.

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
js/lobby.js     výběr hráčů
js/main.js      herní smyčka, průběh zápasu, obrazovky, hostitel a host
```

Hřiště má virtuální rozměr 1280 × 720 a škáluje se na velikost okna. Fyzika běží v pevném kroku 1/120 s.
