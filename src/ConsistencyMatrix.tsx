import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  Program,
  ProgramId,
  definitions,
  dayKey,
  consistencyStatus,
} from "./model";
export function ConsistencyMatrix({
  id,
  p,
  now,
}: {
  id: ProgramId;
  p: Program;
  now: number;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const color = definitions[id].color;
  const dates = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 27 + i);
    return date;
  });
  const statusOf = (date: Date) => {
    const key = dayKey(date);
    return id === "porn"
      ? consistencyStatus(p, date, now)
      : key === dayKey(new Date(now))
        ? "pending"
        : p.days[key] === true
          ? "success"
          : p.days[key] === false
            ? "reset"
            : "empty";
  };
  const labels = {
    success: "Splněný den",
    reset: id === "porn" ? "Den s přerušením série" : "Den mimo plán",
    pending: "Dnešek ještě probíhá",
    empty: "Bez potvrzeného záznamu",
  };
  const current = dates.find((d) => dayKey(d) === selected);
  return (
    <View style={s.panel}>
      <Text style={s.title}>MATICE KONZISTENCE</Text>
      <View style={s.row}>
        {dates.slice(0, 7).map((date) => (
          <Text key={dayKey(date)} style={s.weekday}>
            {date.toLocaleDateString("cs-CZ", { weekday: "short" })}
          </Text>
        ))}
      </View>
      {Array.from({ length: 4 }, (_, row) => (
        <View key={row} style={s.row}>
          {dates.slice(row * 7, row * 7 + 7).map((date) => {
            const key = dayKey(date);
            const status = statusOf(date);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString("cs-CZ")}: ${labels[status]}`}
                onPress={() => setSelected(key)}
                key={key}
                style={[
                  s.cell,
                  {
                    backgroundColor:
                      status === "success"
                        ? `${color}35`
                        : status === "reset"
                          ? "#442027"
                          : "#252525",
                    borderColor:
                      selected === key
                        ? "#fff"
                        : status === "pending"
                          ? color
                          : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      status === "success"
                        ? color
                        : status === "reset"
                          ? "#ff8992"
                          : "#aaa",
                    fontSize: 11,
                  }}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={s.muted}>
        {current
          ? `${current.toLocaleDateString("cs-CZ")} · ${labels[statusOf(current)]}`
          : "Posledních 28 dní · klepni na den pro detail"}
      </Text>
      <View style={s.legend}>
        <Text style={{ color, fontSize: 11 }}>● Splněno</Text>
        <Text style={{ color: "#ff8992", fontSize: 11 }}>
          ● {id === "porn" ? "Reset" : "Mimo plán"}
        </Text>
        <Text style={s.muted}>○ Dnes</Text>
      </View>
      <Text style={s.muted}>
        {id === "porn"
          ? `${p.history.length} zaznamenaných přerušení`
          : `${Object.values(p.days).filter((value) => !value).length} potvrzených dní mimo plán`}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  title: { color: "#eee", fontSize: 13, fontWeight: "800", marginBottom: 6 },
  row: { flexDirection: "row", gap: 6 },
  weekday: { flex: 1, textAlign: "center", color: "#888", fontSize: 10 },
  cell: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
  },
  muted: { color: "#999", fontSize: 12, lineHeight: 19 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
