import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/profile/model.ts";
import * as mindModel from "../src/mind/model.ts";
import * as buildModel from "../src/build/model.ts";
import * as businessModel from "../src/business/model.ts";
// Tiny hook host makes delayed storage and unmount ordering deterministic.
function host(path, store, imports) {
  const state = [],
    refs = [],
    effects = [];
  let cursor = 0,
    pending = [];
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state))
        state[i] = typeof initial === "function" ? initial() : initial;
      return [
        state[i],
        (v) => {
          state[i] = typeof v === "function" ? v(state[i]) : v;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return (refs[i] ??= { current: initial });
    },
    useEffect(fn, deps) {
      const i = cursor++,
        old = effects[i];
      if (!old || deps.some((v, n) => !Object.is(v, old.deps[n])))
        pending.push(() => {
          old?.cleanup?.();
          effects[i] = { deps, cleanup: fn() };
        });
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Date,
    Promise,
    require: (name) =>
      name === "react"
        ? react
        : name === "@react-native-async-storage/async-storage"
          ? { __esModule: true, default: store }
          : (imports[name] ??
            (() => {
              throw Error("unknown " + name);
            })()),
  });
  return {
    hook: Object.values(module.exports)[0],
    render(fn) {
      cursor = 0;
      const result = fn();
      const next = pending;
      pending = [];
      next.forEach((f) => f());
      return result;
    },
    unmount() {
      effects.forEach((e) => e?.cleanup?.());
    },
  };
}
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
const now = Date.parse("2026-10-26T12:00:00Z");
test("A late missing-profile read from an unmounted session cannot overwrite restored metadata", async () => {
  let resolve;
  const writes = [];
  const store = {
    getItem: () => new Promise((r) => (resolve = r)),
    setItem: async (k, v) => writes.push([k, v]),
  };
  const h = host("src/profile/useProfile.ts", store, {
      "./model": model,
      "../mind/model": mindModel,
    }),
    gate = { current: false };
  h.render(() => h.hook(null, false, false, now, gate));
  gate.current = true;
  h.unmount();
  resolve(null);
  await tick();
  assert.equal(writes.length, 0);
});
test("Immediate restore gate suppresses initializer writes before React commits blocked props", async () => {
  let resolve;
  const writes = [];
  const store = {
    getItem: () => new Promise((r) => (resolve = r)),
    setItem: async (k, v) => writes.push([k, v]),
  };
  const h = host("src/profile/useProfile.ts", store, {
      "./model": model,
      "../mind/model": mindModel,
    }),
    gate = { current: false };
  h.render(() => h.hook(null, false, false, now, gate));
  gate.current = true;
  resolve(null);
  await tick();
  const active = h.render(() => h.hook(null, false, false, now, gate));
  assert.equal(active.loaded, true);
  assert.equal(writes.length, 0);
  active.edit("Should not overwrite backup", "");
  active.setGoals({ workouts: 3, mindDays: 0, lessons: 0, businessSteps: 0 });
  active.retrySave();
  await tick();
  assert.equal(writes.length, 0);
  h.unmount();
});
test("An unchanged score records the new local day across midnight", async () => {
  const writes = [],
    store = {
      getItem: async () => JSON.stringify(model.initialProfile(now)),
      setItem: async (k, v) => writes.push(JSON.parse(v)),
    };
  const h = host("src/profile/useProfile.ts", store, {
      "./model": model,
      "../mind/model": mindModel,
    }),
    gate = { current: false };
  h.render(() => h.hook(0, true, false, now, gate));
  await tick();
  h.render(() => h.hook(0, true, false, now, gate));
  await tick();
  h.render(() => h.hook(0, true, false, now + 86400000, gate));
  await tick();
  assert.equal(writes.at(-1).snapshots.length, 2);
  assert.notEqual(
    writes.at(-1).snapshots[0].day,
    writes.at(-1).snapshots[1].day,
  );
  h.unmount();
});
for (const [name, domain] of [
  ["Build", buildModel],
  ["Mind", mindModel],
  ["Business", businessModel],
])
  test(`${name} stale action callbacks respect the synchronous gate and unmount`, async () => {
    const writes = [],
      initial = domain[`initial${name}`](),
      store = {
        getItem: async () => JSON.stringify(initial),
        setItem: async (k, v) => writes.push([k, v]),
      };
    const path = `src/${name.toLowerCase()}/use${name}.ts`,
      h = host(path, store, { "./model": domain }),
      gate = { current: false };
    h.render(() => h.hook(false, gate));
    await tick();
    const api = h.render(() => h.hook(false, gate));
    assert.equal(api.loaded, true);
    gate.current = true;
    api.update((d) => ({ ...d, prime: 1 }));
    api.retrySave();
    await tick();
    assert.equal(writes.length, 0);
    gate.current = false;
    h.unmount();
    api.update((d) => ({ ...d, prime: 1 }));
    api.retrySave();
    await tick();
    assert.equal(writes.length, 0);
  });

test("Profile queue drain reports a rejected write and only clears after successful retry", async () => {
  let fail = true;
  const store = {
    getItem: async () => JSON.stringify(model.initialProfile(now)),
    setItem: async () => {
      if (fail) throw Error("unavailable");
    },
  };
  const h = host("src/profile/useProfile.ts", store, {
      "./model": model,
      "../mind/model": mindModel,
    }),
    gate = { current: false };
  h.render(() => h.hook(null, false, false, now, gate));
  await tick();
  const api = h.render(() => h.hook(null, false, false, now, gate));
  api.edit("Neuložené jméno", "");
  assert.equal(await api.flush(), false);
  fail = false;
  api.retrySave();
  assert.equal(await api.flush(), true);
  h.unmount();
});
for (const [name, domain] of [
  ["Build", buildModel],
  ["Mind", mindModel],
  ["Business", businessModel],
])
  test(`${name} queue failure remains visible to backup until successful retry`, async () => {
    let fail = true;
    const store = {
      getItem: async () => JSON.stringify(domain[`initial${name}`]()),
      setItem: async () => {
        if (fail) throw Error("unavailable");
      },
    };
    const h = host(`src/${name.toLowerCase()}/use${name}.ts`, store, {
        "./model": domain,
      }),
      gate = { current: false };
    h.render(() => h.hook(false, gate));
    await tick();
    const api = h.render(() => h.hook(false, gate));
    api.update((d) => ({ ...d, prime: 1 }));
    assert.equal(await api.flush(), false);
    fail = false;
    api.retrySave();
    assert.equal(await api.flush(), true);
    h.unmount();
  });
