import { mindRank } from "./ranking.ts";
import { lessonById, lessons } from "./lessons.ts";
export type HabitKind =
  | "reading"
  | "learning"
  | "focus"
  | "meditation"
  | "reflection"
  | "custom";
export const habitKinds: Record<HabitKind, string> = {
  reading: "Četba",
  learning: "Učení",
  focus: "Soustředění",
  meditation: "Meditace",
  reflection: "Reflexe",
  custom: "Vlastní aktivita",
};
export type Habit = {
  id: string;
  kind: HabitKind;
  title: string;
  minutes: number;
  days: number[];
};
export type Plan = { from: string; habits: Habit[] };
export type Check = { habit: Habit; at: number; note: string };
export type Difficulty = "easy" | "normal" | "hard";
export type Operation = "+" | "−" | "×" | "÷";
export type GameResult = {
  id: string;
  at: number;
  difficulty: Difficulty;
  duration: number;
  operations: Operation[];
  correct: number;
  mistakes: number;
  maxCombo?: number;
};
export type ArenaPreferences = Pick<
  GameResult,
  "difficulty" | "duration" | "operations"
>;
export type LearningNotes = {
  saved: string[];
  notes: Record<string, string>;
  reviewed: Record<string, number>;
};
export type Focus = {
  id: string;
  start: number;
  end: number;
  minutes: number;
  habitId?: string;
  day: string;
};
export type MindData = {
  version: 1;
  prime?: number;
  lessonProgress?: Record<string, number>;
  learning?: LearningNotes;
  additions?: Record<string, Habit[]>;
  arenaPreferences?: ArenaPreferences;
  plans: Plan[];
  checks: Record<string, Record<string, Check>>;
  games: GameResult[];
  lessons: Record<string, number>;
  earned: Record<string, number>;
  focus?: Focus;
  sessions: Record<string, { at: number; minutes: number; day?: string }>;
};
export const initialMind = (): MindData => ({
  version: 1,
  plans: [],
  checks: {},
  games: [],
  lessons: {},
  earned: {},
  sessions: {},
});
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shift(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function weekStart(day: string) {
  const n = new Date(`${day}T12:00:00`).getDay();
  return shift(day, -(n + 6) % 7);
}
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function validDay(day: unknown): day is string {
  return (
    typeof day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    dayKey(new Date(`${day}T12:00:00`)) === day
  );
}
function validHabit(h: any): h is Habit {
  return (
    h &&
    typeof h.id === "string" &&
    h.id.length > 0 &&
    Object.hasOwn(habitKinds, h.kind) &&
    typeof h.title === "string" &&
    h.title.trim().length > 0 &&
    h.title.length <= 80 &&
    Number.isInteger(h.minutes) &&
    h.minutes >= 1 &&
    h.minutes <= 180 &&
    Array.isArray(h.days) &&
    h.days.length > 0 &&
    h.days.every(
      (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 6,
    ) &&
    new Set(h.days).size === h.days.length
  );
}
export function habitsFor(data: MindData, day: string): Habit[] {
  const p = [...data.plans]
    .sort((a, b) => a.from.localeCompare(b.from))
    .filter((p) => p.from <= day)
    .at(-1);
  const weekday = (new Date(`${day}T12:00:00`).getDay() + 6) % 7;
  const tasks = [
    ...(p?.habits ?? []).filter((h) => h.days.includes(weekday)),
    ...(data.additions?.[day] ?? []),
  ];
  const checked = Object.values(data.checks[day] ?? {}).map((c) => c.habit);
  return [
    ...tasks.map((h) => checked.find((c) => c.id === h.id) ?? h),
    ...checked.filter((c) => !tasks.some((h) => h.id === c.id)),
  ];
}
export function addDayHabit(
  data: MindData,
  day: string,
  habit: Habit,
): MindData {
  if (
    !validDay(day) ||
    !validHabit(habit) ||
    habitsFor(data, day).some((h) => h.id === habit.id)
  )
    throw new Error("Zkontroluj název, den a délku aktivity.");
  return {
    ...data,
    additions: {
      ...data.additions,
      [day]: [...(data.additions?.[day] ?? []), habit],
    },
  };
}
export function removeDayHabit(
  data: MindData,
  day: string,
  id: string,
): MindData {
  if (
    !data.additions?.[day]?.some((h) => h.id === id) ||
    data.checks[day]?.[id] ||
    (data.focus?.day === day && data.focus.habitId === id)
  )
    throw new Error("Dokončenou nebo právě běžící aktivitu nejprve ukonči.");
  return {
    ...data,
    additions: {
      ...data.additions,
      [day]: data.additions[day].filter((h) => h.id !== id),
    },
  };
}
export function editHabitNote(
  data: MindData,
  day: string,
  id: string,
  note: string,
): MindData {
  const check = data.checks[day]?.[id];
  if (!check) throw new Error("Aktivita ještě není splněná.");
  return {
    ...data,
    checks: {
      ...data.checks,
      [day]: {
        ...data.checks[day],
        [id]: { ...check, note: note.trim().slice(0, 1000) },
      },
    },
  };
}
const learningNotes = (data: MindData): LearningNotes =>
  data.learning ?? { saved: [], notes: {}, reviewed: {} };
export function saveLearningNote(
  data: MindData,
  id: string,
  note: string,
): MindData {
  if (!lessonById(id)) throw new Error("Neznámá lekce.");
  const current = learningNotes(data);
  return {
    ...data,
    learning: {
      ...current,
      notes: { ...current.notes, [id]: note.slice(0, 1000) },
    },
  };
}
export function toggleSavedLesson(data: MindData, id: string): MindData {
  if (!lessonById(id)) throw new Error("Neznámá lekce.");
  const current = learningNotes(data);
  return {
    ...data,
    learning: {
      ...current,
      saved: current.saved.includes(id)
        ? current.saved.filter((v) => v !== id)
        : [...current.saved, id],
    },
  };
}
export function advanceLesson(
  data: MindData,
  id: string,
  step: number,
): MindData {
  const lesson = lessonById(id);
  if (
    !lesson ||
    !Number.isInteger(step) ||
    step < 0 ||
    step > lesson.steps.length
  )
    throw new Error("Neplatný krok lekce.");
  return {
    ...data,
    lessonProgress: {
      ...data.lessonProgress,
      [id]: Math.max(data.lessonProgress?.[id] ?? 0, step),
    },
  };
}
export function setPlan(
  data: MindData,
  habits: Habit[],
  today = dayKey(),
): MindData {
  if (
    !validDay(today) ||
    !habits.every(validHabit) ||
    new Set(habits.map((h) => h.id)).size !== habits.length
  )
    throw new Error("Zkontroluj názvy, délku a dny aktivit.");
  return {
    ...data,
    plans: [
      ...data.plans.filter((p) => p.from !== today),
      { from: today, habits },
    ],
  };
}
export function toggleHabit(
  data: MindData,
  day: string,
  id: string,
  note: string,
  now = Date.now(),
): MindData {
  if (!validDay(day) || day > dayKey(new Date(now)))
    throw new Error("Budoucí aktivitu zatím nelze splnit.");
  const h = habitsFor(data, day).find((h) => h.id === id);
  if (!h) throw new Error("Aktivita v tomto dni není naplánovaná.");
  const checks = { ...data.checks[day] };
  if (checks[id]) delete checks[id];
  else checks[id] = { habit: h, at: now, note: note.trim().slice(0, 1000) };
  return award(
    {
      ...data,
      prime: Math.max(data.prime ?? 0, mindRank(data)),
      checks: { ...data.checks, [day]: checks },
    },
    now,
  );
}
export function recordGame(data: MindData, game: GameResult): MindData {
  if (!validGame(game)) throw new Error("Neplatný výsledek hry.");
  if (data.games.some((g) => g.id === game.id)) return data;
  return award({ ...data, games: [...data.games, game] }, game.at);
}
function validGame(g: any): g is GameResult {
  return (
    g &&
    typeof g.id === "string" &&
    Number.isFinite(g.at) &&
    g.at >= 0 &&
    ["easy", "normal", "hard"].includes(g.difficulty) &&
    [60, 120].includes(g.duration) &&
    Array.isArray(g.operations) &&
    g.operations.length > 0 &&
    new Set(g.operations).size === g.operations.length &&
    g.operations.every((o: unknown) =>
      ["+", "−", "×", "÷"].includes(String(o)),
    ) &&
    Number.isInteger(g.correct) &&
    g.correct >= 0 &&
    Number.isInteger(g.mistakes) &&
    g.mistakes >= 0 &&
    (g.maxCombo === undefined ||
      (Number.isInteger(g.maxCombo) &&
        g.maxCombo >= 0 &&
        g.maxCombo <= g.correct))
  );
}
export function completeLesson(
  data: MindData,
  id: string,
  now = Date.now(),
): MindData {
  if (!lessonById(id)) throw new Error("Neznámá lekce.");
  if (!Number.isFinite(now) || now < 0)
    throw new Error("Neplatný čas dokončení.");
  if (Object.hasOwn(data.lessons, id)) {
    const current = learningNotes(data);
    return award(
      {
        ...data,
        learning: {
          ...current,
          reviewed: {
            ...current.reviewed,
            [id]: Math.max(data.lessons[id], current.reviewed[id] ?? 0, now),
          },
        },
      },
      now,
    );
  }
  return award(
    { ...data, lessons: { ...data.lessons, [id]: data.lessons[id] ?? now } },
    now,
  );
}
export function startFocus(
  data: MindData,
  minutes: number,
  habitId?: string,
  now = Date.now(),
): MindData {
  if (data.focus) throw new Error("Nejprve dokonči nebo ukonči běžící blok.");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)
    throw new Error("Neplatná délka bloku.");
  return {
    ...data,
    focus: {
      id: uid(),
      start: now,
      end: now + minutes * 60000,
      minutes,
      habitId,
      day: dayKey(new Date(now)),
    },
  };
}
export function finishFocus(data: MindData, now = Date.now()): MindData {
  const f = data.focus;
  if (!f || now < f.end) throw new Error("Blok ještě běží.");
  let next: MindData = {
    ...data,
    focus: undefined,
    sessions: {
      ...data.sessions,
      [f.id]: { at: now, minutes: f.minutes, day: f.day },
    },
  };
  if (
    f.habitId &&
    habitsFor(next, f.day).some((h) => h.id === f.habitId) &&
    !next.checks[f.day]?.[f.habitId]
  )
    next = toggleHabit(next, f.day, f.habitId, "Dokončený časový blok", now);
  return award(next, now);
}
export const badges = [
  {
    id: "first-plan",
    name: "První krok",
    description: "Splň první aktivitu svého plánu.",
    target: 1,
  },
  {
    id: "habit-days",
    name: "Týden pro hlavu",
    description: "Splň alespoň jednu aktivitu v 7 různých dnech.",
    target: 7,
  },
  {
    id: "reading",
    name: "Mezi řádky",
    description: "Splň četbu v 10 různých dnech.",
    target: 10,
  },
  {
    id: "math-100",
    name: "Stovka v hlavě",
    description: "Nasbírej 100 správných odpovědí v dokončených kolech.",
    target: 100,
  },
  {
    id: "math-clean",
    name: "Čisté kolo",
    description: "Dokonči kolo bez chyby s alespoň 10 správnými odpověďmi.",
    target: 1,
  },
  {
    id: "lesson",
    name: "Nový obzor",
    description: "Dokonči první interaktivní lekci.",
    target: 1,
  },
  {
    id: "all-lessons",
    name: "Zvídavá hlava",
    description:
      "Dokonči lekce Tvůj první kód, Od ropy k benzínu a Úrok z úroku.",
    target: 3,
  },
  {
    id: "explorer",
    name: "Devět nových obzorů",
    description: "Dokonči všech 9 témat knihovny.",
    target: 9,
  },
  {
    id: "reviewer",
    name: "Zpátky k poznání",
    description: "Projdi znovu 3 různá dokončená témata včetně jejich otázek.",
    target: 3,
  },
  {
    id: "focus",
    name: "Hluboký ponor",
    description: "Dokonči celkem 100 minut časových bloků.",
    target: 100,
  },
];
export function badgeValue(data: MindData, id: string) {
  const days = Object.values(data.checks);
  switch (id) {
    case "first-plan":
      return days.reduce((n, d) => n + Object.keys(d).length, 0);
    case "habit-days":
      return days.filter((d) => Object.keys(d).length).length;
    case "reading":
      return days.filter((d) =>
        Object.values(d).some((c) => c.habit.kind === "reading"),
      ).length;
    case "math-100":
      return data.games.reduce((n, g) => n + g.correct, 0);
    case "math-clean":
      return data.games.some((g) => g.correct >= 10 && g.mistakes === 0)
        ? 1
        : 0;
    case "lesson":
      return Object.keys(data.lessons).length;
    case "all-lessons":
      return ["python-start", "oil-to-fuel", "compound-interest"].filter((id) =>
        Object.hasOwn(data.lessons, id),
      ).length;
    case "explorer":
      return lessons.filter((l) => Object.hasOwn(data.lessons, l.id)).length;
    case "reviewer":
      return Object.keys(data.learning?.reviewed ?? {}).length;
    case "focus":
      return Object.values(data.sessions).reduce((n, s) => n + s.minutes, 0);
    default:
      return 0;
  }
}
export function award(data: MindData, now = Date.now()): MindData {
  const earned = { ...data.earned };
  badges.forEach((b) => {
    if (badgeValue(data, b.id) >= b.target && !earned[b.id]) earned[b.id] = now;
  });
  return { ...data, earned, prime: Math.max(data.prime ?? 0, mindRank(data)) };
}
export function parseMind(raw: string): MindData {
  const d = JSON.parse(raw);
  const object = (v: any) => v && typeof v === "object" && !Array.isArray(v);
  const time = (v: any) => Number.isFinite(v) && v >= 0;
  if (
    d?.version !== 1 ||
    (d.prime !== undefined &&
      (!Number.isInteger(d.prime) || d.prime < 0 || d.prime > 11)) ||
    (d.lessonProgress !== undefined &&
      (!object(d.lessonProgress) ||
        !Object.entries(d.lessonProgress).every(
          ([id, step]) =>
            !!lessonById(id) &&
            Number.isInteger(step) &&
            Number(step) >= 0 &&
            Number(step) <= lessonById(id)!.steps.length,
        ))) ||
    (d.additions !== undefined &&
      (!object(d.additions) ||
        !Object.entries(d.additions).every(
          ([day, items]: [string, any]) =>
            validDay(day) &&
            Array.isArray(items) &&
            items.every(validHabit) &&
            new Set(items.map((h: Habit) => h.id)).size === items.length,
        ))) ||
    (d.learning !== undefined &&
      (!object(d.learning) ||
        !Array.isArray(d.learning.saved) ||
        !d.learning.saved.every(
          (id: unknown) => typeof id === "string" && !!lessonById(id),
        ) ||
        new Set(d.learning.saved).size !== d.learning.saved.length ||
        !object(d.learning.notes) ||
        !Object.entries(d.learning.notes).every(
          ([id, n]) =>
            !!lessonById(id) && typeof n === "string" && n.length <= 1000,
        ) ||
        !object(d.learning.reviewed) ||
        !Object.entries(d.learning.reviewed).every(
          ([id, t]) =>
            !!lessonById(id) &&
            time(t) &&
            time(d.lessons?.[id]) &&
            Number(t) >= d.lessons[id],
        ))) ||
    (d.arenaPreferences !== undefined &&
      !validGame({
        ...d.arenaPreferences,
        id: "preferences",
        at: 0,
        correct: 0,
        mistakes: 0,
      })) ||
    !Array.isArray(d.plans) ||
    !d.plans.every(
      (p: any) =>
        validDay(p.from) &&
        Array.isArray(p.habits) &&
        p.habits.every(validHabit) &&
        new Set(p.habits.map((h: Habit) => h.id)).size === p.habits.length,
    ) ||
    !object(d.checks) ||
    !Object.entries(d.checks).every(
      ([day, checks]: [string, any]) =>
        validDay(day) &&
        object(checks) &&
        Object.entries(checks).every(
          ([id, c]: [string, any]) =>
            validHabit(c.habit) &&
            c.habit.id === id &&
            time(c.at) &&
            typeof c.note === "string",
        ),
    ) ||
    !Array.isArray(d.games) ||
    !d.games.every(validGame) ||
    !object(d.lessons) ||
    !Object.entries(d.lessons).every(
      ([id, t]) => !!lessonById(id) && time(t),
    ) ||
    !object(d.earned) ||
    !Object.entries(d.earned).every(
      ([id, t]) => badges.some((b) => b.id === id) && time(t),
    ) ||
    !object(d.sessions) ||
    !Object.values(d.sessions).every(
      (s: any) =>
        time(s.at) &&
        Number.isInteger(s.minutes) &&
        s.minutes >= 1 &&
        s.minutes <= 180 &&
        (s.day === undefined || validDay(s.day)),
    ) ||
    (d.focus &&
      (!time(d.focus.start) ||
        !time(d.focus.end) ||
        !Number.isInteger(d.focus.minutes) ||
        d.focus.minutes < 1 ||
        d.focus.minutes > 180 ||
        d.focus.end - d.focus.start !== d.focus.minutes * 60000 ||
        typeof d.focus.id !== "string" ||
        !validDay(d.focus.day) ||
        (d.focus.habitId !== undefined && typeof d.focus.habitId !== "string")))
  )
    throw new Error("Mind data jsou poškozená.");
  const fix = (h: Habit): Habit =>
    h.kind === "reading" &&
    h.title.trim().toLocaleLowerCase("cs-CZ") === "meditace"
      ? { ...h, kind: "meditation" }
      : h;
  return {
    ...d,
    plans: d.plans.map((p: Plan) => ({ ...p, habits: p.habits.map(fix) })),
    checks: Object.fromEntries(
      Object.entries(d.checks).map(([day, checks]: [string, any]) => [
        day,
        Object.fromEntries(
          Object.entries(checks).map(([id, c]: [string, any]) => [
            id,
            { ...c, habit: fix(c.habit) },
          ]),
        ),
      ]),
    ),
  };
}
