import { exerciseById } from "./catalog.ts";
export type Kind = "run" | "cycle" | "swim" | "strength" | "mobility";
export const kinds: Record<Kind, { name: string; icon: string }> = {
  run: { name: "Běh", icon: "→" },
  cycle: { name: "Kolo", icon: "◎" },
  swim: { name: "Plavání", icon: "≈" },
  strength: { name: "Posilovna", icon: "Ⅱ" },
  mobility: { name: "Mobilita", icon: "↔" },
};
export type Prescription = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
};
export type Activity = {
  id: string;
  day: string;
  kind: Kind;
  title: string;
  targetMinutes: number;
  targetKm?: number;
  details: string;
  exercises: Prescription[];
};
export type SetLog = { reps: string; weight: string; done: boolean };
export type WorkoutDraft = Record<string, SetLog[]>;
export type ActivityLog = {
  at: number;
  minutes: number;
  km?: number;
  sets?: WorkoutDraft;
};
export type Routine = {
  id: string;
  title: string;
  period: "morning" | "evening";
  steps: string[];
};
export type Profile = {
  goal: "balanced" | "strength" | "endurance";
  level: "beginner" | "regular";
  days: number[];
  equipment: "home" | "gym";
  minutes: number;
  sport: "run" | "cycle" | "swim";
};
export type BuildData = {
  version: 1;
  restEnds?: Record<string, number>;
  metricDrafts?: Record<string, { minutes: string; km: string }>;
  activities: Activity[];
  logs: Record<string, ActivityLog>;
  drafts: Record<string, WorkoutDraft>;
  routines: Routine[];
  routineChecks: Record<string, string[]>;
  earned: Record<string, number>;
  pinnedBadgeId: string;
  profile: Profile;
};
export const defaultProfile: Profile = {
  goal: "balanced",
  level: "beginner",
  days: [0, 2, 5],
  equipment: "home",
  minutes: 30,
  sport: "run",
};
export const initialBuild = (): BuildData => ({
  version: 1,
  activities: [],
  logs: {},
  drafts: {},
  routines: [
    {
      id: "skin-am",
      title: "Ranní péče",
      period: "morning",
      steps: [
        "Jemné čištění podle potřeb pleti",
        "Hydratační péče",
        "SPF podle návodu na výrobku",
      ],
    },
    {
      id: "skin-pm",
      title: "Večerní péče",
      period: "evening",
      steps: ["Odličování a jemné čištění", "Hydratační péče"],
    },
  ],
  routineChecks: {},
  earned: {},
  pinnedBadgeId: "first",
  profile: { ...defaultProfile, days: [...defaultProfile.days] },
});
export const dateKey = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T12:00:00`);
  return Number.isFinite(d.getTime()) && dateKey(d) === day;
}
export function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
export function monday(day: string) {
  const d = new Date(`${day}T12:00:00`);
  return shiftDay(day, -((d.getDay() + 6) % 7));
}
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const numberInput = (value: string) =>
  Number(value.trim().replace(",", "."));
const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function activityError(a: Activity): string | undefined {
  if (!validDay(a.day)) return "Zadej platné datum ve tvaru RRRR-MM-DD.";
  if (!Object.hasOwn(kinds, a.kind) || !a.title.trim())
    return "Doplň název a druh aktivity.";
  if (!finite(a.targetMinutes, 1, 600))
    return "Plánovaná délka musí být 1 až 600 minut.";
  if (
    a.targetKm !== undefined &&
    (!["run", "cycle", "swim"].includes(a.kind) ||
      !finite(a.targetKm, 0.1, 500))
  )
    return "Zadej vzdálenost mezi 0,1 a 500 km, nebo ji nech prázdnou.";
  if (a.kind === "strength" && a.exercises.length === 0)
    return "Přidej alespoň jeden cvik.";
  if (new Set(a.exercises.map((e) => e.exerciseId)).size !== a.exercises.length)
    return "Každý cvik přidej pouze jednou.";
  for (const e of a.exercises)
    if (
      !exerciseById(e.exerciseId) ||
      !finite(e.sets, 1, 8) ||
      !Number.isInteger(e.sets) ||
      !finite(e.reps, 1, 100) ||
      !Number.isInteger(e.reps) ||
      !finite(e.restSeconds, 0, 300)
    )
      return "Cviky potřebují 1–8 sérií, 1–100 opakování a pauzu do 300 sekund.";
}
export function logError(
  a: Activity,
  log: ActivityLog,
  today = dateKey(),
): string | undefined {
  if (a.day > today) return "Budoucí trénink zatím nejde označit jako hotový.";
  if (!finite(log.minutes, 1, 1440))
    return "Zapiš skutečnou délku: 1 až 1440 minut.";
  if (["run", "cycle", "swim"].includes(a.kind) && !finite(log.km, 0.01, 500))
    return "Zapiš skutečnou vzdálenost: 0,01 až 500 km.";
  if (!finite(log.at, 0, Number.MAX_SAFE_INTEGER))
    return "Neplatný čas záznamu.";
  if (a.kind === "strength")
    for (const e of a.exercises) {
      const sets = log.sets?.[e.exerciseId];
      if (
        !sets ||
        sets.length !== e.sets ||
        sets.some(
          (s) =>
            !s.done ||
            !s.reps.trim() ||
            !finite(numberInput(s.reps), 1, 100) ||
            !Number.isInteger(numberInput(s.reps)) ||
            !s.weight.trim() ||
            !finite(numberInput(s.weight), 0, 1000),
        )
      )
        return "Potvrď všechny série a doplň skutečná opakování a váhu. Bez zátěže zapiš 0 kg.";
    }
}
export const badges = [
  {
    id: "first",
    title: "První krok",
    description: "Dokonči první pohybovou aktivitu.",
    target: 1,
    unit: "aktivita",
    icon: "→",
  },
  {
    id: "run100",
    title: "Stovka po svém",
    description: "Nasbírej 100 km během. Počet běhů je na tobě.",
    target: 100,
    unit: "km",
    icon: "100",
  },
  {
    id: "cycle200",
    title: "Dvě stě na kole",
    description: "Nasbírej 200 km na kole.",
    target: 200,
    unit: "km",
    icon: "◎",
  },
  {
    id: "half",
    title: "Půlmaratonec",
    description: "Zapiš jeden běh dlouhý alespoň 21,1 km.",
    target: 21.1,
    unit: "km v jednom běhu",
    icon: "21",
  },
  {
    id: "swim3",
    title: "Ve svém živlu",
    description: "Plav alespoň ve třech různých dnech jednoho týdne (po–ne).",
    target: 3,
    unit: "dny v týdnu",
    icon: "≈",
  },
  {
    id: "strength10",
    title: "Silný základ",
    description: "Dokonči 10 silových tréninků se zapsanými sériemi.",
    target: 10,
    unit: "tréninků",
    icon: "Ⅱ",
  },
  {
    id: "mobility100",
    title: "Volnost pohybu",
    description: "Nasbírej 100 minut mobility.",
    target: 100,
    unit: "min",
    icon: "↔",
  },
  {
    id: "care14",
    title: "Péče je návyk",
    description: "Dokonči alespoň jednu rutinu ve 14 různých dnech.",
    target: 14,
    unit: "dnů",
    icon: "◇",
  },
] as const;
export function badgeProgress(data: BuildData, id: string): number {
  const done = data.activities.filter((a) => data.logs[a.id]);
  const sum = (kind: Kind, metric: "km" | "minutes") =>
    done
      .filter((a) => a.kind === kind)
      .reduce((n, a) => n + (data.logs[a.id][metric] ?? 0), 0);
  switch (id) {
    case "first":
      return done.length;
    case "run100":
      return sum("run", "km");
    case "cycle200":
      return sum("cycle", "km");
    case "half":
      return Math.max(
        0,
        ...done
          .filter((a) => a.kind === "run")
          .map((a) => data.logs[a.id].km ?? 0),
      );
    case "strength10":
      return done.filter((a) => a.kind === "strength").length;
    case "mobility100":
      return sum("mobility", "minutes");
    case "care14":
      return Object.values(data.routineChecks).filter((v) => v.length > 0)
        .length;
    case "swim3": {
      const weeks: Record<string, Set<string>> = {};
      done
        .filter((a) => a.kind === "swim")
        .forEach((a) => {
          const w = monday(a.day);
          (weeks[w] ??= new Set()).add(a.day);
        });
      return Math.max(0, ...Object.values(weeks).map((v) => v.size));
    }
    default:
      return 0;
  }
}
export function award(data: BuildData, now = Date.now()): BuildData {
  const earned = { ...data.earned };
  for (const b of badges)
    if (!earned[b.id] && badgeProgress(data, b.id) >= b.target)
      earned[b.id] = now;
  return { ...data, earned };
}
export function complete(
  data: BuildData,
  a: Activity,
  log: ActivityLog,
  today = dateKey(),
): BuildData {
  const canonical = data.activities.find((v) => v.id === a.id);
  if (!canonical) throw new Error("Aktivita už není v plánu.");
  const error = logError(canonical, log, today);
  if (error) throw new Error(error);
  return award({ ...data, logs: { ...data.logs, [a.id]: log } });
}
export function generatePlan(profile: Profile, week: string): Activity[] {
  return [...new Set(profile.days)]
    .sort((a, b) => a - b)
    .map((day, i) => {
      const strength =
        profile.goal === "strength"
          ? i % 3 !== 2
          : profile.goal === "endurance"
            ? i % 3 === 2
            : i % 2 === 0;
      const kind: Kind = strength ? "strength" : profile.sport;
      const ids =
        profile.equipment === "gym"
          ? i % 2 === 0
            ? ["goblet", "db-bench", "seated-row", "dead-bug"]
            : ["rdl", "db-overhead", "pulldown", "bird-dog"]
          : ["squat", "knee-push-up", "glute-bridge", "bird-dog"];
      return {
        id: uid(),
        day: shiftDay(week, day),
        kind,
        title: strength
          ? "Celé tělo"
          : profile.sport === "run"
            ? profile.level === "beginner"
              ? "Běh / chůze"
              : "Lehký souvislý běh"
            : profile.sport === "cycle"
              ? "Klidná jízda"
              : "Plavání vlastním tempem",
        targetMinutes: profile.minutes,
        details: strength
          ? "5 minut lehkého zahřátí. Zvol zátěž, se kterou zůstává technika klidná. U cviků na jednu stranu vystřídej obě strany."
          : profile.level === "beginner" && kind === "run"
            ? "5 minut chůze. Střídej 1 minutu lehkého běhu a 2 minuty chůze. Závěr volně."
            : "Začni i skonči volně. Drž tempo, při kterém zvládneš mluvit. Zkrať aktivitu podle svého stavu.",
        exercises: strength
          ? ids.slice(0, profile.minutes === 30 ? 3 : 4).map((exerciseId) => ({
              exerciseId,
              sets: profile.level === "beginner" ? 2 : 3,
              reps: 10,
              restSeconds: exerciseById(exerciseId)!.rest,
            }))
          : [],
      };
    });
}
export function applyPlan(
  data: BuildData,
  plan: Activity[],
  week: string,
  today = dateKey(),
): BuildData {
  const kept = data.activities.filter(
    (a) =>
      monday(a.day) !== week ||
      a.day < today ||
      data.logs[a.id] ||
      data.drafts[a.id] ||
      data.metricDrafts?.[a.id],
  );
  const occupied = new Set(
    kept.filter((a) => monday(a.day) === week).map((a) => a.day),
  );
  return {
    ...data,
    activities: [
      ...kept,
      ...plan.filter((a) => a.day >= today && !occupied.has(a.day)),
    ],
  };
}
export function parseBuild(raw: string): BuildData {
  const d = JSON.parse(raw) as BuildData;
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.activities) ||
    !Array.isArray(d.routines) ||
    !d.logs ||
    !d.drafts ||
    !d.routineChecks ||
    !d.earned ||
    !d.profile ||
    !Array.isArray(d.profile.days) ||
    !badges.some((b) => b.id === d.pinnedBadgeId)
  )
    throw new Error("Neznámý formát dat Build.");
  const object = (v: unknown) =>
    !!v && typeof v === "object" && !Array.isArray(v);
  if (![d.logs, d.drafts, d.routineChecks, d.earned, d.profile].every(object))
    throw new Error("Poškozená data Build.");
  if (new Set(d.activities.map((a) => a.id)).size !== d.activities.length)
    throw new Error("Duplicitní aktivity.");
  for (const a of d.activities)
    if (
      !a ||
      typeof a.id !== "string" ||
      typeof a.title !== "string" ||
      typeof a.details !== "string" ||
      !Array.isArray(a.exercises) ||
      activityError(a)
    )
      throw new Error("Neplatná aktivita.");
  for (const [id, log] of Object.entries(d.logs)) {
    const a = d.activities.find((a) => a.id === id);
    if (!a || !log || logError(a, log, "9999-12-31"))
      throw new Error("Neplatný dokončený trénink.");
  }
  for (const [id, draft] of Object.entries(d.drafts)) {
    if (!d.activities.some((a) => a.id === id) || !object(draft))
      throw new Error("Neplatný rozepsaný trénink.");
    for (const sets of Object.values(draft))
      if (
        !Array.isArray(sets) ||
        sets.some(
          (s) =>
            !s ||
            typeof s.reps !== "string" ||
            typeof s.weight !== "string" ||
            typeof s.done !== "boolean",
        )
      )
        throw new Error("Neplatná série.");
  }
  for (const r of d.routines)
    if (
      !r ||
      typeof r.id !== "string" ||
      typeof r.title !== "string" ||
      !["morning", "evening"].includes(r.period) ||
      !Array.isArray(r.steps) ||
      r.steps.some((s) => typeof s !== "string")
    )
      throw new Error("Neplatná rutina.");
  for (const [day, ids] of Object.entries(d.routineChecks))
    if (
      !validDay(day) ||
      !Array.isArray(ids) ||
      ids.some((id) => typeof id !== "string")
    )
      throw new Error("Neplatný záznam péče.");
  if (
    !["balanced", "strength", "endurance"].includes(d.profile.goal) ||
    !["beginner", "regular"].includes(d.profile.level) ||
    !["home", "gym"].includes(d.profile.equipment) ||
    !["run", "cycle", "swim"].includes(d.profile.sport) ||
    ![30, 45, 60].includes(d.profile.minutes) ||
    d.profile.days.some((v) => !Number.isInteger(v) || v < 0 || v > 6)
  )
    throw new Error("Neplatné nastavení plánu.");
  if (d.metricDrafts) {
    if (!object(d.metricDrafts)) throw new Error("Neplatný rozepsaný výkon.");
    for (const [id, entry] of Object.entries(d.metricDrafts))
      if (
        !d.activities.some((a) => a.id === id) ||
        !entry ||
        typeof entry.minutes !== "string" ||
        typeof entry.km !== "string"
      )
        throw new Error("Neplatný rozepsaný výkon.");
  }
  if (
    d.restEnds &&
    (!object(d.restEnds) ||
      Object.values(d.restEnds).some(
        (v) => !finite(v, 0, Number.MAX_SAFE_INTEGER),
      ))
  )
    throw new Error("Neplatná pauza.");
  if (
    Object.values(d.earned).some((v) => !finite(v, 0, Number.MAX_SAFE_INTEGER))
  )
    throw new Error("Neplatný odznak.");
  return d;
}
