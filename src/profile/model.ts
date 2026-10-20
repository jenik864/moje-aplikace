import { milestones, ranks, type Data, type ProgramId } from "../model.ts";
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
export type Profile = {
  version: 1;
  name: string;
  intention: string;
  prime: number;
  createdAt: number;
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
