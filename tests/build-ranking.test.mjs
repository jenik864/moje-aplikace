import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPoints,
  buildRank,
  buildMilestones,
} from "../src/build/ranking.ts";
import { initialBuild, complete, parseBuild } from "../src/build/model.ts";
const activity = (id, day) => ({
  id,
  day,
  kind: "run",
  title: "Běh",
  targetMinutes: 120,
  details: "",
  exercises: [],
});
test("rank counts only actual minutes with one shared daily cap, independent of sport and planned duration", () => {
  const d = initialBuild();
  d.activities = [
    activity("a", "2026-10-10"),
    activity("b", "2026-10-10"),
    activity("planned", "2026-10-11"),
  ];
  assert.equal(buildPoints(d), 0);
  d.logs.a = { at: 1, minutes: 20, km: 2 };
  d.logs.b = { at: 1, minutes: 100, km: 10 };
  assert.equal(buildPoints(d), 3);
  d.routineChecks["2026-10-11"] = ["skin-am"];
  assert.equal(buildPoints(d), 3);
  d.activities.push(activity("short", "2026-10-09"));
  d.logs.short = { at: 1, minutes: 15, km: 1 };
  assert.equal(buildPoints(d), 3.5);
});
test("rank thresholds use cumulative movement and do not decay on a rest day", () => {
  for (const [rank, threshold] of buildMilestones.entries()) {
    const d = initialBuild();
    let points = threshold;
    let i = 0;
    while (points > 0) {
      const id = String(i++);
      d.activities.push(activity(id, `day-${id}`));
      d.logs[id] = { at: 1, minutes: Math.min(3, points) * 30, km: 1 };
      points -= Math.min(3, points);
    }
    assert.equal(buildRank(d), rank);
  }
});
test("correction changes Current, preserves PRIME and old data remains readable", () => {
  let d = initialBuild();
  const a = activity("a", "2026-10-10"),
    b = activity("b", "2026-10-11");
  d.activities = [a, b];
  d = complete(d, a, { at: 1, minutes: 90, km: 5 }, "2026-10-11");
  d = complete(d, b, { at: 1, minutes: 90, km: 5 }, "2026-10-11");
  assert.equal(buildRank(d), 1);
  assert.equal(d.prime, 1);
  d = complete(d, b, { at: 1, minutes: 1, km: 1 }, "2026-10-11");
  assert.equal(buildRank(d), 0);
  assert.equal(d.prime, 1);
  assert.equal(parseBuild(JSON.stringify(d)).prime, 1);
  delete d.prime;
  assert.doesNotThrow(() => parseBuild(JSON.stringify(d)));
});

test("first correction of legacy data preserves the rank visible before that correction", () => {
  const d = initialBuild();
  const a = activity("a", "2026-10-10"),
    b = activity("b", "2026-10-11");
  d.activities = [a, b];
  d.logs = {
    a: { at: 1, minutes: 90, km: 5 },
    b: { at: 1, minutes: 90, km: 5 },
  };
  assert.equal(d.prime, undefined);
  assert.equal(buildRank(d), 1);
  const corrected = complete(d, b, { at: 1, minutes: 10, km: 1 }, "2026-10-11");
  assert.equal(buildRank(corrected), 0);
  assert.equal(corrected.prime, 1);
});
