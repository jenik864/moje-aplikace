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

Me ukazuje ranky disciplín. Celkový rank zatím zůstává Copper: férové bodování Build a Mind není dohodnuté. Mind a Business jsou zatím úvodní obrazovky. Build má vlastní plánování a odznaky (viz níže).

Data se ukládají pouze lokálně přes AsyncStorage (bez šifrování), nikam se neodesílají. Nejde zatím o produkční zabezpečení citlivých dat. Bez systémových blokací, selfie kamery, účtů, žebříčků a předplatného.

Dohodnutá pravidla a další směr jsou v [docs/PRODUCT.md](docs/PRODUCT.md).

## Build

Build má modrý akcent, dnešní misi a týdenní kalendář. Návrh plánu vzniká lokálně z tréninkových šablon podle cíle, zkušeností, volných dnů, času, vybavení a sportu. Před použitím se zobrazí náhled. Přepisuje jen nezahájené aktivity vybraného týdne od dneška; minulost, dokončené aktivity a rozepsané série zachová. Každou nedokončenou aktivitu lze upravit nebo přesunout.

Běh, kolo a plavání vyžadují vlastní zápis skutečných kilometrů a minut. Posilování ukládá série, opakování a váhy; pauza používá skutečný čas a pokračuje i při zavřené aplikaci. Mobilita ukládá minuty. Knihovna obsahuje 51 cviků se schematickou mapou hlavních a pomocných svalů, technikou a alternativou. Ranní a večerní rutiny péče jsou upravitelné a splnění je ruční.

Build nepoužívá ranky. Osm odznaků se odemyká z uložených dokončených výkonů a rutin; jednu výzvu lze připnout na hlavní obrazovku. Kilometry v plánu nic neodemknou, oprava záznamu se nezapočítá dvakrát. Plavecký odznak vyžaduje tři různé dny v jednom týdnu od pondělí do neděle. Získané odznaky zůstávají odemčené i po opravě záznamu. Data Build jsou oddělená v lokálním klíči `quitter.build.v1`. Při chybě načítání se nepřepíšou; neúspěšné uložení nabízí opakování. Není připojené GPS ani externí AI.
