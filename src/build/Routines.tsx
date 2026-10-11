import React, { useState } from "react";
import { View, Text } from "react-native";
import { Button, Chip, Field, s, useBuildStyles } from "./components";
import { uid, type Routine } from "./model";
export function Routines({
  routines,
  onSave,
  onRemove,
}: {
  routines: Routine[];
  onSave: (r: Routine) => void;
  onRemove: (id: string) => void;
}) {
  const s = useBuildStyles();
  const [edit, setEdit] = useState<Routine | null>(null);
  const [steps, setSteps] = useState("");
  const [error, setError] = useState("");
  const [remove, setRemove] = useState("");
  function start(r: Routine) {
    setEdit({ ...r });
    setSteps(r.steps.join("\n"));
    setError("");
  }
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.title}>Péče o tělo.</Text>
      <Text style={s.muted}>
        Sestav si krátké rutiny pro pleť, regeneraci nebo jiné každodenní
        návyky. Odhad času ani splnění se nevytváří automaticky.
      </Text>
      {edit ? (
        <View style={s.card}>
          <Field
            label="Název rutiny"
            value={edit.title}
            onChange={(title) => setEdit({ ...edit, title })}
          />
          <View style={s.row}>
            <Chip
              title="Ráno"
              active={edit.period === "morning"}
              onPress={() => setEdit({ ...edit, period: "morning" })}
            />
            <Chip
              title="Večer"
              active={edit.period === "evening"}
              onPress={() => setEdit({ ...edit, period: "evening" })}
            />
          </View>
          <Field
            label="Kroky (každý na nový řádek)"
            value={steps}
            onChange={setSteps}
            multiline
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Button
            title="Uložit rutinu"
            onPress={() => {
              const lines = steps
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              if (!edit.title.trim() || !lines.length) {
                setError("Doplň název a alespoň jeden krok.");
                return;
              }
              onSave({ ...edit, title: edit.title.trim(), steps: lines });
              setEdit(null);
            }}
          />
          <Button
            secondary
            title="Zrušit úpravy"
            onPress={() => setEdit(null)}
          />
        </View>
      ) : (
        <Button
          title="+ Vlastní rutina"
          onPress={() =>
            start({ id: uid(), title: "", period: "evening", steps: [] })
          }
        />
      )}
      {routines.map((r) => (
        <View key={r.id} style={s.card}>
          <Text style={s.label}>
            {r.period === "morning" ? "RÁNO" : "VEČER"}
          </Text>
          <Text style={s.h2}>{r.title}</Text>
          {r.steps.map((step, i) => (
            <Text key={i} style={s.text}>
              {i + 1}. {step}
            </Text>
          ))}
          <Button secondary title="Upravit" onPress={() => start(r)} />
          <Button
            secondary
            title={
              remove === r.id ? "Potvrdit odebrání rutiny" : "Odebrat rutinu"
            }
            onPress={() => {
              if (remove === r.id) {
                onRemove(r.id);
                setRemove("");
              } else setRemove(r.id);
            }}
          />
          {remove === r.id && (
            <Button
              secondary
              title="Ponechat rutinu"
              onPress={() => setRemove("")}
            />
          )}
        </View>
      ))}
    </View>
  );
}
