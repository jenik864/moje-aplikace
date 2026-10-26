import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialBusiness, parseBusiness, type BusinessData } from "./model";
const key = "quitter.business.v1";
export function useBusiness(blocked = false, gate?: { current: boolean }) {
  const lastWriteFailed = useRef(false);
  const mounted = useRef(true),
    hydration = useRef(0);
  const [data, setData] = useState<BusinessData>(initialBusiness);
  const current = useRef(data),
    queue = useRef(Promise.resolve()),
    serial = useRef(0);
  const [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false);
  async function hydrate() {
    const token = ++hydration.current;
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key);
      const next = raw === null ? initialBusiness() : parseBusiness(raw);
      if (!mounted.current || token !== hydration.current) return;
      current.current = next;
      setData(next);
      setLoaded(true);
    } catch {
      if (!mounted.current || token !== hydration.current) return;
      setLoadError(
        "Business se nepodařilo načíst. Uložené projekty zůstaly zachované.",
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
  function save(next: BusinessData) {
    const revision = ++serial.current;
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(
        () => {
          if (revision === serial.current) {
            lastWriteFailed.current = false;
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (revision === serial.current) {
            lastWriteFailed.current = true;
            setSaveError(
              "Změny se zatím neuložily. Nezavírej aplikaci a zkus uložení znovu.",
            );
            setSaving(false);
          }
        },
      );
  }
  function update(fn: (data: BusinessData) => BusinessData) {
    if (!loaded || blocked || gate?.current || !mounted.current) return;
    const next = fn(current.current);
    current.current = next;
    setData(next);
    save(next);
  }
  return {
    data,
    flush: () => queue.current.then(() => !lastWriteFailed.current),
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
