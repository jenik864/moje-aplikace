import test from "node:test";
import assert from "node:assert/strict";
import {
  summary,
  dayActivity,
  trendDays,
  durationLabel,
} from "../src/porn/analytics.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const day = 86400000;
const p = {
  startedAt: now - 60000,
  signedAt: now - 4 * day,
  history: [
    { at: now - 2 * day, duration: 2 * day },
    { at: now - 60000, duration: 2 * day - 60000 },
  ],
  triggers: [{ at: now - 30000, trigger: "Stres", durationSeconds: 20 }],
};
test("statistics retain short attempts and exclude current series from completed average", () => {
  const stats = summary(p, now);
  assert.equal(stats.current, 60000);
  assert.equal(stats.best, 2 * day);
  assert.equal(stats.attempts, 3);
  assert.equal(stats.resets, 2);
  assert.equal(stats.sos, 1);
  assert.equal(stats.average, 2 * day - 30000);
  const first = summary({ ...p, history: [] }, now);
  assert.equal(first.average, null);
  assert.equal(first.attempts, 1);
});
test("a reset and ongoing today coexist; days before activation are not successes", () => {
  const today = dayActivity(p, new Date(now), now);
  assert.equal(today.pending, true);
  assert.equal(today.successful, false);
  assert.equal(today.resets.length, 1);
  assert.equal(today.sos.length, 1);
  assert.equal(dayActivity(p, new Date(now - 5 * day), now).active, false);
  assert.equal(dayActivity(p, new Date(now - day), now).successful, true);
  assert.equal(dayActivity(p, new Date(now - 2 * day), now).successful, false);
});
test("overlapping restored intervals never double count time or pre-activation time", () => {
  const restored = {
    ...p,
    signedAt: now - day,
    startedAt: now - day,
    history: [
      { at: now, duration: 3 * day },
      { at: now, duration: 2 * day },
    ],
  };
  assert.equal(
    dayActivity(restored, new Date(now - day), now).clearMs,
    12 * 3600000,
  );
  assert.equal(dayActivity(restored, new Date(now), now).clearMs, 12 * 3600000);
});
test("trend uses local calendar dates and durations keep useful detail", () => {
  const days = trendDays(p, now, 28);
  assert.equal(days.length, 28);
  assert.equal(days[27].date.toDateString(), new Date(now).toDateString());
  assert.equal(durationLabel(5 * 60000), "5 min");
  assert.equal(durationLabel(day + 2 * 3600000), "1 den 2 h");
  assert.equal(durationLabel(3 * day), "3 dny 0 h");
});
