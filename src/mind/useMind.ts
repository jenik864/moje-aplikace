import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialMind, parseMind, type MindData } from "./model";
const key = "quitter.mind.v1";
export function useMind(blocked = false, gate?: { current: boolean }) {
  const lastWriteFailed = useRef(false);
  const mounted = useRef(true),
    hydration = useRef(0);
  const [data, setData] = useState<MindData>(initialMind);
  const [persisted, setPersisted] = useState<MindData | null>(null);
  const current = useRef(data);
  const queue = useRef(Promise.resolve());
  const serial = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  async function hydrate() {
    const token = ++hydration.current;
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key);
      const next = raw === null ? initialMind() : parseMind(raw);
      if (!mounted.current || token !== hydration.current) return;
      current.current = next;
      setData(next);
      setPersisted(next);
      setLoaded(true);
    } catch {
      if (!mounted.current || token !== hydration.current) return;
      setLoadError(
        "Mind se nepodařilo načíst. Uložená data zůstala nedotčená.",
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
  function save(next: MindData) {
    const revision = ++serial.current;
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(
        () => {
          if (revision === serial.current) {
            setPersisted(next);
            lastWriteFailed.current = false;
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (revision === serial.current) {
            lastWriteFailed.current = true;
            setSaveError("Změny zatím nejsou uložené. Zkus uložení znovu.");
            setSaving(false);
          }
        },
      );
  }
  function update(fn: (d: MindData) => MindData) {
    if (!loaded || blocked || gate?.current || !mounted.current) return;
    const next = fn(current.current);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    flush: () => queue.current.then(() => !lastWriteFailed.current),
    persisted,
    update,
    loaded,
    loadError,
    saveError,
    saving,
    retryLoad: hydrate,
    retrySave: () => {
      if (loaded && !blocked && !gate?.current && mounted.current)
        save(current.current);
    },
  };
}
