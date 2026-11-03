import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Program } from "../model";
import { periodSummary, summary, durationLabel } from "./analytics";
import { statusColors } from "../statusColors";
import { SeriesChart, ActivityChart } from "./Charts";

export function ProgressInsights({ p, now }: { p: Program; now: number }) {
  const [period, setPeriod] = useState(28);
  const report = periodSummary(p, now, period);
  const stats = summary(p, now);
  const triggers = Object.entries(
    (p.triggers ?? [])
      .filter(
        (e) => e.at >= report.from && e.at <= now && e.trigger !== "Neuvedeno",
      )
      .reduce<
        Record<string, number>
      >((values, e) => ({ ...values, [e.trigger]: (values[e.trigger] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <View style={{ gap: 30 }}>
      <View style={s.hero}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.label}>AKTUÁLNÍ SÉRIE</Text>
          <Text style={s.large}>
            {Math.floor(stats.current / 86400000)}
            <Text style={{ fontSize: 18, color: "#898989" }}> dní</Text>
          </Text>
        </View>
        <View style={{ flex: 1, gap: 8, alignItems: "flex-end" }}>
          <Text style={s.label}>OSOBNÍ NEJLEPŠÍ</Text>
          <Text style={s.best}>{durationLabel(stats.best)}</Text>
          <Text style={s.note}>
            {stats.current >= stats.best
              ? "Právě ji tvoříš."
              : "Součást tvé historie."}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[7, 14, 28].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Statistiky za ${value} dní`}
            accessibilityState={{ selected: period === value }}
            aria-pressed={period === value}
            onPress={() => setPeriod(value)}
            style={[
              s.period,
              period === value && {
                backgroundColor: "#EDEDED",
                borderColor: "#EDEDED",
              },
            ]}
          >
            <Text
              style={{
                color: period === value ? "#101010" : "#9B9B9B",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {value} dní
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.section}>
        <Text style={s.label}>KONZISTENCE · POSLEDNÍCH {period} DNÍ</Text>
        <View style={{ flexDirection: "row", gap: 18, alignItems: "baseline" }}>
          <Text
            style={[
              s.rate,
              {
                color: report.rate === null ? "#777777" : statusColors.success,
              },
            ]}
          >
            {report.rate === null ? "—" : Math.round(report.rate * 100)}
            {report.rate !== null && <Text style={{ fontSize: 22 }}> %</Text>}
          </Text>
          <Text style={[s.body, { flex: 1 }]}>
            {report.completed
              ? `${report.successful} splněných z ${report.completed} dokončených dnů`
              : "První výsledek se objeví po dokončení dne."}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            height: 7,
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: "#272727",
          }}
        >
          {report.completed > 0 && (
            <>
              <View
                style={{
                  width: `${(report.successful / report.completed) * 100}%`,
                  backgroundColor: statusColors.success,
                }}
              />
              <View
                style={{
                  width: `${(report.failed / report.completed) * 100}%`,
                  backgroundColor: statusColors.failure,
                }}
              />
            </>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
          <Text style={[s.note, { color: statusColors.success }]}>
            ● {report.successful} splněno
          </Text>
          <Text style={[s.note, { color: statusColors.failure }]}>
            ● {report.failed} dní s resetem
          </Text>
          {report.unknown > 0 && (
            <Text style={s.note}>● {report.unknown} bez výsledku</Text>
          )}
        </View>
        <Text style={s.note}>
          Dnešek ještě běží. Dny před zahájením nejsou součástí výsledku.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={s.label}>RESETY V OBDOBÍ</Text>
          <Text style={s.best}>{report.resets}</Text>
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={s.label}>NÁVRATY ZE SOS</Text>
          <Text style={s.best}>{report.sos}</Text>
        </View>
      </View>
      <View style={s.section}>
        <Text style={s.heading}>Tvoje série v čase</Text>
        <Text style={s.note}>Posledních 8 sérií · celá historie</Text>
        <SeriesChart p={p} now={now} />
      </View>
      <View style={s.section}>
        <Text style={s.heading}>Momenty rozhodnutí</Text>
        <Text style={s.note}>Resety a návraty ze SOS za {period} dní</Text>
        <ActivityChart p={p} now={now} days={period} />
      </View>
      <View style={s.section}>
        <Text style={s.heading}>Co předcházelo impulzu</Text>
        {triggers.length ? (
          triggers.map(([trigger, count]) => (
            <View
              key={trigger}
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.body}>{trigger}</Text>
                <View style={{ height: 3, backgroundColor: "#202020" }}>
                  <View
                    style={{
                      height: 3,
                      width: `${(count / triggers[0][1]) * 100}%`,
                      backgroundColor: "#AFAFAF",
                    }}
                  />
                </View>
              </View>
              <Text style={s.best}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={s.body}>
            V tomto období nejsou vybrané spouštěče. Po použití SOS je tu můžeš
            sledovat.
          </Text>
        )}
      </View>
      <View style={s.hero}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={s.label}>PRŮMĚR UKONČENÝCH SÉRIÍ</Text>
          <Text style={s.best}>
            {stats.average === null ? "—" : durationLabel(stats.average)}
          </Text>
          <Text style={s.note}>
            Celá historie · běžící série průměr nemění.
          </Text>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: "#ffffff12",
  },
  large: {
    color: "#FAFAFA",
    fontSize: 58,
    fontWeight: "600",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  rate: {
    fontSize: 48,
    fontWeight: "600",
    letterSpacing: -1.7,
    fontVariant: ["tabular-nums"],
  },
  label: {
    color: "#909090",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  best: {
    color: "#EFEFEF",
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  body: { color: "#BEBEBE", fontSize: 13, lineHeight: 21 },
  note: { color: "#818181", fontSize: 11, lineHeight: 18 },
  heading: {
    color: "#F4F4F4",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  section: {
    gap: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: "#ffffff12",
  },
  period: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#303030",
  },
});
