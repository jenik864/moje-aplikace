import { preferBack } from "../src/build/anatomy.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { findExercises } from "../src/build/search.ts";
import { exercises } from "../src/build/catalog.ts";
import {
  frontParts,
  backParts,
  roleFor,
  muscleNotes,
} from "../src/build/anatomy.ts";
test("library search works without diacritics and combines muscle and equipment including secondary muscles", () => {
  assert.ok(
    findExercises(exercises, "predni drep", null, "Vše").some(
      (e) => e.id === "front-squat",
    ),
  );
  assert.ok(
    findExercises(exercises, "drep", "core", "Jednoručka").some(
      (e) => e.id === "goblet",
    ),
  );
  assert.equal(findExercises(exercises, "unknown", null, "Vše").length, 0);
  assert.equal(findExercises(exercises, "", null, "Vše").length, 51);
});
test("anatomy covers every catalogue muscle and uses main role when a muscle is also secondary", () => {
  const covered = new Set([...frontParts, ...backParts].map((p) => p.muscle));
  for (const e of exercises) {
    for (const muscle of [...e.main, ...e.secondary]) {
      assert.ok(covered.has(muscle));
      assert.ok(muscleNotes[muscle]);
    }
    for (const m of e.main) assert.equal(roleFor(m, e), "main");
    for (const m of e.secondary.filter((m) => !e.main.includes(m)))
      assert.equal(roleFor(m, e), "secondary");
  }
  assert.equal(
    roleFor("core", { main: ["core"], secondary: ["core"] }),
    "main",
  );
  assert.ok(frontParts.find((p) => p.muscle === "core").paths.length >= 6);
});

test("initial view exposes the main muscles rather than starting glute, calf or triceps exercises from the front", () => {
  for (const m of ["glutes", "calves", "triceps", "hamstrings", "back"])
    assert.equal(preferBack({ main: [m] }), true);
  assert.equal(preferBack({ main: ["quads", "glutes"] }), false);
  assert.equal(preferBack({ main: ["chest", "triceps"] }), false);
});
