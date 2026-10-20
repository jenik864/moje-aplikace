import type { Lesson } from "./lessons.ts";

export const extraLessons: Lesson[] = [
  {
    id: "percentages",
    group: "finance",
    title: "Procenta bez hádání",
    category: "ČÍSLA V PRAXI",
    minutes: 10,
    subtitle: "Slevy, zdražení a rozdíl mezi procenty a procentními body.",
    steps: [
      {
        title: "Vždy se ptej: z čeho?",
        text: "Procento je jedna setina základu. Dvacet procent z 800 Kč je 160 Kč. Pro výpočet ceny po slevě odečti slevu od základu nebo cenu vynásob 0,8. Změň slevu v ukázce a sleduj obě částky.",
        example: "800 × 0,20 = 160 Kč\n800 − 160 = 640 Kč",
        question: "Kolik je 15 % z 200 Kč?",
        options: ["15 Kč", "30 Kč", "185 Kč"],
        answer: 1,
        explanation: "200 × 0,15 = 30 Kč. Částka 170 Kč by byla cena po slevě.",
      },
      {
        title: "Dvě změny mají dva základy",
        text: "Zdražení o 20 % a následná sleva o 20 % se nevyruší. Sleva se počítá z nové, vyšší ceny. Pro původních 1 000 Kč dostaneš 1 000 × 1,2 × 0,8 = 960 Kč.",
        example: "1 000 → +20 % → 1 200 → −20 % → 960",
        question:
          "Cena vzroste ze 100 na 150 Kč. O kolik procent musí klesnout, aby byla znovu 100 Kč?",
        options: ["50 %", "25 %", "Přibližně 33,3 %"],
        answer: 2,
        explanation: "Pokles 50 Kč se počítá ze 150 Kč: 50 / 150 ≈ 33,3 %.",
      },
      {
        title: "Procentní body nejsou procenta",
        text: "Pokud podíl vzroste z 20 % na 30 %, jde o růst o 10 procentních bodů. Relativně ale vzrostl o polovinu, tedy o 50 %. Výchozí hodnota je znovu klíčová.",
        example: "30 % − 20 % = 10 procentních bodů\n(30 − 20) / 20 = 50 %",
        question: "Podíl klesne ze 40 % na 30 %. Kolik procentních bodů ubylo?",
        options: ["10", "25", "30"],
        answer: 0,
        explanation:
          "Rozdíl podílů je 10 procentních bodů. Relativní pokles je 10 / 40 = 25 %.",
      },
    ],
    practice: {
      prompt:
        "Bunda stojí 2 000 Kč. Nejprve dostaneš slevu 20 % a potom dalších 10 % z nové ceny. Kolik zaplatíš?",
      options: ["1 400 Kč", "1 440 Kč", "1 600 Kč"],
      answer: 1,
      explanation:
        "2 000 × 0,8 × 0,9 = 1 440 Kč. Slevy se nesčítají, protože mají různé základy.",
    },
    takeaway:
      "U každé procentní změny urči základ. U dvou změn počítej postupně a rozlišuj procenta od procentních bodů.",
  },
  {
    id: "internet",
    group: "world",
    title: "Co se stane po kliknutí",
    category: "INTERNET",
    minutes: 12,
    subtitle: "DNS, datové pakety a co doopravdy znamená zámek HTTPS.",
    steps: [
      {
        title: "Jméno potřebuje adresu",
        text: "Prohlížeč potřebuje zjistit, kam požadavek poslat. DNS překládá doménové jméno na IP adresu. Odpověď může být dočasně uložená v mezipaměti. Jedna doména může mít více adres a jedna adresa může sloužit více webům.",
        example: "doména → DNS → IP adresa → server",
        question: "K čemu hlavně slouží DNS?",
        options: [
          "K šifrování všech souborů",
          "K překladu názvů na síťové adresy",
          "K nabíjení telefonu",
        ],
        answer: 1,
        explanation:
          "DNS pomáhá najít síťovou adresu služby. Samotný obsah stránky přenášejí jiné protokoly.",
      },
      {
        title: "Rychlost není jen počet megabitů",
        text: "Data putují v paketech. Přenos může omezit kapacita linky, prodleva i ztráty. V jednoduchém modelu je čas přenosu velikost v bitech dělená rychlostí v bitech za sekundu. Osm bitů tvoří jeden byte; MB a Mb tedy nejsou totéž.",
        example: "10 MB = 80 Mb\n80 Mb / 20 Mb/s = 4 s",
        question:
          "Jak dlouho trvá ideální přenos 10 MB přes 40 Mb/s bez dalších prodlev?",
        options: ["0,25 s", "2 s", "40 s"],
        answer: 1,
        explanation:
          "10 MB je 80 Mb. 80 / 40 = 2 sekundy; skutečný přenos přidává další prodlevy.",
      },
      {
        title: "Zámek chrání spojení",
        text: "HTTPS používá TLS k ochraně přenosu mezi klientem a službou a k ověření jejího certifikátu pro danou doménu. Zámek ale neříká, že obchodník je poctivý nebo že obsah je pravdivý. I podvodný web může mít platné HTTPS.",
        example: "HTTPS: chráněný přenos ≠ důvěryhodný obsah",
        question: "Co můžeš vyvodit jen z toho, že web používá HTTPS?",
        options: [
          "Všechny informace jsou pravdivé",
          "Obchod vždy doručí zboží",
          "Spojení používá ochranu přenosu",
        ],
        answer: 2,
        explanation:
          "HTTPS chrání spojení. Důvěryhodnost domény a obsahu posuzuj zvlášť.",
      },
    ],
    practice: {
      prompt:
        "Odkaz v nečekané zprávě vede na přihlašovací stránku banky. Má HTTPS, ale jinou doménu. Co je rozumný další krok?",
      options: [
        "Přihlásit se, zámek vše potvrzuje",
        "Otevřít známou adresu banky samostatně a zprávu ověřit",
        "Poslat odesílateli heslo",
      ],
      answer: 1,
      explanation:
        "HTTPS neověřuje úmysl odesílatele. Známou adresu nebo bankovní aplikaci otevři samostatně.",
    },
    takeaway:
      "Umíš popsat cestu doména → adresa → přenos a víš, proč rychlé připojení ani zámek automaticky neznamenají bezproblémový a důvěryhodný web.",
  },
  {
    id: "memory",
    group: "mind",
    title: "Paměť, která zůstane",
    category: "JAK SE UČIT",
    minutes: 10,
    subtitle: "Vybavování, rozestupy a malé skupiny místo nekonečného čtení.",
    steps: [
      {
        title: "Zkus si to vybavit",
        text: "Pocit, že je text povědomý, není totéž jako schopnost něco vysvětlit bez nápovědy. Po krátkém učení zavři podklady a vlastními slovy napiš nebo řekni hlavní myšlenku. Potom si ověř chyby. Zkus si zapamatovat slova v ukázce a skrýt je.",
        example: "PŘEČÍST → SKRÝT → VYBAVIT → OVĚŘIT",
        question: "Co lépe ověří, jestli umíš myšlenku použít bez nápovědy?",
        options: [
          "Přečíst si nadpis desetkrát",
          "Vysvětlit ji zpaměti a pak ověřit chyby",
          "Zvýraznit celou stránku",
        ],
        answer: 1,
        explanation:
          "Vybavení ukáže, co skutečně dokážeš získat z paměti. Následná kontrola pomůže opravit mezery.",
      },
      {
        title: "Vrať se k tomu později",
        text: "Rozložené opakování vrací učivo v dalších dnech. Vhodný rozestup záleží na obtížnosti i tom, jak dlouho si chceš věc pamatovat. Jeden pevný rozvrh nefunguje pro každého. Ukázka nabízí příklad rozložení, nikoli zaručený recept.",
        example: "Dnes → další den → za několik dnů → za několik týdnů",
        question: "Když si při opakování nic nevybavíš, co dává smysl?",
        options: [
          "Doplnit mezery a příště zkusit kratší rozestup",
          "Přestat se to učit",
          "Považovat zapomenutí za důkaz, že se neumíš učit",
        ],
        answer: 0,
        explanation:
          "Opakování uprav podle skutečného vybavení, ne podle pocitu selhání.",
      },
      {
        title: "Dej informacím strukturu",
        text: "Seskupování pomáhá, když menší části spojíš do smysluplných celků. Členění dlouhého čísla může usnadnit jeho přečtení; pro složitější učivo pomáhají vztahy, příklady a vlastní vysvětlení. Samotné hezké rozdělení ale nezaručí zapamatování.",
        example: "739162845 → 739 · 162 · 845",
        question: "Co je užitečné při učení nového principu?",
        options: [
          "Učit se jen jeho délku",
          "Vynechat všechny příklady",
          "Spojit jej s příkladem a vysvětlit vlastními slovy",
        ],
        answer: 2,
        explanation:
          "Smysluplné vztahy a vybavení dávají učení více opěrných bodů.",
      },
    ],
    practice: {
      prompt:
        "Právě ses naučil nový pojem. Který plán kombinuje aktivní vybavení a rozestupy?",
      options: [
        "Dnes si jej vysvětlit bez textu, ověřit a zítra zkusit znovu",
        "Dnes si jen zvýraznit definici a už se nevracet",
        "Počkat měsíc bez prvního vyzkoušení",
      ],
      answer: 0,
      explanation:
        "Nejprve ověř porozumění a další opakování rozlož. Vlastní interval uprav podle toho, co si vybavíš.",
    },
    takeaway:
      "Po další četbě zavři knihu, napiš tři hlavní myšlenky a další den si je zkus vybavit znovu.",
  },
  {
    id: "critical-thinking",
    group: "mind",
    title: "Nenech se zmást čísly",
    category: "KRITICKÉ MYŠLENÍ",
    minutes: 14,
    subtitle: "Souvislost, příčina a základní četnost na názorných příkladech.",
    steps: [
      {
        title: "Souvislost ještě není příčina",
        text: "Dvě věci se mohou měnit společně, aniž jedna způsobuje druhou. V létě může růst prodej zmrzliny i návštěvnost koupališť. Společným vlivem je počasí. K posouzení příčiny potřebuješ více než souběh dvou grafů.",
        example:
          "Teplé počasí → více zmrzliny\nTeplé počasí → více návštěv koupaliště",
        question: "Co samotná korelace dvou jevů dokazuje?",
        options: [
          "Že první určitě způsobuje druhý",
          "Že je mezi nimi pozorovaná souvislost",
          "Že žádná příčina nemůže existovat",
        ],
        answer: 1,
        explanation:
          "Korelace popisuje souvislost. Příčinný vztah může existovat, ale musíš jej ověřit jinak.",
      },
      {
        title: "Záleží i na tom, jak častý je jev",
        text: "Představ si filtr, který odhalí 95 % podvodných zpráv, ale také označí 5 % neškodných. Když je podvodů málo, mezi označenými může převažovat neškodná pošta. Rozhoduje základní četnost, nikoli jen jedno číslo přesnosti.",
        example:
          "10 000 zpráv, 1 % podvodů\n95 odhalených podvodů + 495 falešných poplachů",
        question:
          "V tomto příkladu je označeno 590 zpráv, z toho 95 podvodných. Jaký podíl označených je skutečně podvod?",
        options: ["95 %", "50 %", "Přibližně 16 %"],
        answer: 2,
        explanation:
          "95 / 590 ≈ 16,1 %. Filtr může být užitečný, ale označení samo není jistota.",
      },
      {
        title: "Jaké srovnání chybí?",
        text: "Tvrzení, že se někdo po změně zlepšil, ještě neříká, co by se stalo bez ní. Ptej se na výchozí stav, velikost a výběr vzorku, srovnávací skupinu a způsob měření. Ne každou otázku vyřeší experiment, ale férové srovnání bývá zásadní.",
        example: "Tvrzení → měření → srovnání → nejistota",
        question:
          "Reklama říká: 8 z 10 oslovených zákazníků se zlepšilo. Co by bylo dobré zjistit?",
        options: [
          "Jen barvu loga",
          "Jak byli vybráni a jak dopadla srovnávací skupina",
          "Zda lze číslo zaokrouhlit na 100 %",
        ],
        answer: 1,
        explanation:
          "Výběr lidí a srovnání mohou zásadně změnit výklad výsledku.",
      },
    ],
    practice: {
      prompt:
        "Studie ukazuje, že lidé kupující dražší běžecké boty běhají rychleji. Který závěr respektuje omezení tohoto pozorování?",
      options: [
        "Dražší boty každého automaticky zrychlí",
        "Je tam souvislost; výsledek může ovlivňovat i zkušenost a množství tréninku",
        "Cena bot nikdy s rychlostí nesouvisí",
      ],
      answer: 1,
      explanation:
        "Pozorovaná souvislost může mít více příčin. Bez dalšího srovnání nelze připsat rozdíl pouze botám.",
    },
    takeaway:
      "U výrazného tvrzení se ptej: oproti čemu, u koho, jak měřeno a co dalšího mohlo výsledek ovlivnit?",
  },
  {
    id: "electricity",
    group: "world",
    title: "Kam mizí elektřina",
    category: "ENERGIE",
    minutes: 10,
    subtitle:
      "Výkon, spotřeba a účinnost bez zaměňování wattů za kilowatthodiny.",
    steps: [
      {
        title: "Výkon je tempo, energie množství",
        text: "Watt vyjadřuje výkon: kolik energie se přenese za sekundu. Spotřebovaná energie závisí také na době. Zařízení s příkonem 1 000 W běžící hodinu spotřebuje 1 kWh. V modelu předpokládáme stálý příkon.",
        example: "Energie (kWh) = příkon (W) × čas (h) / 1 000",
        question:
          "Kolik spotřebuje 2 000W topidlo za půl hodiny při stálém příkonu?",
        options: ["1 kWh", "4 kWh", "1 W"],
        answer: 0,
        explanation: "2 000 × 0,5 / 1 000 = 1 kWh.",
      },
      {
        title: "Napětí a proud",
        text: "V jednoduchém stejnosměrném obvodu platí výkon P = U × I, tedy napětí krát proud. Při 5 V a 2 A jde o 10 W. U střídavých obvodů může být potřebný i účiník. Údaj na nabíječce bývá maximální hodnota pro daný režim, ne stálá spotřeba.",
        example: "5 V × 2 A = 10 W",
        question: "Jaký výkon odpovídá 12 V a 2 A v tomto modelu?",
        options: ["6 W", "24 W", "14 kWh"],
        answer: 1,
        explanation:
          "12 × 2 = 24 W. Kilowatthodina je jednotka energie, nikoli výkonu.",
      },
      {
        title: "Účinnost říká, kam energie šla",
        text: "Účinnost je poměr užitečně získané energie k dodané. Při účinnosti 80 % získáš ze 100 Wh dodané energie 80 Wh užitečné; zbytek se promění například v teplo. Energie se neztratila, jen ji pro daný účel nevyužiješ.",
        example: "100 Wh vstup → 80 Wh užitek + 20 Wh ostatní přeměny",
        question:
          "Zařízení s účinností 75 % dostane 200 Wh. Kolik je užitečný výstup?",
        options: ["75 Wh", "200 Wh", "150 Wh"],
        answer: 2,
        explanation: "200 × 0,75 = 150 Wh užitečné energie.",
      },
    ],
    practice: {
      prompt:
        "Dvě lampy svítí stejně dlouho. První má stálý příkon 10 W a druhá 50 W. Které tvrzení o spotřebě za tuto dobu platí?",
      options: [
        "První spotřebuje pětkrát více",
        "Druhá spotřebuje pětkrát více energie",
        "Mají vždy stejnou spotřebu",
      ],
      answer: 1,
      explanation:
        "Při stejné době je energie úměrná příkonu. O kvalitě nebo jasu světla tento výpočet sám nic neříká.",
    },
    takeaway:
      "Umíš odhadnout spotřebu z příkonu a času a rozlišit výkon, energii a účinnost.",
  },
  {
    id: "algorithms",
    group: "skills",
    title: "Hledej chytřeji",
    category: "ALGORITMICKÉ MYŠLENÍ",
    minutes: 12,
    subtitle: "Jak funguje hledání půlením a proč záleží na uspořádání dat.",
    steps: [
      {
        title: "Postup musí mít jasná pravidla",
        text: "Algoritmus je přesný postup řešení úlohy. Při lineárním hledání procházíš prvky jeden po druhém, dokud nenajdeš cíl nebo nedojdeš na konec. U seznamu s n prvky může být potřeba až n kontrol.",
        example:
          "Seznam: 2, 4, 6, 8, 10, 12, 14\nHledej 14: zkontroluj postupně 7 prvků.",
        question:
          "Kolik kontrol může nejhůř potřebovat lineární hledání v 100 prvcích?",
        options: ["100", "1", "Vždy přesně 10"],
        answer: 0,
        explanation: "Cíl může být poslední nebo nemusí být v seznamu vůbec.",
      },
      {
        title: "Seřazený seznam můžeš půlit",
        text: "Binární hledání porovná cíl s prostředním prvkem seřazeného seznamu. Podle výsledku vyřadí jednu polovinu a pokračuje ve druhé. Bez odpovídajícího seřazení toto vyřazování není spolehlivé.",
        example: "2, 4, 6, [8], 10, 12, 14\nCíl 14 > 8 → pokračuj vpravo.",
        question: "Co binární hledání v této podobě potřebuje?",
        options: [
          "Náhodně promíchaný seznam",
          "Seznam seřazený podle stejného pravidla porovnání",
          "Jen sudá čísla",
        ],
        answer: 1,
        explanation: "Pořadí zaručuje, že ve vyřazené polovině cíl není.",
      },
      {
        title: "Půlení rychle zmenšuje problém",
        text: "Každé neúspěšné porovnání odstraní zhruba polovinu zbývajících možností. U 1 024 prvků potřebuje tato běžná implementace nanejvýš 11 porovnání. Seřazení a údržba seznamu ale také stojí práci; vhodný postup závisí na celé úloze.",
        example: "1 024 → 512 → 256 → … → 2 → 1",
        question:
          "Co se stane s maximálním počtem porovnání při zdvojnásobení velkého seznamu?",
        options: [
          "Přibližně se zdvojnásobí",
          "Vždy klesne na nulu",
          "Vzroste přibližně o jedno",
        ],
        answer: 2,
        explanation: "Jedno půlení navíc zhruba vyrovná dvojnásobnou velikost.",
      },
    ],
    practice: {
      prompt:
        "Hledáš 22 v seřazeném seznamu 4, 10, 16, 22, 28, 34, 40. První kontrolovaný prostředek je 22. Co udělá binární hledání?",
      options: [
        "Zkontroluje ještě povinně všechny prvky",
        "Cíl našlo při prvním porovnání",
        "Začne seznam řadit od konce",
      ],
      answer: 1,
      explanation:
        "Pokud prostřední prvek odpovídá cíli, hledání rovnou končí.",
    },
    takeaway:
      "Umíš projít jednoduchý algoritmus hledání a vysvětlit, proč půlení funguje jen při správném pořadí dat.",
  },
];
