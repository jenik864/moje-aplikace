import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMind,
  setPlan,
  habitsFor,
  addDayHabit,
  removeDayHabit,
  toggleHabit,
  editHabitNote,
  completeLesson,
  advanceLesson,
  toggleSavedLesson,
  saveLearningNote,
  parseMind,
  startFocus,
  badgeValue,
  recordGame,
} from "../src/mind/model.ts";
import { mindXP, mindRank } from "../src/mind/ranking.ts";
import { lessons, findLessons } from "../src/mind/lessons.ts";
import { learningNext, weekOverview } from "../src/mind/insights.ts";
import {
  binaryTrace,
  discountedPrice,
  energyKWh,
  filterExample,
  transferSeconds,
} from "../src/mind/experiments.ts";
const day = "2026-10-20",
  now = new Date(`${day}T12:00:00`).getTime();
const habit = {
  id: "once",
  title: "Jedna kapitola",
  kind: "reading",
  minutes: 20,
  days: [1],
};
test("One-off tasks coexist with recurring plans without leaking into other days; corrections preserve note and earned rank", () => {
  let d = setPlan(
    initialMind(),
    [{ ...habit, id: "daily", days: [0, 1, 2, 3, 4, 5, 6] }],
    day,
  );
  d = addDayHabit(d, day, habit);
  assert.deepEqual(
    habitsFor(d, day).map((h) => h.id),
    ["daily", "once"],
  );
  assert.deepEqual(
    habitsFor(d, "2026-10-21").map((h) => h.id),
    ["daily"],
  );
  assert.throws(() => addDayHabit(d, day, habit));
  assert.throws(() => addDayHabit(d, "2026-02-30", habit));
  assert.throws(() => addDayHabit(d, day, { ...habit, minutes: 0 }));
  d = toggleHabit(d, day, "once", "kapitola 3", now);
  const xp = mindXP(d),
    at = d.checks[day].once.at,
    earned = d.earned;
  d = editHabitNote(d, day, "once", "  Přepsaná poznámka  ");
  assert.equal(d.checks[day].once.note, "Přepsaná poznámka");
  assert.equal(d.checks[day].once.at, at);
  assert.equal(mindXP(d), xp);
  assert.deepEqual(d.earned, earned);
  assert.throws(() => removeDayHabit(d, day, "once"));
  d = toggleHabit(d, day, "once", "", now);
  d = removeDayHabit(d, day, "once");
  assert.equal(habitsFor(d, day).length, 1);
  assert.equal(mindXP(d), 0);
  assert.ok(d.earned["first-plan"]);
  assert.throws(() => editHabitNote(d, day, "once", "missing"));
  d = addDayHabit(d, day, habit);
  d = startFocus(d, 20, "once", now);
  assert.throws(() => removeDayHabit(d, day, "once"));
  assert.deepEqual(parseMind(JSON.stringify(d)), d);
});
test("Library bookmarks, progress, notes and reviews survive reload without creating XP", () => {
  let d = toggleSavedLesson(initialMind(), "memory");
  d = saveLearningNote(d, "memory", "Vybavit si tři myšlenky.");
  d = saveLearningNote(d, "memory", "Rozepsaná poznámka ");
  assert.equal(d.learning.notes.memory, "Rozepsaná poznámka ");
  d = advanceLesson(d, "memory", 2);
  d = advanceLesson(d, "memory", 1);
  assert.equal(d.lessonProgress.memory, 2);
  assert.equal(mindXP(d), 0);
  assert.deepEqual(parseMind(JSON.stringify(d)), d);
  d = completeLesson(d, "memory", now);
  const before = mindXP(d);
  d = completeLesson(d, "memory", now + 86400000 * 3);
  assert.equal(mindXP(d), before);
  assert.equal(d.lessons.memory, now);
  assert.equal(d.learning.reviewed.memory, now + 86400000 * 3);
  assert.equal(badgeValue(d, "reviewer"), 1);
  d = toggleSavedLesson(d, "memory");
  assert.deepEqual(d.learning.saved, []);
  assert.throws(() => advanceLesson(d, "memory", 4));
  assert.throws(() => saveLearningNote(d, "unknown", "x"));
  assert.throws(() =>
    parseMind(
      JSON.stringify({
        ...d,
        learning: { ...d.learning, reviewed: { internet: now } },
      }),
    ),
  );
  assert.throws(() =>
    parseMind(
      JSON.stringify({
        ...d,
        learning: { ...d.learning, saved: ["memory", "memory"] },
      }),
    ),
  );
});
test("All nine lessons award first completions only, while the legacy three-lesson badge retains its original requirements", () => {
  let d = initialMind();
  for (const [i, l] of lessons.entries()) {
    d = completeLesson(d, l.id, now + i * 86400000);
    assert.equal(
      parseMind(JSON.stringify(d)).lessons[l.id],
      now + i * 86400000,
    );
  }
  assert.equal(mindXP(d), 135);
  assert.equal(mindRank(d), 2);
  assert.ok(d.earned.explorer);
  assert.ok(d.earned["all-lessons"]);
  let others = initialMind();
  for (const id of ["memory", "internet", "electricity"])
    others = completeLesson(others, id, now);
  assert.equal(badgeValue(others, "all-lessons"), 0);
  assert.equal(others.earned["all-lessons"], undefined);
  assert.equal(badgeValue(others, "explorer"), 3);
  const legacy = parseMind(
    JSON.stringify({ ...initialMind(), earned: { "all-lessons": now } }),
  );
  assert.equal(legacy.earned["all-lessons"], now);
});
test("Search ignores Czech accents, respects learning areas and combines words", () => {
  assert.equal(findLessons("pamet")[0].id, "memory");
  assert.equal(findLessons("procenta slevy", "finance")[0].id, "percentages");
  assert.deepEqual(findLessons("python", "world"), []);
  assert.equal(findLessons("  ").length, 9);
  assert.equal(findLessons("internet")[0].id, "internet");
  assert.deepEqual(
    new Set(lessons.map((l) => l.group)),
    new Set(["skills", "world", "mind", "finance"]),
  );
});
test("Continue prioritizes an unfinished lesson and reviews respect the latest actual replay date", () => {
  let d = advanceLesson(initialMind(), "algorithms", 2);
  assert.equal(learningNext(d, now).resume.id, "algorithms");
  assert.equal(learningNext(d, now).suggested.id, "algorithms");
  d = completeLesson(d, "algorithms", now);
  assert.equal(learningNext(d, now + 86400000).review, undefined);
  assert.equal(learningNext(d, now + 3 * 86400000).review.id, "algorithms");
  d = completeLesson(d, "algorithms", now + 3 * 86400000);
  assert.equal(learningNext(d, now + 4 * 86400000).review, undefined);
  assert.equal(
    learningNext(d, now).suggested.id,
    learningNext(d, now + 100).suggested.id,
  );
});
test("Weekly overview separates planned minutes, finished blocks and actual capped XP, including midnight sessions", () => {
  let d = addDayHabit(initialMind(), day, { ...habit, minutes: 30 });
  d = toggleHabit(d, day, "once", "", now);
  d = {
    ...d,
    sessions: {
      late: { at: new Date("2026-10-21T00:10:00").getTime(), minutes: 30, day },
    },
  };
  d = completeLesson(d, "electricity", now);
  d = recordGame(d, {
    id: "g",
    at: now,
    difficulty: "normal",
    duration: 60,
    operations: ["+"],
    correct: 20,
    mistakes: 2,
    maxCombo: 10,
  });
  const s = weekOverview(d, "2026-10-19", day);
  assert.equal(s.xp, 60);
  assert.equal(s.minutes, 30);
  assert.equal(s.focusMinutes, 30);
  assert.equal(s.done, 1);
  assert.equal(s.lessons, 1);
  assert.equal(s.correct, 20);
  assert.equal(s.activeDays, 1);
  assert.equal(s.days[1].xp, 60);
  assert.equal(s.days[2].xp, 0);
  assert.equal(s.days[2].future, true);
  assert.equal(weekOverview(d, "2026-10-12", day).xp, 0);
});
test("Arena preferences and real maximum streak are optional for old records and strictly validated for new ones", () => {
  const base = {
    id: "g",
    at: now,
    difficulty: "normal",
    duration: 60,
    operations: ["+"],
    correct: 20,
    mistakes: 2,
  };
  let d = recordGame(initialMind(), base);
  assert.equal(parseMind(JSON.stringify(d)).games[0].maxCombo, undefined);
  d = {
    ...d,
    arenaPreferences: {
      difficulty: "hard",
      duration: 120,
      operations: ["×", "÷"],
    },
  };
  assert.deepEqual(
    parseMind(JSON.stringify(d)).arenaPreferences,
    d.arenaPreferences,
  );
  assert.throws(() => recordGame(d, { ...base, id: "bad", maxCombo: 21 }));
  assert.throws(() =>
    parseMind(
      JSON.stringify({
        ...d,
        arenaPreferences: { ...d.arenaPreferences, operations: [] },
      }),
    ),
  );
  assert.throws(() =>
    recordGame(d, { ...base, id: "bad", operations: ["+", "+"] }),
  );
});
test("Interactive experiments obey units, changing percentage bases, base rates and actual binary-search steps", () => {
  assert.equal(discountedPrice(2000, [20, 10]), 1440);
  assert.equal(discountedPrice(1000, [-20, 20]), 960);
  assert.equal(transferSeconds(10, 40), 2);
  assert.equal(energyKWh(2000, 0.5), 1);
  const r = filterExample(1);
  assert.equal(r.detected, 95);
  assert.equal(r.falseAlarms, 495);
  assert.ok(r.share > 16 && r.share < 17);
  assert.equal(filterExample(50).share, 95);
  for (let target = 1; target <= 1024; target++) {
    const values = Array.from({ length: 1024 }, (_, i) => i + 1),
      trace = binaryTrace(values, target);
    assert.ok(trace.length <= 11);
    assert.equal(values[trace.at(-1).mid], target);
    for (let i = 1; i < trace.length; i++)
      assert.ok(
        trace[i].high - trace[i].low < trace[i - 1].high - trace[i - 1].low,
      );
  }
  assert.ok(binaryTrace([2, 4, 6], 3).every((s) => !s.found));
});
