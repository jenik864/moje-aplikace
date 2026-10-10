import { dayKey, type Program, type ProgramId } from "../model.ts";
export type DailyId = Exclude<ProgramId, "porn">;

export function dailyActivity(p: Program, date: Date, now: number) {
  const key = dayKey(date);
  const today = dayKey(new Date(now));
  const active =
    key >= dayKey(new Date(p.signedAt ?? p.startedAt)) && key <= today;
  const pending = active && key === today;
  const confirmed = active && !pending && typeof p.days[key] === "boolean";
  const log = active ? p.dailyLogs?.[key] : undefined;
  return {
    key,
    date,
    active,
    pending,
    confirmed,
    success: confirmed ? p.days[key] : null,
    minutes:
      (confirmed || pending) && Number.isFinite(log?.minutes)
        ? log!.minutes!
        : null,
    draft: pending && log ? log.success : null,
    sos: active
      ? (p.triggers ?? []).filter((e) => dayKey(new Date(e.at)) === key)
      : [],
  };
}
export function dailyTrend(p: Program, now: number, count = 28) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - count + 1 + index);
    return dailyActivity(p, date, now);
  });
}
export function dailySummary(p: Program, now: number) {
  const completed = dailyTrend(p, now).filter((d) => d.confirmed);
  const success = completed.filter((d) => d.success).length;
  const start = dayKey(new Date(p.signedAt ?? p.startedAt));
  const today = dayKey(new Date(now));
  const keys = Object.keys(p.days)
    .filter((k) => k >= start && k < today)
    .sort();
  let best = 0,
    run = 0,
    previous: string | null = null;
  for (const key of keys) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() - 1);
    run = p.days[key] === true ? (previous === dayKey(date) ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    previous = key;
  }
  const minutes = completed
    .map((d) => d.minutes)
    .filter((v): v is number => v !== null);
  return {
    completed: completed.length,
    success,
    rate: completed.length
      ? Math.round((success / completed.length) * 100)
      : null,
    best,
    averageMinutes: minutes.length
      ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)
      : null,
    recordedMinutesDays: minutes.length,
    sos: (p.triggers ?? []).length,
  };
}
