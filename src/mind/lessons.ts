import { extraLessons } from "./topics.ts";
export type LessonGroup = "skills" | "world" | "mind" | "finance";
export const lessonGroups: Record<LessonGroup, string> = {
  skills: "Dovednosti",
  world: "Jak svět funguje",
  mind: "Myšlení a paměť",
  finance: "Peníze a čísla",
};
export type Step = {
  title: string;
  text: string;
  example: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};
export type Lesson = {
  id: string;
  group: LessonGroup;
  title: string;
  category: string;
  subtitle: string;
  minutes: number;
  steps: Step[];
  practice: {
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  takeaway: string;
};
export const lessons: Lesson[] = [
  {
    id: "python-start",
    group: "skills",
    title: "Tvůj první kód",
    category: "PROGRAMOVÁNÍ",
    subtitle: "Proměnné, podmínky a malý program v Pythonu.",
    minutes: 12,
    steps: [
      {
        title: "Proměnná je pojmenovaná hodnota",
        text: "Program pracuje s hodnotami. Proměnná ti umožní hodnotu uložit pod jménem a později ji použít nebo změnit. Znak = v Pythonu přiřazuje hodnotu; neznamená otázku, zda se dvě věci rovnají.",
        example:
          "cena = 80\npocet = 3\ncelkem = cena * pocet\nprint(celkem)  # vypíše 240",
        question: "Co vypíše print(cena + 20)?",
        options: ["100", "80", "cena + 20"],
        answer: 0,
        explanation: "V cena je číslo 80. Po přičtení 20 získáš 100.",
      },
      {
        title: "Podmínka vybírá cestu",
        text: "Příkaz if spustí odsazené řádky, pokud podmínka platí. Jinak se provede větev else. Odsazení v Pythonu určuje, které řádky do větve patří.",
        example:
          'vek = 17\nif vek >= 18:\n    print("Dospělý")\nelse:\n    print("Mladší než 18")',
        question: "Která větev proběhne při vek = 18?",
        options: ["else", "if", "Obě větve"],
        answer: 1,
        explanation:
          "Znak >= znamená větší nebo rovno, takže 18 podmínku splňuje.",
      },
      {
        title: "Opakování šetří práci",
        text: "Cyklus for zopakuje kód pro každou hodnotu. range(3) vytvoří postupně 0, 1 a 2. Horní hranice do výsledku nepatří. Opět záleží na odsazení.",
        example: "for i in range(3):\n    print(i)\n# 0, potom 1, potom 2",
        question: "Kolikrát se provede print v range(5)?",
        options: ["4krát", "6krát", "5krát"],
        answer: 2,
        explanation: "Hodnoty jsou 0, 1, 2, 3 a 4: celkem pět průchodů.",
      },
    ],
    practice: {
      prompt:
        "Doplň výpočet pro nákup 3 knih po 120 Kč. Jaký řádek správně vypočítá celkem?",
      options: [
        "celkem = cena + pocet",
        "celkem = cena * pocet",
        "celkem = cena / pocet",
      ],
      answer: 1,
      explanation:
        "Násobení ceny počtem dá 360 Kč. Zkus si tento program později přepsat do Pythonu a změnit počet knih.",
    },
    takeaway:
      "Umíš přečíst jednoduchý Python kód s proměnnou, podmínkou a cyklem. Další krok: napsat vlastní malý výpočet.",
  },
  {
    id: "oil-to-fuel",
    group: "world",
    title: "Od ropy k benzínu",
    category: "JAK VĚCI FUNGUJÍ",
    subtitle: "Co se děje v rafinerii a proč nestačí ropu převařit.",
    minutes: 10,
    steps: [
      {
        title: "Ropa je směs",
        text: "Ropa obsahuje mnoho různých uhlovodíků. Liší se mimo jiné délkou molekul a teplotou varu. Benzín není jediná látka: je to směs vybraných složek vhodná pro zážehové motory.",
        example:
          "ROPA → mnoho uhlovodíků\nBENZÍN → směs vhodných lehčích složek",
        question: "Co je ropa?",
        options: ["Čistý benzín", "Směs mnoha látek", "Jedna molekula"],
        answer: 1,
        explanation:
          "Ropa je složitá směs. Rafinace z ní připravuje různé produkty.",
      },
      {
        title: "Destilace rozděluje směs",
        text: "Zahřátá ropa vstupuje do destilační kolony. Dole je tepleji, nahoře chladněji. Páry podle svého rozsahu teplot varu kondenzují v různých částech. Tím vznikají frakce; lehčí mají obecně nižší teploty varu.",
        example:
          "NAHOŘE: plyny a lehčí frakce\nSTŘED: benzínové, petrolejové a naftové frakce\nDOLE: těžší frakce a zbytek",
        question: "Co destilace hlavně dělá?",
        options: [
          "Odděluje podle teplot varu",
          "Mění všechny molekuly na benzín",
          "Přidává vodu",
        ],
        answer: 0,
        explanation:
          "Destilace především odděluje složky. Chemické změny probíhají v dalších jednotkách.",
      },
      {
        title: "Úprava a míchání",
        text: "Kraking štěpí větší uhlovodíkové molekuly na menší. Další procesy upravují strukturu a odstraňují nežádoucí látky, například síru. Nakonec se složky míchají podle požadovaných vlastností a norem.",
        example:
          "ODDĚLENÍ → CHEMICKÉ ÚPRAVY → MÍCHÁNÍ\nOktanové číslo popisuje odolnost vůči klepání motoru.",
        question: "Co vyšší oktanové číslo vyjadřuje?",
        options: [
          "Více litrů v nádrži",
          "Automaticky více energie",
          "Vyšší odolnost vůči klepání",
        ],
        answer: 2,
        explanation:
          "Oktanové číslo není prosté měřítko energie. Řiď se palivem doporučeným výrobcem motoru.",
      },
    ],
    practice: {
      prompt: "Které pořadí správně shrnuje cestu k hotovému benzínu?",
      options: [
        "Destilace → úpravy složek → míchání",
        "Míchání → těžba → destilace",
        "Ropa → přidání barviva → hotovo",
      ],
      answer: 0,
      explanation:
        "Rafinérie oddělí frakce, zpracuje je a smíchá výsledné palivo. Skutečné provozy mají více propojených jednotek.",
    },
    takeaway:
      "Dokážeš vysvětlit rozdíl mezi destilací a krakingem a proč hotový benzín vzniká mícháním.",
  },
  {
    id: "compound-interest",
    group: "finance",
    title: "Úrok z úroku",
    category: "FINANČNÍ GRAMOTNOST",
    subtitle: "Pochop složené úročení na jednoduchém příkladu.",
    minutes: 10,
    steps: [
      {
        title: "První rok",
        text: "Při ročním úroku 5 % z 1 000 Kč získáš za rok 50 Kč. Pokud úrok ponecháš na účtu, začínáš další rok s 1 050 Kč. Tento příklad ignoruje daně, poplatky a změny sazby.",
        example: "1 000 × 0,05 = 50 Kč\nPo prvním roce: 1 050 Kč",
        question: "Kolik bude po roce z 2 000 Kč při 5 %?",
        options: ["2 005 Kč", "2 100 Kč", "2 500 Kč"],
        answer: 1,
        explanation: "Pět procent z 2 000 Kč je 100 Kč.",
      },
      {
        title: "Druhý rok",
        text: "Další úrok se počítá i z předchozího úroku. Z 1 050 Kč při 5 % získáš 52,50 Kč. To je princip složeného úročení. Kdybys úrok vždy vybral, jistina by zůstala stejná.",
        example:
          "1 050 × 1,05 = 1 102,50 Kč\nRozdíl oproti prostému úročení: 2,50 Kč",
        question:
          "Z 1 000 Kč při 5 % ročně: z čeho se počítá úrok ve druhém roce, když první úrok ponecháš na účtu?",
        options: [
          "Jen z původních 1 000 Kč",
          "Jen z 50 Kč",
          "Z celých 1 050 Kč",
        ],
        answer: 2,
        explanation:
          "Úrok ponechaný na účtu se stává součástí základu pro další úročení.",
      },
      {
        title: "Čas a skutečná hodnota",
        text: "Při stejné roční sazbě r je částka po n letech P × (1 + r)^n. Růst není zárukou u investic: výnosy kolísají a můžeš ztratit peníze. Inflace navíc snižuje kupní sílu, i když číselný zůstatek roste.",
        example:
          "1 000 × 1,05³ ≈ 1 157,63 Kč\nModel: stálá sazba, bez daní a poplatků.",
        question: "Co může snížit kupní sílu peněz?",
        options: ["Inflace", "Název účtu", "Počet číslic PINu"],
        answer: 0,
        explanation: "Pokud ceny rostou, za stejnou částku si koupíš méně.",
      },
    ],
    practice: {
      prompt:
        "Na účtu je 1 100 Kč a další roční úrok je 10 %. Kolik bude po připsání úroku v tomto zjednodušeném modelu?",
      options: ["1 200 Kč", "1 110 Kč", "1 210 Kč"],
      answer: 2,
      explanation: "10 % z 1 100 je 110 Kč. Nový zůstatek je 1 210 Kč.",
    },
    takeaway:
      "Umíš spočítat jednoduchý příklad složeného úročení a rozlišit zůstatek od kupní síly.",
  },
  ...extraLessons,
];
export const lessonById = (id: string) => lessons.find((l) => l.id === id);
export function findLessons(query: string, group = "all") {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("cs-CZ");
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return lessons.filter(
    (l) =>
      (group === "all" || l.group === group) &&
      words.every((word) =>
        normalize(`${l.title} ${l.subtitle} ${l.category}`).includes(word),
      ),
  );
}
