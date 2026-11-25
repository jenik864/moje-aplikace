# Hlavouni

Fotbal velkých hlav v prohlížeči. Dva nebo čtyři panáčci s velkými hlavami hrají na noční stadion, hlavičkují a kopou do branky. Hra běží v obyčejném HTML5 canvasu, nic se neinstaluje.

## Spuštění

Stačí otevřít `index.html` v prohlížeči (dvojklik funguje, skripty nejsou moduly).

Pro hraní z mobilu ve stejné síti spusťte ve složce projektu jednoduchý server a otevřete adresu počítače:

```sh
python3 -m http.server 8000
# potom v telefonu http://<adresa-počítače>:8000
```

## Možnosti hry

| Volba | Hodnoty |
| --- | --- |
| Zápas | 1 v 1, 2 v 2 |
| Hráči | 1 hráč proti počítači, 2 hráči proti sobě, 2 hráči spolu proti počítači (jen 2 v 2) |
| Počítač | lehký, střední, těžký |
| Délka | 1, 2 nebo 3 minuty |

Ve 2 v 2 doplní chybějící hráče počítač. Při remíze po skončení času se hraje na zlatý gól. Nastavení i ztlumení zvuku si hra pamatuje v prohlížeči.

## Ovládání

| | Hráč 1 | Hráč 2 |
| --- | --- | --- |
| Běh | `A` `D` | `←` `→` |
| Skok | `W` | `↑` |
| Kop | `mezerník` nebo `S` | `↓` nebo `Enter` |

Když hraje jen jeden člověk, fungují mu obě sady kláves. `Esc` nebo `P` pozastaví hru.

Na dotykovém displeji se zobrazí tlačítka: jeden hráč běhá vlevo dole a skáče a kope vpravo dole. Při dvou hráčích má každý svou čtveřici tlačítek na své straně displeje. Telefon je potřeba otočit na šířku.

## Jak to funguje

- Kop: kopačka se švihne dopředu a nahoru. Čím později ve švihu trefí míč, tím vyšší je lob (24° až 58°).
- Hlavička: míč se odráží od hlavy podle toho, kam hráč běží a skáče.
- Na břevno se dá vyskočit, míč se od něj odráží a ze střechy branky sjede zpět do hřiště.
- Gól platí, když celý míč přejde brankovou čáru pod břevnem.
- Počítač odhaduje dráhu míče, chodí si za míč, vyskakuje na hlavičky, přeskakuje míč i soupeře, a když je soupeř u míče dřív, vrací se před vlastní branku. Obtížnost mění rychlost běhu, reakce, přesnost a ochotu bránit.

## Struktura

```
index.html      stránka, menu a panely
style.css       vzhled menu, tlačítek a dotykového ovládání
js/config.js    rozměry hřiště, fyzikální konstanty, týmy, postavičky, obtížnosti
js/audio.js     zvuky skládané ve Web Audio (bez souborů)
js/input.js     klávesnice a dotyková tlačítka
js/ai.js        počítačový hráč
js/physics.js   míč, hráči, kolize, góly
js/render.js    kreslení stadionu, hráčů, míče, efektů a tabule
js/main.js      herní smyčka, průběh zápasu, menu
```

Hřiště má virtuální rozměr 1280 × 720 a škáluje se na velikost okna. Fyzika běží v pevném kroku 1/120 s.
