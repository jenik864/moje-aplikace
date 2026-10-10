import { dayKey, rankOf, type Program } from "../model.ts";
export type FoodPillar = {
  id: string;
  label: string;
  startDay: string;
  endDay?: string;
  mode?: "periods" | "meals" | "day";
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
    foodScores:
      confirmed && day.complete
        ? { ...p.foodScores, [key]: foodDayPoints(next, key) }
        : p.foodScores,
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
    foodScores: { ...p.foodScores, [key]: foodDayPoints(p, key) },
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

export const foodPresets: {
  label: string;
  mode: NonNullable<FoodPillar["mode"]>;
}[] = [
  { label: "Bez sladkých nápojů", mode: "periods" },
  { label: "Sladkosti podle plánu", mode: "periods" },
  { label: "Bez impulzivních objednávek", mode: "day" },
  { label: "Bez fast foodu", mode: "day" },
  { label: "Pravidelná hlavní jídla", mode: "meals" },
];
export function pillarSlots(pillar: FoodPillar) {
  const mode =
    pillar.mode ??
    (/sladk|nápoj/i.test(pillar.label)
      ? "periods"
      : /hlavní jíd|pravidelné jíd/i.test(pillar.label)
        ? "meals"
        : "day");
  if (mode === "periods")
    return [
      { id: "morning", label: "Ráno · do 10:00", end: 10 },
      { id: "afternoon", label: "Den · 10–16", end: 16 },
      { id: "evening", label: "Večer · od 16:00", end: 24 },
    ];
  if (mode === "meals")
    return [
      { id: "breakfast", label: "Snídaně", end: 10 },
      { id: "lunch", label: "Oběd", end: 16 },
      { id: "dinner", label: "Večeře", end: 24 },
    ];
  return [{ id: "day", label: "Celý den", end: 24 }];
}
export function slotAnswer(
  p: Program,
  key: string,
  pillar: FoodPillar,
  slot: string,
) {
  const slots = p.foodSlots?.[key];
  if (slots) return slots[`${pillar.id}:${slot}`];
  return foodAnswers(p, key)[pillar.id];
}
export function foodDayPoints(p: Program, key: string) {
  const pillars = activePillars(p, key);
  if (!pillars.length) return 0;
  return (
    (100 *
      pillars.reduce((sum, pillar) => {
        const slots = pillarSlots(pillar);
        return (
          sum +
          slots.filter((slot) => slotAnswer(p, key, pillar, slot.id) === true)
            .length /
            slots.length
        );
      }, 0)) /
    pillars.length
  );
}
export function foodPoints(p: Program, now: number) {
  const today = dayKey(new Date(now));
  const start = dayKey(new Date(p.signedAt ?? p.startedAt));
  return Object.entries(p.days).reduce((total, [key, value]) => {
    if (key >= today || key < start || typeof value !== "boolean") return total;
    const score = p.foodScores?.[key];
    return (
      total +
      (typeof score === "number" && Number.isFinite(score)
        ? Math.max(0, Math.min(100, score))
        : value
          ? 100
          : 0)
    );
  }, 0);
}
export function saveFoodSlot(
  p: Program,
  key: string,
  pillarId: string,
  slotId: string,
  value: boolean,
  now: number,
): Program {
  const today = dayKey(new Date(now));
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key !== today && key !== dayKey(yesterday))
    throw new Error("Upravit můžeš dnešek nebo včerejšek.");
  const pillar = activePillars(p, key).find((v) => v.id === pillarId);
  const slot = pillar && pillarSlots(pillar).find((v) => v.id === slotId);
  if (!pillar || !slot) throw new Error("Neplatná část pilíře.");
  if (key === today && new Date(now).getHours() < slot.end)
    throw new Error("Tuto část můžeš vyplnit až po jejím skončení.");
  // Preserve answers belonging to other pillars when moving an existing day to slot records.
  const initial: Record<string, boolean> = { ...p.foodSlots?.[key] };
  if (!p.foodSlots?.[key])
    for (const v of activePillars(p, key))
      for (const part of pillarSlots(v)) {
        const old = foodAnswers(p, key)[v.id];
        if (typeof old === "boolean") initial[`${v.id}:${part.id}`] = old;
      }
  initial[`${pillarId}:${slotId}`] = value;
  const slots = pillarSlots(pillar);
  const complete = slots.every(
    (v) => typeof initial[`${pillarId}:${v.id}`] === "boolean",
  );
  const next = { ...p, foodSlots: { ...p.foodSlots, [key]: initial } };
  if (!complete) return next;
  return saveFoodAnswer(
    next,
    key,
    pillarId,
    slots.every((v) => initial[`${pillarId}:${v.id}`] === true),
    now,
  );
}
