import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Program, ProgramId, dayKey, consistencyStatus, rankOf } from "./model";
import { rankColors } from "./ui";
import { dailyActivity } from "./daily/analytics";
export function ConsistencyMatrix({
  id,
  p,
  now,
}: {
  id: ProgramId;
  p: Program;
  now: number;
}) {
  const [selected, setSelected] = React.useState<string | null>(
    dayKey(new Date(now)),
  );
  const color = rankColors[rankOf(id, p, now)];
  const dates = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 27 + i);
    return date;
  });
  const statusOf = (date: Date) => {
    const key = dayKey(date);
    if (id !== "porn" && key < dayKey(new Date(p.signedAt ?? p.startedAt)))
      return "empty";
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
  const activity =
    current && id !== "porn" ? dailyActivity(p, current, now) : null;
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
      {activity && (
        <View
          style={{
            gap: 10,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: "#332a2b",
          }}
        >
          {!activity.active ? (
            <Text style={s.muted}>
              Před zahájením programu — bez hodnocení.
            </Text>
          ) : (
            <>
              {activity.minutes !== null && (
                <Text style={s.detail}>
                  {activity.minutes.toLocaleString("cs-CZ")} / {p.limit} min ·{" "}
                  {activity.pending ? "Průběžný zápis" : "Potvrzený den"}
                </Text>
              )}
              {activity.pending && (
                <Text style={s.muted}>
                  {activity.draft === null
                    ? "Dnešní stav zatím není zaznamenaný."
                    : activity.draft
                      ? "Dnešní průběžný stav je v plánu."
                      : "Dnešní průběžný stav je mimo plán."}{" "}
                  Dnešek nezvyšuje rank.
                </Text>
              )}
              {activity.sos.length > 0 && (
                <Text style={s.muted}>
                  Uložené návraty ze SOS: {activity.sos.length}
                </Text>
              )}
            </>
          )}
        </View>
      )}
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
    backgroundColor: "#131214",
    borderWidth: 1,
    borderColor: "#2b2728",
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  title: {
    color: "#c4bab3",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: 6 },
  weekday: { flex: 1, textAlign: "center", color: "#888", fontSize: 10 },
  cell: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
  },
  muted: { color: "#aca39f", fontSize: 12, lineHeight: 19 },
  detail: { color: "#f3f3ed", fontSize: 18, lineHeight: 25 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
