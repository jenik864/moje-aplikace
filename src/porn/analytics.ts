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

function rangeSize(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 90)
    throw new Error("Rozsah musí být 1–90 dní.");
  return count;
}

export function periodSummary(p: Program, now: number, count = 28) {
  const days = trendDays(p, now, rangeSize(count));
  const start = new Date(days[0].date);
  start.setHours(0, 0, 0, 0);
  const inRange = (event: { at: number }) =>
    event.at >= start.getTime() && event.at <= now;
  const completed = days.filter((d) => d.active && !d.pending);
  const successful = completed.filter((d) => d.successful).length;
  const failed = completed.filter((d) => d.resets.length > 0).length;
  return {
    from: start.getTime(),
    completed: completed.length,
    successful,
    failed,
    unknown: completed.length - successful - failed,
    rate: completed.length ? successful / completed.length : null,
    resets: p.history.filter(inRange).length,
    sos: (p.triggers ?? []).filter(inRange).length,
  };
}

export function activityBuckets(p: Program, now: number, count = 14) {
  const days = trendDays(p, now, rangeSize(count));
  const stride = count > 14 ? 7 : 1;
  return Array.from({ length: Math.ceil(days.length / stride) }, (_, index) => {
    const group = days.slice(index * stride, (index + 1) * stride);
    return {
      from: group[0].date.getTime(),
      to: group[group.length - 1].date.getTime(),
      resets: group.reduce(
        (n, day) => n + day.resets.filter((e) => e.at <= now).length,
        0,
      ),
      sos: group.reduce(
        (n, day) => n + day.sos.filter((e) => e.at <= now).length,
        0,
      ),
    };
  });
}
