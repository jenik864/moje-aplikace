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

Quit má tři odlišné programy s onboardingem, podpisem, důvody a lokálním uložením. Porn Reboot má živý časovač a reset podržením 3 s. Doomscrolling a Junk Food mají ruční check-in dokončeného předchozího dne. Vynechaný check-in přerušuje sérii. Nejde o automatické sledování ostatních aplikací.

Každý program má vlastní úvod a onboarding s inspirací pro osobní manifest. Podpis zůstává zachovaný při návratu o krok zpět. SOS obsahuje volitelnou časovanou pauzu a ukládá vybraný spouštěč i délku pauzy.

Porn Reboot nabízí historii sérií, úpravu manifestu a ukládání spouštěčů SOS. Odznaky ranků mají barvy jednotlivých materiálů.

Me ukazuje ranky disciplín. Celkový rank zatím zůstává Copper: férové bodování Build a Mind není dohodnuté. Build, Mind a Business jsou zatím úvodní obrazovky.

Data se ukládají pouze lokálně přes AsyncStorage (bez šifrování), nikam se neodesílají. Nejde zatím o produkční zabezpečení citlivých dat. Bez systémových blokací, selfie kamery, účtů, žebříčků a předplatného.

Dohodnutá pravidla a další směr jsou v [docs/PRODUCT.md](docs/PRODUCT.md).
