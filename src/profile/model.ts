import { milestones, ranks, type Data, type ProgramId } from "../model.ts";
import { parseGoals, type GoalTargets } from "./goals.ts";
import { dayKey, validDay } from "../mind/model.ts";
import { foodPoints } from "../food/model.ts";
import { usageSummary, timeThresholds } from "../scroll/scoring.ts";
import { buildPoints, buildMilestones } from "../build/ranking.ts";
import { mindXP, mindMilestones } from "../mind/ranking.ts";
import type { BuildData } from "../build/model.ts";
import type { MindData } from "../mind/model.ts";

export const maxRank = ranks.length - 1;
export function rankForScore(score: number) {
  return Math.min(maxRank, Math.max(0, Math.floor(score + 1e-10)));
}
// One unit is one rank interval. A fraction measures actual progress inside it.
export function scaleScore(value: number, thresholds: readonly number[]) {
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Neplatný postup disciplíny.");
  const index = thresholds.reduce(
    (rank, threshold, i) => (value >= threshold ? i : rank),
    0,
  );
  return index === thresholds.length - 1
    ? maxRank
    : index +
        (value - thresholds[index]) /
          (thresholds[index + 1] - thresholds[index]);
}
export type ProgramScore = {
  id: ProgramId;
  score: number | null;
  rank: number | null;
  prime: number | null;
  state: "inactive" | "unmeasured" | "ready" | "invalid";
  detail: string;
};
export function quitScores(data: Data, now: number): ProgramScore[] {
  return (["porn", "scroll", "food"] as ProgramId[]).map((id) => {
    const p = data[id];
    const base = { id, score: null, rank: null, prime: null };
    if (!p)
      return {
        ...base,
        state: "inactive",
        detail: "Program zatím není aktivní",
      };
    if (!Number.isFinite(p.startedAt) || !Number.isFinite(now))
      return {
        ...base,
        state: "invalid",
        detail: "Data programu nelze vyhodnotit",
      };
    let score: number, detail: string;
    if (id === "scroll") {
      const summary = usageSummary(p, now);
      if (summary.average === null)
        return {
          ...base,
          state: "unmeasured",
          detail: `${summary.days.length}/7 dokončených dnů měření`,
        };
      const minutes = summary.average;
      const rank = timeThresholds.reduce(
        (r, threshold, i) => (minutes <= threshold ? i : r),
        0,
      );
      const upper = rank === 0 ? 1440 : timeThresholds[rank];
      score =
        rank === maxRank
          ? maxRank
          : rank +
            Math.max(
              0,
              Math.min(
                1,
                (upper - minutes) / (upper - timeThresholds[rank + 1]),
              ),
            );
      detail = `Průměr ${minutes.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} min / den`;
    } else if (id === "porn") {
      const days = Math.max(0, now - p.startedAt) / 86400000;
      score = scaleScore(days, milestones);
      detail = `${Math.floor(days)} dní v aktuální sérii`;
    } else {
      const points = foodPoints(p, now);
      score = scaleScore(points / 100, milestones);
      detail = `${points.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} potvrzených bodů`;
    }
    const rank = rankForScore(score),
      prime =
        Number.isInteger(p.prime) && p.prime >= 0 && p.prime <= maxRank
          ? Math.max(rank, p.prime)
          : rank;
    return {
      id,
      score,
      rank,
      prime: id === "food" ? null : prime,
      state: "ready",
      detail,
    };
  });
}
export function profileSummary(
  quit: Data,
  build: BuildData | null,
  mind: MindData | null,
  now: number,
) {
  const programs = quitScores(quit, now),
    counted = programs.filter((p) => p.score !== null);
  const quitScore = programs.some((p) => p.state === "invalid")
    ? null
    : counted.length
      ? counted.reduce((sum, p) => sum + p.score!, 0) / counted.length
      : 0;
  const buildScore = build
    ? scaleScore(buildPoints(build), buildMilestones)
    : null;
  const mindScore = mind ? scaleScore(mindXP(mind), mindMilestones) : null;
  const ready = buildScore !== null && mindScore !== null && quitScore !== null;
  const score = ready
    ? Math.min(maxRank, (quitScore! + buildScore! + mindScore!) / 3)
    : null;
  return {
    programs,
    quitScore,
    buildScore,
    mindScore,
    ready,
    score,
    rank: score === null ? null : rankForScore(score),
  };
}
export type RankSnapshot = { day: string; at: number; score: number };
export type Profile = {
  version: 1;
  name: string;
  intention: string;
  prime: number;
  createdAt: number;
  goals?: GoalTargets;
  snapshots?: RankSnapshot[];
};
export const initialProfile = (now = Date.now()): Profile => ({
  version: 1,
  name: "",
  intention: "",
  prime: 0,
  createdAt: now,
});
export function parseProfile(raw: string): Profile {
  const p = JSON.parse(raw);
  if (
    !p ||
    p.version !== 1 ||
    typeof p.name !== "string" ||
    p.name.length > 40 ||
    typeof p.intention !== "string" ||
    p.intention.length > 160 ||
    !Number.isInteger(p.prime) ||
    p.prime < 0 ||
    p.prime > maxRank ||
    !Number.isFinite(p.createdAt) ||
    p.createdAt < 0
  )
    throw new Error("Profil se nepodařilo načíst.");
  if (p.goals !== undefined) parseGoals(p.goals);
  if (
    p.snapshots !== undefined &&
    (!Array.isArray(p.snapshots) ||
      p.snapshots.length > 366 ||
      !p.snapshots.every(
        (v: any, i: number) =>
          v &&
          validDay(v.day) &&
          Number.isFinite(v.at) &&
          v.at >= 0 &&
          Math.abs(v.at - Date.parse(`${v.day}T12:00:00Z`)) <= 36 * 3600000 &&
          Number.isFinite(v.score) &&
          v.score >= 0 &&
          v.score <= maxRank &&
          (i === 0 || p.snapshots[i - 1].day < v.day),
      ))
  )
    throw new Error("Historii ranku se nepodařilo načíst.");
  return p;
}
export function editProfile(
  profile: Profile,
  name: string,
  intention: string,
): Profile {
  return parseProfile(
    JSON.stringify({
      ...profile,
      name: name.trim(),
      intention: intention.trim(),
    }),
  );
}
export function observeRank(profile: Profile, score: number): Profile {
  if (!Number.isFinite(score) || score < 0 || score > maxRank)
    throw new Error("Neplatný celkový rank.");
  const rank = rankForScore(score);
  return rank > profile.prime ? { ...profile, prime: rank } : profile;
}

// Save observed daily values only; never reconstruct history from current totals.
export function observeProfile(
  profile: Profile,
  score: number,
  now = Date.now(),
): Profile {
  if (!Number.isFinite(now) || now < 0)
    throw new Error("Neplatný čas záznamu.");
  const ranked = observeRank(profile, score),
    day = dayKey(new Date(now));
  const old = profile.snapshots?.find((s) => s.day === day);
  if (old && Math.floor(old.score * 100) === Math.floor(score * 100))
    return ranked;
  return {
    ...ranked,
    snapshots: [
      ...(profile.snapshots ?? []).filter((s) => s.day !== day),
      { day, at: now, score },
    ]
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-366),
  };
}
export function setProfileGoals(profile: Profile, goals: GoalTargets): Profile {
  return { ...profile, goals: parseGoals(goals) };
}
