import { dayKey, type Program } from "../model.ts";
import { validDay } from "../mind/model.ts";

export const breakLengths = [5, 10, 20] as const;
export type AttentionBreak = {
  id: string;
  startedAt: number;
  durationMinutes: number;
  activity: string;
};
export type AttentionSession = AttentionBreak & {
  endedAt: number;
  outcome: "completed" | "cancelled";
};
export type Reflection = { rating: number; note: string; at: number };
export type AttentionData = {
  version: 1;
  preferredMinutes: number;
  plan: { trigger: string; replacement: string };
  active?: AttentionBreak;
  sessions: AttentionSession[];
  reflections: Record<string, Reflection>;
};
export const initialAttention = (): AttentionData => ({
  version: 1,
  preferredMinutes: 10,
  plan: { trigger: "", replacement: "" },
  sessions: [],
  reflections: {},
});
const object = (v: any) => !!v && typeof v === "object" && !Array.isArray(v);
const stamp = (v: any) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= 8640000000000000;
const text = (v: any, max: number) => typeof v === "string" && v.length <= max;
const duration = (v: any) => breakLengths.some((n) => n === v);
const validBreak = (v: any) =>
  object(v) &&
  text(v.id, 100) &&
  v.id.length > 0 &&
  stamp(v.startedAt) &&
  duration(v.durationMinutes) &&
  text(v.activity, 80) &&
  v.activity.trim().length > 0;
export function isAttention(v: any): v is AttentionData {
  return (
    object(v) &&
    v.version === 1 &&
    duration(v.preferredMinutes) &&
    object(v.plan) &&
    text(v.plan.trigger, 200) &&
    text(v.plan.replacement, 200) &&
    (v.active === undefined || validBreak(v.active)) &&
    Array.isArray(v.sessions) &&
    v.sessions.length <= 1000 &&
    v.sessions.every(
      (s: any) =>
        validBreak(s) &&
        stamp(s.endedAt) &&
        s.endedAt >= s.startedAt &&
        ["completed", "cancelled"].includes(s.outcome) &&
        (s.outcome !== "completed" ||
          s.endedAt - s.startedAt >= s.durationMinutes * 60000),
    ) &&
    new Set(v.sessions.map((s: any) => s.id)).size === v.sessions.length &&
    (!v.active || !v.sessions.some((s: any) => s.id === v.active.id)) &&
    object(v.reflections) &&
    Object.keys(v.reflections).length <= 732 &&
    Object.entries(v.reflections).every(
      ([day, r]: [string, any]) =>
        validDay(day) &&
        object(r) &&
        Number.isInteger(r.rating) &&
        r.rating >= 1 &&
        r.rating <= 5 &&
        text(r.note, 1000) &&
        stamp(r.at),
    )
  );
}
export function attention(p: Program): AttentionData {
  if (p.attention === undefined) return initialAttention();
  if (!isAttention(p.attention))
    throw new Error("Záznamy pozornosti se nepodařilo načíst.");
  return p.attention;
}
export function breakRemaining(active: AttentionBreak, now: number) {
  return Math.max(
    0,
    Math.min(
      active.durationMinutes * 60,
      Math.ceil(
        (active.startedAt + active.durationMinutes * 60000 - now) / 1000,
      ),
    ),
  );
}
export function beginBreak(
  p: Program,
  minutes: number,
  activity: string,
  now: number,
  id = `attention-${now}-${Math.random().toString(36).slice(2, 9)}`,
): Program {
  const data = attention(p);
  if (data.active) throw new Error("Nejprve dokonči nebo ukonči běžící blok.");
  const active = {
    id,
    startedAt: now,
    durationMinutes: minutes,
    activity: activity.trim(),
  };
  if (!validBreak(active) || data.sessions.some((s) => s.id === id))
    throw new Error("Vyber 5, 10 nebo 20 minut a pojmenuj svoji činnost.");
  return { ...p, attention: { ...data, preferredMinutes: minutes, active } };
}
export function endBreak(
  p: Program,
  id: string,
  completed: boolean,
  now: number,
): Program {
  const data = attention(p),
    active = data.active;
  if (!active || active.id !== id) throw new Error("Tento blok už neběží.");
  if (!stamp(now) || now < active.startedAt)
    throw new Error("Zkontroluj čas v zařízení.");
  if (completed && breakRemaining(active, now) > 0)
    throw new Error("Blok ještě běží. Počkej na konec odpočtu.");
  const next = { ...data };
  delete next.active;
  return {
    ...p,
    attention: {
      ...next,
      sessions: [
        ...data.sessions,
        {
          ...active,
          endedAt: now,
          outcome: completed ? ("completed" as const) : ("cancelled" as const),
        },
      ].slice(-1000),
    },
  };
}
export function saveAttentionPlan(
  p: Program,
  trigger: string,
  replacement: string,
  limit: number,
): Program {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1440)
    throw new Error("Denní cíl nastav mezi 1 a 1 440 minutami.");
  if (
    !text(trigger, 200) ||
    !text(replacement, 200) ||
    !trigger.trim() ||
    !replacement.trim()
  )
    throw new Error("Doplň situaci i to, co chceš udělat místo feedu.");
  return {
    ...p,
    limit,
    attention: {
      ...attention(p),
      plan: { trigger: trigger.trim(), replacement: replacement.trim() },
    },
  };
}
export function saveReflection(
  p: Program,
  day: string,
  rating: number,
  note: string,
  now: number,
): Program {
  if (
    !validDay(day) ||
    day > dayKey(new Date(now)) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    !text(note, 1000) ||
    !stamp(now)
  )
    throw new Error("Vyber hodnocení 1–5 a platný den reflexe.");
  const data = attention(p),
    reflections = {
      ...data.reflections,
      [day]: { rating, note: note.trim(), at: now },
    };
  return {
    ...p,
    attention: {
      ...data,
      reflections: Object.fromEntries(
        Object.entries(reflections)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 732),
      ),
    },
  };
}
export function attentionSummary(p: Program, now: number) {
  const data = attention(p),
    today = dayKey(new Date(now));
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const completed = data.sessions.filter(
    (s) => s.outcome === "completed" && s.endedAt <= now,
  );
  const todaySessions = completed.filter(
    (s) => dayKey(new Date(s.startedAt)) === today,
  );
  const week = completed.filter(
    (s) => s.startedAt >= start.getTime() && s.startedAt <= now,
  );
  return {
    completed,
    today: todaySessions.length,
    todayMinutes: todaySessions.reduce((n, s) => n + s.durationMinutes, 0),
    week: week.length,
    weekMinutes: week.reduce((n, s) => n + s.durationMinutes, 0),
    days: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      return {
        key,
        count: week.filter((s) => dayKey(new Date(s.startedAt)) === key).length,
      };
    }),
  };
}
