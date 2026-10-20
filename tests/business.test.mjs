import test from "node:test";
import assert from "node:assert/strict";
import {
  initialBusiness,
  saveProject,
  saveTask,
  toggleTask,
  removeTask,
  setProjectStatus,
  archiveProject,
  projectProgress,
  tasksForToday,
  parseBusiness,
  parseDate,
  displayDate,
  shiftDay,
} from "../src/business/model.ts";

const day = "2026-10-20",
  at = new Date(`${day}T12:00:00`).getTime();
const input = {
  id: "web",
  title: "Můj web",
  outcome: "Tři lidé vyzkouší veřejný web.",
  notes: "Poznámky",
  color: 1,
};
const project = (template = "empty") =>
  saveProject(initialBusiness(), input, template, at);
const task = (id, plannedFor = day, priority = "normal") => ({
  id,
  projectId: "web",
  title: `Krok ${id}`,
  plannedFor,
  priority,
  minutes: 25,
});
const add = (d, id, plannedFor = day, priority = "normal") =>
  saveTask(d, task(id, plannedFor, priority), at);

test("Business templates add real editable steps once and never invent dates or completion", () => {
  const d = project("idea");
  assert.equal(d.tasks.length, 4);
  assert(
    d.tasks.every((t) => t.plannedFor === undefined && t.doneAt === undefined),
  );
  assert.deepEqual(tasksForToday(d, day), []);
  assert.equal(projectProgress(d, "web").fraction, 0);
  const edited = saveProject(
    d,
    { ...input, title: "Upravený web" },
    "launch",
    at + 1000,
  );
  assert.equal(edited.tasks.length, 4);
  assert.equal(d.projects[0].title, "Můj web");
  assert.equal(edited.projects[0].createdAt, at);
});
test("Today includes unfinished carryover ordered by priority, excludes future and unplanned tasks", () => {
  let d = add(project(), "today");
  d = add(d, "late", "2026-10-19", "high");
  d = add(d, "tomorrow", "2026-10-21");
  d = saveTask(d, { ...task("unplanned"), plannedFor: undefined }, at);
  assert.deepEqual(
    tasksForToday(d, day).map((t) => t.id),
    ["late", "today"],
  );
  assert.equal(d.tasks.length, 4);
});
test("Completion and corrections use actual timestamps without double counting or destroying task details", () => {
  const original = add(project(), "one");
  let d = toggleTask(original, "one", at + 1000);
  assert.equal(projectProgress(d, "web").done, 1);
  assert.equal(original.tasks[0].doneAt, undefined);
  d = toggleTask(d, "one", at + 2000);
  assert.equal(projectProgress(d, "web").done, 0);
  d = toggleTask(d, "one", at + 3000);
  d = saveTask(d, { ...task("one"), title: "Přesnější název" }, at + 4000);
  assert.equal(d.tasks[0].doneAt, at + 3000);
  assert.equal(d.tasks[0].createdAt, at);
});
test("Completed tasks count only on their actual completion day, including early completion", () => {
  let d = add(project(), "early", "2026-10-22");
  d = toggleTask(d, "early", at);
  assert.deepEqual(
    tasksForToday(d, day).map((t) => t.id),
    ["early"],
  );
  assert.deepEqual(tasksForToday(d, "2026-10-21"), []);
  d = add(d, "yesterday", "2026-10-19");
  d = toggleTask(d, "yesterday", at - 86400000);
  assert.deepEqual(
    tasksForToday(d, day).map((t) => t.id),
    ["early"],
  );
});
test("Pausing and archiving preserve work and exclude pending steps until the project is resumed", () => {
  let d = add(project(), "one");
  d = setProjectStatus(d, "web", "paused", at);
  assert.deepEqual(tasksForToday(d, day), []);
  assert.throws(() => toggleTask(d, "one", at));
  assert.throws(() => saveTask(d, task("two"), at));
  d = setProjectStatus(d, "web", "active", at);
  d = archiveProject(d, "web", true, at);
  assert.equal(d.tasks.length, 1);
  assert.deepEqual(tasksForToday(d, day), []);
  assert.throws(() => setProjectStatus(d, "web", "done", at));
  d = archiveProject(d, "web", false, at);
  assert.equal(d.projects[0].status, "active");
  assert.deepEqual(
    tasksForToday(d, day).map((t) => t.id),
    ["one"],
  );
});
test("Project completion requires all real steps, preserves today's accomplishments and allows explicit reopening", () => {
  assert.throws(() => setProjectStatus(project(), "web", "done", at));
  let d = add(project(), "one");
  assert.throws(() => setProjectStatus(d, "web", "done", at));
  d = toggleTask(d, "one", at);
  d = setProjectStatus(d, "web", "done", at + 1);
  assert.equal(tasksForToday(d, day).length, 1);
  assert.equal(d.projects[0].completedAt, at + 1);
  assert.throws(() => toggleTask(d, "one", at));
  d = setProjectStatus(d, "web", "active", at + 2);
  d = toggleTask(d, "one", at + 3);
  assert.equal(d.projects[0].completedAt, undefined);
  assert.equal(projectProgress(d, "web").done, 0);
});
test("Removing a step affects only the selected project and cannot mutate archived or completed work", () => {
  let d = add(project(), "one");
  d = saveProject(
    d,
    { ...input, id: "other", title: "Jiný projekt" },
    "idea",
    at,
  );
  const next = removeTask(d, "one");
  assert.equal(next.tasks.length, 4);
  assert.equal(d.tasks.length, 5);
  assert.equal(projectProgress(next, "web").total, 0);
  assert.throws(() => removeTask(archiveProject(d, "web", true, at), "one"));
});
test("Business validation rejects invalid dates, time estimates, title and cross-project reassignment", () => {
  const d = add(project(), "one");
  assert.throws(() =>
    saveTask(d, { ...task("two"), plannedFor: "2026-02-30" }, at),
  );
  assert.throws(() => saveTask(d, { ...task("two"), minutes: 0 }, at));
  assert.throws(() => saveTask(d, { ...task("two"), minutes: 25.5 }, at));
  assert.throws(() => saveProject(d, { ...input, title: " " }, "empty", at));
  const two = saveProject(d, { ...input, id: "other" }, "empty", at);
  assert.throws(() =>
    saveTask(two, { ...task("one"), projectId: "other" }, at),
  );
});
test("Persistence round trips notes, archive, completion, priorities and scheduling and rejects corrupt history", () => {
  let d = add(project(), "one");
  d = toggleTask(d, "one", at);
  d = setProjectStatus(d, "web", "done", at);
  d = archiveProject(d, "web", true, at);
  const raw = JSON.stringify(d);
  assert.equal(JSON.stringify(parseBusiness(raw)), raw);
  assert.equal(parseBusiness(raw).projects[0].notes, "Poznámky");
  assert.throws(() => parseBusiness("not json"));
  assert.throws(() => parseBusiness(JSON.stringify({ ...d, version: 2 })));
  assert.throws(() =>
    parseBusiness(
      JSON.stringify({ ...d, projects: [d.projects[0], d.projects[0]] }),
    ),
  );
  assert.throws(() =>
    parseBusiness(JSON.stringify({ ...d, tasks: [d.tasks[0], d.tasks[0]] })),
  );
  assert.throws(() => parseBusiness(JSON.stringify({ ...d, projects: [] })));
  assert.throws(() => parseBusiness(JSON.stringify({ ...d, tasks: [] })));
});
test("Czech dates validate real calendar days and keep scheduling stable across month and DST boundaries", () => {
  assert.equal(parseDate("29. 2. 2024"), "2024-02-29");
  assert.equal(displayDate("2026-10-20"), "20. 10. 2026");
  assert.equal(parseDate(" "), undefined);
  assert.throws(() => parseDate("29. 2. 2026"));
  assert.throws(() => parseDate("2026-10-20"));
  assert.equal(shiftDay("2026-10-25", 1), "2026-10-26");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
});
