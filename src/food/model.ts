import { dayKey, rankOf, type Program } from "../model.ts";
export type FoodPillar = {
  id: string;
  label: string;
  startDay: string;
  endDay?: string;
};
export function foodPillars(p: Program): FoodPillar[] {
  return (
    p.foodPillars ?? [
      {
        id: "original",
        label: p.target,
        startDay: dayKey(new Date(p.signedAt ?? p.startedAt)),
      },
    ]
  );
}
export function activePillars(p: Program, key: string) {
  return foodPillars(p).filter(
    (pillar) =>
      pillar.startDay <= key && (!pillar.endDay || key < pillar.endDay),
  );
}
export function foodAnswers(p: Program, key: string): Record<string, boolean> {
  if (p.foodEntries?.[key]) return p.foodEntries[key];
  // Existing one-rule records belong to the original pillar only.
  const value = p.days[key] ?? p.dailyLogs?.[key]?.success;
  return typeof value === "boolean" ? { original: value } : {};
}
export function foodDay(p: Program, key: string) {
  const pillars = activePillars(p, key),
    answers = foodAnswers(p, key);
  const recorded = pillars.filter(
    (pillar) => typeof answers[pillar.id] === "boolean",
  ).length;
  const success = pillars.filter(
    (pillar) => answers[pillar.id] === true,
  ).length;
  return {
    pillars,
    answers,
    recorded,
    success,
    complete: pillars.length > 0 && recorded === pillars.length,
  };
}
export function saveFoodAnswer(
  p: Program,
  key: string,
  pillarId: string,
  success: boolean,
  now: number,
): Program {
  const today = dayKey(new Date(now)),
    yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key !== today && key !== dayKey(yesterday))
    throw new Error("Upravit můžeš dnešek nebo včerejšek.");
  if (!activePillars(p, key).some((pillar) => pillar.id === pillarId))
    throw new Error("Pilíř v tento den nebyl aktivní.");
  const next = {
    ...p,
    foodPillars: foodPillars(p),
    foodEntries: {
      ...p.foodEntries,
      [key]: { ...foodAnswers(p, key), [pillarId]: success },
    },
  };
  const day = foodDay(next, key);
  const dailyLogs = { ...p.dailyLogs };
  // Corrections to a confirmed day immediately recompute its whole-day result.
  const confirmed = key !== today && typeof p.days[key] === "boolean";
  if (day.complete)
    dailyLogs[key] = { success: day.success === day.pillars.length, confirmed };
  else delete dailyLogs[key];
  const result = {
    ...next,
    dailyLogs,
    days:
      confirmed && day.complete
        ? { ...p.days, [key]: day.success === day.pillars.length }
        : p.days,
  };
  return { ...result, prime: Math.max(p.prime, rankOf("food", result, now)) };
}
export function confirmFoodDay(p: Program, key: string, now: number): Program {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key !== dayKey(yesterday))
    throw new Error("Potvrdit můžeš pouze včerejší dokončený den.");
  const day = foodDay(p, key);
  if (!day.complete) throw new Error("Nejdřív vyplň všechny aktivní pilíře.");
  const success = day.success === day.pillars.length;
  const result = {
    ...p,
    foodPillars: foodPillars(p),
    foodEntries: { ...p.foodEntries, [key]: day.answers },
    days: { ...p.days, [key]: success },
    dailyLogs: { ...p.dailyLogs, [key]: { success, confirmed: true } },
  };
  return { ...result, prime: Math.max(p.prime, rankOf("food", result, now)) };
}
export function addFoodPillar(p: Program, label: string, now: number): Program {
  const trimmed = label.trim(),
    today = dayKey(new Date(now));
  if (!trimmed || trimmed.length > 80)
    throw new Error("Pravidlo musí mít 1 až 80 znaků.");
  if (activePillars(p, today).length >= 6)
    throw new Error("Můžeš mít nejvýše 6 aktivních pilířů.");
  if (
    activePillars(p, today).some(
      (pillar) =>
        pillar.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  )
    throw new Error("Tento pilíř už máš přidaný.");
  const id = `pillar-${now}-${foodPillars(p).length}`;
  const next = {
    ...p,
    foodPillars: [...foodPillars(p), { id, label: trimmed, startDay: today }],
    foodEntries: { ...p.foodEntries, [today]: foodAnswers(p, today) },
    dailyLogs: { ...p.dailyLogs },
  };
  delete next.dailyLogs[today]; // A new pillar has no invented answer.
  return next;
}
export function pauseFoodPillar(p: Program, id: string, now: number): Program {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = dayKey(tomorrow);
  if (activePillars(p, key).length <= 1)
    throw new Error("Ponech alespoň jeden aktivní pilíř.");
  if (!activePillars(p, key).some((pillar) => pillar.id === id))
    throw new Error("Tento pilíř už je pozastavený.");
  return {
    ...p,
    foodPillars: foodPillars(p).map((pillar) =>
      pillar.id === id ? { ...pillar, endDay: key } : pillar,
    ),
  };
}

export function resumeFoodPillar(p: Program, id: string, now: number): Program {
  const pillar = foodPillars(p).find((value) => value.id === id);
  if (!pillar?.endDay) throw new Error("Tento pilíř není pozastavený.");
  if (pillar.endDay > dayKey(new Date(now))) {
    return {
      ...p,
      foodPillars: foodPillars(p).map((value) => {
        if (value.id !== id) return value;
        const { endDay, ...active } = value;
        return active;
      }),
    };
  }
  // A resumed pillar is a new period; its previous answers remain historical.
  return addFoodPillar(p, pillar.label, now);
}
