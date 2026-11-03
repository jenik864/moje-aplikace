import test from "node:test";
import assert from "node:assert/strict";
import { periodSummary, activityBuckets } from "../src/porn/analytics.ts";
import { dayTone, calendarColor, statusColors } from "../src/statusColors.ts";
import { reasonLines } from "../src/reasons.ts";
const now = new Date(2026, 10, 3, 17, 20).getTime();
const ago = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.getTime();
};
const base = {
  startedAt: ago(24),
  signedAt: ago(24),
  history: [],
  triggers: [],
};

test("completed days are green; today and dates before activation remain neutral", () => {
  const report = periodSummary(base, now, 28);
  assert.equal(report.completed, 24);
  assert.equal(report.successful, 24);
  assert.equal(report.rate, 1);
  assert.equal(report.failed, 0);
  assert.equal(
    dayTone({ active: true, pending: true, successful: true, failed: false }),
    "pending",
  );
  assert.equal(
    calendarColor({
      active: true,
      pending: false,
      successful: true,
      resets: [],
    }).fill,
    statusColors.success,
  );
  assert.notEqual(
    calendarColor({
      active: true,
      pending: true,
      successful: false,
      resets: [],
    }).fill,
    statusColors.success,
  );
  assert.equal(
    dayTone({ active: false, pending: false, successful: true, failed: true }),
    "empty",
  );
});
test("multiple resets are events, while failed days count each date only once", () => {
  const p = {
    ...base,
    startedAt: ago(2),
    history: [
      { at: ago(2), duration: 22 * 86400000 },
      { at: ago(2) + 1000, duration: 1000 },
    ],
    triggers: [{ at: ago(1), trigger: "Stres" }],
  };
  const report = periodSummary(p, now, 7);
  assert.equal(report.resets, 2);
  assert.equal(report.failed, 1);
  assert.equal(report.completed, 6);
  assert.equal(report.sos, 1);
  assert.equal(
    calendarColor({
      active: true,
      pending: true,
      successful: false,
      resets: [{}],
    }).surface,
    statusColors.failureSurface,
  );
});
test("today cannot produce a completed success and future events are excluded", () => {
  const p = {
    ...base,
    startedAt: now - 60000,
    signedAt: now - 60000,
    history: [{ at: now + 1000, duration: 1000 }],
    triggers: [
      { at: now + 1000, trigger: "Future" },
      { at: now, trigger: "Now" },
    ],
  };
  const report = periodSummary(p, now, 7);
  assert.equal(report.completed, 0);
  assert.equal(report.rate, null);
  assert.equal(report.resets, 0);
  assert.equal(report.sos, 1);
  const buckets = activityBuckets(p, now, 28);
  assert.equal(
    buckets.reduce((n, b) => n + b.resets, 0),
    0,
  );
  assert.equal(
    buckets.reduce((n, b) => n + b.sos, 0),
    1,
  );
});
test("daily and weekly event charts preserve totals across the same source range", () => {
  const p = {
    ...base,
    triggers: [
      { at: ago(25), trigger: "Old" },
      { at: ago(8), trigger: "Middle" },
      { at: now, trigger: "Today" },
    ],
  };
  const buckets = activityBuckets(p, now, 28);
  assert.equal(buckets.length, 4);
  assert.equal(
    buckets.reduce((n, b) => n + b.sos, 0),
    3,
  );
  assert.equal(activityBuckets(p, now, 14).length, 14);
  assert.equal(
    activityBuckets(p, now, 7).reduce((n, b) => n + b.sos, 0),
    1,
  );
  assert.ok(buckets[0].to < buckets[1].from);
  for (const bad of [0, NaN, 91, 1.5])
    assert.throws(() => periodSummary(p, now, bad));
});
test("calendar windows use local days across the autumn clock change", () => {
  const dstNow = new Date(2026, 9, 27, 12).getTime();
  const report = periodSummary(
    {
      ...base,
      startedAt: new Date(2026, 9, 24, 12).getTime(),
      signedAt: new Date(2026, 9, 24, 12).getTime(),
    },
    dstNow,
    7,
  );
  assert.equal(report.completed, 3);
  assert.equal(report.successful, 3);
});
test("reason presentation preserves order, repeated personal sentences and original content", () => {
  const original =
    "Chci být přítomnější. Chci mít čas!\n\nMoje vlastní věta.\nMoje vlastní věta.";
  assert.deepEqual(reasonLines(original), [
    "Chci být přítomnější.",
    "Chci mít čas!",
    "Moje vlastní věta.",
    "Moje vlastní věta.",
  ]);
  assert.deepEqual(reasonLines("  "), []);
  assert.deepEqual(reasonLines("nižší písmeno. pokračování zůstává spolu"), [
    "nižší písmeno. pokračování zůstává spolu",
  ]);
  assert.equal(
    original,
    "Chci být přítomnější. Chci mít čas!\n\nMoje vlastní věta.\nMoje vlastní věta.",
  );
});

test('material atlas keeps twelve equal square cells for every rank preview', async () => {
  const { readFileSync } = await import('node:fs');
  const png = readFileSync(new URL('../assets/dials/material-atlas.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(width % 3, 0); assert.equal(height % 4, 0);
  assert.equal(width / 3, height / 4);
  assert.ok(width / 3 >= 300, 'Each material must retain useful source detail');
});
