import type { BuildData } from "./model.ts";
export const buildMilestones = [
  0, 6, 12, 20, 35, 55, 85, 120, 170, 240, 330, 450,
];
// One point per 30 actual minutes; all movement on a day shares a 90 minute cap.
export function buildPoints(data: BuildData) {
  const daily: Record<string, number> = {};
  for (const a of data.activities) {
    const log = data.logs[a.id];
    if (log) daily[a.day] = (daily[a.day] ?? 0) + log.minutes;
  }
  return (
    Math.round(
      Object.values(daily).reduce(
        (sum, min) => sum + Math.min(90, min) / 30,
        0,
      ) * 100,
    ) / 100
  );
}
export function buildRank(data: BuildData) {
  const points = buildPoints(data);
  let rank = 0;
  buildMilestones.forEach((threshold, i) => {
    if (points >= threshold) rank = i;
  });
  return rank;
}
