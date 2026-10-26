import test from "node:test";
import assert from "node:assert/strict";
import {
  initialProfile,
  parseProfile,
  observeProfile,
  editProfile,
  setProfileGoals,
} from "../src/profile/model.ts";
import { shift, dayKey } from "../src/mind/model.ts";
const day = "2026-10-26",
  now = new Date(`${day}T12:00:00`).getTime();
test("Observed rank history starts now, does not invent prior days, and avoids per-second storage churn", () => {
  const initial = initialProfile(now - 90 * 86400000),
    first = observeProfile(initial, 1.253, now);
  assert.equal(first.snapshots.length, 1);
  assert.equal(first.snapshots[0].day, day);
  assert.equal(first.prime, 1);
  assert.equal(observeProfile(first, 1.259, now + 1000), first);
  const next = observeProfile(first, 1.266, now + 2000);
  assert.equal(next.snapshots.length, 1);
  assert.equal(next.snapshots[0].score, 1.266);
  assert.deepEqual(parseProfile(JSON.stringify(next)), next);
});
test("A corrected daily snapshot stores actual current score while PRIME retains the achieved rank", () => {
  let p = observeProfile(initialProfile(now), 4.1, now);
  p = observeProfile(p, 0.3, now + 1000);
  assert.equal(p.prime, 4);
  assert.equal(p.snapshots[0].score, 0.3);
  assert.equal(p.snapshots.length, 1);
  const next = observeProfile(p, 0.3, now + 3 * 86400000);
  assert.deepEqual(
    next.snapshots.map((s) => s.day),
    [day, dayKey(new Date(now + 3 * 86400000))],
  );
});
test("History is sorted and bounded to366 recorded local days even when the clock moves backwards", () => {
  let p = initialProfile(now);
  for (let i = 0; i < 370; i++) {
    const at = new Date(`${shift(day, i)}T12:00:00`).getTime();
    p = observeProfile(p, i % 12, at);
  }
  assert.equal(p.snapshots.length, 366);
  assert.equal(p.snapshots[0].day, shift(day, 4));
  p = observeProfile(p, 1, now);
  assert.equal(p.snapshots.length, 366);
  assert.equal(p.snapshots[0].day, shift(day, 4));
  assert.deepEqual(parseProfile(JSON.stringify(p)), p);
});
test("Goals and name edits preserve observed history and PRIME without creating points", () => {
  let p = observeProfile(initialProfile(now), 3.2, now);
  const before = p.snapshots;
  p = setProfileGoals(p, {
    workouts: 3,
    mindDays: 4,
    lessons: 2,
    businessSteps: 5,
  });
  p = editProfile(p, "Jan", "Moje tempo");
  assert.deepEqual(p.snapshots, before);
  assert.equal(p.prime, 3);
  assert.equal(p.goals.workouts, 3);
  assert.throws(() =>
    setProfileGoals(p, {
      workouts: 100,
      mindDays: 4,
      lessons: 2,
      businessSteps: 5,
    }),
  );
});
test("Legacy profiles remain readable; malformed or duplicate history cannot overwrite valid metadata", () => {
  const p = initialProfile(now);
  assert.deepEqual(parseProfile(JSON.stringify(p)), p);
  for (const snapshots of [
    [{ day, at: now, score: NaN }],
    [{ day, at: now, score: 12 }],
    [{ day: "2026-02-30", at: now, score: 1 }],
    [{ day, at: now - 10 * 86400000, score: 1 }],
    [
      { day, at: now, score: 1 },
      { day, at: now + 1, score: 2 },
    ],
  ])
    assert.throws(() => parseProfile(JSON.stringify({ ...p, snapshots })));
  assert.throws(() => observeProfile(p, 1, NaN));
});

test("Observed local days survive export to a device in another timezone", () => {
  const p = {
    ...initialProfile(now),
    snapshots: [
      { day: "2026-10-26", at: Date.parse("2026-10-25T23:30:00Z"), score: 1 },
    ],
  };
  assert.equal(parseProfile(JSON.stringify(p)).snapshots[0].day, "2026-10-26");
});
