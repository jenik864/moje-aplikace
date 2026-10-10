import test from "node:test";
import assert from "node:assert/strict";
import { rankForDays, rankOf, streak, dayKey } from "../src/model.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const p = { startedAt: now, prime: 0, days: {}, history: [] };
test("all rank thresholds and lower/upper bounds", () => {
  const boundaries = [0, 3, 5, 9, 14, 21, 30, 60, 90, 180];
  boundaries.forEach((day, index) => {
    assert.equal(rankForDays(day), index);
    if (index > 0) assert.equal(rankForDays(day - 0.001), index - 1);
  });
  assert.equal(rankForDays(-1), 0);
  assert.equal(rankForDays(999), 9);
});
test("porn rank uses exact elapsed time; resetting only current series preserves prime", () => {
  const old = { ...p, startedAt: now - 30 * 86400000, prime: 6 };
  assert.equal(rankOf("porn", old, now), 6);
  const reset = { ...old, startedAt: now };
  assert.equal(rankOf("porn", reset, now), 0);
  assert.equal(reset.prime, 6);
});
test("daily streak counts only completed consecutive local days", () => {
  const days = {};
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days[dayKey(d)] = true;
  }
  assert.equal(streak({ ...p, days }, now), 3);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  days[dayKey(yesterday)] = false;
  assert.equal(streak({ ...p, days }, now), 0);
});
test("a missing daily entry breaks a series", () => {
  assert.equal(
    streak({ ...p, days: { "2026-10-09": true, "2026-10-07": true } }, now),
    1,
  );
});

test("reset preserves manifest, trigger history and best rank", async () => {
  const { resetProgram } = await import("../src/model.ts");
  const old = {
    ...p,
    startedAt: now - 9 * 86400000,
    reasons: "My why",
    signature: "M 0 0 L 1 1",
    triggers: [{ at: now - 1000, trigger: "Stres" }],
    prime: 6,
  };
  const next = resetProgram(old, now);
  assert.equal(rankOf("porn", next, now), 0);
  assert.equal(next.prime, 6);
  assert.equal(next.reasons, old.reasons);
  assert.deepEqual(next.triggers, old.triggers);
  assert.deepEqual(next.history, [{ at: now, duration: 9 * 86400000 }]);
});
test("consistency includes previous series, reset days and pending today", async () => {
  const { consistencyStatus } = await import("../src/model.ts");
  const resetAt = new Date(2026, 9, 9, 12).getTime();
  const old = {
    ...p,
    startedAt: resetAt,
    history: [{ at: resetAt, duration: 5 * 86400000 }],
  };
  assert.equal(consistencyStatus(old, new Date(2026, 9, 7), now), "success");
  assert.equal(consistencyStatus(old, new Date(2026, 9, 9), now), "reset");
  assert.equal(consistencyStatus(old, new Date(now), now), "pending");
  assert.equal(consistencyStatus(old, new Date(2026, 9, 1), now), "empty");
});

test("SOS countdown follows its deadline after background time and clamps at zero", async () => {
  const { protocolRemaining } = await import("../src/model.ts");
  assert.equal(protocolRemaining(now + 120000, now), 120);
  assert.equal(protocolRemaining(now + 120000, now + 119001), 1);
  assert.equal(protocolRemaining(now + 120000, now + 150000), 0);
});
