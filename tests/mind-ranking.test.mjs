import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMind,
  setPlan,
  toggleHabit,
  startFocus,
  finishFocus,
  recordGame,
  completeLesson,
  parseMind,
} from "../src/mind/model.ts";
import {
  dailyMindXP,
  mindXP,
  mindRank,
  mindMilestones,
} from "../src/mind/ranking.ts";
const day = "2026-10-12",
  now = new Date(`${day}T12:00:00`).getTime(),
  habit = {
    id: "h",
    title: "Četba",
    kind: "reading",
    minutes: 30,
    days: [0, 1, 2, 3, 4, 5, 6],
  };
const game = {
  id: "g",
  at: now,
  difficulty: "easy",
  duration: 60,
  operations: ["+"],
  correct: 100,
  mistakes: 0,
};
test("Mind planning and unfinished rounds earn no XP; all sources share daily limits", () => {
  let d = setPlan(initialMind(), [habit], day);
  assert.equal(mindXP(d), 0);
  d = toggleHabit(d, day, "h", "", now);
  assert.equal(mindXP(d), 30);
  d = recordGame(d, game);
  assert.equal(mindXP(d), 45);
  d = recordGame(d, { ...game, id: "g2" });
  assert.equal(mindXP(d), 45);
  for (const id of ["python-start", "oil-to-fuel", "compound-interest"])
    d = completeLesson(d, id, now);
  assert.equal(dailyMindXP(d)[day], 60);
  assert.equal(mindXP(d), 60);
});
test("Focus and habit completion cannot double count the same daily minutes", () => {
  let d = setPlan(initialMind(), [habit], day);
  d = startFocus(d, 30, "h", now);
  d = finishFocus(d, now + 30 * 60000);
  assert.equal(mindXP(d), 30);
  assert.ok(d.checks[day].h);
  d = completeLesson(d, "python-start", now);
  assert.equal(mindXP(d), 45);
  d = completeLesson(d, "python-start", now + 1000);
  assert.equal(mindXP(d), 45);
});
test("Current corrections preserve legacy PRIME and inactive days do not reset rank", () => {
  let d = setPlan(initialMind(), [habit], day);
  d = toggleHabit(d, day, "h", "", now);
  d = recordGame(d, game);
  assert.equal(mindRank(d), 1);
  delete d.prime;
  d = toggleHabit(d, day, "h", "", now);
  assert.equal(mindRank(d), 0);
  assert.equal(d.prime, 1);
  assert.equal(parseMind(JSON.stringify(d)).prime, 1);
  assert.equal(mindXP(d), 15);
});
test("Restored cross-midnight focus awards XP to its original activity day", () => {
  const late = new Date(`${day}T23:55:00`).getTime();
  let d = startFocus(setPlan(initialMind(), [habit], day), 30, "h", late);
  d = finishFocus(d, late + 30 * 60000);
  assert.deepEqual(dailyMindXP(d), { [day]: 30 });
});
test("Every threshold maps to the intended rank, and malformed progress is protected", () => {
  for (let i = 0; i < mindMilestones.length; i++) {
    const d = initialMind();
    let xp = mindMilestones[i],
      n = 0;
    while (xp) {
      const minutes = Math.min(30, xp);
      d.sessions[`s${n++}`] = { at: now + n * 86400000, minutes };
      xp -= minutes;
    }
    assert.equal(mindRank(d), i);
  }
  const d = initialMind();
  assert.throws(() => parseMind(JSON.stringify({ ...d, prime: 12 })));
  assert.throws(() =>
    parseMind(JSON.stringify({ ...d, lessonProgress: { "python-start": 4 } })),
  );
  assert.deepEqual(
    parseMind(JSON.stringify({ ...d, lessonProgress: { "python-start": 2 } }))
      .lessonProgress,
    { "python-start": 2 },
  );
});

test("Legacy meditation category is corrected without losing identifiers or notes", () => {
  let d = setPlan(initialMind(), [{ ...habit, title: "Meditace" }], day);
  d = toggleHabit(d, day, "h", "Klidnější hlava", now);
  const loaded = parseMind(JSON.stringify(d));
  assert.equal(loaded.plans[0].habits[0].kind, "meditation");
  assert.equal(loaded.checks[day].h.habit.kind, "meditation");
  assert.equal(loaded.checks[day].h.note, "Klidnější hlava");
  assert.equal(mindXP(loaded), mindXP(d));
});
