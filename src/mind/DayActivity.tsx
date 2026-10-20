import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button, Chip, Field, useMindStyles } from "./components";
import { habitKinds, uid, type Habit, type HabitKind } from "./model";
export function DayActivity({
  day,
  onSave,
  onDirty,
}: {
  day: string;
  onSave: (habit: Habit) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const s = useMindStyles();
  const [kind, setKind] = useState<HabitKind>("reading"),
    [title, setTitle] = useState("Četba"),
    [minutes, setMinutes] = useState("20"),
    [error, setError] = useState("");
  const dirty = kind !== "reading" || title !== "Četba" || minutes !== "20";
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  return (
    <View style={{ gap: 22 }}>
      <Text style={s.label}>
        JEN TENTO DEN /{" "}
        {new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ")}
      </Text>
      <Text style={s.title}>Jeden další krok.</Text>
      <Text style={s.muted}>
        Jednorázová aktivita doplní vybraný den. Tvůj opakovaný týdenní plán
        zůstává samostatně.
      </Text>
      <View style={s.wrap}>
        {(Object.keys(habitKinds) as HabitKind[]).map((k) => (
          <Chip
            key={k}
            label={habitKinds[k]}
            selected={kind === k}
            onPress={() => {
              if (Object.values(habitKinds).includes(title) || !title.trim())
                setTitle(habitKinds[k]);
              setKind(k);
            }}
          />
        ))}
      </View>
      <Field
        label="Název jednorázové aktivity"
        value={title}
        onChangeText={(v) => setTitle(v.slice(0, 80))}
      />
      <Field
        label="Cíl v minutách"
        value={minutes}
        onChangeText={setMinutes}
        number
      />
      <View style={s.wrap}>
        {[10, 20, 30, 45].map((n) => (
          <Chip
            key={n}
            label={`${n} min`}
            selected={Number(minutes) === n}
            onPress={() => setMinutes(String(n))}
          />
        ))}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button
        onPress={() => {
          const n = Number(minutes);
          if (!title.trim() || !Number.isInteger(n) || n < 1 || n > 180) {
            setError("Vyplň název a délku od 1 do 180 minut.");
            return;
          }
          onSave({
            id: uid(),
            kind,
            title: title.trim(),
            minutes: n,
            days: [(new Date(`${day}T12:00:00`).getDay() + 6) % 7],
          });
        }}
      >
        Přidat do vybraného dne
      </Button>
    </View>
  );
}
