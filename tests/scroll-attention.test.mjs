import test from "node:test";
import assert from "node:assert/strict";
import {
  beginBreak,
  endBreak,
  attention,
  initialAttention,
  breakRemaining,
  isAttention,
  saveAttentionPlan,
  saveReflection,
  attentionSummary,
} from "../src/scroll/attention.ts";
import {
  mergeUsage,
  usageTimeline,
  validUsage,
} from "../src/scroll/insights.ts";
import { dayKey, rankOf, applyProgramChange } from "../src/model.ts";
import {
  parseQuitBackup,
  BACKUP_KEYS,
  createBackup,
  parseBackup,
} from "../src/profile/backup.ts";
import { activityEvents } from "../src/profile/activity.ts";
const now = new Date(2026, 10, 3, 20, 30).getTime();
const base = () => ({
  startedAt: now - 86400000,
  signedAt: now - 86400000,
  prime: 0,
  rankVersion: 2,
  screenTimeVersion: 1,
  limit: 45,
  target: "Moje pravidlo",
  reasons: "Můj důvod",
  signature: "M 0 0 L 1 1",
  days: {},
  history: [],
});
const row = (n, minutes = 30, at = now) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return {
    key: dayKey(d),
    minutes,
    measuredAt: at,
    source: "android-usage",
    apps: [{ name: "Instagram", minutes }],
  };
};
const measurements = () => Array.from({ length: 8 }, (_, i) => row(i));

test("legacy scroll programs open without initializing fake measurements or progress", () => {
  const p = base();
  assert.deepEqual(attention(p), initialAttention());
  assert.equal(p.attention, undefined);
  assert.equal(rankOf("scroll", p, now), 0);
  assert.equal(usageTimeline(p, now).average, null);
});
test("an elapsed countdown stays pending until explicit completion and never awards rank", () => {
  const p = beginBreak(base(), 10, "Četba", now, "one");
  assert.equal(breakRemaining(attention(p).active, now), 600);
  assert.throws(() => endBreak(p, "one", true, now + 599999));
  assert.equal(attentionSummary(p, now + 600000).completed.length, 0);
  const done = endBreak(p, "one", true, now + 600000);
  assert.equal(done.attention.active, undefined);
  assert.equal(done.attention.sessions.length, 1);
  assert.equal(attentionSummary(done, now + 600000).todayMinutes, 10);
  assert.equal(rankOf("scroll", done, now + 600000), 0);
  assert.equal(done.prime, 0);
  assert.equal(done.usageDays, undefined);
  assert.ok(isAttention(done.attention));
});
test("reloading the same stored deadline retains real remaining time; early exit is not a completion", () => {
  const p = JSON.parse(
    JSON.stringify(beginBreak(base(), 5, "Procházka", now, "two")),
  );
  assert.equal(breakRemaining(p.attention.active, now + 120000), 180);
  const ended = endBreak(p, "two", false, now + 120000);
  assert.equal(ended.attention.sessions[0].outcome, "cancelled");
  assert.equal(attentionSummary(ended, now + 120000).todayMinutes, 0);
});
test("stale callbacks and duplicate IDs cannot finish or restart another block", () => {
  const p = beginBreak(base(), 5, "Jen klid", now, "same");
  assert.throws(() => beginBreak(p, 10, "Jiné", now, "other"));
  assert.throws(() => endBreak(p, "old", true, now + 300000));
  const done = endBreak(p, "same", true, now + 300000);
  assert.throws(() => endBreak(done, "same", true, now + 300001));
  assert.throws(() => beginBreak(done, 5, "Jiné", now + 400000, "same"));
  for (const duration of [0, 1, 7, NaN, 1440])
    assert.throws(() => beginBreak(base(), duration, "Četba", now, "bad"));
});
test("midnight completion credits the original calendar day, and late confirmation credits only planned minutes", () => {
  const start = new Date(2026, 10, 3, 23, 58).getTime(),
    end = new Date(2026, 10, 4, 0, 20).getTime();
  const p = endBreak(
    beginBreak(base(), 5, "Klid", start, "night"),
    "night",
    true,
    end,
  );
  const report = attentionSummary(p, end);
  assert.equal(report.todayMinutes, 0);
  assert.equal(report.weekMinutes, 5);
  assert.equal(
    report.days.find((d) => d.key === dayKey(new Date(start))).count,
    1,
  );
});
test("plan edits preserve signature, series and system source; personal target never changes measured rank", () => {
  const p = mergeUsage(base(), measurements(), now),
    rank = rankOf("scroll", p, now);
  const updated = saveAttentionPlan(p, "  Nuda  ", "  Četba  ", 1440);
  assert.equal(updated.attention.plan.trigger, "Nuda");
  assert.equal(updated.limit, 1440);
  assert.equal(rankOf("scroll", updated, now), rank);
  for (const key of [
    "signature",
    "startedAt",
    "signedAt",
    "prime",
    "usageDays",
    "days",
    "history",
  ])
    assert.deepEqual(updated[key], p[key]);
  assert.throws(() => saveAttentionPlan(p, "", "Četba", 45));
  for (const n of [0, 1441, 2.5, NaN])
    assert.throws(() => saveAttentionPlan(p, "Nuda", "Četba", n));
});
test("one reflection per day replaces only that reflection, with valid ratings and no future entries", () => {
  const day = dayKey(new Date(now));
  let p = saveReflection(base(), day, 2, "  Stres  ", now);
  p = saveReflection(p, day, 5, "Pomohla četba", now + 1);
  assert.equal(Object.keys(p.attention.reflections).length, 1);
  assert.equal(p.attention.reflections[day].rating, 5);
  assert.equal(p.attention.reflections[day].note, "Pomohla četba");
  assert.equal(rankOf("scroll", p, now), 0);
  for (const rating of [0, 6, NaN, 1.5])
    assert.throws(() => saveReflection(p, day, rating, "", now));
  assert.throws(() => saveReflection(p, "2099-01-01", 5, "", now));
  assert.throws(() => saveReflection(p, day, 5, "x".repeat(1001), now));
});
test("portable backup round trips the active block, plan, reflection and existing signature", () => {
  let p = saveAttentionPlan(base(), "Čekání", "Dívám se kolem", 30);
  p = saveReflection(p, dayKey(new Date(now)), 4, "Moje poznámka", now);
  p = beginBreak(p, 20, "Vlastní činnost", now, "backup");
  const payload = Object.fromEntries(BACKUP_KEYS.map((key) => [key, null]));
  payload["quitter.v1"] = JSON.stringify({ scroll: p });
  const portable = parseBackup(createBackup(payload, now));
  assert.deepEqual(parseQuitBackup(portable.payload["quitter.v1"]).scroll, p);
  assert.equal(breakRemaining(p.attention.active, now + 120000), 18 * 60);
});
test("corrupt new records are rejected before backup restore or dashboard use", () => {
  const p = endBreak(
    beginBreak(base(), 5, "Klid", now, "id"),
    "id",
    true,
    now + 300000,
  );
  for (const attention of [
    {
      ...p.attention,
      sessions: [{ ...p.attention.sessions[0], endedAt: now + 1000 }],
    },
    {
      ...p.attention,
      sessions: [p.attention.sessions[0], p.attention.sessions[0]],
    },
    { ...p.attention, active: { ...p.attention.sessions[0] } },
    {
      ...p.attention,
      reflections: { "2026-02-30": { rating: 5, note: "", at: now } },
    },
    { ...p.attention, preferredMinutes: 600 },
  ]) {
    assert.equal(isAttention(attention), false);
    assert.throws(() =>
      parseQuitBackup(JSON.stringify({ scroll: { ...p, attention } })),
    );
  }
});
test("measurement merge cannot erase a concurrently saved plan and stale samples cannot replace newer ones", () => {
  let data = { scroll: base() };
  data = applyProgramChange(data, "scroll", (p) =>
    saveAttentionPlan(p, "Nuda", "Četba", 30),
  );
  data = applyProgramChange(data, "scroll", (p) =>
    mergeUsage(p, [row(0, 35)], now),
  );
  assert.equal(data.scroll.attention.plan.replacement, "Četba");
  assert.equal(data.scroll.usageDays[row(0).key].minutes, 35);
  data = applyProgramChange(data, "scroll", (p) =>
    mergeUsage(p, [row(0, 1, now - 1000)], now),
  );
  assert.equal(data.scroll.usageDays[row(0).key].minutes, 35);
  const unchanged = applyProgramChange(data, "scroll", (p) => p);
  assert.equal(unchanged, data);
  assert.equal(applyProgramChange({}, "scroll", (p) => p).scroll, undefined);
});
test("missing data stay absent while genuine zero-minute measurements remain known", () => {
  const p = mergeUsage(base(), [row(1, 0), row(2, 60)], now);
  const report = usageTimeline(p, now, 7);
  assert.equal(report.known.length, 2);
  assert.equal(report.average, 30);
  assert.equal(report.rows.filter((d) => d.record === null).length, 5);
  assert.equal(rankOf("scroll", p, now), 0);
  const bad = {
    ...row(1),
    measuredAt: new Date(`${row(1).key}T12:00:00`).getTime(),
  };
  assert.equal(
    usageTimeline(mergeUsage(base(), [bad], now), now).known.length,
    0,
  );
  const wrongMap = { ...p, usageDays: { [row(1).key]: row(2) } };
  assert.equal(usageTimeline(wrongMap, now).known.length, 0);
  for (const bad of [
    { ...row(0), source: "manual" },
    { ...row(0), minutes: -1 },
    { ...row(0), key: "invalid" },
    { ...row(0), measuredAt: 0 },
    { ...row(0), apps: [{ name: "X", minutes: NaN }] },
  ])
    assert.equal(validUsage(bad, now), false);
});
test("Me history includes only completed deliberate breaks and actual reflections, without points", () => {
  let p = endBreak(
    beginBreak(base(), 5, "Četba", now - 600000, "done"),
    "done",
    true,
    now - 300000,
  );
  p = endBreak(
    beginBreak(p, 5, "Klid", now - 200000, "cancel"),
    "cancel",
    false,
    now - 100000,
  );
  p = saveReflection(p, dayKey(new Date(now)), 4, "Poznámka", now);
  const rows = activityEvents(
    { quit: { scroll: p }, build: null, mind: null, business: null },
    now,
  );
  assert.equal(rows.filter((row) => row.id.includes("scroll:break")).length, 1);
  assert.equal(
    rows.find((row) => row.id.includes("scroll:break")).note,
    "Četba",
  );
  assert.equal(
    rows.filter((row) => row.id.includes("scroll:reflection")).length,
    1,
  );
  assert.equal(p.prime, 0);
});

test("a duplicated or mismatched measurement day cannot complete a seven-day rank window", () => {
  const single = row(1, 0),
    usageDays = Object.fromEntries(
      measurements()
        .slice(1)
        .map((item) => [item.key, single]),
    );
  const p = { ...base(), usageDays };
  assert.equal(rankOf("scroll", p, now), 0);
  assert.equal(usageTimeline(p, now).known.length, 1);
});
