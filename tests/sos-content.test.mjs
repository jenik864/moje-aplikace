import test from "node:test";
import assert from "node:assert/strict";
import { supportFor, supportProgress } from "../src/sos/content.ts";
const now = new Date(2026, 9, 10, 12).getTime();
const base = {
  startedAt: now - 86400000,
  signedAt: now - 7 * 86400000,
  target: "Bez sladkých nápojů",
  days: {},
  history: [],
  prime: 0,
};
test("each program and food category has its own guidance, with an eating route for meals", () => {
  const contents = [
    supportFor("porn"),
    supportFor("scroll"),
    ...[
      "Bez sladkých nápojů",
      "Sladkosti podle plánu",
      "Bez objednávek",
      "Pravidelná hlavní jídla",
      "Moje pravidlo",
    ].map((v) => supportFor("food", v)),
  ];
  assert.equal(new Set(contents.map((v) => v.kind)).size, 7);
  assert(
    contents.every((v) => v.message && v.action && v.reminders.length === 3),
  );
  assert.match(supportFor("food", "Pravidelná hlavní jídla").action, /najez/);
});
test("food support uses only confirmed actual records and separates selected pillars without inventing old slots", () => {
  const p = {
    ...base,
    days: { "2026-10-08": true, "2026-10-09": false, "2026-10-10": true },
    foodPillars: [
      { id: "a", label: "Nápoje", mode: "periods", startDay: "2026-10-03" },
      { id: "b", label: "Jídla", mode: "meals", startDay: "2026-10-03" },
    ],
    foodSlots: {
      "2026-10-09": {
        "a:morning": true,
        "a:afternoon": false,
        "a:evening": true,
        "b:lunch": true,
      },
      "2026-10-10": { "a:morning": true },
    },
    foodEntries: { "2026-10-08": { a: true, b: false } },
  };
  assert.match(supportProgress("food", p, now, "a"), /^3 dodržených/);
  assert.match(supportProgress("food", p, now, "b"), /^1 dodržených/);
  assert.match(supportProgress("food", p, now), /^4 dodržených/);
  assert.match(
    supportProgress("food", { ...base, days: { "2026-10-09": true } }, now),
    /^1 dodržených/,
  );
});
test("porn shows actual elapsed time and missing scroll measurement never produces a made-up success", () => {
  assert.match(supportProgress("porn", base, now), /^1 den/);
  assert.match(supportProgress("scroll", base, now), /není úplné/);
});
