import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initialProfile,
  parseProfile,
  observeRank,
  editProfile,
  type Profile,
} from "./model";
const key = "quitter.profile.v1";
export function useProfile(score: number | null, settled: boolean) {
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
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (serial === revision.current) {
            setSaveError("Profil se zatím neuložil. Zkus uložení znovu.");
            setSaving(false);
          }
        },
      );
  }
  async function hydrate() {
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key),
        next = raw === null ? initialProfile() : parseProfile(raw);
      current.current = next;
      setData(next);
      setLoaded(true);
      if (raw === null) save(next);
    } catch {
      setLoadError(
        "Profil se nepodařilo načíst. Původní data zůstala zachovaná.",
      );
    }
  }
  useEffect(() => {
    void hydrate();
  }, []);
  useEffect(() => {
    if (!loaded || !settled || score === null) return;
    const next = observeRank(current.current, score);
    if (next !== current.current) {
      current.current = next;
      setData(next);
      save(next);
    }
  }, [score, settled, loaded]);
  function edit(name: string, intention: string) {
    if (!loaded) return;
    const next = editProfile(current.current, name, intention);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    loaded,
    loadError,
    saveError,
    saving,
    edit,
    retryLoad: hydrate,
    retrySave: () => {
      if (loaded) save(current.current);
    },
  };
}
