import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMind,
  setPlan,
  habitsFor,
  toggleHabit,
  recordGame,
  completeLesson,
  startFocus,
  finishFocus,
  parseMind,
  badgeValue,
  weekStart,
} from "../src/mind/model.ts";
import { problem, acceptAnswer, sameMode } from "../src/mind/math.ts";
import { lessons } from "../src/mind/lessons.ts";
const day = "2026-10-12",
  now = new Date(`${day}T12:00:00`).getTime();
const habit = {
  id: "read",
  kind: "reading",
  title: "Četba",
  minutes: 20,
  days: [0, 1, 2, 3, 4],
};
const planned = () => setPlan(initialMind(), [habit], day);
const game = (id = "g", correct = 10) => ({
  id,
  at: now,
  difficulty: "normal",
  duration: 60,
  operations: ["+", "−"],
  correct,
  mistakes: 0,
});
test("Mind preserves historical schedules and completed task snapshots after plan edits", () => {
  let d = toggleHabit(planned(), day, "read", "Duna, s. 42", now);
  d = setPlan(
    d,
    [{ ...habit, title: "Python", kind: "learning" }],
    "2026-10-13",
  );
  assert.equal(habitsFor(d, day)[0].title, "Četba");
  assert.equal(habitsFor(d, "2026-10-13")[0].title, "Python");
  d = setPlan(d, [], day);
  assert.equal(habitsFor(d, day)[0].title, "Četba");
  assert.equal(d.checks[day].read.note, "Duna, s. 42");
});
test("No retroactive tasks before plan creation or future completion", () => {
  const d = planned();
  assert.deepEqual(habitsFor(d, "2026-10-11"), []);
  assert.throws(() => toggleHabit(d, "2026-10-13", "read", "", now));
  assert.throws(() => toggleHabit(d, day, "missing", "", now));
  assert.deepEqual(habitsFor(d, "2026-10-17"), []);
});
test("Habit corrections do not duplicate achievements and earned badges remain", () => {
  let d = toggleHabit(planned(), day, "read", "", now);
  assert.equal(badgeValue(d, "first-plan"), 1);
  assert.equal(d.earned["first-plan"], now);
  d = toggleHabit(d, day, "read", "", now);
  assert.equal(badgeValue(d, "first-plan"), 0);
  assert.equal(d.earned["first-plan"], now);
  d = toggleHabit(d, day, "read", "", now);
  assert.equal(badgeValue(d, "first-plan"), 1);
});
test("Plan validation rejects invalid time, days and duplicate identifiers", () => {
  for (const h of [
    { ...habit, minutes: 0 },
    { ...habit, days: [] },
    { ...habit, days: [8] },
    { ...habit, days: [0, 0] },
    { ...habit, title: " " },
  ])
    assert.throws(() => setPlan(initialMind(), [h], day));
  assert.throws(() => setPlan(initialMind(), [habit, habit], day));
});
test("Focus uses persisted deadline and cannot award early or twice", () => {
  let d = startFocus(planned(), 20, "read", now);
  assert.throws(() => finishFocus(d, now + 1000));
  assert.throws(() => startFocus(d, 10, undefined, now));
  d = parseMind(JSON.stringify(d));
  d = finishFocus(d, now + 20 * 60000);
  assert.equal(d.focus, undefined);
  assert.equal(badgeValue(d, "focus"), 20);
  assert.ok(d.checks[day].read);
  assert.throws(() => finishFocus(d, now + 30 * 60000));
});
test("Focus spanning midnight checks the original planned day", () => {
  const late = new Date(`${day}T23:55:00`).getTime();
  let d = startFocus(planned(), 20, "read", late);
  d = finishFocus(d, late + 20 * 60000);
  assert.ok(d.checks[day].read);
  assert.equal(d.checks["2026-10-13"], undefined);
});
test("Canceling a focus block does not record minutes", () => {
  const d = {
    ...startFocus(initialMind(), 20, undefined, now),
    focus: undefined,
  };
  assert.equal(badgeValue(d, "focus"), 0);
});
test("Game results are idempotent; empty games cannot unlock clean-round badge", () => {
  let d = recordGame(initialMind(), game("empty", 0));
  assert.equal(d.earned["math-clean"], undefined);
  d = recordGame(d, game());
  d = recordGame(d, game());
  assert.equal(d.games.length, 2);
  assert.equal(badgeValue(d, "math-100"), 10);
  assert.ok(d.earned["math-clean"]);
  assert.throws(() => recordGame(d, { ...game("bad"), correct: -1 }));
});
test("Replaying a lesson does not duplicate lesson badges", () => {
  let d = completeLesson(initialMind(), "python-start", now);
  d = completeLesson(d, "python-start", now + 100);
  assert.equal(d.lessons["python-start"], now);
  assert.equal(badgeValue(d, "all-lessons"), 1);
  assert.throws(() => completeLesson(d, "fake", now));
});
test("Persistence rejects corrupt history and timers rather than overwriting them", () => {
  const d = startFocus(planned(), 20, "read", now);
  assert.deepEqual(parseMind(JSON.stringify(d)), d);
  for (const bad of [
    { ...d, version: 2 },
    { ...d, checks: { bad: {} } },
    { ...d, focus: { ...d.focus, end: now } },
    { ...d, plans: [{ from: day, habits: [{ ...habit, days: [99] }] }] },
    { ...d, lessons: { unknown: now } },
  ])
    assert.throws(() => parseMind(JSON.stringify(bad)));
});
test("Week always starts on Monday, including Sunday and year boundaries", () => {
  assert.equal(weekStart("2026-10-11"), "2026-10-05");
  assert.equal(weekStart(day), day);
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
});
test("Math generator keeps subtraction nonnegative and division integral across difficulties", () => {
  for (const difficulty of ["easy", "normal", "hard"])
    for (const operation of ["+", "−", "×", "÷"])
      for (let i = 0; i < 100; i++) {
        const p = problem(difficulty, [operation]);
        assert.ok(Number.isInteger(p.answer));
        assert.ok(p.answer >= 0);
        const [a, , b] = p.text.split(" ");
        const expected =
          operation === "+"
            ? +a + +b
            : operation === "−"
              ? +a - +b
              : operation === "×"
                ? +a * +b
                : +a / +b;
        assert.equal(p.answer, expected);
      }
  assert.throws(() => problem("easy", []));
});
test("Late answers never count and records require exactly the same game mode", () => {
  const p = { text: "2 + 2", answer: 4 };
  assert.equal(acceptAnswer("4", p, 99, 100), true);
  assert.equal(acceptAnswer("4", p, 100, 100), false);
  assert.equal(acceptAnswer("4.0", p, 99, 100), false);
  assert.ok(sameMode(game(), { ...game(), operations: ["−", "+"] }));
  assert.equal(sameMode(game(), { ...game(), duration: 120 }), false);
  assert.equal(sameMode(game(), { ...game(), operations: ["+"] }), false);
});
test("Every learning route has valid quizzes and an actionable final task", () => {
  assert.equal(new Set(lessons.map((l) => l.id)).size, 9);
  for (const l of lessons) {
    assert.equal(l.steps.length, 3);
    for (const q of [...l.steps, l.practice])
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
    assert.ok(l.practice.prompt.length > 30);
  }
});
