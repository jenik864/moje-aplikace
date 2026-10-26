import type { BuildData } from "../build/model.ts";
import type { MindData } from "../mind/model.ts";
import type { BusinessData } from "../business/model.ts";
import { lessons } from "../mind/lessons.ts";

export type GoalTargets = {
  workouts: number;
  mindDays: number;
  lessons: number;
  businessSteps: number;
};
export type GoalId = keyof GoalTargets;
export const goalDefinitions: readonly {
  id: GoalId;
  title: string;
  field: string;
  maximum: number;
  detail: string;
}[] = [
  {
    id: "workouts",
    title: "Pohyb",
    field: "Tréninky týdně",
    maximum: 21,
    detail: "Dokončené tréninky se skutečným záznamem v Build.",
  },
  {
    id: "mindDays",
    title: "Prostor pro hlavu",
    field: "Aktivní dny Mind týdně",
    maximum: 7,
    detail:
      "Den s potvrzenou aktivitou, blokem, lekcí, opakováním nebo odehraným kolem.",
  },
  {
    id: "lessons",
    title: "Nové obzory",
    field: "Nové lekce týdně",
    maximum: 21,
    detail: "První dokončení lekce. Opakování další novou lekci nepřidává.",
  },
  {
    id: "businessSteps",
    title: "Vlastní projekty",
    field: "Dokončené kroky Business týdně",
    maximum: 100,
    detail: "Skutečně dokončené kroky bez ohledu na plánovaný termín.",
  },
];
export const defaultGoals = (): GoalTargets => ({
  workouts: 0,
  mindDays: 0,
  lessons: 0,
  businessSteps: 0,
});

// Missing metadata is an opt-out, not an invented starter challenge.
export function parseGoals(value: unknown): GoalTargets {
  if (value === undefined) return defaultGoals();
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Týdenní cíle se nepodařilo načíst.");
  const candidate = value as Record<string, unknown>;
  const result = defaultGoals();
  for (const definition of goalDefinitions) {
    const target = candidate[definition.id];
    if (
      typeof target !== "number" ||
      !Number.isInteger(target) ||
      target < 0 ||
      target > definition.maximum
    )
      throw new Error(
        `${definition.field}: zadej celé číslo od 0 do ${definition.maximum}.`,
      );
    result[definition.id] = target;
  }
  return result;
}

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    localDay(new Date(`${value}T12:00:00`)) === value
  );
}
const positive = (value: number) => Number.isFinite(value) && value > 0;
export type GoalProgressRow = {
  id: GoalId;
  title: string;
  detail: string;
  target: number;
  actual: number | null;
  enabled: boolean;
  complete: boolean;
  ratio: number;
};
export type GoalProgress = ReturnType<typeof goalProgress>;

/**
 * Build uses the performed day on the activity and requires its confirmed log.
 * Mind checks/focus retain their recorded day, including blocks across midnight.
 * Lessons and Business use their actual first-completion/done timestamps.
 * Missing sources remain unknown, and no goals influence source XP or rank.
 */
export function goalProgress({
  targets,
  build,
  mind,
  business,
  now = Date.now(),
}: {
  targets: GoalTargets;
  build: BuildData | null;
  mind: MindData | null;
  business: BusinessData | null;
  now?: number;
}) {
  if (
    !Number.isFinite(now) ||
    now < 0 ||
    !Number.isFinite(new Date(now).getTime())
  )
    throw new Error("Neplatný čas týdenního přehledu.");
  const validated = parseGoals(targets);
  const date = new Date(now),
    today = localDay(date);
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const start = localDay(monday),
    end = localDay(sunday);
  const within = (day: string) =>
    validDay(day) && day >= start && day <= end && day <= today;
  const confirmed = (at: number) => Number.isFinite(at) && at >= 0 && at <= now;
  const stampDay = (at: number) =>
    confirmed(at) ? localDay(new Date(at)) : null;
  const inWeek = (at: number) => {
    const day = stampDay(at);
    return day !== null && within(day);
  };

  let workouts: number | null = null;
  if (build) {
    const completed = new Set<string>();
    for (const activity of build.activities) {
      const log = build.logs[activity.id];
      if (
        within(activity.day) &&
        log &&
        confirmed(log.at) &&
        positive(log.minutes)
      )
        completed.add(activity.id);
    }
    workouts = completed.size;
  }

  let mindDays: number | null = null,
    lessonCount: number | null = null;
  if (mind) {
    const days = new Set<string>(),
      knownLessons = new Set(lessons.map((lesson) => lesson.id));
    for (const [day, checks] of Object.entries(mind.checks))
      if (
        within(day) &&
        Object.values(checks).some(
          (check) => confirmed(check.at) && positive(check.habit.minutes),
        )
      )
        days.add(day);
    for (const session of Object.values(mind.sessions)) {
      const day = session.day ?? stampDay(session.at);
      if (
        day !== null &&
        confirmed(session.at) &&
        positive(session.minutes) &&
        within(day)
      )
        days.add(day);
    }
    for (const game of mind.games) {
      const day = stampDay(game.at);
      if (day !== null && within(day) && game.correct + game.mistakes > 0)
        days.add(day);
    }
    lessonCount = 0;
    for (const [id, at] of Object.entries(mind.lessons)) {
      const day = stampDay(at);
      if (knownLessons.has(id) && day !== null && within(day)) {
        lessonCount++;
        days.add(day);
      }
    }
    // Legacy metadata knows only the latest review of each topic. Count only
    // that confirmed date; do not reconstruct missing earlier practice.
    for (const [id, at] of Object.entries(mind.learning?.reviewed ?? {})) {
      const day = stampDay(at);
      if (
        knownLessons.has(id) &&
        Object.hasOwn(mind.lessons, id) &&
        day !== null &&
        within(day)
      )
        days.add(day);
    }
    mindDays = days.size;
  }

  let businessSteps: number | null = null;
  if (business) {
    const projects = new Set(business.projects.map((project) => project.id));
    const completed = new Set(
      business.tasks
        .filter(
          (task) =>
            projects.has(task.projectId) &&
            task.doneAt !== undefined &&
            inWeek(task.doneAt),
        )
        .map((task) => task.id),
    );
    businessSteps = completed.size;
  }
  const actual: Record<GoalId, number | null> = {
    workouts,
    mindDays,
    lessons: lessonCount,
    businessSteps,
  };
  const rows: GoalProgressRow[] = goalDefinitions.map((definition) => {
    const target = validated[definition.id],
      value = actual[definition.id],
      enabled = target > 0;
    return {
      id: definition.id,
      title: definition.title,
      detail: definition.detail,
      target,
      actual: value,
      enabled,
      complete: enabled && value !== null && value >= target,
      ratio: enabled && value !== null ? Math.min(1, value / target) : 0,
    };
  });
  const enabled = rows.filter((row) => row.enabled);
  return {
    start,
    end,
    today,
    rows,
    enabledCount: enabled.length,
    completedCount: enabled.filter((row) => row.complete).length,
    unavailableCount: enabled.filter((row) => row.actual === null).length,
    ready: enabled.every((row) => row.actual !== null),
  };
}
