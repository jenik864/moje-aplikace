import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialBuild, parseBuild, type BuildData } from "./model";
const key = "quitter.build.v1";
export function useBuild() {
  const [data, setData] = useState<BuildData>(initialBuild);
  const [persisted, setPersisted] = useState<BuildData | null>(null);
  const current = useRef(data);
  const queue = useRef(Promise.resolve());
  const serial = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  async function hydrate() {
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key);
      const next = raw === null ? initialBuild() : parseBuild(raw);
      current.current = next;
      setData(next);
      setPersisted(next);
      setLoaded(true);
    } catch {
      setLoadError(
        "Build se nepodařilo načíst. Uložená data zůstala nedotčená.",
      );
    }
  }
  useEffect(() => {
    void hydrate();
  }, []);
  function save(next: BuildData) {
    const revision = ++serial.current;
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(
        () => {
          if (revision === serial.current) {
            setPersisted(next);
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (revision === serial.current) {
            setSaveError("Změny zatím nejsou uložené. Zkus uložení znovu.");
            setSaving(false);
          }
        },
      );
  }
  function update(fn: (d: BuildData) => BuildData) {
    if (!loaded) return;
    const next = fn(current.current);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    persisted,
    update,
    loaded,
    loadError,
    saveError,
    saving,
    retryLoad: hydrate,
    retrySave: () => {
      if (loaded) save(current.current);
    },
  };
}
