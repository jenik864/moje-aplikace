import React, { useContext } from "react";
import { View, Text } from "react-native";
import {
  Button,
  Chip,
  Progress,
  useMindStyles,
  MindTheme,
  mint,
} from "./components";
import { weekOverview } from "./insights";
import { dayKey, shift, type MindData } from "./model";
import { weekdays } from "./PlanEditor";
export function WeeklyInsights({
  data,
  week,
  onWeek,
  onPlan,
}: {
  data: MindData;
  week: string;
  onWeek: (week: string) => void;
  onPlan: () => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme),
    today = dayKey(),
    summary = weekOverview(data, week, today);
  const pretty = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "numeric",
    });
  return (
    <View style={{ gap: 22 }}>
      <Text style={s.label}>TVŮJ TÝDEN V SOUVISLOSTECH</Text>
      <Text style={s.title}>Každý krok je vidět.</Text>
      <View style={[s.between, { flexWrap: "wrap" }]}>
        <Chip
          label="← Předchozí týden"
          onPress={() => onWeek(shift(week, -7))}
        />
        <Chip label="Další týden →" onPress={() => onWeek(shift(week, 7))} />
      </View>
      <Text style={s.muted}>
        {pretty(week)} – {pretty(shift(week, 6))}
      </Text>
      <View style={[s.hero, { padding: 18, gap: 12 }]}>
        <View style={s.between}>
          <Text style={s.label}>SPLNĚNÝ PLÁN</Text>
          <Text style={[s.h2, { color }]}>
            {summary.done}/{summary.planned}
          </Text>
        </View>
        <Progress
          value={summary.planned ? summary.done / summary.planned : 0}
        />
        <Text style={s.muted}>
          Počítají se aktivity naplánované pro tento týden, včetně
          jednorázových. Budoucí dny čekají na splnění.
        </Text>
      </View>
      <View style={[s.card, { gap: 18 }]}>
        <View style={s.between}>
          <Text style={s.h3}>XP po dnech</Text>
          <Text style={[s.h2, { color: mint }]}>{summary.xp} XP</Text>
        </View>
        <View style={[s.row, { gap: 6, alignItems: "flex-end" }]}>
          {summary.days.map((d, i) => (
            <View
              key={d.day}
              accessibilityLabel={`${weekdays[i]}: ${d.xp} XP${d.future ? ", budoucí den" : ""}`}
              style={{ flex: 1, gap: 8, alignItems: "center" }}
            >
              <Text style={[s.muted, { fontSize: 11 }]}>
                {d.future ? "—" : d.xp}
              </Text>
              <View
                style={{
                  height: 100,
                  width: "100%",
                  justifyContent: "flex-end",
                  backgroundColor: "#ffffff05",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: d.future ? 0 : Math.max(2, (d.xp / 60) * 100),
                    backgroundColor: d.day === today ? mint : color,
                    borderRadius: 6,
                    opacity: d.xp ? 1 : 0.25,
                  }}
                />
              </View>
              <Text style={[s.muted, { fontSize: 11 }]}>{weekdays[i]}</Text>
            </View>
          ))}
        </View>
        <Text style={s.muted}>
          Denní limit je 60 XP. Prázdný budoucí den není neúspěch.
        </Text>
      </View>
      <View style={[s.row, { alignItems: "stretch", gap: 10 }]}>
        {[
          [`${summary.activeDays}/7`, "aktivních dnů"],
          [String(summary.minutes), "minut cílů splněných aktivit"],
        ].map(([value, label]) => (
          <View key={label} style={[s.card, { flex: 1, padding: 16, gap: 8 }]}>
            <Text style={[s.stat, { color }]}>{value}</Text>
            <Text style={s.muted}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.h3}>Co jsi dokončil</Text>
        {[
          ["Časové bloky", `${summary.focusMinutes} min`],
          ["Nové lekce", String(summary.lessons)],
          ["Kola arény", String(summary.games)],
          ["Správné odpovědi", String(summary.correct)],
        ].map(([label, value]) => (
          <View key={label} style={s.between}>
            <Text style={s.muted}>{label}</Text>
            <Text style={s.link}>{value}</Text>
          </View>
        ))}
        <Text style={[s.muted, { fontSize: 12 }]}>
          Čas aktivit vychází z jejich cíle, čas bloků z dokončeného časovače.
          Mohou popisovat stejnou činnost, proto je nesčítáme do jednoho odhadu.
        </Text>
      </View>
      <Button quiet onPress={onPlan}>
        Doladit můj pravidelný plán
      </Button>
    </View>
  );
}
