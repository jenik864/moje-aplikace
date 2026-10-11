import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { exercises, exerciseById, muscleNames, type Muscle } from "./catalog";
import {
  Chip,
  Field,
  Button,
  ExerciseDetail,
  s,
  useBuildStyles,
} from "./components";
export function Library() {
  const s = useBuildStyles();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState("Vše");
  const [selected, setSelected] = useState<string | null>(null);
  const list = exercises.filter(
    (e) =>
      (!muscle || e.main.includes(muscle)) &&
      (equipment === "Vše" || e.equipment === equipment) &&
      e.name.toLocaleLowerCase("cs").includes(search.toLocaleLowerCase("cs")),
  );
  if (selected) {
    const e = exerciseById(selected)!;
    return (
      <View style={{ gap: 20 }}>
        <Button
          secondary
          title="← Zpět na cviky"
          onPress={() => setSelected(null)}
        />
        <ExerciseDetail exercise={e} />
        <Text style={s.label}>ALTERNATIVA</Text>
        <Button
          secondary
          title={exerciseById(e.alternative)?.name ?? "Jiný cvik"}
          onPress={() => setSelected(e.alternative)}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.title}>Znáš svůj pohyb.</Text>
      <Text style={s.muted}>
        {exercises.length} cviků · technika, zapojené svaly a alternativa.
      </Text>
      <Field label="Hledat cvik" value={search} onChange={setSearch} />
      <Text style={s.label}>HLAVNÍ SVALOVÁ SKUPINA</Text>
      <View style={s.row}>
        <Chip title="Vše" active={!muscle} onPress={() => setMuscle(null)} />
        {(Object.keys(muscleNames) as Muscle[]).map((m) => (
          <Chip
            key={m}
            title={muscleNames[m]}
            active={muscle === m}
            onPress={() => setMuscle(m)}
          />
        ))}
      </View>
      <Text style={s.label}>VYBAVENÍ</Text>
      <View style={s.row}>
        {["Vše", ...new Set(exercises.map((e) => e.equipment))].map((eq) => (
          <Chip
            key={eq}
            title={eq}
            active={equipment === eq}
            onPress={() => setEquipment(eq)}
          />
        ))}
      </View>
      <Text style={s.small}>{list.length} nalezených cviků</Text>
      {list.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          onPress={() => setSelected(e.id)}
          style={s.card}
        >
          <View style={s.between}>
            <Text style={[s.h2, s.flex]}>{e.name}</Text>
            <Text style={s.icon}>→</Text>
          </View>
          <Text style={s.muted}>
            {e.equipment} · {e.main.map((m) => muscleNames[m]).join(", ")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
