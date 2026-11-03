import { foodPoints, type FoodPillar } from "./food/model.ts";
import { usageSummary, type UsageDay } from "./scroll/scoring.ts";
import type { AttentionData } from "./scroll/attention.ts";
export const ranks = [
  "Copper",
  "Bronze",
  "Iron",
  "Silver",
  "Gold",
  "Platinum",
  "Sapphire",
  "Amethyst",
  "Ruby",
  "Emerald",
  "Diamond",
  "Obsidian",
] as const;
export const milestones = [0, 3, 4, 5, 9, 14, 21, 25, 30, 60, 90, 180];
export type ProgramId = "porn" | "scroll" | "food";
export type TriggerEvent = {
  at: number;
  trigger: string;
  durationSeconds?: number;
  pauseStarted?: boolean;
  outcome?: string;
  pillarId?: string;
};
export type Program = {
  foodPillars?: FoodPillar[];
  foodSlots?: Record<string, Record<string, boolean>>;
  foodScores?: Record<string, number>;
  foodEntries?: Record<string, Record<string, boolean>>;
  rankVersion?: 2;
  screenTimeVersion?: 1;
  legacyScrollPrime?: number;
  usageDays?: Record<string, UsageDay>;
  attention?: AttentionData;
  signedAt?: number;
  dailyLogs?: Record<
    string,
    { success: boolean; minutes?: number; confirmed: boolean }
  >;
  triggers?: TriggerEvent[];
  startedAt: number;
  reasons: string;
  signature: string;
  prime: number;
  limit: number;
  target: string;
  days: Record<string, boolean>;
  history: { at: number; duration: number }[];
};
export type Data = Partial<Record<ProgramId, Program>>;
export type ProgramChange = Program | ((current: Program) => Program);
export function applyProgramChange(
  data: Data,
  id: ProgramId,
  value: ProgramChange,
): Data {
  const current = data[id];
  const next =
    typeof value === "function"
      ? current
        ? value(current)
        : undefined
      : value;
  return !next || next === current ? data : { ...data, [id]: next };
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function streak(p: Program, now = Date.now()) {
  let days = 0;
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  while (p.days[dayKey(date)] === true) {
    days++;
    date.setDate(date.getDate() - 1);
  }
  return days;
}
export function rankForDays(days: number) {
  return milestones.reduce(
    (rank, threshold, index) => (days >= threshold ? index : rank),
    0,
  );
}
export function rankOf(id: ProgramId, p: Program, now = Date.now()) {
  if (id === "scroll") return usageSummary(p, now).rank;
  if (id === "food") return rankForDays(foodPoints(p, now) / 100);
  return rankForDays(
    id === "porn"
      ? Math.max(0, (now - p.startedAt) / 86400000)
      : streak(p, now),
  );
}
export const definitions = {
  porn: {
    title: "Porn Reboot",
    label: "PŘEVEZMI KONTROLU",
    color: "#b994ff",
    symbol: "◎",
    description:
      "Vědomé sledování porna přerušuje sérii. Masturbace bez porna ani náhodné zobrazení obsahu ji neruší.",
    target: "Bez vědomého sledování porna",
    prompt: "Co chceš získat zpět?",
    action:
      "Odlož telefon a přesuň se na jiné místo. Dej si dvě minuty chůze nebo klidného dýchání.",
  },
  scroll: {
    title: "Doomscrolling",
    label: "TVŮJ ČAS. TVOJE VOLBA.",
    color: "#c5fa67",
    symbol: "↯",
    description:
      "Denní cíl je tvoje pomůcka. Rank určuje průměr skutečného času v sociálních aplikacích za sedm dokončených dní. Měření vyžaduje podporovanou nativní aplikaci.",
    target:
      "Instagram, TikTok, YouTube, Facebook, X, Reddit, Snapchat, Threads, Pinterest, Twitch, Discord",
    prompt: "Čemu chceš věnovat svůj čas?",
    action:
      "Polož telefon displejem dolů. Vyber jednu věc mimo obrazovku a věnuj jí příštích pět minut.",
  },
  food: {
    title: "Junk Food",
    label: "VĚDOMÁ VOLBA",
    color: "#ffbd7a",
    symbol: "◈",
    description:
      "Sleduj jeden nebo více konkrétních pilířů kolem jídla. Rank vychází z tvých potvrzených dní, ne z automatického měření.",
    target: "Bez sladkých nápojů",
    prompt: "Proč chceš změnit tento návyk?",
    action:
      "Zastav se: máš hlad, nebo reaguješ na stres? Pokud máš hlad, dej si běžné syté jídlo. Jinak si dopřej krátkou pauzu.",
  },
};

export function resetProgram(p: Program, now = Date.now()): Program {
  return {
    ...p,
    startedAt: now,
    prime: Math.max(p.prime, rankOf("porn", p, now)),
    history: [
      ...p.history,
      { at: now, duration: Math.max(0, now - p.startedAt) },
    ],
  };
}
export function consistencyStatus(
  p: Program,
  date: Date,
  now = Date.now(),
): "success" | "reset" | "pending" | "empty" {
  const key = dayKey(date);
  if (p.history.some((h) => dayKey(new Date(h.at)) === key)) return "reset";
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (key === dayKey(new Date(now)))
    return p.startedAt <= now ? "pending" : "empty";
  if (end.getTime() > now) return "empty";
  const ranges = [
    ...p.history.map((h) => ({ from: h.at - h.duration, to: h.at })),
    { from: p.startedAt, to: now },
  ];
  return ranges.some((r) => r.from < end.getTime() && r.to >= end.getTime())
    ? "success"
    : "empty";
}

export function protocolRemaining(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function saveDailyRecord(
  id: Exclude<ProgramId, "porn">,
  p: Program,
  key: string,
  record: { success: boolean; minutes?: number },
  confirmed: boolean,
  now = Date.now(),
): Program {
  if (id === "food" && p.foodPillars)
    throw new Error("Use individual food pillar records");
  const today = dayKey(new Date(now));
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  const yesterday = dayKey(date);
  if (
    key < dayKey(new Date(p.signedAt ?? p.startedAt)) ||
    (confirmed ? key !== yesterday : key !== today)
  )
    throw new Error("Invalid day for check-in");
  if (
    id === "scroll" &&
    (record.minutes === undefined ||
      !Number.isFinite(record.minutes) ||
      record.minutes < 0 ||
      record.minutes > 1440)
  )
    throw new Error("Invalid minutes");
  const success = id === "scroll" ? record.minutes! <= p.limit : record.success;
  const next = {
    ...p,
    dailyLogs: {
      ...(p.dailyLogs ?? {}),
      [key]: { ...record, success, confirmed },
    },
    days: confirmed ? { ...p.days, [key]: success } : p.days,
  };
  return {
    ...next,
    prime: id === "scroll" ? p.prime : Math.max(p.prime, rankOf(id, next, now)),
  };
}
export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 86400)} dní · ${Math.floor(seconds / 3600) % 24} h · ${Math.floor(seconds / 60) % 60} min`;
}

// PRIME was an index into the original ten-rank ladder. Translate once on load.
export function migrateRanks(data: Data): Data {
  const original = [0, 1, 3, 4, 5, 6, 8, 9, 10, 11];
  const migrated = Object.fromEntries(
    Object.entries(data)
      .filter(([, p]) => p != null)
      .map(([id, p]) => [
        id,
        p.rankVersion === 2
          ? p
          : {
              ...p,
              rankVersion: 2,
              prime:
                original[Math.max(0, Math.min(9, Math.floor(p.prime || 0)))],
            },
      ]),
  ) as Data;
  if (migrated.scroll && migrated.scroll.screenTimeVersion !== 1) {
    migrated.scroll = {
      ...migrated.scroll,
      legacyScrollPrime: migrated.scroll.prime,
      prime: 0,
      screenTimeVersion: 1,
    };
  }
  return migrated;
}
