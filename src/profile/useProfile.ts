import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initialProfile,
  parseProfile,
  observeProfile,
  setProfileGoals,
  editProfile,
  type Profile,
} from "./model";
import type { GoalTargets } from "./goals";
import { dayKey } from "../mind/model";
const key = "quitter.profile.v1";
export function useProfile(
  score: number | null,
  settled: boolean,
  blocked = false,
  now = Date.now(),
  gate?: { current: boolean },
) {
  const lastWriteFailed = useRef(false);
  const mounted = useRef(true);
  const hydration = useRef(0);
  const localDay = dayKey(new Date(now));
  const [data, setData] = useState<Profile>(initialProfile),
    [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef(data),
    queue = useRef(Promise.resolve()),
    revision = useRef(0);
  function save(next: Profile) {
    const serial = ++revision.current;
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(
        () => {
          if (serial === revision.current) {
            lastWriteFailed.current = false;
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (serial === revision.current) {
            lastWriteFailed.current = true;
            setSaveError("Profil se zatím neuložil. Zkus uložení znovu.");
            setSaving(false);
          }
        },
      );
  }
  async function hydrate() {
    const token = ++hydration.current;
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key),
        next = raw === null ? initialProfile() : parseProfile(raw);
      if (!mounted.current || token !== hydration.current) return;
      current.current = next;
      setData(next);
      setLoaded(true);
      if (raw === null && !gate?.current) save(next);
    } catch {
      if (!mounted.current || token !== hydration.current) return;
      setLoadError(
        "Profil se nepodařilo načíst. Původní data zůstala zachovaná.",
      );
    }
  }
  useEffect(() => {
    mounted.current = true;
    void hydrate();
    return () => {
      mounted.current = false;
      hydration.current++;
    };
  }, []);
  useEffect(() => {
    if (
      blocked ||
      gate?.current ||
      !mounted.current ||
      !loaded ||
      !settled ||
      score === null
    )
      return;
    const next = observeProfile(current.current, score, now);
    if (next !== current.current) {
      current.current = next;
      setData(next);
      save(next);
    }
  }, [score, settled, loaded, blocked, localDay]);
  function edit(name: string, intention: string) {
    if (!loaded || blocked || gate?.current || !mounted.current) return;
    const next = editProfile(current.current, name, intention);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    loaded,
    flush: () => queue.current.then(() => !lastWriteFailed.current),
    setGoals: (goals: GoalTargets) => {
      if (!loaded || blocked || gate?.current || !mounted.current) return;
      const next = setProfileGoals(current.current, goals);
      current.current = next;
      setData(next);
      save(next);
    },
    loadError,
    saveError,
    saving,
    edit,
    retryLoad: hydrate,
    retrySave: () => {
      if (loaded && !blocked && !gate?.current && mounted.current)
        save(current.current);
    },
  };
}
