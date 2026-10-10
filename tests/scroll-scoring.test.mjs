import test from "node:test";
import assert from "node:assert/strict";
import { usageSummary, timeThresholds } from "../src/scroll/scoring.ts";
import { dayKey, rankOf, migrateRanks } from "../src/model.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const base = { startedAt: now, prime: 0, days: {}, history: [], limit: 45 };
function measured(minutes) {
  const usageDays = {};
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    usageDays[key] = {
      key,
      minutes,
      source: "android-usage",
      measuredAt: now,
      apps: [],
    };
  }
  return { ...base, usageDays };
}
test("scroll ranks use real measured minutes at each boundary, not streak or personal limit", () => {
  timeThresholds.slice(1).forEach((limit, i) => {
    assert.equal(rankOf("scroll", measured(limit), now), i + 1);
    assert.equal(rankOf("scroll", measured(limit + 0.01), now), i);
  });
  const p = measured(30);
  assert.equal(rankOf("scroll", { ...p, limit: 1440 }, now), 8);
  assert.equal(rankOf("scroll", { ...p, limit: 1 }, now), 8);
});
test("missing, invalid, unverified or unfinished data never become zero-minute success", () => {
  const p = measured(0);
  const key = Object.keys(p.usageDays)[0];
  const missing = { ...p.usageDays };
  delete missing[key];
  assert.equal(usageSummary({ ...p, usageDays: missing }, now).average, null);
  for (const bad of [
    { minutes: NaN },
    { minutes: -1 },
    { minutes: 1441 },
    { source: "manual" },
    { measuredAt: now + 3600000 },
    { measuredAt: new Date(`${key}T12:00:00`).getTime() },
  ]) {
    assert.equal(
      usageSummary(
        {
          ...p,
          usageDays: { ...p.usageDays, [key]: { ...p.usageDays[key], ...bad } },
        },
        now,
      ).rank,
      0,
    );
  }
});
test("today, stale records and manual checkins are excluded from measured rank", () => {
  const p = measured(180);
  p.usageDays[dayKey(new Date(now))] = {
    key: dayKey(new Date(now)),
    minutes: 0,
    source: "android-usage",
    measuredAt: now,
    apps: [],
  };
  p.dailyLogs = {};
  p.days = {};
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    p.days[key] = true;
    p.dailyLogs[key] = { success: true, minutes: 0, confirmed: true };
  }
  assert.equal(rankOf("scroll", p, now), 1);
  assert.equal(rankOf("scroll", { ...p, usageDays: {} }, now), 0);
  assert.equal(usageSummary(p, now + 8 * 86400000).average, null);
});
test("old scroll PRIME remains archived and migration never clears a new measured PRIME", () => {
  const first = migrateRanks({ scroll: { ...base, prime: 6 } });
  assert.equal(first.scroll.prime, 0);
  assert.equal(first.scroll.legacyScrollPrime, 8);
  assert.equal(first.scroll.screenTimeVersion, 1);
  const next = {
    scroll: { ...first.scroll, prime: 8, usageDays: measured(30).usageDays },
  };
  assert.deepEqual(migrateRanks(next), next);
});
test("food keeps confirmed-day ranking independently of screen-time rules", () => {
  const days = {};
  for (let i = 1; i <= 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days[dayKey(d)] = true;
  }
  assert.equal(rankOf("food", { ...base, days }, now), 2);
});
