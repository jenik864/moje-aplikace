import type { Program } from "../model";
export function seriesData(p: Program, now: number) {
  return [
    ...p.history.map((h, i) => ({
      id: `history-${i}`,
      start: h.at - Math.max(0, h.duration),
      end: h.at,
      duration: Math.max(0, h.duration),
      current: false,
    })),
    {
      id: "current",
      start: p.startedAt,
      end: now,
      duration: Math.max(0, now - p.startedAt),
      current: true,
    },
  ];
}
export function summary(p: Program, now: number) {
  const series = seriesData(p, now);
  const finished = series.filter((s) => !s.current);
  return {
    current: series[series.length - 1].duration,
    best: Math.max(...series.map((s) => s.duration)),
    attempts: series.length,
    resets: finished.length,
    average: finished.length
      ? finished.reduce((sum, s) => sum + s.duration, 0) / finished.length
      : null,
    sos: (p.triggers ?? []).length,
  };
}
export function dayActivity(p: Program, date: Date, now: number) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const from = start.getTime();
  const to = Math.min(end.getTime(), now);
  const started =
    p.signedAt ??
    Math.min(p.startedAt, ...p.history.map((h) => h.at - h.duration));
  const active = from <= now && end.getTime() > started;
  const resets = p.history.filter((h) => h.at >= from && h.at < end.getTime());
  const sos = (p.triggers ?? []).filter(
    (t) => t.at >= from && t.at < end.getTime(),
  );
  const ranges = seriesData(p, now)
    .map((s) => ({ from: s.start, to: s.end }))
    .sort((a, b) => a.from - b.from);
  // Merge overlapping restored ranges before counting elapsed time.
  const merged: { from: number; to: number }[] = [];
  ranges.forEach((r) => {
    const last = merged[merged.length - 1];
    if (last && r.from <= last.to) last.to = Math.max(last.to, r.to);
    else merged.push({ ...r });
  });
  const clearMs = active
    ? merged.reduce(
        (sum, r) =>
          sum +
          Math.max(0, Math.min(r.to, to) - Math.max(r.from, from, started)),
        0,
      )
    : 0;
  return {
    active,
    resets,
    sos,
    clearMs,
    pending: active && end.getTime() > now,
    successful:
      active && end.getTime() <= now && resets.length === 0 && clearMs > 0,
  };
}
export function trendDays(p: Program, now: number, count = 14) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - count + 1 + i);
    return { date, ...dayActivity(p, date, now) };
  });
}
export function durationLabel(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(minutes / 1440);
  if (days > 0)
    return `${days} ${days === 1 ? "den" : days < 5 ? "dny" : "dní"} ${Math.floor(minutes / 60) % 24} h`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes} min`;
}
