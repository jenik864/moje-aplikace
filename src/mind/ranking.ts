import type { MindData } from "./model.ts";
export const mindMilestones = [
  0, 40, 100, 180, 300, 480, 720, 1050, 1500, 2100, 2900, 4000,
];
const date = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function dailyMindXP(data: MindData) {
  const activity: Record<string, number> = {},
    focus: Record<string, number> = {},
    arena: Record<string, number> = {},
    learning: Record<string, number> = {};
  for (const [day, checks] of Object.entries(data.checks))
    activity[day] = Object.values(checks).reduce(
      (n, c) => n + c.habit.minutes,
      0,
    );
  for (const session of Object.values(data.sessions)) {
    const day = session.day ?? date(session.at);
    focus[day] = (focus[day] ?? 0) + session.minutes;
  }
  for (const game of data.games) {
    const day = date(game.at);
    arena[day] = (arena[day] ?? 0) + game.correct;
  }
  for (const at of Object.values(data.lessons)) {
    const day = date(at);
    learning[day] = (learning[day] ?? 0) + 15;
  }
  const days = new Set([
    ...Object.keys(activity),
    ...Object.keys(focus),
    ...Object.keys(arena),
    ...Object.keys(learning),
  ]);
  return Object.fromEntries(
    [...days].map((day) => [
      day,
      Math.min(
        60,
        Math.min(30, Math.max(activity[day] ?? 0, focus[day] ?? 0)) +
          Math.min(15, arena[day] ?? 0) +
          (learning[day] ?? 0),
      ),
    ]),
  );
}
export function mindXP(data: MindData) {
  return Object.values(dailyMindXP(data)).reduce((n, v) => n + v, 0);
}
export function mindRank(data: MindData) {
  const xp = mindXP(data);
  let rank = 0;
  mindMilestones.forEach((n, i) => {
    if (xp >= n) rank = i;
  });
  return rank;
}
