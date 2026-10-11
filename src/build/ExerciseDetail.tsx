import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Chip, useBuildStyles } from "./components";
import type { Exercise } from "./catalog";
import { MuscleMap } from "./MuscleMap";
export function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const s = useBuildStyles();
  const [tab, setTab] = useState<"muscles" | "technique">("muscles");
  useEffect(() => setTab("muscles"), [exercise.id]);
  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>
          {exercise.equipment.toUpperCase()} / KNIHOVNA CVIKŮ
        </Text>
        <Text style={s.title}>{exercise.name}</Text>
      </View>
      <View style={s.row}>
        <Chip
          title="Zapojené svaly"
          active={tab === "muscles"}
          onPress={() => setTab("muscles")}
        />
        <Chip
          title="Jak cvičit"
          active={tab === "technique"}
          onPress={() => setTab("technique")}
        />
      </View>
      {tab === "muscles" ? (
        <MuscleMap exercise={exercise} />
      ) : (
        <View style={{ gap: 18 }}>
          <Text style={s.label}>PROVEDENÍ / KROK ZA KROKEM</Text>
          {exercise.steps.map((step, i) => (
            <View key={i} style={[s.step, { paddingVertical: 12 }]}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "#202832",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={s.link}>{i + 1}</Text>
              </View>
              <Text style={[s.text, s.flex]}>{step}</Text>
            </View>
          ))}
          <View
            style={[
              s.card,
              { borderColor: "#9f253755", backgroundColor: "#29161a" },
            ]}
          >
            <Text
              style={{
                color: "#ed8992",
                fontSize: 11,
                letterSpacing: 1.5,
                fontWeight: "700",
              }}
            >
              NA CO SI DÁT POZOR
            </Text>
            <Text style={s.text}>{exercise.error}</Text>
          </View>
          <Text style={s.small}>
            Zvol rozsah a zátěž bez bolesti. U nového cviku si nech zkontrolovat
            techniku.
          </Text>
        </View>
      )}
    </View>
  );
}
