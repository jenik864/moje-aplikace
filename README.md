# Quitter

První prototyp mobilní aplikace pro seberozvoj v React Native + Expo.

## Spuštění

Node.js 22.13+ (ověřeno na 24.19), npm.

```sh
npm ci
npm start
```

Na telefonu použijte Expo Go kompatibilní s Expo SDK 57, pokud je pro váš telefon dostupné; jinak odpovídající development build. Telefon musí dosáhnout na Metro server. Přístup z cloudového prostředí není automaticky zajištěn. Pro web:

```sh
npm run web
```

## Vizuální systém

Quit, Build, Mind, Business a Me používají společné tmavé plochy, jemné světlo, typografii a SVG ikony. `src/design.tsx` obsahuje prostředí, materiálový vizuál ranku a spodní navigaci; ta zabírá vlastní místo a respektuje spodní bezpečný okraj telefonu. Dvanáct emblémů má vlastní siluetu, kovový povrch nebo krystalové fasety. Barva aktivních disciplín dál vychází z jejich Current ranku. Redesign nemění pravidla bodování ani formát uložených dat.

## Kontroly

```sh
npm run typecheck
npm test
npx expo export --platform web
```

Pokud prostředí nedovoluje zápis do standardní npm cache, použijte `npm_config_cache=/tmp/quitter-npm-cache`. V tomto cloudovém sandboxu spouštějte Expo s `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/quitter-expo EXPO_OFFLINE=1`, aby jeho lokální nastavení používalo zapisovatelnou cestu. Offline režim nepoužívá Expo API; závislosti jsou stále ověřované npm.

## První verze

Quit má tři odlišné programy s onboardingem, podpisem, důvody a lokálním uložením. Porn Reboot má živý časovač a reset podržením 3 s. Doomscrolling a Junk Food mají ruční průběžný zápis dneška a potvrzení dokončeného předchozího dne. Dnešní koncept nezvyšuje rank. Doomscrolling ukazuje ručně zapsanou spotřebu vůči limitu. Vynechaný check-in přerušuje sérii. Nejde o automatické sledování ostatních aplikací.

Každý program má vlastní úvod a onboarding s inspirací pro osobní manifest. Podpis zůstává zachovaný při návratu o krok zpět. SOS obsahuje volitelnou časovanou pauzu a ukládá návrat k plánu, volitelný spouštěč i délku pauzy. Návratové tlačítko je stále dostupné.

Porn Reboot má samostatný detailní dashboard s časovačem, Current/PRIME a postupem k milníku. Barvy a vlastní ciferník se mění podle Current ranku; deset ciferníků lze prohlédnout v náhledech ranků. SOS je pod časovačem, má vlastní nouzový panel a připomínku důvodů před pauzou. Ranky, 28denní matice, manifest s podpisem, celá historie a záznamy SOS se rozklikávají. Statistiky zobrazují graf posledních osmi sérií, 14denní události, konzistenci dokončených dnů a průměr ukončených sérií. Výpočty používají uložená data. Odznaky ranků mají barvy jednotlivých materiálů.

Doomscrolling má vlastní ukazatel zapsaných minut vůči dennímu limitu; Junk Food zvýrazňuje konkrétní pravidlo a dnešní stav. Oba programy mají barvy podle Current ranku, rozklikávací ranky, kalendář s detaily, grafy skutečných zápisů, manifest s původním podpisem a záznamy SOS. Statistiky oddělují dnešní koncept od potvrzených dní. SOS používá kruhový odpočet pěti minut pro Doomscrolling a dvou minut pro Junk Food.

Me zobrazuje vypočtený celkový rank a skutečný postup Quit, Build a Mind, umožňuje úpravu jména a osobního záměru a přímé otevření disciplín (viz níže). Business má vlastní projekty a kroky. Mind má vlastní plán, arénu a lekce. Build má vlastní plánování a odznaky.

Data se ukládají pouze lokálně přes AsyncStorage (bez šifrování), nikam se neodesílají. Nejde zatím o produkční zabezpečení citlivých dat. Bez systémových blokací, selfie kamery, účtů, žebříčků a předplatného.

Dohodnutá pravidla a další směr jsou v [docs/PRODUCT.md](docs/PRODUCT.md).

## Build

Build má nahoře Current/PRIME a barevný design podle Current ranku, dnešní misi, přehled všech sedmi dnů a měsíční kalendář. Týden lze sestavit vlastními aktivitami nebo si nechat vytvořit návrh s Quitterem. Návrh plánu vzniká lokálně z tréninkových šablon podle cíle, zkušeností, volných dnů, času, vybavení a sportu. Před použitím se zobrazí náhled. Přepisuje jen nezahájené aktivity vybraného týdne od dneška; minulost, dokončené aktivity a rozepsané série zachová. Každou nedokončenou aktivitu lze upravit nebo přesunout.

Běh, kolo a plavání vyžadují vlastní zápis skutečných kilometrů a minut. Posilování ukládá série, opakování a váhy; pauza používá skutečný čas a pokračuje i při zavřené aplikaci. Mobilita ukládá minuty. Knihovna obsahuje 51 cviků, kompaktní řádky s náhledy, hledání bez diakritiky a rozbalovací filtry pro hlavní i pomocné svaly. Detail má záložky „Zapojené svaly“ a „Jak cvičit“. Anatomická vektorová mapa má tvarované svalové skupiny a jednotlivé břišní svaly; tmavá červená označuje hlavní a světlejší pomocné zapojení nezávisle na ranku. Lze přepnout přední, zadní nebo oba pohledy, klepnout na sval pro detail a zastavit pulzování hlavních svalů. Animace respektuje omezený pohyb systému. Jde o orientační mapu, nikoli měření intenzity ani animovanou demonstraci cviku. Ranní a večerní rutiny péče jsou upravitelné a splnění je ruční.

Build má kumulativní rank: 1 bod za 30 skutečně zapsaných minut pohybu, nejvýše 3 body za kalendářní den dohromady ze všech aktivit. Odpočinek postup neresetuje; plán a péče o pleť body nedávají. Hranice Copper–Obsidian jsou 0, 6, 12, 20, 35, 55, 85, 120, 170, 240, 330 a 450 bodů. Oprava záznamu přepočítá Current, PRIME zachová nejvyšší dosažený rank. Starší data bez PRIME zůstávají čitelná. Osm odznaků se odemyká z uložených dokončených výkonů a rutin; jednu výzvu lze připnout na hlavní obrazovku. Kilometry v plánu nic neodemknou, oprava záznamu se nezapočítá dvakrát. Plavecký odznak vyžaduje tři různé dny v jednom týdnu od pondělí do neděle. Získané odznaky zůstávají odemčené i po opravě záznamu. Data Build jsou oddělená v lokálním klíči `quitter.build.v1`. Při chybě načítání se nepřepíšou; neúspěšné uložení nabízí opakování. Není připojené GPS ani externí AI.

## Mind

Mind má Current/PRIME, vlastní XP a design podle Current ranku. Hlavní obrazovka ukazuje postup k dalšímu ranku, konkrétní dnešní aktivitu, přímý vstup do arény a objevování, týdenní plán a kompaktní vstup do odznaků. Osobní plán obsahuje četbu, učení, soustředění, meditaci, reflexi a vlastní aktivity. Editor odděluje přehled od formuláře; u aktivity lze nastavit název, cíl 1–180 minut a opakující se dny. Budoucí splnění je zakázané. Změny plánu platí od dneška a starší rozvrhy i již potvrzené aktivity zůstávají zachované. Vybraný den lze doplnit jednorázovou aktivitou bez změny pravidelného plánu; nedokončenou jednorázovou aktivitu lze odebrat, během běžícího bloku je chráněná. Poznámku u splněné aktivity lze upravit bez rušení splnění a změny XP. Editor pravidelného plánu i jednorázové aktivity chrání neuložené změny. Četba může mít poznámku s knihou a stránkou. Týdenní přehled ukazuje skutečná denní XP, splnění, cíle aktivit, dokončené bloky, lekce a kola. Cíle a čas bloků jsou oddělené, protože mohou popisovat stejnou činnost. Starší aktivita s přesným názvem „Meditace“, vedená jako četba, se při načtení převede do vlastní kategorie.

Rank má hranice Copper–Obsidian 0, 40, 100, 180, 300, 480, 720, 1050, 1500, 2100, 2900 a 4000 XP. Za den se bere vyšší ze součtu minut cílů ručně splněných aktivit a minut potvrzených časových bloků, nejvýše 30 XP. Správné příklady z dokončených kol přidávají 1 XP za příklad, nejvýše 15 XP denně. První dokončení každé lekce přidává 15 XP. Společný denní strop je 60 XP. Plán, rozehraná kola, zrušené bloky a opakování stejné lekce nic nepřidávají. Rank se při odpočinku neresetuje. Oprava splnění přepočítá Current; PRIME si pamatuje nejvyšší úroveň, i u starších dat bez uloženého PRIME. Blok přes půlnoc počítá minuty k původnímu dni. Staré záznamy her, lekcí a aktivit se zahrnou do nového systému bez vymazání historie.

Mentální aréna má 60/120sekundová kola, tři obtížnosti a volbu sčítání, odčítání, násobení a dělení. Správná odpověď automaticky vymaže vstup a okamžitě otevře další příklad z dotykové i fyzické klávesnice. Tlačítko OK je odstraněné. Herní obrazovka má pevné rozložení pro čas, příklad a klávesnici; používá menší rozměry na nízkých displejích. Odečítání je nezáporné a dělení celočíselné. Chybný vstup s dostatečným počtem číslic označí příklad jako chybný nejvýše jednou; lze ho opravit. Přeskočení se započítá jako chyba, pokud příklad ještě nebyl označený jako chybný. Zapisují se pouze dokončená kola, rekordy se porovnávají při shodné obtížnosti, délce a sadě operací. Deadline používá skutečný čas; pozdní odpovědi se nezapočítají. Jemný efekt změny příkladu respektuje omezení pohybu systému. Náhled příkladu odpovídá zvolenému režimu. Poslední spuštěná obtížnost, délka a operace se uloží; historii lze filtrovat na stejný režim. Výsledek ukazuje správné příklady za minutu, nejdelší skutečnou sérii, přesnost a skutečný rozdíl XP po denních limitech. Starší kola bez uložené série se nepřepočítávají na vymyšlený rekord.

Objevování má devět témat ve čtyřech oblastech: Python a hledání půlením; rafinerie, internet a elektřina; paměť a kritické myšlení; složené úročení a procenta. Knihovna nabízí hledání bez diakritiky, oblastní filtry, uložená, rozpracovaná a dokončená témata. Domovská obrazovka doporučí denní téma; rozpracovaná lekce má přednost. Po odstupu dvou dnů knihovna nabídne nejdéle neopakované dokončené téma; jde o jednoduchou pomůcku pro opakování, nikoli odhad zapamatování.

Každá lekce má tři kroky s ovladatelnými ukázkami a kontrolní otázkou a závěrečný úkol. Python simuluje konkrétní kód, rafinerie ukazuje frakce a úročení mění čas i sazbu. Nové laboratoře demonstrují různé základy procent, přenos MB přes Mb/s, aktivní vybavení, základní četnost, výkon/energii/účinnost a skutečné kroky lineárního i binárního hledání. Jde o označené zjednodušené modely. Pokračování je dostupné dole a vyžaduje správnou odpověď. Postup se uloží po potvrzeném kroku. Poznámky k tématům se ukládají automaticky včetně mezer při psaní a jsou dostupné i při opakování. První dokončení zachovává původní datum; opakování zapíše datum osvěžení bez dalších XP. Témata fungují bez sítě; generování vlastních témat a AI tutor nejsou připojené.

Časový blok ukládá deadline a funguje i po návratu do aplikace. Po doběhnutí je nutné skutečné dokončení potvrdit; zrušení XP ani splnění nedává. Blok spuštěný z dnešní aktivity ji při potvrzení označí jako splněnou. Časovač neověřuje vykonávání činnosti a nenahrazuje systémové blokování rozptýlení. Deset odznaků se odemyká ze splněných návyků, dokončených her, lekcí a bloků; po získání zůstávají. Původní odznak Zvídavá hlava dál vyžaduje původní tři lekce; nové odznaky oceňují všech devět témat a opakování tří různých lekcí. Data zůstávají v `quitter.mind.v1`; nové volitelné položky jsou kompatibilní se staršími zápisy. Načítání chrání poškozená data před přepsáním a uložení nabízí opakování při chybě.

## Business

Business má dvě jasně oddělené obrazovky: dnešní práci a moje projekty. Projekt obsahuje konkrétní očekávaný výsledek, poznámky, barvu a stav. Lze začít vlastním postupem nebo si nechat vložit čtyři upravitelné kroky pro ověření nápadu či zveřejnění výstupu. Šablona nepřidává termíny ani splnění.

Kroky mají vlastní název, volitelný odhad 5–240 minut, datum a prioritu. Detail kroku dovoluje naplánování na dnešek, splnění, opravu a úpravu. Dnešní přehled zahrnuje nehotové starší kroky a upřednostní důležité. Budoucí a nenaplánované kroky nevydává za dnešní plán. Splněné kroky se zobrazují jen v den skutečného splnění, i pokud byl krok dokončen před plánovaným datem. Odhady nejsou měřený čas.

Projekt se dokončí výslovně a až po splnění všech kroků. Znovuotevření umožní další změny; pozastavení vyřadí nehotové kroky z denního přehledu. Archiv projekt i kroky zachová a dovoluje obnovení. Smazání jednotlivého kroku vyžaduje potvrzení. Formulář při opuštění chrání neuložené změny.

Business se ukládá samostatně do `quitter.business.v1`. Poškozená či nenačtená data se nepřepíšou, chyba zápisu nabízí opakování. Pravidla ani data Quit, Build a Mind se nemění; Business nepřidává XP do jejich ranků. Spolupráce, sdílení projektů, účty a AI nejsou připojené.

## Me a celkový rank

Celkový rank má tři stejně vážené oblasti: Quit, Build a Mind. Každý existující systém se převádí na škálu 0–11 podle svých dvanácti ranků včetně lineárního postupu mezi sousedními hranicemi. Quit je průměr aktivních programů s dostupnými údaji; Doomscrolling čekající na sedm skutečně měřených dokončených dnů se nezapočítá. Bez započitatelného programu má Quit výchozí skóre 0. Build a Mind mají vždy vlastní třetinu. Průměr oblastí krát 100 tvoří body profilu: Copper 0, Bronze 100, Iron 200 až Obsidian 1100. Business je samostatný.

Neaktivní program není neúspěšný den. Neúplná měření nejsou nula; chybějící či poškozená data Build/Mind blokují celkový výsledek, dokud se je nepodaří načíst. Plány, péče o pleť, náhledy a úprava jména body nepřidávají. Pravidla a historické PRIME jednotlivých disciplín se nemění. Nová aktivace programu může změnit průměr Quit a tedy Current.

Celkový PRIME je nejvyšší skutečně zaznamenaný společný rank od zavedení profilu. Neskládá se z nezávislých historických PRIME disciplín, které nemusely nastat zároveň. Sleduje se i mimo obrazovku Me a postup zaznamenává až po úspěšném uložení všech zdrojových dat. Opravy a resety jej nesnižují. Jméno, osobní záměr a PRIME se ukládají odděleně do `quitter.profile.v1`; chyba načtení původní data nepřepíše a chybu zápisu lze zopakovat.

Build a Mind nyní používají jednu společnou instanci dat pro svou sekci i profil. Me ukazuje aktuální ranky, zdrojové body/XP, odznaky, počty potvrzených tréninků a aktivit. Z profilu lze otevřít konkrétní program Quit i ostatní sekce. Jméno a záměr jsou volitelné, formulář chrání rozepsané změny. Přehled ukládání vysvětluje lokální data; účet, přenos dat a cloudová synchronizace nejsou připojené.
