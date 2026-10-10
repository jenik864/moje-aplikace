import test from "node:test";
import assert from "node:assert/strict";
import {
  foodPoints,
  foodDayPoints,
  saveFoodSlot,
  confirmFoodDay,
} from "../src/food/model.ts";
import { rankOf } from "../src/model.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const base = {
  startedAt: now - 7 * 86400000,
  target: "Plan",
  reasons: "Why",
  signature: "signature",
  prime: 0,
  days: {},
  history: [],
  foodPillars: [
    {
      id: "drinks",
      label: "Bez sladkých nápojů",
      startDay: "2026-10-03",
      mode: "periods",
    },
    {
      id: "orders",
      label: "Bez objednávek",
      startDay: "2026-10-03",
      mode: "day",
    },
  ],
};
test("equal pillar weights, partial credit, confirmation and correction never award points twice", () => {
  let p = base;
  for (const [id, slot, value] of [
    ["drinks", "morning", true],
    ["drinks", "afternoon", true],
    ["drinks", "evening", false],
    ["orders", "day", true],
  ])
    p = saveFoodSlot(p, "2026-10-09", id, slot, value, now);
  assert.equal(foodPoints(p, now), 0);
  assert.ok(Math.abs(foodDayPoints(p, "2026-10-09") - 83.333333) < 0.0001);
  p = confirmFoodDay(p, "2026-10-09", now);
  assert.ok(Math.abs(foodPoints(p, now) - 83.333333) < 0.0001);
  assert.equal(
    foodPoints(confirmFoodDay(p, "2026-10-09", now), now),
    foodPoints(p, now),
  );
  p = saveFoodSlot(p, "2026-10-09", "drinks", "evening", true, now);
  assert.equal(foodPoints(p, now), 100);
});
test("future parts and whole-day answers are locked; missing answers prevent confirmation", () => {
  assert.throws(() =>
    saveFoodSlot(base, "2026-10-10", "drinks", "afternoon", true, now),
  );
  assert.throws(() =>
    saveFoodSlot(base, "2026-10-10", "orders", "day", true, now),
  );
  const p = saveFoodSlot(base, "2026-10-10", "drinks", "morning", true, now);
  assert.equal(foodPoints(p, now), 0);
  assert.throws(() => confirmFoodDay(p, "2026-10-09", now));
});
test("cumulative single rank survives bad and missing days; legacy history is retained", () => {
  const p = {
    ...base,
    days: {
      "2026-10-03": true,
      "2026-10-05": true,
      "2026-10-07": true,
      "2026-10-09": false,
      "2026-10-10": true,
    },
  };
  assert.equal(foodPoints(p, now), 300);
  assert.equal(rankOf("food", p, now), 1);
});
test("six pillars and one pillar both earn at most 100 points; scores exclude preactivation and future", () => {
  const p = {
    ...base,
    days: { "2026-10-01": true, "2026-10-09": true, "2026-10-11": true },
    foodScores: { "2026-10-09": 1000 },
  };
  assert.equal(foodPoints(p, now), 100);
});

test("pillar count cannot accelerate rank progress", () => {
  for (const count of [1, 6]) {
    const foodPillars = Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      label: `Goal ${i}`,
      mode: "day",
      startDay: "2026-10-03",
    }));
    const foodEntries = {
      "2026-10-09": Object.fromEntries(foodPillars.map((v) => [v.id, true])),
    };
    assert.equal(
      foodDayPoints({ ...base, foodPillars, foodEntries }, "2026-10-09"),
      100,
    );
  }
});
