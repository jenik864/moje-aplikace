import { dayKey, type Program } from "../model.ts";
import { validDay } from "../mind/model.ts";
import type { UsageDay } from "./scoring.ts";

export const monitoredApps = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "X",
  "Reddit",
  "Snapchat",
  "Threads",
  "Pinterest",
  "Twitch",
  "Discord",
];
export function validUsage(row: any, now: number): row is UsageDay {
  return (
    !!row &&
    validDay(row.key) &&
    row.key <= dayKey(new Date(now)) &&
    row.source === "android-usage" &&
    Number.isFinite(row.minutes) &&
    row.minutes >= 0 &&
    row.minutes <= 1440 &&
    Number.isFinite(row.measuredAt) &&
    row.measuredAt >= new Date(`${row.key}T00:00:00`).getTime() &&
    row.measuredAt <= now + 60000 &&
    Array.isArray(row.apps) &&
    row.apps.every(
      (app: any) =>
        app &&
        typeof app.name === "string" &&
        app.name.length > 0 &&
        Number.isFinite(app.minutes) &&
        app.minutes >= 0 &&
        app.minutes <= 1440,
    )
  );
}
export function mergeUsage(p: Program, rows: unknown[], now: number): Program {
  const usageDays = { ...p.usageDays };
  for (const row of rows) {
    if (!validUsage(row, now)) continue;
    if (usageDays[row.key]?.measuredAt > row.measuredAt) continue;
    usageDays[row.key] = { ...row, apps: row.apps.map((app) => ({ ...app })) };
  }
  if (
    p.screenTimeVersion === 1 &&
    JSON.stringify(usageDays) === JSON.stringify(p.usageDays ?? {})
  )
    return p;
  return { ...p, usageDays, screenTimeVersion: 1 };
}
export function usageTimeline(p: Program, now: number, count = 7) {
  if (![7, 14, 28].includes(count)) throw new Error("Vyber 7, 14 nebo 28 dní.");
  const today = dayKey(new Date(now));
  const rows = Array.from({ length: count }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - count + i);
    const key = dayKey(date),
      row = p.usageDays?.[key],
      end = new Date(date);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    return {
      key,
      date,
      record:
        row &&
        row.key === key &&
        validUsage(row, now) &&
        row.measuredAt >= end.getTime()
          ? row
          : null,
    };
  });
  const known = rows.flatMap((row) => (row.record ? [row.record] : []));
  const current = p.usageDays?.[today];
  return {
    rows,
    known,
    average: known.length
      ? known.reduce((n, d) => n + d.minutes, 0) / known.length
      : null,
    withinGoal: known.filter((d) => d.minutes <= p.limit).length,
    total: known.length ? known.reduce((n, d) => n + d.minutes, 0) : null,
    today:
      current && current.key === today && validUsage(current, now)
        ? current
        : null,
  };
}
