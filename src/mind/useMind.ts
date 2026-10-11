import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialMind, parseMind, type MindData } from "./model";
const key = "quitter.mind.v1";
export function useMind() {
  const [data, setData] = useState<MindData>(initialMind);
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
      const next = raw ? parseMind(raw) : initialMind();
      current.current = next;
      setData(next);
      setLoaded(true);
    } catch {
      setLoadError(
        "Mind se nepodařilo načíst. Uložená data zůstala nedotčená.",
      );
    }
  }
  useEffect(() => {
    void hydrate();
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
  function update(fn: (d: MindData) => MindData) {
    if (!loaded) return;
    const next = fn(current.current);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    update,
    loaded,
    loadError,
    saveError,
    saving,
    retryLoad: hydrate,
    retrySave: () => save(current.current),
  };
}
