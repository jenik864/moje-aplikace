import test from "node:test";
import assert from "node:assert/strict";
import {
  addFoodPillar,
  activePillars,
  foodDay,
  foodPillars,
  saveFoodAnswer,
  confirmFoodDay,
  pauseFoodPillar,
  resumeFoodPillar,
} from "../src/food/model.ts";
import { rankOf, saveDailyRecord } from "../src/model.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const base = {
  startedAt: now - 6 * 86400000,
  signedAt: now - 6 * 86400000,
  prime: 0,
  rankVersion: 2,
  target: "Bez sladkých nápojů",
  reasons: "Důvody",
  signature: "M 0 0 L 1 1",
  days: {},
  history: [],
  triggers: [],
};
test("legacy records map to the original pillar without overwriting signed intent or history", () => {
  const p = {
    ...base,
    days: { "2026-10-09": true },
    dailyLogs: { "2026-10-10": { success: true, confirmed: false } },
  };
  const next = addFoodPillar(p, "Bez impulzivních objednávek", now);
  assert.deepEqual(next.days, p.days);
  assert.equal(next.target, p.target);
  assert.equal(next.signature, p.signature);
  assert.equal(foodDay(next, "2026-10-09").success, 1);
  assert.equal(foodDay(next, "2026-10-10").recorded, 1);
  assert.equal(foodDay(next, "2026-10-10").complete, false);
  assert.equal(next.dailyLogs["2026-10-10"], undefined);
});
test("adding a pillar today does not make yesterday require that new pillar", () => {
  const next = addFoodPillar(base, "Pravidelné jídlo", now);
  const answered = saveFoodAnswer(next, "2026-10-09", "original", true, now);
  const confirmed = confirmFoodDay(answered, "2026-10-09", now);
  assert.equal(confirmed.days["2026-10-09"], true);
  assert.equal(activePillars(next, "2026-10-10").length, 2);
  assert.throws(() =>
    saveFoodAnswer(next, "2026-10-09", foodPillars(next)[1].id, true, now),
  );
});
test("every active pillar must be answered before confirming a day; mixed results do not count as successful", () => {
  const next = addFoodPillar(base, "Pravidelné jídlo", now - 86400000);
  const id = foodPillars(next)[1].id;
  const partial = saveFoodAnswer(next, "2026-10-09", "original", true, now);
  assert.throws(() => confirmFoodDay(partial, "2026-10-09", now));
  const mixed = saveFoodAnswer(partial, "2026-10-09", id, false, now);
  const confirmed = confirmFoodDay(mixed, "2026-10-09", now);
  assert.equal(confirmed.days["2026-10-09"], false);
  assert.equal(rankOf("food", confirmed, now), 0);
  const corrected = saveFoodAnswer(confirmed, "2026-10-09", id, true, now);
  assert.equal(corrected.days["2026-10-09"], true);
  assert.equal(foodDay(corrected, "2026-10-09").success, 2);
});
test("today is a draft and multiple pillar clicks never create multiple rank days", () => {
  let p = addFoodPillar(base, "Pravidelné jídlo", now);
  for (const pillar of foodPillars(p))
    p = saveFoodAnswer(p, "2026-10-10", pillar.id, true, now);
  assert.equal(p.dailyLogs["2026-10-10"].success, true);
  assert.equal(p.dailyLogs["2026-10-10"].confirmed, false);
  assert.equal(p.days["2026-10-10"], undefined);
  assert.equal(rankOf("food", p, now), 0);
  assert.throws(() => confirmFoodDay(p, "2026-10-10", now));
  assert.throws(() =>
    saveDailyRecord("food", p, "2026-10-09", { success: true }, true, now),
  );
});
test("correction drops current rank and retains PRIME, reasons and trigger history", () => {
  const p = {
    ...base,
    prime: 1,
    days: { "2026-10-07": true, "2026-10-08": true, "2026-10-09": true },
    triggers: [{ at: now, trigger: "Stres" }],
  };
  assert.equal(rankOf("food", p, now), 1);
  const changed = saveFoodAnswer(p, "2026-10-09", "original", false, now);
  assert.equal(rankOf("food", changed, now), 0);
  assert.equal(changed.prime, 1);
  assert.deepEqual(changed.triggers, p.triggers);
  assert.equal(changed.reasons, p.reasons);
});
test("pausing starts tomorrow, preserves historical answers, and never removes the last pillar", () => {
  const p = addFoodPillar(base, "Pravidelné jídlo", now);
  const id = foodPillars(p)[1].id;
  const next = pauseFoodPillar(p, id, now);
  assert.equal(activePillars(next, "2026-10-10").length, 2);
  assert.equal(activePillars(next, "2026-10-11").length, 1);
  assert.deepEqual(next.days, p.days);
  assert.throws(() => pauseFoodPillar(next, "original", now));
});
test("pillar validation prevents empty, duplicate, excessively long and seventh active rules", () => {
  for (const label of ["", "  ", "x".repeat(81), "bez sladkých nápojů"])
    assert.throws(() => addFoodPillar(base, label, now));
  let p = base;
  for (let i = 0; i < 5; i++) p = addFoodPillar(p, `Pilíř ${i}`, now);
  assert.equal(foodPillars(p).length, 6);
  assert.throws(() => addFoodPillar(p, "Sedmý", now));
  assert.throws(() => saveFoodAnswer(p, "2026-10-08", "original", true, now));
  assert.throws(() => confirmFoodDay(p, "2026-10-11", now));
});

test("pause can be cancelled and resuming later preserves the old period without inventing new answers", () => {
  const p = addFoodPillar(base, "Pravidelné jídlo", now),
    id = foodPillars(p)[1].id;
  const paused = pauseFoodPillar(p, id, now),
    cancelled = resumeFoodPillar(paused, id, now);
  assert.equal(activePillars(cancelled, "2026-10-11").length, 2);
  assert.equal(foodPillars(cancelled)[1].endDay, undefined);
  const later = now + 2 * 86400000,
    resumed = resumeFoodPillar(paused, id, later);
  assert.equal(foodPillars(resumed)[1].endDay, "2026-10-11");
  assert.notEqual(foodPillars(resumed)[2].id, id);
  assert.equal(foodDay(resumed, "2026-10-12").recorded, 0);
});
