import { type Data } from "../model.ts";
import { parseBuild } from "../build/model.ts";
import { parseMind, validDay } from "../mind/model.ts";
import { parseBusiness } from "../business/model.ts";
import { parseProfile } from "./model.ts";

export const BACKUP_KEYS = [
  "quitter.v1",
  "quitter.build.v1",
  "quitter.mind.v1",
  "quitter.business.v1",
  "quitter.profile.v1",
] as const;
export type BackupKey = (typeof BACKUP_KEYS)[number];
export type BackupPayload = Record<BackupKey, string | null>;
export type BackupEnvelope = {
  format: "quitter-backup";
  version: 1;
  exportedAt: number;
  payload: BackupPayload;
};
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export const time = (v: unknown): v is number =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= 8640000000000000;
const numeric = (v: unknown, max = Number.MAX_VALUE) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const text = (v: unknown): v is string => typeof v === "string";
const optional = (v: unknown, check: (v: any) => boolean) =>
  v === undefined || check(v);
const record = (
  v: unknown,
  check: (value: any, key: string) => boolean,
): boolean =>
  object(v) && Object.entries(v).every(([key, value]) => check(value, key));
const rank = (v: unknown) => Number.isInteger(v) && numeric(v, 11);
export function utf8Bytes(value: string) {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 0x80) bytes++;
    else if (c < 0x800) bytes += 2;
    else if (
      c >= 0xd800 &&
      c <= 0xdbff &&
      value.charCodeAt(i + 1) >= 0xdc00 &&
      value.charCodeAt(i + 1) <= 0xdfff
    ) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}
export function assertExactKeys(value: unknown, keys: readonly string[]) {
  if (
    !object(value) ||
    Object.keys(value).length !== keys.length ||
    !Object.keys(value).every((key) => keys.includes(key))
  )
    throw new Error("Soubor obsahuje neznámé nebo chybějící položky.");
}
function safeTree(value: unknown, depth = 0): void {
  if (depth > 80) throw new Error("Záloha má neplatně vnořená data.");
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw new Error("Záloha obsahuje nepovolené položky.");
    safeTree(child, depth + 1);
  }
}
// Quit predates the versioned feature parsers. Validate all fields used by its
// dashboards before allowing a portable file to become application storage.
export function parseQuitBackup(raw: string): Data {
  const data: unknown = JSON.parse(raw);
  if (
    !object(data) ||
    Object.keys(data).some((id) => !["porn", "scroll", "food"].includes(id))
  )
    throw new Error("Neplatná data Quit.");
  safeTree(data);
  const bools = (v: unknown) =>
    record(v, (value) => typeof value === "boolean");
  const dayRecords = (v: unknown, check: (v: any) => boolean) =>
    record(v, (value, key) => validDay(key) && check(value));
  for (const p of Object.values(data)) {
    if (
      !object(p) ||
      !time(p.startedAt) ||
      !text(p.reasons) ||
      !text(p.signature) ||
      !rank(p.prime) ||
      !numeric(p.limit, 1440) ||
      !text(p.target) ||
      !dayRecords(p.days, (v) => typeof v === "boolean") ||
      !Array.isArray(p.history) ||
      !p.history.every(
        (h) => object(h) && time(h.at) && numeric(h.duration, 8640000000000000),
      ) ||
      !optional(p.signedAt, time) ||
      !optional(p.rankVersion, (v) => v === 2) ||
      !optional(p.screenTimeVersion, (v) => v === 1) ||
      !optional(p.legacyScrollPrime, rank) ||
      !optional(p.dailyLogs, (v) =>
        dayRecords(
          v,
          (d) =>
            object(d) &&
            typeof d.success === "boolean" &&
            typeof d.confirmed === "boolean" &&
            optional(d.minutes, (n) => numeric(n, 1440)),
        ),
      ) ||
      !optional(
        p.triggers,
        (v) =>
          Array.isArray(v) &&
          v.every(
            (t) =>
              object(t) &&
              time(t.at) &&
              text(t.trigger) &&
              optional(t.durationSeconds, (n) => numeric(n)) &&
              optional(t.pauseStarted, (b) => typeof b === "boolean") &&
              optional(t.outcome, text) &&
              optional(t.pillarId, text),
          ),
      ) ||
      !optional(p.foodScores, (v) => dayRecords(v, (n) => numeric(n, 100))) ||
      !optional(p.foodEntries, (v) => dayRecords(v, bools)) ||
      !optional(p.foodSlots, (v) => dayRecords(v, bools)) ||
      !optional(
        p.foodPillars,
        (v) =>
          Array.isArray(v) &&
          new Set(v.map((p) => p?.id)).size === v.length &&
          v.every(
            (p) =>
              object(p) &&
              text(p.id) &&
              p.id.length > 0 &&
              text(p.label) &&
              validDay(p.startDay) &&
              optional(p.endDay, (d) => validDay(d) && d >= p.startDay) &&
              optional(p.mode, (m) => ["day", "periods", "meals"].includes(m)),
          ),
      ) ||
      !optional(p.usageDays, (v) =>
        dayRecords(
          v,
          (d) =>
            object(d) &&
            validDay(d.key) &&
            v[d.key] === d &&
            d.source === "android-usage" &&
            numeric(d.minutes, 1440) &&
            time(d.measuredAt) &&
            Array.isArray(d.apps) &&
            d.apps.every(
              (a) => object(a) && text(a.name) && numeric(a.minutes, 1440),
            ),
        ),
      )
    )
      throw new Error("Data některého programu Quit jsou neplatná.");
  }
  return data as Data;
}
export function validatePayload(
  payload: unknown,
  validateContents = true,
): BackupPayload {
  assertExactKeys(payload, BACKUP_KEYS);
  const values = payload as BackupPayload;
  for (const key of BACKUP_KEYS) {
    const raw = values[key];
    if (raw !== null && typeof raw !== "string")
      throw new Error("Neplatný obsah zálohy.");
    if (raw === null || !validateContents) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      safeTree(parsed);
      if (key === "quitter.v1") parseQuitBackup(raw);
      else if (key === "quitter.build.v1") parseBuild(raw);
      else if (key === "quitter.mind.v1") parseMind(raw);
      else if (key === "quitter.business.v1") parseBusiness(raw);
      else parseProfile(raw);
    } catch {
      throw new Error(
        `Záloha obsahuje neplatná data ${key === "quitter.v1" ? "Quit" : key.split(".")[1]}. Nic se nezměnilo.`,
      );
    }
  }
  return Object.fromEntries(
    BACKUP_KEYS.map((key) => [key, values[key]]),
  ) as BackupPayload;
}
export function createBackup(
  payload: BackupPayload,
  exportedAt = Date.now(),
): string {
  const snapshot: BackupEnvelope = {
    format: "quitter-backup",
    version: 1,
    exportedAt,
    payload: validatePayload(payload),
  };
  if (!time(exportedAt)) throw new Error("Neplatné datum zálohy.");
  const raw = JSON.stringify(snapshot, null, 2);
  if (utf8Bytes(raw) > MAX_BACKUP_BYTES)
    throw new Error("Záloha je větší než povolených 8 MB.");
  return raw;
}
export function parseBackup(raw: string): BackupEnvelope {
  if (typeof raw !== "string" || utf8Bytes(raw) > MAX_BACKUP_BYTES)
    throw new Error("Záloha je větší než povolených 8 MB.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Soubor není platná JSON záloha Quitteru.");
  }
  assertExactKeys(parsed, ["format", "version", "exportedAt", "payload"]);
  const d = parsed as BackupEnvelope;
  if (d.format !== "quitter-backup" || d.version !== 1 || !time(d.exportedAt))
    throw new Error("Tento formát nebo verzi zálohy nelze otevřít.");
  return { ...d, payload: validatePayload(d.payload) };
}
export function backupSummary(backup: BackupEnvelope) {
  const p = backup.payload;
  const quit =
    p["quitter.v1"] === null ? {} : parseQuitBackup(p["quitter.v1"]!);
  const build =
    p["quitter.build.v1"] === null ? null : parseBuild(p["quitter.build.v1"]!);
  const mind =
    p["quitter.mind.v1"] === null ? null : parseMind(p["quitter.mind.v1"]!);
  const business =
    p["quitter.business.v1"] === null
      ? null
      : parseBusiness(p["quitter.business.v1"]!);
  const profile =
    p["quitter.profile.v1"] === null
      ? null
      : parseProfile(p["quitter.profile.v1"]!);
  return {
    exportedAt: backup.exportedAt,
    storedSections: BACKUP_KEYS.filter((key) => p[key] !== null).length,
    programs: Object.keys(quit).length,
    workouts: build ? Object.keys(build.logs).length : 0,
    activities: build?.activities.length ?? 0,
    mindActivities: mind
      ? Object.values(mind.checks).reduce(
          (n, checks) => n + Object.keys(checks).length,
          0,
        )
      : 0,
    games: mind?.games.length ?? 0,
    lessons: mind ? Object.keys(mind.lessons).length : 0,
    projects: business?.projects.length ?? 0,
    tasks: business?.tasks.length ?? 0,
    name: profile?.name ?? "",
    hasProfile: profile !== null,
  };
}
