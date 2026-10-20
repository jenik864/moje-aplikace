import test from "node:test";
import assert from "node:assert/strict";
import { initialBuild, dateKey, shiftDay } from "../src/build/model.ts";
import { initialMind } from "../src/mind/model.ts";
import { milestones } from "../src/model.ts";
import { buildMilestones } from "../src/build/ranking.ts";
import { mindMilestones } from "../src/mind/ranking.ts";
import {
  scaleScore,
  rankForScore,
  quitScores,
  profileSummary,
  initialProfile,
  parseProfile,
  editProfile,
  observeRank,
} from "../src/profile/model.ts";
const day = "2026-10-20",
  now = new Date(`${day}T12:00:00`).getTime();
const program = (days = 0, prime = 0) => ({
  startedAt: now - days * 86400000,
  signedAt: now - Math.max(days, 1) * 86400000,
  prime,
  rankVersion: 2,
  limit: 45,
  target: "Vlastní pravidlo",
  reasons: "Moje proč",
  signature: "M 0 0 L 1 1",
  days: {},
  history: [],
});
function body(points = 0) {
  const d = initialBuild();
  for (let i = 0; i < Math.ceil(points / 3); i++) {
    const id = `a-${i}`;
    d.activities.push({
      id,
      day: shiftDay(day, -i),
      kind: "mobility",
      title: "Pohyb",
      targetMinutes: 30,
      details: "",
      exercises: [],
    });
    d.logs[id] = {
      at: now - i * 86400000,
      minutes: Math.min(3, points - i * 3) * 30,
    };
  }
  return d;
}
function head(xp = 0) {
  const d = initialMind();
  for (let i = 0; i < Math.ceil(xp / 30); i++)
    d.sessions[`s-${i}`] = {
      at: now - i * 86400000,
      minutes: Math.min(30, xp - i * 30),
      day: shiftDay(day, -i),
    };
  return d;
}
test("Each discipline reaches the same twelve normalized rank boundaries despite different units", () => {
  for (let i = 0; i < 12; i++) {
    assert.equal(scaleScore(milestones[i], milestones), i);
    assert.equal(scaleScore(buildMilestones[i], buildMilestones), i);
    assert.equal(scaleScore(mindMilestones[i], mindMilestones), i);
  }
  assert.equal(scaleScore(3.5, milestones), 1.5);
  assert.equal(scaleScore(9, buildMilestones), 1.5);
  assert.equal(scaleScore(70, mindMilestones), 1.5);
  assert.throws(() => scaleScore(NaN, milestones));
  assert.throws(() => scaleScore(-1, milestones));
});
test("Overall rank gives Quit, Build and Mind exactly equal weight and includes interval progress", () => {
  const first = profileSummary({ porn: program(3) }, body(6), head(40), now);
  assert.equal(first.score, 1);
  assert.equal(first.rank, 1);
  const half = profileSummary({ porn: program(3.5) }, body(9), head(70), now);
  assert.equal(half.score, 1.5);
  assert.equal(half.rank, 1);
  const gold = profileSummary({ porn: program(9) }, body(35), head(300), now);
  assert.equal(gold.score, 4);
  assert.equal(gold.rank, 4);
});
test("Quit averages active evaluable programs, not missing measurements or unchosen programs", () => {
  const d = { porn: program(9), scroll: program() };
  const s = profileSummary(d, body(), head(), now);
  assert.equal(s.quitScore, 4);
  assert.equal(s.programs.find((p) => p.id === "scroll").state, "unmeasured");
  assert.equal(s.programs.find((p) => p.id === "food").state, "inactive");
  assert.equal(
    profileSummary({ ...d, food: program() }, body(), head(), now).quitScore,
    2,
  );
  assert.equal(profileSummary({}, body(), head(), now).score, 0);
});
test("Measured zero is valid only with seven real finished days; manual logs cannot fabricate a rank", () => {
  const p = program(10);
  p.dailyLogs = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [
      shiftDay(day, -i - 1),
      { minutes: 0, confirmed: true, success: true },
    ]),
  );
  assert.equal(quitScores({ scroll: p }, now)[1].score, null);
  p.usageDays = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => {
      const key = shiftDay(day, -i - 1);
      return [
        key,
        { key, minutes: 0, apps: [], source: "android-usage", measuredAt: now },
      ];
    }),
  );
  assert.equal(quitScores({ scroll: p }, now)[1].score, 11);
  for (const measurement of Object.values(p.usageDays))
    measurement.minutes = 37.5;
  assert.equal(quitScores({ scroll: p }, now)[1].score, 7.5);
  delete p.usageDays[shiftDay(day, -1)];
  assert.equal(quitScores({ scroll: p }, now)[1].score, null);
});
test("Incomplete or invalid source data blocks an overall result instead of turning unknown into zero", () => {
  assert.equal(profileSummary({}, null, head(), now).rank, null);
  assert.equal(profileSummary({}, body(), null, now).score, null);
  const corrupt = profileSummary(
    { porn: { ...program(), startedAt: NaN } },
    body(),
    head(),
    now,
  );
  assert.equal(corrupt.ready, false);
  assert.equal(corrupt.quitScore, null);
});
test("Plans and skincare alone do not increase the overall rank", () => {
  const d = body();
  d.activities = [
    {
      id: "planned",
      day,
      kind: "run",
      title: "V plánu",
      targetMinutes: 90,
      details: "",
      exercises: [],
    },
  ];
  d.routineChecks[day] = ["skin-am", "skin-pm"];
  const m = head();
  m.plans = [
    {
      from: day,
      habits: [
        {
          id: "read",
          title: "Četba",
          kind: "reading",
          minutes: 30,
          days: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
    },
  ];
  assert.equal(profileSummary({}, d, m, now).score, 0);
});
test("The overall maximum is Obsidian and never exceeds the shared scale", () => {
  const s = profileSummary({ porn: program(1000) }, body(600), head(5000), now);
  assert.equal(s.score, 11);
  assert.equal(s.rank, 11);
  assert.equal(rankForScore(11), 11);
});
test("Overall PRIME records real concurrent overall ranks, never averages independent historical records", () => {
  const d = body(),
    m = head();
  d.prime = 11;
  m.prime = 11;
  const summary = profileSummary({ porn: program(0, 11) }, d, m, now);
  const initial = initialProfile(now);
  assert.equal(observeRank(initial, summary.score).prime, 0);
  const peak = observeRank(initial, 5.5);
  assert.equal(peak.prime, 5);
  assert.equal(observeRank(peak, 1), peak);
  assert.equal(observeRank(peak, 5.8), peak);
  assert.equal(observeRank(peak, 6).prime, 6);
  assert.equal(initial.prime, 0);
});
test("Editing identity preserves PRIME and creation date while stored profile validation protects corrupt data", () => {
  const p = observeRank(initialProfile(now), 3.2),
    edited = editProfile(p, "  Jan  ", "  Mít čas na vlastní věci.  ");
  assert.equal(edited.name, "Jan");
  assert.equal(edited.intention, "Mít čas na vlastní věci.");
  assert.equal(edited.prime, 3);
  assert.equal(edited.createdAt, now);
  assert.deepEqual(parseProfile(JSON.stringify(edited)), edited);
  for (const raw of [
    "",
    "null",
    "{}",
    JSON.stringify({ ...p, version: 2 }),
    JSON.stringify({ ...p, prime: -1 }),
    JSON.stringify({ ...p, prime: 12 }),
    JSON.stringify({ ...p, prime: 1.5 }),
    JSON.stringify({ ...p, name: "x".repeat(41) }),
    JSON.stringify({ ...p, intention: "x".repeat(161) }),
  ])
    assert.throws(() => parseProfile(raw));
  assert.throws(() => observeRank(p, Infinity));
  assert.throws(() => observeRank(p, -1));
});
test("The local calendar remains the basis of historical confirmed food points", () => {
  const p = program(10);
  p.days[shiftDay(day, -1)] = true;
  p.days[day] = true;
  p.foodScores = { [shiftDay(day, -1)]: 50, [day]: 100 };
  assert.equal(quitScores({ food: p }, now)[2].score, 0.5 / 3);
  assert.equal(dateKey(new Date(now)), day);
});
