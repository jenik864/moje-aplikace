import React from "react";
import { AppState } from "react-native";
import type { Program } from "../model";
import { usageNative } from "./native";
import { mergeUsage } from "./insights";
import { usageSummary } from "./scoring";

export function useUsageConnection(
  p: Program,
  update: (p: Program | ((current: Program) => Program)) => void,
) {
  const [status, setStatus] = React.useState<
    "unsupported" | "permission" | "connected" | "error" | "loading"
  >(usageNative ? "loading" : "unsupported");
  const [busy, setBusy] = React.useState(false);
  const latest = React.useRef({ p, update }),
    lock = React.useRef(false),
    mounted = React.useRef(true);
  latest.current = { p, update };
  const refresh = React.useCallback(async () => {
    if (!usageNative || lock.current || !mounted.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const allowed = await usageNative.hasPermission();
      if (!mounted.current) return;
      if (!allowed) {
        setStatus("permission");
        return;
      }
      const rows = await usageNative.readUsage();
      if (!Array.isArray(rows)) throw new Error("Neplatná odpověď měření.");
      if (!mounted.current) return;
      const at = Date.now();
      latest.current.update((current) => {
        const next = mergeUsage(current, rows, at);
        const prime = Math.max(next.prime, usageSummary(next, at).rank);
        return next !== current || prime !== current.prime
          ? { ...next, prime }
          : current;
      });
      setStatus("connected");
    } catch {
      if (mounted.current) setStatus("error");
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  React.useEffect(() => {
    mounted.current = true;
    void refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60000);
    return () => {
      mounted.current = false;
      listener.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  const openSettings = async () => {
    if (!usageNative) return;
    try {
      await usageNative.openSettings();
    } catch {
      if (mounted.current) setStatus("error");
    }
  };
  return { status, busy, refresh, openSettings, supported: !!usageNative };
}
