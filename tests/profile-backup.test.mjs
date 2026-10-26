import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_KEYS,
  MAX_BACKUP_BYTES,
  createBackup,
  parseBackup,
  parseQuitBackup,
  backupSummary,
  utf8Bytes,
} from "../src/profile/backup.ts";
import {
  JOURNAL_KEY,
  BackupStorageError,
  readBackup,
  restoreBackup,
  recoverBackup,
} from "../src/profile/backupStorage.ts";
import { initialBuild } from "../src/build/model.ts";
import {
  initialMind,
  addDayHabit,
  toggleHabit,
  completeLesson,
  recordGame,
} from "../src/mind/model.ts";
import { initialBusiness, saveProject } from "../src/business/model.ts";
import { initialProfile } from "../src/profile/model.ts";
const now = new Date("2026-10-26T12:00:00Z").getTime(),
  day = "2026-10-26";
const program = () => ({
  startedAt: now - 86400000,
  signedAt: now - 86400000,
  rankVersion: 2,
  prime: 0,
  limit: 45,
  target: "Moje pravidlo",
  reasons: "Moje proč",
  signature: "M 0 0 L 1 1",
  days: {},
  history: [],
});
const emptyPayload = () =>
  Object.fromEntries(BACKUP_KEYS.map((k) => [k, null]));
function payload(name = "Jan") {
  const build = initialBuild();
  build.activities = [
    {
      id: "a",
      day,
      kind: "mobility",
      title: "Pohyb",
      targetMinutes: 30,
      details: "",
      exercises: [],
    },
  ];
  build.logs = { a: { at: now, minutes: 30 } };
  let mind = addDayHabit(initialMind(), day, {
    id: "read",
    kind: "reading",
    title: "Četba",
    minutes: 20,
    days: [0],
  });
  mind = toggleHabit(mind, day, "read", "Poznámka", now);
  mind = completeLesson(mind, "memory", now);
  mind = recordGame(mind, {
    id: "g",
    at: now,
    difficulty: "normal",
    duration: 60,
    operations: ["+"],
    correct: 12,
    mistakes: 1,
    maxCombo: 7,
  });
  const business = saveProject(
    initialBusiness(),
    {
      id: "p",
      title: "Vlastní web",
      outcome: "Web je veřejný",
      notes: "Poznámky",
      color: 1,
    },
    "idea",
    now,
  );
  business.tasks = business.tasks.map((task, i) => ({
    ...task,
    id: `task-${i}`,
  }));
  return {
    "quitter.v1": JSON.stringify({
      porn: program(),
      food: {
        ...program(),
        foodPillars: [
          { id: "original", label: "Pití", startDay: day, mode: "periods" },
        ],
        foodSlots: { [day]: { "original:morning": true } },
        foodScores: { [day]: 50 },
      },
    }),
    "quitter.build.v1": JSON.stringify(build),
    "quitter.mind.v1": JSON.stringify(mind),
    "quitter.business.v1": JSON.stringify(business),
    "quitter.profile.v1": JSON.stringify({ ...initialProfile(now), name }),
  };
}
function memory(initial = {}) {
  const map = new Map(Object.entries(initial)),
    events = [];
  const storage = {
    async getItem(key) {
      events.push(["get", key]);
      return map.get(key) ?? null;
    },
    async multiGet(keys) {
      events.push(["read", ...keys]);
      return keys.map((k) => [k, map.get(k) ?? null]);
    },
    async multiSet(pairs) {
      events.push(["set", ...pairs.map(([k]) => k)]);
      for (const [k, v] of pairs) map.set(k, v);
    },
    async removeItem(key) {
      events.push(["remove", key]);
      map.delete(key);
    },
  };
  return { map, events, storage };
}
const stored = (m) =>
  Object.fromEntries(BACKUP_KEYS.map((k) => [k, m.get(k) ?? null]));
const journal = (before) =>
  JSON.stringify({
    format: "quitter-restore-journal",
    version: 1,
    createdAt: now,
    before,
  });
test("Portable backup round-trips all raw values and summarizes actual records without changing ranks or timestamps", () => {
  const p = payload(),
    raw = createBackup(p, now),
    envelope = parseBackup(raw);
  assert.deepEqual(envelope.payload, p);
  assert.equal(envelope.exportedAt, now);
  assert.equal(envelope.format, "quitter-backup");
  const s = backupSummary(envelope);
  assert.equal(s.programs, 2);
  assert.equal(s.workouts, 1);
  assert.equal(s.activities, 1);
  assert.equal(s.mindActivities, 1);
  assert.equal(s.games, 1);
  assert.equal(s.lessons, 1);
  assert.equal(s.projects, 1);
  assert.equal(s.name, "Jan");
  assert.equal(s.storedSections, 5);
  const nil = backupSummary(parseBackup(createBackup(emptyPayload(), now)));
  assert.equal(nil.storedSections, 0);
  assert.equal(nil.programs, 0);
  assert.equal(nil.hasProfile, false);
});
test("Envelope and payload require all five known keys, supported versions and valid per-feature formats", () => {
  const base = JSON.parse(createBackup(payload(), now));
  for (const bad of [
    { ...base, version: 2 },
    { ...base, format: "another-app" },
    { ...base, exportedAt: -1 },
    { ...base, extra: true },
    { ...base, payload: { ...base.payload, unrelated: "keep" } },
    { ...base, payload: { "quitter.v1": "{}" } },
  ])
    assert.throws(() => parseBackup(JSON.stringify(bad)));
  for (const key of BACKUP_KEYS) {
    const bad = {
      ...base,
      payload: {
        ...base.payload,
        [key]: key === "quitter.v1" ? '{"unknown":{}}' : '{"version":999}',
      },
    };
    assert.throws(() => parseBackup(JSON.stringify(bad)), key);
  }
  assert.throws(() => parseBackup("not JSON"));
  assert.throws(() =>
    parseBackup(
      '{"format":"quitter-backup","version":1,"exportedAt":1,"payload":{},"__proto__":{}}',
    ),
  );
});
test("Quit backup validation protects dates, required values, food records, triggers and measured usage before hydration", () => {
  const p = program();
  assert.deepEqual(parseQuitBackup(JSON.stringify({ porn: p })), { porn: p });
  const usage = {
    key: day,
    minutes: 45,
    source: "android-usage",
    measuredAt: now,
    apps: [{ name: "YouTube", minutes: 45 }],
  };
  assert.ok(
    parseQuitBackup(
      JSON.stringify({ scroll: { ...p, usageDays: { [day]: usage } } }),
    ).scroll,
  );
  for (const change of [
    { startedAt: null },
    { prime: 12 },
    { days: { "2026-02-30": true } },
    { history: [{ at: now, duration: -1 }] },
    { dailyLogs: { [day]: { success: true, confirmed: "yes" } } },
    { foodEntries: { [day]: { original: 1 } } },
    {
      foodPillars: [
        { id: "a", label: "A", startDay: day },
        { id: "a", label: "B", startDay: day },
      ],
    },
    { usageDays: { [day]: { ...usage, key: "2026-10-25" } } },
    { triggers: [{ at: now, trigger: 3 }] },
  ])
    assert.throws(() =>
      parseQuitBackup(JSON.stringify({ porn: { ...p, ...change } })),
    );
});
test("UTF-8 size limit includes Czech and supplementary characters and rejects oversized files before JSON parsing", () => {
  for (const str of ["abc", "Příliš žluťoučký", "🧠🚀", "\ud800", "漢字"])
    assert.equal(utf8Bytes(str), Buffer.byteLength(str));
  assert.throws(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1)), /8 MB/);
  const raw = JSON.parse(createBackup(payload(), now));
  raw.payload["quitter.profile.v1"] =
    '{"version":1,"name":"Jan","intention":"x","prime":0,"createdAt":1,"extra":{"constructor":{}}}';
  assert.throws(() => parseBackup(JSON.stringify(raw)));
});
test("Invalid target is rejected before any storage call or mutation", async () => {
  const m = memory({ ...payload(), unrelated: "keep" });
  await assert.rejects(restoreBackup(m.storage, '{"invalid":true}'));
  assert.deepEqual(m.events, []);
  assert.equal(m.map.get("unrelated"), "keep");
});
test("Successful restore replaces only the known keys, removes absent sections and commits by deleting the journal", async () => {
  const before = payload("Before"),
    target = {
      ...payload("After"),
      "quitter.business.v1": null,
      "quitter.mind.v1": null,
    },
    m = memory({ ...before, unrelated: "keep" });
  await restoreBackup(m.storage, createBackup(target, now));
  assert.deepEqual(stored(m.map), target);
  assert.equal(m.map.get("unrelated"), "keep");
  assert.equal(m.map.has(JOURNAL_KEY), false);
  const writes = m.events.filter((e) => e[0] === "set" || e[0] === "remove");
  assert.equal(writes[0][1], JOURNAL_KEY);
  assert.equal(writes.at(-1)[1], JOURNAL_KEY);
  assert.ok(
    writes.every((e) =>
      e.slice(1).every((k) => BACKUP_KEYS.includes(k) || k === JOURNAL_KEY),
    ),
  );
});
test("Partially failing batch write rolls back exact originals, including corrupt and absent values", async () => {
  const before = {
      ...payload("Before"),
      "quitter.mind.v1": "corrupt original data",
      "quitter.business.v1": null,
    },
    m = memory(
      Object.fromEntries(
        Object.entries({ ...before, unrelated: "keep" }).filter(
          ([, v]) => v !== null,
        ),
      ),
    ),
    base = m.storage.multiSet;
  let fail = true;
  m.storage.multiSet = async (pairs) => {
    if (fail && pairs.some(([k]) => k === "quitter.v1")) {
      fail = false;
      m.map.set(pairs[0][0], pairs[0][1]);
      throw Error("partial write");
    }
    await base(pairs);
  };
  await assert.rejects(
    restoreBackup(m.storage, createBackup(payload("After"), now)),
    (e) => e instanceof BackupStorageError && !e.recoveryRequired,
  );
  assert.deepEqual(stored(m.map), before);
  assert.equal(m.map.has(JOURNAL_KEY), false);
  assert.equal(m.map.get("unrelated"), "keep");
});
test("A failed null-key deletion rolls back sections already written or removed", async () => {
  const before = payload(),
    m = memory(before),
    base = m.storage.removeItem;
  let fail = true;
  m.storage.removeItem = async (key) => {
    if (fail && key === "quitter.build.v1") {
      fail = false;
      throw Error("delete failed");
    }
    await base(key);
  };
  await assert.rejects(
    restoreBackup(
      m.storage,
      createBackup(
        {
          ...emptyPayload(),
          "quitter.profile.v1": payload("New")["quitter.profile.v1"],
        },
        now,
      ),
    ),
  );
  assert.deepEqual(stored(m.map), before);
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
test("Interrupted rollback remains journaled and is recovered before new hooks load, with exact original bytes", async () => {
  const before = {
      ...payload("Before"),
      "quitter.v1": "corrupt Quit raw",
      "quitter.business.v1": null,
    },
    m = memory(
      Object.fromEntries(Object.entries(before).filter(([, v]) => v !== null)),
    ),
    base = m.storage.multiSet;
  let failures = 2;
  m.storage.multiSet = async (pairs) => {
    if (pairs.some(([k]) => k === "quitter.v1") && failures-- > 0) {
      m.map.set(pairs[0][0], pairs[0][1]);
      throw Error("disk unavailable");
    }
    await base(pairs);
  };
  await assert.rejects(
    restoreBackup(m.storage, createBackup(payload("After"), now)),
    (e) => e.recoveryRequired === true,
  );
  assert.ok(m.map.has(JOURNAL_KEY));
  const restarted = memory(Object.fromEntries(m.map));
  assert.equal(await recoverBackup(restarted.storage), true);
  assert.deepEqual(stored(restarted.map), before);
  assert.equal(restarted.map.has(JOURNAL_KEY), false);
  assert.equal(await recoverBackup(restarted.storage), false);
});
test("Journal preparation failure never starts app writes, even when provider rejects after persisting the journal", async () => {
  const before = payload(),
    m = memory(before),
    base = m.storage.multiSet;
  let fail = true;
  m.storage.multiSet = async (pairs) => {
    await base(pairs);
    if (fail && pairs[0][0] === JOURNAL_KEY) {
      fail = false;
      throw Error("write result lost");
    }
  };
  await assert.rejects(
    restoreBackup(m.storage, createBackup(payload("After"), now)),
    (e) => e.recoveryRequired === true,
  );
  assert.deepEqual(stored(m.map), before);
  assert.ok(m.map.has(JOURNAL_KEY));
  assert.equal(await recoverBackup(m.storage), true);
  assert.deepEqual(stored(m.map), before);
});
test("Read-back verification catches silently dropped writes and restores the prior snapshot", async () => {
  const before = payload(),
    m = memory(before),
    base = m.storage.multiSet;
  let drop = true;
  m.storage.multiSet = async (pairs) => {
    if (drop && pairs.some(([k]) => k === "quitter.profile.v1")) {
      drop = false;
      await base(pairs.filter(([k]) => k !== "quitter.profile.v1"));
      return;
    }
    await base(pairs);
  };
  await assert.rejects(
    restoreBackup(m.storage, createBackup(payload("After"), now)),
  );
  assert.deepEqual(stored(m.map), before);
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
test("Deletion that completes but rejects is recognized as committed rather than unsafely rolling back", async () => {
  const m = memory(payload()),
    base = m.storage.removeItem;
  let fail = true;
  const target = payload("After");
  m.storage.removeItem = async (key) => {
    await base(key);
    if (fail && key === JOURNAL_KEY) {
      fail = false;
      throw Error("ack lost");
    }
  };
  await restoreBackup(m.storage, createBackup(target, now));
  assert.deepEqual(stored(m.map), target);
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
test("Failure to delete the commit journal before deletion rolls back instead of claiming success", async () => {
  const before = payload(),
    m = memory(before),
    base = m.storage.removeItem;
  let fail = true;
  m.storage.removeItem = async (key) => {
    if (fail && key === JOURNAL_KEY) {
      fail = false;
      throw Error("not deleted");
    }
    await base(key);
  };
  await assert.rejects(
    restoreBackup(m.storage, createBackup(payload("After"), now)),
    (e) => e.recoveryRequired === false,
  );
  assert.deepEqual(stored(m.map), before);
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
test("Recovery never consumes an invalid journal or writes unexpected keys", async () => {
  for (const raw of [
    "broken JSON",
    JSON.stringify({
      format: "other",
      version: 1,
      createdAt: now,
      before: emptyPayload(),
    }),
    journal({ ...emptyPayload(), unrelated: "bad" }),
  ]) {
    const m = memory({ ...payload(), [JOURNAL_KEY]: raw, unrelated: "keep" }),
      before = Object.fromEntries(m.map);
    await assert.rejects(
      recoverBackup(m.storage),
      (e) => e.recoveryRequired === true,
    );
    assert.deepEqual(Object.fromEntries(m.map), before);
    assert.deepEqual(m.events, [["get", JOURNAL_KEY]]);
  }
});
test("Export recovers pending transaction first and excludes its journal and unrelated app keys", async () => {
  const before = payload("Before"),
    m = memory({
      ...payload("Partial"),
      [JOURNAL_KEY]: journal(before),
      unrelated: "private other app",
    });
  const raw = await readBackup(m.storage);
  assert.deepEqual(parseBackup(raw).payload, before);
  assert.equal(raw.includes("private other app"), false);
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
test("Two concurrent restore requests serialize their journals and leave the second complete snapshot", async () => {
  const m = memory(payload()),
    base = m.storage.multiSet;
  let release, started;
  const gate = new Promise((r) => (release = r)),
    entered = new Promise((r) => (started = r));
  let first = true;
  m.storage.multiSet = async (pairs) => {
    if (first && pairs[0][0] === JOURNAL_KEY) {
      first = false;
      started();
      await gate;
    }
    await base(pairs);
  };
  const a = restoreBackup(m.storage, createBackup(payload("A"), now));
  await entered;
  const b = restoreBackup(m.storage, createBackup(payload("B"), now));
  await Promise.resolve();
  assert.equal(m.events.filter((e) => e[0] === "read").length, 1);
  release();
  await Promise.all([a, b]);
  assert.deepEqual(stored(m.map), payload("B"));
  assert.equal(m.map.has(JOURNAL_KEY), false);
});
