import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Button, useBuildStyles } from "./components";
import { dateKey, shiftDay, monday, kinds, type BuildData } from "./model";
import { dayNames } from "./PlanEditor";
export function Calendar({
  data,
  day,
  onSelect,
  onOpen,
  onAdd,
}: {
  data: BuildData;
  day: string;
  onSelect: (d: string) => void;
  onOpen: (id: string, d: string) => void;
  onAdd: (d: string) => void;
}) {
  const s = useBuildStyles();
  const [month, setMonth] = useState(day.slice(0, 7) + "-01");
  const [selected, setSelected] = useState(day);
  const start = monday(month);
  const dates = Array.from({ length: 42 }, (_, i) => shiftDay(start, i));
  const activities = data.activities.filter((a) => a.day === selected);
  function move(n: number) {
    const d = new Date(month + "T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(dateKey(d));
  }
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.title}>Dál než jeden týden.</Text>
      <View style={s.between}>
        <Button secondary title="←" onPress={() => move(-1)} />
        <Text style={[s.h2, { flex: 1, textAlign: "center", fontSize: 20 }]}>
          {new Date(month + "T12:00:00").toLocaleDateString("cs-CZ", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Button secondary title="→" onPress={() => move(1)} />
      </View>
      <View style={{ flexDirection: "row" }}>
        {dayNames.map((d) => (
          <Text key={d} style={[s.small, { flex: 1, textAlign: "center" }]}>
            {d}
          </Text>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 4 }}>
          {dates.slice(row * 7, row * 7 + 7).map((d) => {
            const acts = data.activities.filter((a) => a.day === d);
            const done = acts.length > 0 && acts.every((a) => data.logs[a.id]);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${d}, ${acts.length} aktivit${done ? ", dokončeno" : ""}`}
                accessibilityState={{ selected: d === selected }}
                onPress={() => {
                  setSelected(d);
                  onSelect(d);
                }}
                style={[
                  s.day,
                  {
                    minHeight: 56,
                    paddingVertical: 8,
                    borderRadius: 30,
                    opacity: d.slice(0, 7) === month.slice(0, 7) ? 1 : 0.4,
                  },
                  d === selected && s.chipOn,
                ]}
              >
                <Text style={s.text}>{Number(d.slice(-2))}</Text>
                <Text style={s.link}>
                  {done ? "✓" : acts.length ? "•" : " "}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={s.small}>
        • Naplánovaný pohyb · ✓ všechny aktivity dne hotové
      </Text>
      <Text style={s.label}>
        {new Date(selected + "T12:00:00").toLocaleDateString("cs-CZ", {
          weekday: "long",
          day: "numeric",
          month: "numeric",
        })}
      </Text>
      {activities.length ? (
        activities.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            onPress={() => onOpen(a.id, a.day)}
            style={s.card}
          >
            <Text style={s.h2}>{a.title}</Text>
            <Text style={s.muted}>
              {kinds[a.kind].name} ·{" "}
              {data.logs[a.id]
                ? "✓ Dokončeno"
                : `${a.targetMinutes} min v plánu`}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={s.muted}>Žádná aktivita v plánu.</Text>
      )}
      <Button
        title="+ Přidat aktivitu na vybraný den"
        onPress={() => onAdd(selected)}
      />
      <Button
        secondary
        title="Přejít na dnešek"
        onPress={() => {
          const d = dateKey();
          setMonth(d.slice(0, 7) + "-01");
          setSelected(d);
          onSelect(d);
        }}
      />
    </View>
  );
}
