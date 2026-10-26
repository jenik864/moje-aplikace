import test from "node:test";
import assert from "node:assert/strict";
import {
  activityEvents,
  filterActivity,
  groupActivity,
  activityDigest,
  badgeCollection,
} from "../src/profile/activity.ts";
import {
  initialBuild,
  complete as completeWorkout,
} from "../src/build/model.ts";
import {
  initialMind,
  setPlan,
  toggleHabit,
  startFocus,
  finishFocus,
  recordGame,
  completeLesson,
} from "../src/mind/model.ts";
import { initialBusiness } from "../src/business/model.ts";

const at = (day, time = "12:00:00") => new Date(`${day}T${time}`).getTime();
const day = "2026-10-26",
  now = at(day, "15:00:00");
const empty = () => ({
  quit: {},
  build: initialBuild(),
  mind: initialMind(),
  business: initialBusiness(),
});
const program = (extra = {}) => ({
  startedAt: at("2026-10-01"),
  reasons: "Moje důvody",
  signature: "M 0 0 L 1 1",
  prime: 0,
  limit: 45,
  target: "Můj plán",
  days: {},
  history: [],
  ...extra,
});
const workout = (id, day) => ({
  id,
  day,
  kind: "mobility",
  title: "Mobilita zad",
  targetMinutes: 30,
  details: "Bez bolesti",
  exercises: [],
});
const habit = {
  id: "read",
  kind: "reading",
  title: "Četba",
  minutes: 30,
  days: [0, 1, 2, 3, 4, 5, 6],
};

test("Profile history never fabricates completion from plans, running focus, elapsed series or draft daily logs", () => {
  const s = empty();
  s.build.activities = [workout("planned", day)];
  s.mind = setPlan(s.mind, [habit], day);
  s.mind = startFocus(s.mind, 20, "read", now);
  s.quit.porn = program();
  s.quit.scroll = program({
    dailyLogs: {
      [day]: { success: true, minutes: 10, confirmed: false },
      "2026-10-25": { success: true, minutes: 10, confirmed: false },
    },
  });
  const p = {
    id: "project",
    title: "Projekt",
    outcome: "Výstup",
    notes: "",
    color: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  s.business.projects = [p];
  s.business.tasks = [
    {
      id: "planned",
      projectId: p.id,
      title: "Plán",
      plannedFor: day,
      createdAt: now,
      updatedAt: now,
      priority: "normal",
    },
  ];
  const before = JSON.stringify(s);
  assert.deepEqual(activityEvents(s, now), []);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(
    activityEvents(
      { quit: null, build: null, mind: null, business: null },
      now,
    ),
    [],
  );
});

test("Workouts, habit snapshots and midnight focus keep their activity day; Business uses actual completion", () => {
  const s = empty();
  s.build.activities = [workout("done", "2026-10-24")];
  s.build = completeWorkout(
    s.build,
    s.build.activities[0],
    { at: now, minutes: 45 },
    day,
  );
  s.mind = setPlan(s.mind, [habit], "2026-10-24");
  s.mind = toggleHabit(s.mind, "2026-10-24", "read", "Duna, strana 42", now);
  const late = at("2026-10-25", "23:55:00");
  s.mind = startFocus(s.mind, 20, undefined, late);
  s.mind = finishFocus(s.mind, late + 20 * 60000);
  s.business.projects = [
    {
      id: "p",
      title: "Moje aplikace",
      outcome: "První verze",
      notes: "",
      color: 0,
      status: "done",
      createdAt: at("2026-10-01"),
      updatedAt: now,
      completedAt: now,
    },
  ];
  s.business.tasks = [
    {
      id: "t",
      projectId: "p",
      title: "Zveřejnit",
      plannedFor: "2026-10-22",
      doneAt: now,
      createdAt: at("2026-10-01"),
      updatedAt: now,
      priority: "high",
      minutes: 30,
    },
  ];
  const events = activityEvents(s, now),
    get = (kind) => events.find((e) => e.kind === kind);
  assert.equal(get("workout").day, "2026-10-24");
  assert.match(get("workout").detail, /45 skutečných min/);
  assert.equal(get("workout").at, now);
  assert.equal(get("habit").day, "2026-10-24");
  assert.equal(get("habit").note, "Duna, strana 42");
  assert.match(get("habit").detail, /cíl 30 min/);
  assert.equal(get("focus").day, "2026-10-25");
  assert.equal(get("task").day, day);
  assert.equal(get("project").day, day);
  assert.ok(
    !get("task").detail.includes("30 min"),
    "A task estimate is not actual duration",
  );
  assert.deepEqual(
    groupActivity(events).map((g) => g.day),
    [day, "2026-10-25", "2026-10-24"],
  );
});

test("Completed lesson and latest review are distinct surviving records, with current notes; abandoned games stay absent", () => {
  const s = empty();
  s.mind = completeLesson(s.mind, "memory", at("2026-10-22"));
  s.mind = completeLesson(s.mind, "memory", at("2026-10-24"));
  s.mind = completeLesson(s.mind, "memory", now);
  s.mind.learning.notes.memory = "Zítra si vybavím tři myšlenky";
  s.mind = recordGame(s.mind, {
    id: "g",
    at: now,
    difficulty: "normal",
    duration: 60,
    operations: ["+"],
    correct: 8,
    mistakes: 1,
    maxCombo: 6,
  });
  const events = activityEvents(s, now);
  assert.equal(events.filter((e) => e.kind === "lesson").length, 1);
  assert.equal(events.filter((e) => e.kind === "review").length, 1);
  assert.equal(events.find((e) => e.kind === "lesson").day, "2026-10-22");
  assert.equal(events.find((e) => e.kind === "review").day, day);
  assert.ok(
    events
      .find((e) => e.kind === "review")
      .note.startsWith("Současná poznámka"),
  );
  assert.equal(events.filter((e) => e.kind === "arena").length, 1);
  assert.equal(new Set(events.map((e) => e.id)).size, events.length);
});

test("Quit history shows confirmed past records, genuine completed measurements and SOS, not draft or automatic successful streak days", () => {
  const s = empty();
  s.quit.food = program({
    days: {
      "2026-10-24": false,
      "2026-10-25": true,
      [day]: true,
      "2026-10-27": true,
      bad: true,
    },
  });
  s.quit.scroll = program({
    dailyLogs: {
      "2026-10-23": { success: false, minutes: 90, confirmed: true },
      [day]: { success: true, minutes: 0, confirmed: false },
    },
    usageDays: {
      "2026-10-25": {
        key: "2026-10-25",
        minutes: 0,
        apps: [],
        source: "android-usage",
        measuredAt: at(day, "00:00:00"),
      },
      "2026-10-24": {
        key: "2026-10-24",
        minutes: 1,
        apps: [],
        source: "android-usage",
        measuredAt: at("2026-10-24", "23:59:59"),
      },
      "2026-10-23": {
        key: "2026-10-22",
        minutes: 1,
        apps: [],
        source: "android-usage",
        measuredAt: now,
      },
      [day]: {
        key: day,
        minutes: 0,
        apps: [],
        source: "android-usage",
        measuredAt: now,
      },
    },
  });
  s.quit.porn = program({
    signedAt: at("2026-10-01"),
    triggers: [
      {
        at: now,
        trigger: "Stres",
        pauseStarted: false,
        durationSeconds: 0,
        outcome: "Vrátit se k plánu",
      },
    ],
    history: [{ at: at("2026-10-20"), duration: 2 * 86400000 }],
  });
  const events = activityEvents(s, now),
    daily = events.filter((e) => e.kind === "daily"),
    measured = events.filter((e) => e.kind === "measurement");
  assert.equal(daily.length, 3);
  assert.equal(measured.length, 1);
  assert.equal(measured[0].day, "2026-10-25");
  assert.match(measured[0].detail, /0 min/);
  assert.equal(events.filter((e) => e.kind === "program").length, 1);
  assert.equal(events.filter((e) => e.kind === "reset").length, 1);
  assert.equal(events.filter((e) => e.kind === "sos").length, 1);
  assert.ok(
    events
      .find((e) => e.program === "food" && e.day === "2026-10-24")
      .detail.includes("nebyl dodržen"),
  );
  assert.ok(events.every((e) => e.day < day || e.kind === "sos"));
});

test("Corrections remove current activity rows while immutable earned badges remain earned", () => {
  const s = empty();
  s.build.activities = [workout("a", day)];
  s.build = completeWorkout(
    s.build,
    s.build.activities[0],
    { at: now, minutes: 40 },
    day,
  );
  s.mind = setPlan(s.mind, [habit], day);
  s.mind = toggleHabit(s.mind, day, "read", "", now);
  assert.equal(
    activityEvents(s, now).filter(
      (e) => e.kind === "workout" || e.kind === "habit",
    ).length,
    2,
  );
  const buildEarnedAt = s.build.earned.first;
  s.build.logs = {};
  s.mind = toggleHabit(s.mind, day, "read", "", now);
  assert.equal(activityEvents(s, now).length, 0);
  const badges = badgeCollection(s.build, s.mind);
  assert.equal(badges.length, 18);
  for (const id of ["Build:first", "Mind:first-plan"]) {
    const b = badges.find((b) => b.id === id);
    assert.equal(b.earnedAt, id === "Build:first" ? buildEarnedAt : now);
    assert.equal(b.value, 0);
  }
  assert.equal(new Set(badges.map((b) => b.id)).size, 18);
  assert.equal(badges.filter((b) => b.title === "První krok").length, 2);
});

test("7/30-day filters include today and calendar boundaries; accent-insensitive search includes notes and source", () => {
  const rows = [
    "2026-09-27",
    "2026-09-26",
    "2026-10-19",
    "2026-10-20",
    "2026-10-26",
  ].map((d, i) => ({
    id: String(i),
    source: i === 4 ? "Mind" : "Build",
    kind: "habit",
    day: d,
    title: "Četba",
    detail: "Můj plán",
    note: i === 4 ? "Duna, poznámka o paměti" : "",
  }));
  assert.deepEqual(
    filterActivity(rows, { range: 7 }, now).map((e) => e.day),
    ["2026-10-20", day],
  );
  assert.equal(filterActivity(rows, { range: 30 }, now).length, 4);
  assert.equal(filterActivity(rows, { range: "all" }, now).length, 5);
  assert.equal(filterActivity(rows, { query: "mind pameti" }, now).length, 1);
  assert.equal(
    filterActivity(rows, { source: "Build", query: "pameti" }, now).length,
    0,
  );
  assert.deepEqual(
    filterActivity(rows, { range: 7, source: "Build" }, now).map((e) => e.day),
    ["2026-10-20"],
  );
  const chart = activityDigest(rows, now);
  assert.equal(chart.days.length, 28);
  assert.equal(chart.days[0].day, "2026-09-29");
  assert.equal(chart.days.at(-1).day, day);
  assert.equal(chart.records, 3);
  assert.equal(chart.recordDays, 3);
  assert.equal(chart.days.at(-1).sources.Mind, 1);
});

test("Routine history deduplicates check IDs and preserves deleted routine records without inventing a title", () => {
  const s = empty();
  s.build.routineChecks = { [day]: ["skin-am", "skin-am", "old"] };
  const rows = activityEvents(s, now);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((e) => e.id.endsWith(":skin-am")).title, "Ranní péče");
  assert.equal(
    rows.find((e) => e.id.endsWith(":old")).title,
    "Splněná rutina péče",
  );
});

test("Future timestamps and unfinished future plans are excluded, badges require stored earned timestamps including valid zero", () => {
  const s = empty();
  s.mind.games = [
    {
      id: "future",
      at: now + 1000,
      difficulty: "easy",
      duration: 60,
      operations: ["+"],
      correct: 1,
      mistakes: 0,
    },
  ];
  assert.deepEqual(activityEvents(s, now), []);
  s.build.activities = [workout("a", day)];
  s.build.logs = { a: { at: now, minutes: 30 } };
  let collection = badgeCollection(s.build, null);
  assert.equal(collection.find((b) => b.sourceId === "first").value, 1);
  assert.equal(
    collection.find((b) => b.sourceId === "first").earnedAt,
    null,
    "Progress alone does not invent an award",
  );
  s.build.earned.first = 0;
  collection = badgeCollection(s.build, null);
  assert.equal(collection[0].earnedAt, 0);
  assert.equal(collection[0].sourceId, "first");
  assert.deepEqual(badgeCollection(null, null), []);
});
