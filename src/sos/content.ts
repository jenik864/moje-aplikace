import { dayKey, type Program, type ProgramId } from "../model.ts";
import {
  activePillars,
  pillarSlots,
  slotAnswer,
  foodAnswers,
} from "../food/model.ts";
import { usageSummary } from "../scroll/scoring.ts";
export type Support = {
  title: string;
  message: string;
  action: string;
  reminders: string[];
  kind: string;
};
export function supportFor(id: ProgramId, label = ""): Support {
  if (id === "porn")
    return {
      kind: "ODSTUP OD IMPULZU",
      title: "Tenhle okamžik můžeš zvládnout.",
      message:
        "Nutkání není příkaz. Už tím, že ses zastavil, dáváš prostor vlastnímu rozhodnutí.",
      action:
        "Zavři obsah a přesuň se na jiné místo. Nech telefon stranou a chvíli se projdi nebo klidně dýchej.",
      reminders: [
        "Teď stačí jeden krok. Nemusíš vyřešit celý den.",
        "Impulz může zeslábnout. Nemusíš na něj hned reagovat.",
        "Zvol další chvíli podle sebe. Tvůj důvod pořád platí.",
      ],
    };
  if (id === "scroll")
    return {
      kind: "POZORNOST ZPÁTKY K TOBĚ",
      title: "Další příspěvek může počkat.",
      message:
        "Feed bude pokračovat. Ty si teď můžeš vybrat, kam půjde tvoje pozornost.",
      action:
        "Zavři sociální aplikaci a polož telefon displejem dolů. Protáhni se, podívej se ven nebo oslov někoho poblíž.",
      reminders: [
        "Nemusíš vědět, co je dál ve feedu.",
        "Rozhlédni se. Co stojí za tvoji pozornost právě tady?",
        "Tahle chvíle patří tobě. Vyber jednu věc mimo obrazovku.",
      ],
    };
  if (/hlavní jíd|pravidelné jíd/i.test(label))
    return {
      kind: "PRAVIDELNÁ JÍDLA",
      title: "Postarej se o sebe právě teď.",
      message:
        "Nemusí to být dokonalé jídlo. I jednoduché jídlo je krok podle tvého plánu.",
      action:
        "Vyber si dostupné běžné jídlo. Pokud máš hlad, najez se; čekání není cílem tohoto pilíře.",
      reminders: [
        "Tvůj plán má jídlo podpořit, ne odkládat.",
        "Jednoduché je dost dobré.",
        "Další krok může být připravit si jídlo.",
      ],
    };
  if (/nápoj/i.test(label))
    return {
      kind: "SLADKÉ NÁPOJE",
      title: "Zkus teď jinou volbu.",
      message:
        "Automatický zvyk můžeš přerušit jedním malým rozhodnutím. Tentokrát si dej prostor vybrat podle svého plánu.",
      action:
        "Dej si vodu nebo neslazený nápoj, který ti chutná. Sladký nápoj odlož z dosahu a pak znovu zhodnoť chuť.",
      reminders: [
        "Jedna vědomá volba se počítá.",
        "Chuť se může změnit. Nemusíš jednat okamžitě.",
        "Vyber nápoj podle svého plánu, ne podle automatického zvyku.",
      ],
    };
  if (/sladk/i.test(label))
    return {
      kind: "SLADKOSTI",
      title: "Ty vybíráš další krok.",
      message:
        "Chuť nemusíš brát jako prohru. Vrať se ke svému plánu a rozhodni se vědomě.",
      action:
        "Všimni si, jestli jde o hlad nebo chuť. Při hladu si dej jídlo; jinak si nech krátkou chvíli na rozhodnutí o plánované porci.",
      reminders: [
        "Plán je opora, ne trest.",
        "Nemusíš být dokonalý. Můžeš se rozhodnout vědomě.",
        "Vrať se k porci nebo příležitosti, kterou sis naplánoval.",
      ],
    };
  if (/objednáv|fast food/i.test(label))
    return {
      kind: "OBJEDNÁVKY A FAST FOOD",
      title: "Než objednáš, dej si prostor.",
      message:
        "Nemusíš pokračovat v automatickém klikání. Tentokrát si můžeš vybrat, co opravdu potřebuješ.",
      action:
        "Odlož objednávkovou aplikaci. Máš hlad? Podívej se po dostupném jídle doma nebo jiné běžné variantě, která odpovídá tvému plánu.",
      reminders: [
        "Zastavení před objednávkou je užitečný krok.",
        "Při hladu si dej jídlo. Pauza není povinnost.",
        "Rozhodni se podle své potřeby a svého plánu.",
      ],
    };
  return {
    kind: "VĚDOMÁ VOLBA",
    title: "Další krok máš ve svých rukou.",
    message:
      "Nemusíš zopakovat automatický zvyk. Zastav se a vyber jednu malou věc podle svého plánu.",
    action:
      "Pojmenuj, co teď potřebuješ. Při hladu si dej běžné jídlo, při stresu zkus krátký prostor pro zklidnění.",
    reminders: [
      "Nemusíš mít všechno vyřešené.",
      "Malý další krok stačí.",
      "Tvůj plán je opora. Vrať se k tomu, co potřebuješ.",
    ],
  };
}
export function supportProgress(
  id: ProgramId,
  p: Program,
  now: number,
  pillarId?: string,
) {
  if (id === "porn") {
    const minutes = Math.floor(Math.max(0, now - p.startedAt) / 60000);
    return minutes >= 1440
      ? `${Math.floor(minutes / 1440)} ${Math.floor(minutes / 1440) === 1 ? "den" : Math.floor(minutes / 1440) < 5 ? "dny" : "dní"} · ${Math.floor((minutes % 1440) / 60)} h bez porna v aktuální sérii`
      : `${Math.floor(minutes / 60)} h ${minutes % 60} min bez porna v aktuální sérii`;
  }
  if (id === "scroll") {
    const usage = usageSummary(p, now);
    return usage.average !== null
      ? `Posledních 7 dní: ${Math.round(usage.average)} min denně podle měření systému`
      : "Každé vědomé odložení telefonu je prostor pro něco jiného. Měření zatím není úplné.";
  }
  const today = dayKey(new Date(now));
  let count = 0;
  for (const key of Object.keys(p.days))
    if (
      typeof p.days[key] === "boolean" &&
      key < today &&
      key >= dayKey(new Date(p.signedAt ?? p.startedAt))
    ) {
      for (const pillar of activePillars(p, key))
        if (!pillarId || pillar.id === pillarId)
          count += p.foodSlots?.[key]
            ? pillarSlots(pillar).filter(
                (slot) => slotAnswer(p, key, pillar, slot.id) === true,
              ).length
            : foodAnswers(p, key)[pillar.id] === true
              ? 1
              : 0;
    }
  return `${count} dodržených záznamů v potvrzených dnech podle tvých zápisů`;
}
