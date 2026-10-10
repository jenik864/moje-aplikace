import { dayKey, type Program } from "../model.ts";
export type UsageDay = {
  key: string;
  minutes: number;
  apps: { name: string; minutes: number }[];
  source: "android-usage";
  measuredAt: number;
};
export const timeThresholds = [
  Infinity,
  180,
  150,
  120,
  90,
  75,
  60,
  45,
  30,
  20,
  10,
  5,
];
export function usageSummary(p: Program, now: number) {
  const today = dayKey(new Date(now));
  const keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 + i);
    return dayKey(d);
  });
  const valid = (d: UsageDay | undefined) =>
    d?.source === "android-usage" &&
    Number.isFinite(d.minutes) &&
    d.minutes >= 0 &&
    d.minutes <= 1440 &&
    Number.isFinite(d.measuredAt) &&
    d.measuredAt <= now + 60000;
  const days = keys
    .map((key) => p.usageDays?.[key])
    .filter((d) => {
      if (!valid(d)) return false;
      const end = new Date(`${d!.key}T00:00:00`);
      end.setDate(end.getDate() + 1);
      return d!.measuredAt >= end.getTime();
    }) as UsageDay[];
  const average =
    days.length === 7 ? days.reduce((sum, d) => sum + d.minutes, 0) / 7 : null;
  const rank =
    average === null
      ? 0
      : timeThresholds.reduce(
          (best, threshold, i) => (average <= threshold ? i : best),
          0,
        );
  const current = p.usageDays?.[today];
  return { days, keys, average, rank, today: valid(current) ? current! : null };
}
