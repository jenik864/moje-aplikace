import { dayKey, definitions, type Data, type ProgramId } from "../model.ts";
import {
  badges as buildBadges,
  badgeProgress,
  type BuildData,
} from "../build/model.ts";
import {
  badges as mindBadges,
  badgeValue,
  validDay,
  shift,
  habitKinds,
  type MindData,
} from "../mind/model.ts";
import { lessons } from "../mind/lessons.ts";
import type { BusinessData } from "../business/model.ts";

export type ActivitySource = "Quit" | "Build" | "Mind" | "Business";
export const activitySources: ActivitySource[] = [
  "Quit",
  "Build",
  "Mind",
  "Business",
];
export type ProfileSources = {
  quit: Data | null;
  build: BuildData | null;
  mind: MindData | null;
  business: BusinessData | null;
};
export type ActivityEvent = {
  id: string;
  source: ActivitySource;
  kind:
    | "program"
    | "daily"
    | "measurement"
    | "sos"
    | "reset"
    | "workout"
    | "routine"
    | "habit"
    | "focus"
    | "arena"
    | "lesson"
    | "review"
    | "task"
    | "project";
  day: string;
  at?: number;
  title: string;
  detail: string;
  note?: string;
  program?: ProgramId;
};
const stamp = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  Number.isFinite(new Date(value).getTime());
const formatNumber = (n: number) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Current surviving records, never an inferred audit trail or a second points system. */
export function activityEvents(
  sources: ProfileSources,
  now = Date.now(),
): ActivityEvent[] {
  const rows: ActivityEvent[] = [],
    today = dayKey(new Date(now));
  const add = (event: ActivityEvent) => {
    if (
      validDay(event.day) &&
      event.day <= today &&
      (event.at === undefined || (stamp(event.at) && event.at <= now))
    )
      rows.push(event);
  };
  for (const program of ["porn", "scroll", "food"] as ProgramId[]) {
    const p = sources.quit?.[program];
    if (!p) continue;
    const name = definitions[program].title;
    if (stamp(p.signedAt))
      add({
        id: `quit:${program}:start`,
        source: "Quit",
        kind: "program",
        day: dayKey(new Date(p.signedAt)),
        at: p.signedAt,
        title: `Začátek programu ${name}`,
        detail: "Uložený osobní závazek",
        program,
      });
    if (program !== "porn") {
      const start = dayKey(new Date(p.signedAt ?? p.startedAt));
      const recordedDays = new Set([
        ...Object.keys(p.days ?? {}),
        ...Object.keys(p.dailyLogs ?? {}),
      ]);
      for (const day of recordedDays) {
        const log = p.dailyLogs?.[day],
          value =
            typeof p.days[day] === "boolean"
              ? p.days[day]
              : log?.confirmed
                ? log.success
                : undefined;
        if (
          !validDay(day) ||
          day >= today ||
          day < start ||
          typeof value !== "boolean"
        )
          continue;
        const minutes =
          program === "scroll" && Number.isFinite(log?.minutes)
            ? ` · Ruční zápis ${formatNumber(log!.minutes!)} min`
            : "";
        add({
          id: `quit:${program}:daily:${day}`,
          source: "Quit",
          kind: "daily",
          day,
          title: `${name} · denní záznam`,
          detail: `${value ? "Plán dodržen" : "Plán nebyl dodržen v celém rozsahu"}${minutes}`,
          program,
        });
      }
    }
    if (program === "scroll") {
      for (const [day, usage] of Object.entries(p.usageDays ?? {})) {
        if (
          !validDay(day) ||
          day !== usage.key ||
          day >= today ||
          usage.source !== "android-usage" ||
          !Number.isFinite(usage.minutes) ||
          usage.minutes < 0 ||
          usage.minutes > 1440 ||
          !stamp(usage.measuredAt)
        )
          continue;
        const end = new Date(`${day}T00:00:00`);
        end.setDate(end.getDate() + 1);
        if (usage.measuredAt < end.getTime()) continue;
        add({
          id: `quit:scroll:measurement:${day}`,
          source: "Quit",
          kind: "measurement",
          day,
          at: usage.measuredAt,
          title: "Doomscrolling · měřený den",
          detail: `${formatNumber(usage.minutes)} min · dokončené měření Android`,
          program,
        });
      }
    }
    (p.triggers ?? []).forEach((event, index) => {
      if (!stamp(event.at)) return;
      const duration = Number.isFinite(event.durationSeconds)
        ? ` · ${formatNumber(event.durationSeconds!)} s v SOS`
        : "";
      add({
        id: `quit:${program}:sos:${event.at}:${index}`,
        source: "Quit",
        kind: "sos",
        day: dayKey(new Date(event.at)),
        at: event.at,
        title: `${name} · návrat ze SOS`,
        detail: `Uložený průchod SOS${duration}`,
        note: [text(event.trigger), text(event.outcome)]
          .filter(Boolean)
          .join(" · "),
        program,
      });
    });
    if (program === "porn")
      p.history.forEach((entry, index) => {
        if (!stamp(entry.at)) return;
        add({
          id: `quit:porn:reset:${entry.at}:${index}`,
          source: "Quit",
          kind: "reset",
          day: dayKey(new Date(entry.at)),
          at: entry.at,
          title: "Porn Reboot · nový začátek",
          detail: `Ukončená série: ${Math.floor(Math.max(0, entry.duration) / 86400000)} dní`,
          program,
        });
      });
  }
  if (sources.build) {
    const data = sources.build;
    for (const a of data.activities) {
      const log = data.logs[a.id];
      if (!log || !stamp(log.at)) continue;
      const km = Number.isFinite(log.km)
        ? ` · ${formatNumber(log.km!)} km`
        : "";
      add({
        id: `build:workout:${a.id}`,
        source: "Build",
        kind: "workout",
        day: a.day,
        at: log.at,
        title: a.title,
        detail: `${formatNumber(log.minutes)} skutečných min${km}`,
        note: a.details || undefined,
      });
    }
    for (const [day, ids] of Object.entries(data.routineChecks)) {
      for (const id of new Set(ids)) {
        const routine = data.routines.find((r) => r.id === id);
        add({
          id: `build:routine:${day}:${id}`,
          source: "Build",
          kind: "routine",
          day,
          title: routine?.title ?? "Splněná rutina péče",
          detail: routine
            ? "Potvrzená každodenní péče"
            : "Zachovaný záznam rutiny, která už není v seznamu",
        });
      }
    }
  }
  if (sources.mind) {
    const data = sources.mind;
    for (const [day, checks] of Object.entries(data.checks))
      for (const [id, check] of Object.entries(checks)) {
        add({
          id: `mind:habit:${day}:${id}`,
          source: "Mind",
          kind: "habit",
          day,
          at: check.at,
          title: check.habit.title,
          detail: `${habitKinds[check.habit.kind]} · cíl ${check.habit.minutes} min`,
          note: check.note || undefined,
        });
      }
    for (const [id, session] of Object.entries(data.sessions))
      if (stamp(session.at)) {
        add({
          id: `mind:focus:${id}`,
          source: "Mind",
          kind: "focus",
          day: session.day ?? dayKey(new Date(session.at)),
          at: session.at,
          title: "Dokončený časový blok",
          detail: `${session.minutes} min potvrzeného bloku`,
        });
      }
    for (const game of data.games)
      if (stamp(game.at))
        add({
          id: `mind:arena:${game.id}`,
          source: "Mind",
          kind: "arena",
          day: dayKey(new Date(game.at)),
          at: game.at,
          title: "Dokončené kolo arény",
          detail: `${game.correct} správně · ${game.mistakes} chyb / přeskočení · ${game.duration} s`,
        });
    for (const [id, at] of Object.entries(data.lessons))
      if (stamp(at)) {
        const lesson = lessons.find((l) => l.id === id),
          note = data.learning?.notes[id];
        add({
          id: `mind:lesson:${id}`,
          source: "Mind",
          kind: "lesson",
          day: dayKey(new Date(at)),
          at,
          title: lesson?.title ?? "Dokončená lekce",
          detail: "První dokončení lekce",
          note: note ? `Současná poznámka k tématu: ${note}` : undefined,
        });
        const reviewed = data.learning?.reviewed[id];
        if (stamp(reviewed) && reviewed > at)
          add({
            id: `mind:review:${id}`,
            source: "Mind",
            kind: "review",
            day: dayKey(new Date(reviewed)),
            at: reviewed,
            title: lesson?.title ?? "Opakování lekce",
            detail: "Poslední uložené opakování · bez dalších XP",
            note: note ? `Současná poznámka k tématu: ${note}` : undefined,
          });
      }
  }
  if (sources.business) {
    const data = sources.business;
    for (const task of data.tasks)
      if (stamp(task.doneAt)) {
        const project = data.projects.find((p) => p.id === task.projectId);
        add({
          id: `business:task:${task.id}`,
          source: "Business",
          kind: "task",
          day: dayKey(new Date(task.doneAt)),
          at: task.doneAt,
          title: task.title,
          detail: `Dokončený krok${project ? ` · ${project.title}` : ""}`,
        });
      }
    for (const project of data.projects)
      if (project.status === "done" && stamp(project.completedAt))
        add({
          id: `business:project:${project.id}`,
          source: "Business",
          kind: "project",
          day: dayKey(new Date(project.completedAt)),
          at: project.completedAt,
          title: project.title,
          detail: "Dokončený projekt",
          note: `Cíl projektu: ${project.outcome}`,
        });
  }
  return rows.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      (b.at ?? 0) - (a.at ?? 0) ||
      a.id.localeCompare(b.id),
  );
}
export type ActivityFilter = {
  source?: ActivitySource | "all";
  range?: 7 | 30 | "all";
  query?: string;
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ");
export function filterActivity(
  events: readonly ActivityEvent[],
  filter: ActivityFilter = {},
  now = Date.now(),
) {
  const today = dayKey(new Date(now)),
    from =
      filter.range && filter.range !== "all"
        ? shift(today, 1 - filter.range)
        : null;
  const words = normalize(filter.query?.trim() ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return events.filter(
    (event) =>
      event.day <= today &&
      (!from || event.day >= from) &&
      (!filter.source ||
        filter.source === "all" ||
        event.source === filter.source) &&
      words.every((word) =>
        normalize(
          `${event.source} ${event.title} ${event.detail} ${event.note ?? ""}`,
        ).includes(word),
      ),
  );
}
export function groupActivity(events: readonly ActivityEvent[]) {
  const groups = new Map<string, ActivityEvent[]>();
  for (const event of events)
    groups.set(event.day, [...(groups.get(event.day) ?? []), event]);
  return [...groups]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, rows]) => ({ day, events: rows }));
}
export function activityDigest(
  events: readonly ActivityEvent[],
  now = Date.now(),
  count = 28,
) {
  const today = dayKey(new Date(now));
  const days = Array.from(
    { length: Math.max(1, Math.min(366, Math.floor(count))) },
    (_, i) => {
      const day = shift(
        today,
        i - Math.max(1, Math.min(366, Math.floor(count))) + 1,
      );
      const rows = events.filter((e) => e.day === day);
      return {
        day,
        count: rows.length,
        sources: Object.fromEntries(
          activitySources.map((source) => [
            source,
            rows.filter((e) => e.source === source).length,
          ]),
        ) as Record<ActivitySource, number>,
      };
    },
  );
  return {
    days,
    records: days.reduce((n, d) => n + d.count, 0),
    recordDays: days.filter((d) => d.count > 0).length,
  };
}
export type CollectionBadge = {
  id: string;
  source: "Build" | "Mind";
  sourceId: string;
  title: string;
  description: string;
  target: number;
  value: number;
  unit: string;
  earnedAt: number | null;
  pinned: boolean;
};
export function badgeCollection(
  build: BuildData | null,
  mind: MindData | null,
): CollectionBadge[] {
  const list: CollectionBadge[] = [];
  if (build)
    for (const badge of buildBadges)
      list.push({
        id: `Build:${badge.id}`,
        source: "Build",
        sourceId: badge.id,
        title: badge.title,
        description: badge.description,
        target: badge.target,
        value: badgeProgress(build, badge.id),
        unit: badge.unit,
        earnedAt: stamp(build.earned[badge.id]) ? build.earned[badge.id] : null,
        pinned: build.pinnedBadgeId === badge.id,
      });
  const units: Record<string, string> = {
    "first-plan": "aktivita",
    "habit-days": "dnů",
    reading: "dnů četby",
    "math-100": "odpovědí",
    "math-clean": "kolo",
    lesson: "lekce",
    "all-lessons": "lekce",
    explorer: "témat",
    reviewer: "témat",
    focus: "min",
  };
  if (mind)
    for (const badge of mindBadges)
      list.push({
        id: `Mind:${badge.id}`,
        source: "Mind",
        sourceId: badge.id,
        title: badge.name,
        description: badge.description,
        target: badge.target,
        value: badgeValue(mind, badge.id),
        unit: units[badge.id] ?? "záznamů",
        earnedAt: stamp(mind.earned[badge.id]) ? mind.earned[badge.id] : null,
        pinned: false,
      });
  return list.sort(
    (a, b) =>
      (b.earnedAt === null ? 0 : 1) - (a.earnedAt === null ? 0 : 1) ||
      (b.earnedAt ?? 0) - (a.earnedAt ?? 0) ||
      Math.min(1, b.value / b.target) - Math.min(1, a.value / a.target) ||
      a.id.localeCompare(b.id),
  );
}
