import { dayKey, habitsFor, shift, type MindData } from "./model.ts";
import { dailyMindXP } from "./ranking.ts";
import { lessons } from "./lessons.ts";

export function weekOverview(data: MindData, from: string, today = dayKey()) {
  const xp = dailyMindXP(data),
    end = shift(from, 6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = shift(from, i),
      tasks = habitsFor(data, day),
      checks = day > today ? [] : Object.values(data.checks[day] ?? {});
    return {
      day,
      planned: tasks.length,
      done: checks.length,
      minutes: checks.reduce((n, c) => n + c.habit.minutes, 0),
      xp: day > today ? 0 : (xp[day] ?? 0),
      future: day > today,
    };
  });
  const within = (at: number) => {
    const day = dayKey(new Date(at));
    return day >= from && day <= end && day <= today;
  };
  const games = data.games.filter((g) => within(g.at));
  return {
    days,
    planned: days.reduce((n, d) => n + d.planned, 0),
    done: days.reduce((n, d) => n + d.done, 0),
    minutes: days.reduce((n, d) => n + d.minutes, 0),
    xp: days.reduce((n, d) => n + d.xp, 0),
    activeDays: days.filter((d) => !d.future && (d.done > 0 || d.xp > 0))
      .length,
    focusMinutes: Object.values(data.sessions)
      .filter((s) => {
        const day = s.day ?? dayKey(new Date(s.at));
        return day >= from && day <= end && day <= today;
      })
      .reduce((n, s) => n + s.minutes, 0),
    lessons: Object.values(data.lessons).filter(within).length,
    games: games.length,
    correct: games.reduce((n, g) => n + g.correct, 0),
    mistakes: games.reduce((n, g) => n + g.mistakes, 0),
  };
}
export function learningNext(data: MindData, now = Date.now()) {
  const unfinished = lessons.filter((l) => !Object.hasOwn(data.lessons, l.id));
  const resume = unfinished.find((l) => (data.lessonProgress?.[l.id] ?? 0) > 0);
  const today = dayKey(new Date(now));
  const dayIndex = Math.floor(
    Date.UTC(
      ...(today
        .split("-")
        .map(Number)
        .map((n, i) => (i === 1 ? n - 1 : n)) as [number, number, number]),
    ) / 86400000,
  );
  const suggested =
    resume ??
    unfinished[dayIndex % Math.max(1, unfinished.length)] ??
    lessons[dayIndex % lessons.length];
  const review = lessons
    .filter(
      (l) =>
        Object.hasOwn(data.lessons, l.id) &&
        now - (data.learning?.reviewed[l.id] ?? data.lessons[l.id]) >=
          2 * 86400000,
    )
    .sort(
      (a, b) =>
        (data.learning?.reviewed[a.id] ?? data.lessons[a.id]) -
        (data.learning?.reviewed[b.id] ?? data.lessons[b.id]),
    )[0];
  return { resume, suggested, review };
}
