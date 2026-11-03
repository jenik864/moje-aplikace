import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as insights from "../src/scroll/insights.ts";
import * as scoring from "../src/scroll/scoring.ts";
import { saveAttentionPlan } from "../src/scroll/attention.ts";
import { dayKey } from "../src/model.ts";
const tick = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
function hookHost(bridge) {
  const refs = [],
    values = [],
    effects = [];
  let cursor = 0,
    pending = [];
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in values)) values[i] = initial;
      return [
        values[i],
        (v) => {
          values[i] = typeof v === "function" ? v(values[i]) : v;
        },
      ];
    },
    useRef(v) {
      const i = cursor++;
      return (refs[i] ??= { current: v });
    },
    useCallback(fn) {
      cursor++;
      return fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!effects[i])
        pending.push(() => {
          effects[i] = { cleanup: fn(), deps };
        });
    },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(
    readFileSync("src/scroll/useUsageConnection.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    Date,
    Promise,
    Array,
    setInterval: () => 1,
    clearInterval: () => {},
    require: (name) =>
      ({
        react: { __esModule: true, default: react },
        "react-native": {
          AppState: {
            currentState: "active",
            addEventListener: () => ({ remove() {} }),
          },
        },
        "./native": { usageNative: bridge },
        "./insights": insights,
        "./scoring": scoring,
      })[name],
  });
  return {
    render(p, update) {
      cursor = 0;
      const value = module.exports.useUsageConnection(p, update);
      const work = pending;
      pending = [];
      work.forEach((fn) => fn());
      return value;
    },
    unmount() {
      effects.forEach((e) => e?.cleanup?.());
    },
  };
}
const program = () => ({
  startedAt: Date.now(),
  prime: 0,
  limit: 45,
  days: {},
  history: [],
});
test("delayed native reads merge with the latest user plan rather than the captured program", async () => {
  let resolve;
  const bridge = {
      hasPermission: async () => true,
      readUsage: () => new Promise((r) => (resolve = r)),
    },
    writes = [];
  const p = program(),
    host = hookHost(bridge);
  host.render(p, (value) => writes.push(value));
  await tick();
  const newer = saveAttentionPlan(p, "Čekání", "Četba", 30),
    at = Date.now();
  resolve([
    {
      key: dayKey(new Date(at)),
      minutes: 25,
      source: "android-usage",
      measuredAt: at,
      apps: [],
    },
  ]);
  await tick();
  assert.equal(writes.length, 1);
  assert.equal(typeof writes[0], "function");
  const merged = writes[0](newer);
  assert.equal(merged.attention.plan.replacement, "Četba");
  assert.equal(merged.limit, 30);
  assert.equal(merged.usageDays[dayKey(new Date(at))].minutes, 25);
  host.unmount();
});
test("a native read resolving after unmount cannot overwrite a restored session", async () => {
  let resolve;
  const writes = [],
    host = hookHost({
      hasPermission: async () => true,
      readUsage: () => new Promise((r) => (resolve = r)),
    });
  host.render(program(), (v) => writes.push(v));
  await tick();
  host.unmount();
  resolve([]);
  await tick();
  assert.equal(writes.length, 0);
});
test("unmounting while permission is pending prevents starting a native read", async () => {
  let resolve,
    reads = 0;
  const writes = [],
    host = hookHost({
      hasPermission: () => new Promise((r) => (resolve = r)),
      readUsage: async () => {
        reads++;
        return [];
      },
    });
  host.render(program(), (v) => writes.push(v));
  host.unmount();
  resolve(true);
  await tick();
  assert.equal(reads, 0);
  assert.equal(writes.length, 0);
});
test("denied permission and malformed native responses preserve all stored data", async () => {
  for (const bridge of [
    {
      hasPermission: async () => false,
      readUsage: async () => {
        throw Error("must not read");
      },
    },
    { hasPermission: async () => true, readUsage: async () => null },
  ]) {
    const writes = [],
      host = hookHost(bridge);
    host.render(program(), (v) => writes.push(v));
    await tick();
    assert.equal(writes.length, 0);
    host.unmount();
  }
});
