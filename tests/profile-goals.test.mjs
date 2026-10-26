import test from "node:test";
import assert from "node:assert/strict";
import { initialBuild } from "../src/build/model.ts";
import { initialMind } from "../src/mind/model.ts";
import { initialBusiness } from "../src/business/model.ts";
import { mindXP } from "../src/mind/ranking.ts";
import { buildPoints } from "../src/build/ranking.ts";
import {
  defaultGoals,
  parseGoals,
  goalProgress,
} from "../src/profile/goals.ts";

const day = "2026-10-28",
  now = new Date(`${day}T12:00:00`).getTime(),
  stamp = (day, time = "12:00:00") => new Date(`${day}T${time}`).getTime();
const goals = { workouts: 3, mindDays: 4, lessons: 2, businessSteps: 5 };
const sources = () => ({
  build: initialBuild(),
  mind: initialMind(),
  business: initialBusiness(),
});
const row = (progress, id) => progress.rows.find((r) => r.id === id);
function addWorkout(build, id, date, minutes, at = stamp(date)) {
  build.activities.push({
    id,
    day: date,
    kind: "mobility",
    title: "Pohyb",
    targetMinutes: 120,
    details: "",
    exercises: [],
  });
  if (minutes !== undefined) build.logs[id] = { at, minutes };
}
function addCheck(mind, date, id, at = stamp(date)) {
  mind.checks[date] = {
    ...mind.checks[date],
    [id]: {
      at,
      habit: {
        id,
        kind: "reading",
        title: "Četba",
        minutes: 20,
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      note: "Potvrzené splnění",
    },
  };
}
function addProject(business) {
  business.projects.push({
    id: "p",
    title: "Můj projekt",
    outcome: "Vydat výstup",
    notes: "",
    color: 0,
    status: "active",
    createdAt: stamp("2026-10-01"),
    updatedAt: now,
  });
}
function addTask(business, id, doneAt, plannedFor = day) {
  business.tasks.push({
    id,
    projectId: "p",
    title: "Vlastní krok",
    plannedFor,
    minutes: 240,
    priority: "normal",
    createdAt: stamp("2026-10-01"),
    updatedAt: doneAt ?? now,
    ...(doneAt === undefined ? {} : { doneAt }),
  });
}

test("Personal goals start fully opted out and reject malformed metadata without inventing targets", () => {
  assert.deepEqual(defaultGoals(), {
    workouts: 0,
    mindDays: 0,
    lessons: 0,
    businessSteps: 0,
  });
  assert.deepEqual(parseGoals(undefined), defaultGoals());
  const first = defaultGoals();
  first.workouts = 8;
  assert.equal(defaultGoals().workouts, 0);
  assert.deepEqual(parseGoals(goals), goals);
  for (const invalid of [
    null,
    "",
    [],
    {},
    { ...goals, workouts: -1 },
    { ...goals, workouts: 22 },
    { ...goals, mindDays: 8 },
    { ...goals, lessons: 22 },
    { ...goals, businessSteps: 101 },
    { ...goals, lessons: 1.5 },
    { ...goals, workouts: "3" },
    { ...goals, lessons: Infinity },
  ])
    assert.throws(() => parseGoals(invalid));
  const progress = goalProgress({ targets: defaultGoals(), ...sources(), now });
  assert.equal(progress.enabledCount, 0);
  assert.equal(progress.completedCount, 0);
  assert.ok(progress.rows.every((r) => !r.complete && r.ratio === 0));
});

test("Weekly workout progress requires an actual log and follows the performed calendar day, including backfills and corrections", () => {
  const data = sources();
  addWorkout(data.build, "plan", day, undefined);
  addWorkout(data.build, "done", day, 15, now);
  addWorkout(data.build, "monday", "2026-10-26", 20, now);
  addWorkout(data.build, "old-week", "2026-10-25", 60, now);
  addWorkout(data.build, "future-day", "2026-10-29", 60, now);
  addWorkout(data.build, "future-write", day, 60, now + 1);
  data.build.logs.orphan = { at: now, minutes: 90 };
  data.build.routineChecks[day] = ["skin-am", "skin-pm"];
  let progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "workouts").actual, 2);
  assert.equal(row(progress, "workouts").ratio, 2 / 3);
  assert.equal(row(progress, "workouts").complete, false);
  data.build.logs.plan = { at: now, minutes: 10 };
  progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "workouts").complete, true);
  delete data.build.logs.done;
  progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "workouts").actual, 2);
  assert.equal(row(progress, "workouts").complete, false);
});

test("Mind goal counts distinct confirmed active days across sources, while new lessons exclude repeats", () => {
  const data = sources();
  addCheck(data.mind, "2026-10-26", "reading");
  addCheck(data.mind, "2026-10-26", "reflection");
  data.mind.sessions = {
    sameDay: { at: stamp("2026-10-26"), minutes: 20, day: "2026-10-26" },
    midnight: {
      at: stamp("2026-10-27", "00:15:00"),
      minutes: 30,
      day: "2026-10-26",
    },
    oldWeek: {
      at: stamp("2026-10-26", "00:15:00"),
      minutes: 30,
      day: "2026-10-25",
    },
  };
  data.mind.lessons = {
    "python-start": stamp("2026-10-20"),
    memory: stamp("2026-10-27"),
    electricity: now,
    internet: stamp("2026-10-29"),
  };
  data.mind.learning = {
    saved: ["memory"],
    notes: { memory: "Uložená poznámka" },
    reviewed: { "python-start": now },
  };
  data.mind.games = [
    {
      id: "empty",
      at: stamp("2026-10-25"),
      difficulty: "easy",
      duration: 60,
      operations: ["+"],
      correct: 0,
      mistakes: 0,
    },
    {
      id: "real",
      at: stamp("2026-10-27"),
      difficulty: "easy",
      duration: 60,
      operations: ["+"],
      correct: 10,
      mistakes: 0,
    },
  ];
  const progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "mindDays").actual, 3);
  assert.equal(row(progress, "lessons").actual, 2);
  assert.equal(row(progress, "lessons").complete, true);
  assert.equal(row(progress, "mindDays").complete, false);
  const onlyReview = sources();
  onlyReview.mind.lessons = { memory: stamp("2026-10-20") };
  onlyReview.mind.learning = {
    saved: [],
    notes: {},
    reviewed: { memory: now },
  };
  const reviewed = goalProgress({ targets: goals, ...onlyReview, now });
  assert.equal(row(reviewed, "mindDays").actual, 1);
  assert.equal(row(reviewed, "lessons").actual, 0);
});

test("Plans, pending focus, notes, bookmarks and idle rounds never create goal completion", () => {
  const data = sources();
  data.mind.plans = [
    {
      from: "2026-10-26",
      habits: [
        {
          id: "h",
          title: "Četba",
          kind: "reading",
          minutes: 60,
          days: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
    },
  ];
  data.mind.focus = {
    id: "running",
    start: now - 60000,
    end: now + 60000,
    minutes: 2,
    day,
  };
  data.mind.learning = {
    saved: ["memory"],
    notes: { memory: "Nápad" },
    reviewed: {},
  };
  data.mind.games = [
    {
      id: "idle",
      at: now,
      difficulty: "easy",
      duration: 60,
      operations: ["+"],
      correct: 0,
      mistakes: 0,
    },
  ];
  addCheck(data.mind, "2026-10-29", "future", now);
  addProject(data.business);
  addTask(data.business, "planned", undefined);
  const progress = goalProgress({ targets: goals, ...data, now });
  assert.ok(progress.rows.every((r) => r.actual === 0 && !r.complete));
});

test("Business goals use actual completion timestamps, retain archived achievements and reflect reopening without touching rank sources", () => {
  const data = sources();
  addProject(data.business);
  addTask(data.business, "actual-now", now, "2026-09-01");
  addTask(data.business, "actual-old", stamp("2026-10-25"), day);
  addTask(data.business, "actual-future", stamp("2026-10-29"), day);
  addTask(data.business, "not-done", undefined, day);
  data.business.projects[0].archivedAt = now;
  const snapshot = structuredClone(data),
    before = [buildPoints(data.build), mindXP(data.mind)];
  let progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "businessSteps").actual, 1);
  assert.deepEqual(data, snapshot);
  assert.deepEqual([buildPoints(data.build), mindXP(data.mind)], before);
  delete data.business.tasks[0].doneAt;
  progress = goalProgress({ targets: goals, ...data, now });
  assert.equal(row(progress, "businessSteps").actual, 0);
});

test("Missing sources stay unknown, disabled targets never appear complete and over-target values remain honest", () => {
  let progress = goalProgress({
    targets: goals,
    build: null,
    mind: null,
    business: null,
    now,
  });
  assert.ok(
    progress.rows.every(
      (r) => r.actual === null && !r.complete && r.ratio === 0,
    ),
  );
  assert.equal(progress.ready, false);
  assert.equal(progress.unavailableCount, 4);
  const data = sources();
  for (let i = 0; i < 5; i++) addWorkout(data.build, `a${i}`, day, 10, now);
  progress = goalProgress({
    targets: { ...defaultGoals(), workouts: 2 },
    ...data,
    now,
  });
  assert.equal(row(progress, "workouts").actual, 5);
  assert.equal(row(progress, "workouts").ratio, 1);
  assert.equal(progress.completedCount, 1);
  assert.ok(
    progress.rows.filter((r) => r.id !== "workouts").every((r) => !r.complete),
  );
  const disabled = goalProgress({
    targets: defaultGoals(),
    build: null,
    mind: null,
    business: null,
    now,
  });
  assert.equal(disabled.enabledCount, 0);
  assert.equal(disabled.completedCount, 0);
});

test("Week boundaries use local Monday–Sunday across year and clock changes, excluding later times on today", () => {
  const data = sources();
  addProject(data.business);
  const sundayNow = stamp("2026-10-25", "23:59:59");
  addTask(data.business, "sunday", sundayNow);
  addTask(data.business, "next-week", stamp("2026-10-26", "00:00:00"));
  const sunday = goalProgress({ targets: goals, ...data, now: sundayNow });
  assert.equal(sunday.start, "2026-10-19");
  assert.equal(sunday.end, "2026-10-25");
  assert.equal(row(sunday, "businessSteps").actual, 1);
  const monday = goalProgress({
    targets: goals,
    ...data,
    now: stamp("2026-10-26", "00:00:00"),
  });
  assert.equal(monday.start, "2026-10-26");
  assert.equal(row(monday, "businessSteps").actual, 1);
  const year = goalProgress({
    targets: defaultGoals(),
    ...sources(),
    now: stamp("2027-01-01"),
  });
  assert.equal(year.start, "2026-12-28");
  assert.equal(year.end, "2027-01-03");
  assert.throws(() => goalProgress({ targets: goals, ...sources(), now: NaN }));
  assert.throws(() =>
    goalProgress({ targets: goals, ...sources(), now: Number.MAX_VALUE }),
  );
});
