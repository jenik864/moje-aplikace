import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyActivity,
  dailyTrend,
  dailySummary,
} from "../src/daily/analytics.ts";
import { dayKey } from "../src/model.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const date = (days) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
};
const key = (days) => dayKey(date(days));
const base = {
  signedAt: date(7).getTime(),
  startedAt: date(7).getTime(),
  days: {},
  dailyLogs: {},
  history: [],
  triggers: [],
};
test("daily statistics count only confirmed days after activation and exclude today's draft", () => {
  const p = {
    ...base,
    days: {
      [key(8)]: true,
      [key(3)]: true,
      [key(2)]: false,
      [key(1)]: true,
      [key(0)]: true,
    },
    dailyLogs: { [key(0)]: { minutes: 300, success: false, confirmed: false } },
  };
  const result = dailySummary(p, now);
  assert.equal(result.completed, 3);
  assert.equal(result.success, 2);
  assert.equal(result.rate, 67);
  assert.equal(dailyActivity(p, date(0), now).confirmed, false);
  assert.equal(dailyActivity(p, date(0), now).draft, false);
  assert.equal(dailyActivity(p, date(8), now).active, false);
});
test("average minutes includes failed confirmed days but not drafts or missing historical measurements", () => {
  const p = {
    ...base,
    days: { [key(4)]: true, [key(3)]: true, [key(2)]: false, [key(1)]: true },
    dailyLogs: {
      [key(3)]: { minutes: 15, confirmed: true },
      [key(2)]: { minutes: 60, confirmed: true },
      [key(1)]: { minutes: 45, confirmed: true },
      [key(0)]: { minutes: 1440, confirmed: false },
    },
  };
  const stats = dailySummary(p, now);
  assert.equal(stats.averageMinutes, 40);
  assert.equal(stats.recordedMinutesDays, 3);
  assert.equal(dailyActivity(p, date(4), now).minutes, null);
});
test("best streak breaks at missing or failed days and excludes pre-activation and future records", () => {
  const p = {
    ...base,
    days: {
      [key(8)]: true,
      [key(7)]: true,
      [key(6)]: true,
      [key(4)]: true,
      [key(3)]: true,
      [key(2)]: true,
      [key(1)]: false,
      [key(-1)]: true,
    },
  };
  assert.equal(dailySummary(p, now).best, 3);
});
test("empty daily history reports unknown consistency and average rather than false zero results", () => {
  const stats = dailySummary(base, now);
  assert.equal(stats.rate, null);
  assert.equal(stats.averageMinutes, null);
  assert.equal(stats.completed, 0);
});
test("daily detail keeps a current draft and SOS separate from confirmed success", () => {
  const p = {
    ...base,
    dailyLogs: { [key(0)]: { success: true, minutes: 0, confirmed: false } },
    triggers: [
      { at: now, trigger: "Stres" },
      { at: date(1).getTime(), trigger: "Nuda" },
    ],
  };
  const today = dailyActivity(p, date(0), now);
  assert.equal(today.minutes, 0);
  assert.equal(today.success, null);
  assert.equal(today.sos.length, 1);
  assert.equal(today.draft, true);
  assert.equal(dailySummary(p, now).sos, 2);
});
test("trend follows local calendar days across month and daylight saving boundaries", () => {
  process.env.TZ = "Europe/Prague";
  const end = new Date(2026, 9, 27, 12).getTime();
  const p = { ...base, signedAt: new Date(2026, 8, 1).getTime() };
  const trend = dailyTrend(p, end, 28);
  assert.equal(trend.length, 28);
  assert.equal(new Set(trend.map((d) => d.key)).size, 28);
  assert.equal(trend[0].key, "2026-09-30");
  assert.equal(trend[27].key, "2026-10-27");
});
