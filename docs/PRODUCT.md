# Quitter — dohodnutá pravidla

- React Native + Expo; pět záložek Quit, Build, Mind, Business, Me.
- Vzhled: #050505 pozadí, #1a1a1a panely, zelená úspěch, červená SOS, fialová profil. Profesionální geometrické znaky bez fantasy postav.
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
