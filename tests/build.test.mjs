import test from "node:test";
import assert from "node:assert/strict";
import { exercises, exerciseById } from "../src/build/catalog.ts";
import {
  initialBuild,
  activityError,
  logError,
  generatePlan,
  applyPlan,
  complete,
  badgeProgress,
  award,
  parseBuild,
  monday,
} from "../src/build/model.ts";
const today = "2026-10-11";
const activity = (id, kind = "run", day = today) => ({
  id,
  kind,
  day,
  title: "Trénink",
  targetMinutes: 30,
  targetKm: kind === "run" ? 12 : undefined,
  details: "",
  exercises: [],
});
const log = (km = 2) => ({ at: 1791710000000, minutes: 30, km });
test("catalogue has unique, complete exercises and resolvable alternatives", () => {
  assert.equal(exercises.length, 51);
  assert.equal(new Set(exercises.map((e) => e.id)).size, 51);
  for (const e of exercises) {
    assert.ok(e.name && e.main.length && e.steps.length === 3 && e.error);
    assert.ok(exerciseById(e.alternative));
    assert.notEqual(e.id, e.alternative);
  }
});
test("planned distance earns nothing, saved actual distance is idempotent and corrected totals replace previous values", () => {
  let d = initialBuild();
  const a = activity("a");
  d.activities.push(a);
  assert.equal(badgeProgress(d, "run100"), 0);
  d = complete(d, a, log(4), today);
  assert.equal(badgeProgress(d, "run100"), 4);
  d = complete(d, a, log(4), today);
  assert.equal(badgeProgress(d, "first"), 1);
  d = complete(d, a, log(2), today);
  assert.equal(badgeProgress(d, "run100"), 2);
  assert.ok(d.earned.first);
});
test("invalid actual values, future workouts and missing strength sets are rejected", () => {
  const a = activity("a");
  for (const entry of [
    { ...log(), minutes: NaN },
    { ...log(), minutes: 0 },
    { ...log(), km: -1 },
    { ...log(), km: Infinity },
  ])
    assert.ok(logError(a, entry, today));
  assert.ok(logError({ ...a, day: "2026-10-12" }, log(), today));
  const strength = {
    ...activity("b", "strength"),
    exercises: [{ exerciseId: "squat", sets: 2, reps: 10, restSeconds: 60 }],
  };
  assert.ok(logError(strength, log(), today));
  const sets = {
    squat: [
      { reps: "10", weight: "0", done: true },
      { reps: "8", weight: "0", done: true },
    ],
  };
  assert.equal(
    logError(strength, { at: 1, minutes: 20, sets }, today),
    undefined,
  );
  sets.squat[0].weight = "";
  assert.ok(logError(strength, { at: 1, minutes: 20, sets }, today));
});
test("half marathon must be a single run, swimming challenge uses distinct dates within one Monday-Sunday week", () => {
  let d = initialBuild();
  for (let i = 0; i < 3; i++) {
    const a = activity(`r${i}`, "run");
    d.activities.push(a);
    d = complete(d, a, log(10), today);
  }
  assert.equal(badgeProgress(d, "half"), 10);
  assert.equal(d.earned.half, undefined);
  for (const [i, date] of [
    "2026-10-04",
    "2026-10-05",
    "2026-10-05",
    "2026-10-07",
  ].entries()) {
    const a = activity(`s${i}`, "swim", date);
    d.activities.push(a);
    d = complete(d, a, log(1), today);
  }
  assert.equal(badgeProgress(d, "swim3"), 2);
  const a = activity("s-last", "swim", "2026-10-11");
  d.activities.push(a);
  d = complete(d, a, log(1), today);
  assert.equal(badgeProgress(d, "swim3"), 3);
  assert.ok(d.earned.swim3);
  assert.equal(monday(today), "2026-10-05");
});
test("care progress counts days, not individual routines and never counts empty days", () => {
  const d = initialBuild();
  d.routineChecks = {
    "2026-10-01": ["a", "b"],
    "2026-10-02": [],
    "2026-10-03": ["a"],
  };
  assert.equal(badgeProgress(d, "care14"), 2);
});
test("generated plan follows selected days, time, equipment, experience and does not invent distances", () => {
  const profile = {
    goal: "balanced",
    level: "beginner",
    days: [0, 2, 2, 5],
    equipment: "home",
    minutes: 30,
    sport: "run",
  };
  const p = generatePlan(profile, "2026-10-12");
  assert.deepEqual(
    p.map((a) => a.day),
    ["2026-10-12", "2026-10-14", "2026-10-17"],
  );
  assert.equal(new Set(p.map((a) => a.id)).size, 3);
  assert.ok(
    p.every(
      (a) =>
        !activityError(a) && a.targetMinutes === 30 && a.targetKm === undefined,
    ),
  );
  for (const a of p.filter((a) => a.kind === "strength"))
    assert.ok(
      a.exercises.every(
        (e) =>
          e.sets === 2 &&
          exerciseById(e.exerciseId).equipment === "Vlastní váha",
      ),
    );
  assert.match(p.find((a) => a.kind === "run").details, /1 minutu/);
});
test("applying a plan preserves completed workouts, drafts and past dates and replaces only untouched future work", () => {
  const d = initialBuild();
  d.activities = [
    activity("past", "run", "2026-10-05"),
    activity("done", "run", "2026-10-07"),
    activity("draft", "strength", "2026-10-10"),
    activity("replace", "run", today),
    activity("other", "run", "2026-10-12"),
  ];
  d.logs.done = log();
  d.drafts.draft = { squat: [{ reps: "", weight: "", done: false }] };
  const p = ["2026-10-07", "2026-10-10", today].map((day, i) =>
    activity(`new${i}`, "run", day),
  );
  const result = applyPlan(d, p, "2026-10-05", "2026-10-07");
  assert.deepEqual(
    result.activities.map((a) => a.id),
    ["past", "done", "draft", "other", "new2"],
  );
  assert.deepEqual(result.drafts, d.drafts);
  assert.deepEqual(result.logs, d.logs);
});
test("earned badges survive subsequent correction while progress reflects corrected actual data", () => {
  let d = initialBuild();
  const a = activity("a");
  d.activities.push(a);
  d = complete(d, a, log(100), today);
  const earned = d.earned.run100;
  d = complete(d, a, log(3), today);
  assert.equal(d.earned.run100, earned);
  assert.equal(badgeProgress(d, "run100"), 3);
});
test("valid drafts and logs round trip; malformed persisted data is rejected rather than overwritten", () => {
  const d = initialBuild();
  const a = activity("a", "strength");
  a.exercises = [{ exerciseId: "squat", sets: 2, reps: 10, restSeconds: 60 }];
  d.activities.push(a);
  d.drafts.a = {
    squat: [
      { reps: "10", weight: "0", done: true },
      { reps: "", weight: "", done: false },
    ],
  };
  assert.deepEqual(
    parseBuild(JSON.stringify(d)),
    JSON.parse(JSON.stringify(d)),
  );
  for (const invalid of [
    { ...d, version: 2 },
    { ...d, activities: [{ ...a, day: "2026-02-30" }] },
    { ...d, logs: { unknown: log() } },
    { ...d, drafts: { a: { squat: [null] } } },
    { ...d, profile: { ...d.profile, days: [8] } },
  ])
    assert.throws(() => parseBuild(JSON.stringify(invalid)));
});

test("typed performance drafts survive storage and protect a workout from plan replacement", () => {
  const d = initialBuild();
  const a = activity("started", "run", "2026-10-12");
  d.activities.push(a);
  d.metricDrafts = { started: { minutes: "2", km: "3," } };
  const restored = parseBuild(JSON.stringify(d));
  assert.deepEqual(restored.metricDrafts, d.metricDrafts);
  const replacement = activity("replacement", "run", a.day);
  assert.deepEqual(
    applyPlan(restored, [replacement], "2026-10-12", today).activities.map(
      (a) => a.id,
    ),
    ["started"],
  );
  assert.throws(() =>
    parseBuild(
      JSON.stringify({
        ...d,
        metricDrafts: { missing: { minutes: "2", km: "3" } },
      }),
    ),
  );
});
