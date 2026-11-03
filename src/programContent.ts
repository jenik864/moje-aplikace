import type { ProgramId } from "./model";
export const programContent: Record<
  ProgramId,
  {
    headline: string;
    intro: string;
    focus: string;
    detail: string;
    steps: string[];
    examples: string[];
    duration: number;
  }
> = {
  porn: {
    headline: "Získej zpět\nsvoji pozornost.",
    intro:
      "Rozhodnutí je tvoje. My ti pomůžeme vidět pokrok a zvládnout chvíle, kdy přijde impulz.",
    focus: "ČAS BEZ PORNA",
    detail: "Živý časovač, deset ranků a tvoje vlastní důvody vždy po ruce.",
    steps: [
      "Pojmenuj, co chceš změnit",
      "Napiš svůj osobní manifest",
      "Podepiš a začni první sérii",
    ],
    examples: [
      "Chci být přítomnější ve vztazích.",
      "Chci mít čas na věci, na kterých mi záleží.",
      "Chci rozhodovat o svých návycích.",
    ],
    duration: 300,
  },
  scroll: {
    headline: "Tvůj den není\nnekonečný feed.",
    intro:
      "Připrav si jiný krok pro chvíle nudy nebo stresu. Odlož telefon a vyber, čemu chceš věnovat pozornost.",
    focus: "TVŮJ PLÁN PRO POZORNOST",
    detail:
      "Časované odložení telefonu, vlastní plán a reflexe fungují i bez systémového měření. Připojený čas má oddělený přehled.",
    steps: [
      "Vyber, čemu dáš svůj čas",
      "Nastav denní limit",
      "Podepiš plán pro svůj čas",
    ],
    examples: [
      "Chci číst místo bezcílného scrollování.",
      "Chci odložit telefon před spaním.",
      "Chci věnovat pozornost lidem kolem sebe.",
    ],
    duration: 300,
  },
  food: {
    headline: "Rozhoduj vědomě.\nBez extrémů.",
    intro:
      "Sestav vlastní pilíře kolem jídla. Sleduj každý zvlášť a postupuj po malých krocích.",
    focus: "TVÉ PILÍŘE A KAŽDODENNÍ VOLBY",
    detail:
      "Jeden společný rank, denní části podle tvých cílů a pomoc s dalším krokem.",
    steps: ["Vyber své pilíře", "Pojmenuj své důvody", "Podepiš svůj závazek"],
    examples: [
      "Chci omezit impulzivní objednávky.",
      "Chci změnit zvyk pití sladkých nápojů.",
      "Chci rozlišovat hlad od stresu.",
    ],
    duration: 120,
  },
};
