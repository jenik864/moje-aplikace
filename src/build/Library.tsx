import { ExerciseDetail } from "./ExerciseDetail";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { exercises, exerciseById, muscleNames, type Muscle } from "./catalog";
import { Chip, Field, Button, useBuildStyles } from "./components";
import { MuscleThumbnail } from "./MuscleMap";
import { findExercises } from "./search";
export function Library() {
  const s = useBuildStyles();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState("Vše");
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState(false);
  const list = findExercises(exercises, search, muscle, equipment);
  const active = Number(!!muscle) + Number(equipment !== "Vše");
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
        <View style={{ gap: 10, paddingTop: 10 }}>
          <Text style={s.label}>PODOBNÝ CVIK / ALTERNATIVA</Text>
          <Button
            secondary
            title={exerciseById(e.alternative)?.name ?? "Jiný cvik"}
            onPress={() => setSelected(e.alternative)}
          />
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.title}>Poznej svůj pohyb.</Text>
      <Text style={s.muted}>
        {exercises.length} cviků. Anatomie, technika a alternativa.
      </Text>
      <Field
        label="Hledat cvik"
        value={search}
        onChange={setSearch}
        placeholder="Např. drep, tlaky, guma…"
      />
      <View style={s.between}>
        <Text style={s.small}>
          {list.length} cviků{muscle ? ` · ${muscleNames[muscle]}` : ""}
          {equipment !== "Vše" ? ` · ${equipment}` : ""}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filters }}
          onPress={() => setFilters(!filters)}
          style={s.chip}
        >
          <Text style={s.link}>
            {filters ? "Skrýt filtry" : `Filtry${active ? ` (${active})` : ""}`}
          </Text>
        </Pressable>
      </View>
      {filters && (
        <View style={[s.card, { padding: 14, gap: 12 }]}>
          <Text style={s.label}>SVALOVÁ SKUPINA</Text>
          <Text style={s.small}>Vyhledává hlavní i pomocné zapojení.</Text>
          <View style={s.row}>
            <Chip
              title="Všechny svaly"
              active={!muscle}
              onPress={() => setMuscle(null)}
            />
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
            {["Vše", ...new Set(exercises.map((e) => e.equipment))].map(
              (eq) => (
                <Chip
                  key={eq}
                  title={eq}
                  active={equipment === eq}
                  onPress={() => setEquipment(eq)}
                />
              ),
            )}
          </View>
          <Button
            secondary
            title="Zrušit filtry"
            onPress={() => {
              setMuscle(null);
              setEquipment("Vše");
            }}
          />
          <Button title="Zobrazit cviky" onPress={() => setFilters(false)} />
        </View>
      )}
      {list.length === 0 && (
        <View style={s.empty}>
          <Text style={s.h2}>Žádný takový cvik.</Text>
          <Text style={s.muted}>Zkus kratší název nebo méně filtrů.</Text>
          <Button
            secondary
            title="Vymazat hledání a filtry"
            onPress={() => {
              setSearch("");
              setMuscle(null);
              setEquipment("Vše");
            }}
          />
        </View>
      )}
      {list.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`Otevřít cvik ${e.name}`}
          onPress={() => setSelected(e.id)}
          style={[
            s.between,
            {
              padding: 12,
              backgroundColor: "#111620",
              borderColor: "#ffffff10",
              borderWidth: 1,
              borderRadius: 18,
              gap: 12,
            },
          ]}
        >
          <MuscleThumbnail exercise={e} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[s.h2, { fontSize: 17, lineHeight: 22 }]}>
              {e.name}
            </Text>
            <Text style={s.small}>{e.equipment}</Text>
            <Text style={[s.small, { color: "#e49a9f" }]}>
              {e.main.map((m) => muscleNames[m]).join(" · ")}
            </Text>
          </View>
          <Text style={s.link}>→</Text>
        </Pressable>
      ))}
    </View>
  );
}
