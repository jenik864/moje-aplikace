# Quitter — dohodnutá pravidla

- React Native + Expo; pět záložek Quit, Build, Mind, Business, Me.
- Vzhled: #050505 pozadí, #1a1a1a panely, zelená úspěch, červená SOS, fialová profil. Profesionální geometrické znaky bez fantasy postav.
- Všechny programy Quit používají barvu aktuálního ranku v hlavních prvcích a navigaci; PRIME má vlastní historickou barvu. SOS zůstává růžové. Nové panely jsou neutrální a tmavé.
- Ranky: Copper, Bronze, Silver, Gold, Platinum, Sapphire, Ruby, Emerald, Diamond, Obsidian. Každý začíná na Copper.
- Current může růst i klesat. PRIME je nejvyšší dosažený potvrzený rank a neklesá.
- Disciplíny mají stejné názvy ranků, menší odznaky, bez předpony mini.
- Celkový rank bude odvozen z průměru číselných skóre Quit, Build a Mind se stejnou vahou. Bodování a agregace disciplín ještě nejsou rozhodnuté. Business samostatně.
- Quit: Porn Reboot, Doomscrolling, Junk Food; lze aktivovat více programů, každý má vlastní onboarding, podpis, důvody, dashboard a historii.
- Porn: pouze vědomé sledování porna resetuje sérii. Masturbace bez porna a náhodné zobrazení nejsou relaps. Třísekundové podržení resetu. PRIME a historie zůstávají.
- Milníky Porn: 0 / 3 / 5 / 9 / 14 / 21 / 30 / 60 / 90 / 180 dní. Herní milníky, nikoli zdravotní tvrzení.
- Doomscrolling: vybrané aplikace a společný denní limit; cílově upozornění a systémová blokace po limitu. Vyžaduje nativní integraci a oprávnění, není hotová.
- Junk Food: konkrétní osobní pravidlo; nepodporovat hladovění, tresty ani hodnocení váhy.
- Budoucí Porn SOS: volitelná selfie kamera bez ukládání/odesílání obrazu. Budoucí blokování webů.
- Budoucí Business: projekty, hledání spolupracovníků, AI. RevenueCat pro předplatné.

## Rozsah první implementace
Lokální data, onboarding s kresleným podpisem, časovač Porn, ruční včerejší check-in ostatních disciplín, menší ranky, PRIME, SOS, matice. Doomscrolling/Junk Food zatím používají stejnou dočasnou řadu milníků. Celkový Copper je výchozí stav, ne vypočtený výsledek. Zbylé pilíře jsou informační návrhy, bez funkčních aktivit. Bez účtů, cloudu, žebříčků, blokování, kamery a plateb. Spouštěč SOS se ukládá při návratu k plánu. Porn Reboot zobrazuje poslední série, nejlepší sérii a umožňuje upravovat manifest bez resetu. Matice rozlišuje dokončené dny, dnešek a dny resetu.

Aktuální pokyn uživatele: pokračovat samostatně podle dohodnutého směru a postupně aplikaci vylepšovat. Pro neujasněné produktové volby používat konzervativní výchozí řešení a vysvětlit je.

## Třetí kolo
Programy mají vlastní úvodní ilustraci a odlišné texty a kroky onboardingu. Osobní důvody lze doplnit volitelnými příklady. Podpis se uchová při návratu zpět v otevřeném onboardingu, při kreslení se neprotáčí stránka. Přepínání programů ukazuje aktuální výběr. SOS obsahuje dobrovolnou časovanou pauzu (Porn 2 minuty, Doomscrolling 5 minut, Junk Food 2 minuty); lze ji ukončit kdykoli, bez přidávání bodů. Při návratu s vybraným spouštěčem se uloží i skutečně uplynulý čas, nejvýše délka protokolu.

## Čtvrté kolo
Doomscrolling a Junk Food mají průběžný dnešní zápis. Dnešek se ukládá jako koncept bez zvýšení ranku; následující den uživatel potvrdí celý předchozí den, případně opraví zápis. Doomscrolling ukládá skutečné ručně zadané minuty a přehled limitu, bez automatického sledování. Matice má 7 sloupců, datum každého dne, legendu a detail po klepnutí. Historie Porn ukazuje minuty i čas resetu. SOS je dostupné hned pod rankem, fyzický krok je v horní části SOS a návrat je trvale dostupný. Každý návrat k plánu ukládá záznam, i bez spouštěče (Neuvedeno); zavření křížkem ho neukládá. Nejde o ověření úspěšného zvládnutí krize ani zdroj XP.

## Detailní update Porn Reboot
Rozsah tohoto updatu je pouze Porn Reboot. Kompaktní hlavička uvolňuje první obrazovku pro Current/PRIME, časovač s minutovými značkami a postup k dalšímu ranku. SOS je až pod časovačem a postupem, s jemnějším vzhledem; jeho dvouminutová logika zůstává.

Ranky, matice, statistiky, historie, záznamy SOS a osobní manifest mají vlastní rozklikávací přehledy. Manifest včetně původního podpisu lze zobrazit a upravit důvody přímo v detailu. Matice ukazuje 28 lokálních kalendářních dnů, odlišuje dny před aktivací, dokončené dny bez resetu, resety a dnešek. Jeden den může obsahovat reset i právě běžící novou sérii. Detail dne ukazuje počty a časy jednotlivých resetů a SOS.

Graf délek ukazuje posledních osm sérií včetně právě běžící; bod lze vybrat pro délku. Graf událostí ukazuje počty resetů a uložených návratů SOS za 14 dní. Konzistence počítá pouze dokončené dny od aktivace v posledních 28 dnech, průměr délek pouze ukončené série. Grafy nemají ukázková ani náhodně generovaná data. Prázdné stavy vysvětlují, co zatím chybí. Reset má průběh třísekundového podržení a ruší se při uvolnění nebo opuštění aplikace. Ukládání a pravidla ostatních programů nejsou změněna.

## Ciferníky a atmosféra ranků
V Porn Rebootu určuje aktuální rank barvu časovače, postupu, aktivní navigace, grafu délek, matice a manifestu. PRIME používá barvu historicky nejvyššího ranku. Pozadí zůstává neutrální, SOS červené. Onboarding začíná v měděné barvě.

Každý z deseti ranků má vlastní geometrii hodin: Copper jednoduché značky; Bronze spojovací body; Silver přesné přerušované prstence; Gold výrazné radiální značky; Platinum orbitální vrstvy; Sapphire šestiúhelníkové fazety; Ruby členitou korunu a čtyři drahokamy; Emerald osmiúhelníkové vrstvy; Diamond dvojité fazety; Obsidian šestnáctiúhelníkový obvod, světelný prstenec a čtyři vrcholy. Získání vyššího ranku zobrazí krátké oznámení odemčení. Seznam ranků nabízí náhled ciferníků bez změny uloženého programu. Dříve dosažené ranky označuje podle PRIME, aktuální podle Current.

SOS má vlastní symbol ruky ve štítu, dvouminutový nouzový panel a připomínku osobních důvodů před časovaným krokem. Časovač v SOS je kompaktnější. Nové záznamy ukládají, zda byla pauza spuštěna; starší nulové záznamy se popisují jako bez zaznamenané pauzy. Matice odlišuje výběr dne obrysem a dnešek značkou v rohu, resety označuje červeně. Délky u resetů jsou popsané jako ukončené série. Graf délek má stupnici a přerušované spojení k právě běžící sérii, statistika sérií zahrnuje i běžící sérii. Graf událostí má čitelnější data, celočíselnou stupnici a výběr dnů s událostmi. Ostatní disciplíny mají dosavadní vzhled a pravidla.

## Vizuální doladění Porn Reboot pro první verzi
Hodiny a postup k dalšímu ranku tvoří jeden kompaktní panel. Ciferník má matný neutrální podklad bez plošné radiální záře; barvu a geometrii stále určuje aktuální rank. SVG používá rozměry změřeného panelu, aby velikost a rozestupy nezávisely na výpočtu procentní výšky na telefonu.

Dashboard, SOS a detaily mají sjednocenou typografii, jemnější rámečky, rozestupy a zaoblení. Ranky mají šipku pro náhled, kalendář stručnější legendu a události oddělené řádky. Graf délek zobrazuje hodiny a minuty místo desetinných hodin. SOS ponechává hlavní akci výraznou a návrat k plánu trvale dostupný; jeho text vysvětluje ukládání záznamu bez technických poznámek o budoucích funkcích. Pravidla, uložená data a ostatní programy zůstávají beze změny.

## Oprava rozložení a přepracování ciferníku a SOS
Fotky z iPhonu odhalily posunuté texty v ciferníku a nadměrnou výšku jeho panelu. Ciferník nyní používá explicitní čtvercové rozměry a kreslí čísla, popisky i obvod v jednom SVG souřadnicovém systému. Samostatná absolutně umístěná vrstva textu a kombinace procentní šířky, maximální šířky a poměru stran jsou odstraněné. Náhledy ranků používají stejný způsob rozložení. Hodiny mají kovový obvod v barvě ranku, název ranku na ciferníku, výrazné počítadlo dnů a oddělený čas. Deset geometrií a stávající milníky zůstávají.

Hlavní SOS akce má novou kompozici s plnou kontrastní plochou tlačítka a jednoduchým symbolem pauzy místo ruky ve štítu. SOS obrazovka zobrazuje osobní důvody jako krátký citát a pauzu jako kruhový odpočet. Kruhový průběh zobrazuje zbývající čas; dvouminutová logika, dobrovolný spouštěč, ukládání návratů a trvale dostupný návrat k plánu se nemění. Úpravy se týkají Porn Rebootu.

## Detailní přehledy Doomscrolling a Junk Food
Doomscrolling má vlastní ciferník ručně zapsaných dnešních minut vůči společnému dennímu limitu. Nezapsaný čas je neznámý (pomlčka), nikoli nula. Překročení limitu se zobrazí růžově včetně počtu minut nad limitem. Junk Food zdůrazňuje osobní pravidlo a dnešní průběžný stav. Oba programy zobrazují Current/PRIME, aktuální potvrzenou sérii a postup k dalšímu milníku. Barvy, kompaktní hlavička a SOS navazují na Porn Reboot; jeho ciferník a pravidla se nemění.

Denní check-in má samostatný dnešní koncept a potvrzení dokončeného včerejška. Dnešek nezvyšuje rank, oprava potvrzeného dne může změnit Current a zachová PRIME. První den se potvrzení včerejška nenabízí. Junk Food používá volby Dodrženo / Mimo plán. Pravidlo lze založit během onboardingu; úprava manifestu mění pouze důvody.

Ranky, 28denní konzistence, statistiky, manifest s podpisem a návraty ze SOS mají vlastní rozklikávací přehledy. Detail kalendáře ukazuje potvrzený čas nebo průběžný zápis a počet návratů ze SOS. Graf Doomscrollingu zobrazuje ručně zaznamenané minuty za 14 dní a denní limit; graf Junk Food dodržení pravidla. Dnešní koncept má obrys, chybějící zápis není vyhodnocen jako neúspěch. Konzistence používá pouze potvrzené dny od aktivace v posledních 28 dnech. Nejlepší série přeruší návaznost při chybějícím či nesplněném dni; průměr minut nezahrnuje dnešní koncept ani historické dny bez zapsaného času.

Sdílené SOS používá kruhovou pauzu: Doomscrolling 5 minut, Junk Food 2 minuty. Nové záznamy všech programů uchovávají, zda byla pauza spuštěna. Zavření záznam nevytvoří; návrat k plánu ho uloží i bez spouštěče. Data zůstávají lokální, bez automatického měření, systémového blokování či dalších bodů za SOS. Ukládací klíč a starší záznamy zůstávají kompatibilní. Neaktivní programy pageru jsou skryté pro čtečky obrazovky.


## Rozšíření osobního prostoru Me

Me spojuje skutečné uložené události čtyř oblastí, stávající odznaky Build/Mind a volitelné týdenní cíle. Cíle ani historie nezavádějí další bodování. Celkový rank a PRIME dál vycházejí ze stejných tří stejně vážených oblastí; Business je samostatný. Graf ranku začíná až skutečným pozorováním v této verzi a nevytváří odhad minulosti. Zálohu všech pěti datových oblastí lze stáhnout/sdílet a po náhledu výslovně obnovit s nahrazením současných dat. Obnova chrání původní hodnoty a po dokončení znovu načte všechny sekce. Účet a cloudová synchronizace nejsou součástí tohoto updatu.

## Jednotná barevnost

Všech pět sekcí sdílí téměř černý základ, bílý text a bílé ovládání. Barevné ranky zůstávají na emblémech, cifernících a jejich náhledech. SOS je ve všech programech červené, s plastickým přechodem a statickou září; běžné primární akce jsou bílé. Grafy a navigace nepřebírají barvu aktuálního ranku.
