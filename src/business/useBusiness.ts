import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initialBusiness, parseBusiness, type BusinessData } from "./model";
const key = "quitter.business.v1";
export function useBusiness() {
  const [data, setData] = useState<BusinessData>(initialBusiness);
  const current = useRef(data),
    queue = useRef(Promise.resolve()),
    serial = useRef(0);
  const [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false);
  async function hydrate() {
    setLoadError("");
    setLoaded(false);
    try {
      const raw = await AsyncStorage.getItem(key);
      const next = raw === null ? initialBusiness() : parseBusiness(raw);
      current.current = next;
      setData(next);
      setLoaded(true);
    } catch {
      setLoadError(
        "Business se nepodařilo načíst. Uložené projekty zůstaly zachované.",
      );
    }
  }
  useEffect(() => {
    void hydrate();
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
            setSaveError("");
            setSaving(false);
          }
        },
        () => {
          if (revision === serial.current) {
            setSaveError(
              "Změny se zatím neuložily. Nezavírej aplikaci a zkus uložení znovu.",
            );
            setSaving(false);
          }
        },
      );
  }
  function update(fn: (data: BusinessData) => BusinessData) {
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
    retrySave: () => {
      if (loaded) save(current.current);
    },
  };
}
