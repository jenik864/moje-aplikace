export type ProjectStatus = "active" | "paused" | "done";
export type Project = {
  id: string;
  title: string;
  outcome: string;
  notes: string;
  color: number;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  archivedAt?: number;
};
export type Task = {
  id: string;
  projectId: string;
  title: string;
  plannedFor?: string;
  minutes?: number;
  priority: "normal" | "high";
  createdAt: number;
  updatedAt: number;
  doneAt?: number;
};
export type BusinessData = { version: 1; projects: Project[]; tasks: Task[] };
export const initialBusiness = (): BusinessData => ({
  version: 1,
  projects: [],
  tasks: [],
});
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shiftDay(day: string, count: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + count);
  return dayKey(d);
}
export function validDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dayKey(new Date(`${value}T12:00:00`)) === value
  );
}
export function displayDate(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${Number(day)}. ${Number(month)}. ${year}`;
}
export function parseDate(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const match = value
    .trim()
    .match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})\s*\.?$/);
  if (!match)
    throw new Error(
      "Datum zadej jako den. měsíc. rok, například 20. 10. 2026.",
    );
  const iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  if (!validDay(iso))
    throw new Error("Tohle datum neexistuje. Zkontroluj den, měsíc a rok.");
  return iso;
}
const stamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const text = (value: unknown, max: number, required = false): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (!required || value.trim().length > 0);
const status = (value: unknown): value is ProjectStatus =>
  ["active", "paused", "done"].includes(value as string);
export function parseBusiness(raw: string): BusinessData {
  const d = JSON.parse(raw);
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.projects) ||
    !Array.isArray(d.tasks)
  )
    throw new Error("Neplatná data Business.");
  const ids = new Set<string>(),
    taskIds = new Set<string>();
  for (const p of d.projects) {
    if (
      !p ||
      !text(p.id, 120, true) ||
      ids.has(p.id) ||
      !text(p.title, 80, true) ||
      !text(p.outcome, 300, true) ||
      !text(p.notes, 4000) ||
      !Number.isInteger(p.color) ||
      p.color < 0 ||
      p.color > 4 ||
      !status(p.status) ||
      !stamp(p.createdAt) ||
      !stamp(p.updatedAt) ||
      (p.completedAt !== undefined && !stamp(p.completedAt)) ||
      (p.archivedAt !== undefined && !stamp(p.archivedAt)) ||
      (p.status === "done" && p.completedAt === undefined)
    )
      throw new Error("Neplatný projekt Business.");
    ids.add(p.id);
  }
  for (const t of d.tasks) {
    if (
      !t ||
      !text(t.id, 120, true) ||
      taskIds.has(t.id) ||
      !ids.has(t.projectId) ||
      !text(t.title, 120, true) ||
      !["normal", "high"].includes(t.priority) ||
      !stamp(t.createdAt) ||
      !stamp(t.updatedAt) ||
      (t.doneAt !== undefined && !stamp(t.doneAt)) ||
      (t.plannedFor !== undefined && !validDay(t.plannedFor)) ||
      (t.minutes !== undefined &&
        (!Number.isInteger(t.minutes) || t.minutes < 5 || t.minutes > 240))
    )
      throw new Error("Neplatný úkol Business.");
    taskIds.add(t.id);
  }
  for (const p of d.projects)
    if (p.status === "done") {
      const tasks = d.tasks.filter((t: Task) => t.projectId === p.id);
      if (!tasks.length || tasks.some((t: Task) => t.doneAt === undefined))
        throw new Error("Dokončený projekt obsahuje nedokončené kroky.");
    }
  return d;
}
export const templates = [
  {
    id: "empty",
    name: "Vlastní postup",
    description: "Začni jedním vlastním krokem.",
    tasks: [],
  },
  {
    id: "idea",
    name: "Ověřit nápad",
    description: "Od problému k první zpětné vazbě.",
    tasks: [
      "Popsat, komu a s čím chci pomoct",
      "Ověřit problém rozhovorem s jedním člověkem",
      "Připravit jednoduchý návrh řešení",
      "Získat zpětnou vazbu a rozhodnout další krok",
    ],
  },
  {
    id: "launch",
    name: "Dotáhnout a zveřejnit",
    description: "Malý výstup, který dostaneš ven.",
    tasks: [
      "Určit nejmenší smysluplný výstup",
      "Vytvořit první pracovní verzi",
      "Zkontrolovat ji s jedním člověkem",
      "Upravit a zveřejnit výsledek",
    ],
  },
] as const;
export type ProjectInput = Pick<
  Project,
  "title" | "outcome" | "notes" | "color"
> & { id: string };
export function saveProject(
  data: BusinessData,
  input: ProjectInput,
  templateId = "empty",
  now = Date.now(),
): BusinessData {
  const old = data.projects.find((p) => p.id === input.id);
  if (old?.archivedAt !== undefined)
    throw new Error("Nejdřív obnov projekt z archivu.");
  const p: Project = {
    ...input,
    title: input.title.trim(),
    outcome: input.outcome.trim(),
    notes: input.notes.trim(),
    status: old?.status ?? "active",
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    ...(old?.completedAt !== undefined && { completedAt: old.completedAt }),
    ...(old?.archivedAt !== undefined && { archivedAt: old.archivedAt }),
  };
  const template = templates.find((t) => t.id === templateId);
  if (!template) throw new Error("Vyber platný postup projektu.");
  const next: BusinessData = {
    ...data,
    projects: old
      ? data.projects.map((v) => (v.id === p.id ? p : v))
      : [...data.projects, p],
    tasks: old
      ? data.tasks
      : [
          ...data.tasks,
          ...template.tasks.map(
            (title, i): Task => ({
              id: `${p.id}-step-${i}`,
              projectId: p.id,
              title,
              priority: "normal",
              createdAt: now,
              updatedAt: now,
            }),
          ),
        ],
  };
  return parseBusiness(JSON.stringify(next));
}
export function projectProgress(data: BusinessData, projectId: string) {
  const tasks = data.tasks.filter((t) => t.projectId === projectId);
  const done = tasks.filter((t) => t.doneAt !== undefined).length;
  return {
    total: tasks.length,
    done,
    fraction: tasks.length ? done / tasks.length : 0,
  };
}
function editable(data: BusinessData, projectId: string) {
  const p = data.projects.find((p) => p.id === projectId);
  if (!p) throw new Error("Projekt už není dostupný.");
  if (p.archivedAt !== undefined)
    throw new Error("Nejdřív obnov projekt z archivu.");
  if (p.status !== "active")
    throw new Error("Nejdřív projekt znovu otevři nebo obnov práci.");
  return p;
}
export function saveTask(
  data: BusinessData,
  input: Omit<Task, "createdAt" | "updatedAt" | "doneAt">,
  now = Date.now(),
): BusinessData {
  editable(data, input.projectId);
  const old = data.tasks.find((t) => t.id === input.id);
  if (old && old.projectId !== input.projectId)
    throw new Error("Úkol patří do jiného projektu.");
  const task: Task = {
    ...input,
    title: input.title.trim(),
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    ...(old?.doneAt !== undefined && { doneAt: old.doneAt }),
  };
  return parseBusiness(
    JSON.stringify({
      ...data,
      tasks: old
        ? data.tasks.map((t) => (t.id === task.id ? task : t))
        : [...data.tasks, task],
    }),
  );
}
export function toggleTask(
  data: BusinessData,
  id: string,
  now = Date.now(),
): BusinessData {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) throw new Error("Úkol už není dostupný.");
  editable(data, task.projectId);
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id !== id
        ? t
        : {
            ...t,
            doneAt: t.doneAt === undefined ? now : undefined,
            updatedAt: now,
          },
    ),
  };
}
export function removeTask(data: BusinessData, id: string): BusinessData {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) throw new Error("Úkol už není dostupný.");
  editable(data, task.projectId);
  return { ...data, tasks: data.tasks.filter((t) => t.id !== id) };
}
export function setProjectStatus(
  data: BusinessData,
  id: string,
  next: ProjectStatus,
  now = Date.now(),
): BusinessData {
  const p = data.projects.find((p) => p.id === id);
  if (!p || p.archivedAt !== undefined || !status(next))
    throw new Error("Nejdřív obnov projekt z archivu.");
  const progress = projectProgress(data, id);
  if (next === "done" && (!progress.total || progress.done !== progress.total))
    throw new Error("Nejdřív dokonči všechny kroky projektu.");
  return {
    ...data,
    projects: data.projects.map((p) =>
      p.id !== id
        ? p
        : {
            ...p,
            status: next,
            completedAt: next === "done" ? (p.completedAt ?? now) : undefined,
            updatedAt: now,
          },
    ),
  };
}
export function archiveProject(
  data: BusinessData,
  id: string,
  archived: boolean,
  now = Date.now(),
): BusinessData {
  if (!data.projects.some((p) => p.id === id))
    throw new Error("Projekt už není dostupný.");
  return {
    ...data,
    projects: data.projects.map((p) =>
      p.id !== id
        ? p
        : { ...p, archivedAt: archived ? now : undefined, updatedAt: now },
    ),
  };
}
export function tasksForToday(data: BusinessData, today = dayKey()) {
  const visible = new Set(
    data.projects.filter((p) => p.archivedAt === undefined).map((p) => p.id),
  );
  const active = new Set(
    data.projects
      .filter((p) => p.status === "active" && p.archivedAt === undefined)
      .map((p) => p.id),
  );
  return data.tasks
    .filter((t) =>
      t.doneAt !== undefined
        ? visible.has(t.projectId) && dayKey(new Date(t.doneAt)) === today
        : active.has(t.projectId) &&
          t.plannedFor !== undefined &&
          t.plannedFor <= today,
    )
    .sort(
      (a, b) =>
        Number(a.doneAt !== undefined) - Number(b.doneAt !== undefined) ||
        Number(b.priority === "high") - Number(a.priority === "high") ||
        (a.plannedFor ?? today).localeCompare(b.plannedFor ?? today) ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
}
