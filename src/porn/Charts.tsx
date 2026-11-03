import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Program } from "../model";
import { seriesData, durationLabel, activityBuckets } from "./analytics";
import { statusColors } from "../statusColors";

const shortDuration = (ms: number) =>
  ms >= 86400000
    ? `${Number((ms / 86400000).toFixed(1))} d`
    : ms >= 3600000
      ? `${Number((ms / 3600000).toFixed(1))} h`
      : `${Math.floor(ms / 60000)} m`;
const date = (at: number) =>
  new Date(at).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });

export function SeriesChart({
  p,
  now,
  compact = false,
}: {
  p: Program;
  now: number;
  compact?: boolean;
}) {
  const data = seriesData(p, now).slice(compact ? -5 : -8);
  const [selected, setSelected] = React.useState("current");
  const pick = data.find((d) => d.id === selected) ?? data[data.length - 1];
  const maximum = Math.max(60000, ...data.map((d) => d.duration));
  const height = compact ? 100 : 150;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {!compact && (
          <View style={{ height, justifyContent: "space-between", width: 35 }}>
            {[maximum, maximum / 2, 0].map((v, i) => (
              <Text key={i} style={s.axis}>
                {shortDuration(v)}
              </Text>
            ))}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { height, justifyContent: "space-between" },
            ]}
          >
            {[0, 1, 2].map((n) => (
              <View key={n} style={s.grid} />
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: data.length > 5 ? 7 : 14,
              height: height + 26,
            }}
          >
            {data.map((item, i) => (
              <Pressable
                key={item.id}
                disabled={compact}
                pointerEvents={compact ? "none" : "auto"}
                accessible={!compact}
                aria-hidden={compact || undefined}
                accessibilityRole={compact ? undefined : "button"}
                accessibilityState={{ selected: item.id === selected }}
                accessibilityLabel={
                  compact
                    ? undefined
                    : `Detail ${item.current ? "aktuální série" : `série ${p.history.length - data.length + 2 + i}`}`
                }
                accessibilityValue={{ text: durationLabel(item.duration) }}
                onPress={() => setSelected(item.id)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    width: "100%",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      height: Math.max(
                        item.duration > 0 ? 2 : 0,
                        (item.duration / maximum) * (height - 8),
                      ),
                      width: "72%",
                      maxWidth: 44,
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                      backgroundColor: item.current
                        ? "#ffffff13"
                        : item.id === selected
                          ? "#EEEEEE"
                          : "#646464",
                      borderWidth: item.current ? 1.5 : 0,
                      borderColor: "#DEDEDE",
                      borderStyle: "dashed",
                    }}
                  />
                </View>
                <Text
                  style={[
                    s.axis,
                    {
                      height: 26,
                      paddingTop: 8,
                      color: item.current ? "#E5E5E5" : "#858585",
                    },
                  ]}
                >
                  {item.current
                    ? "Teď"
                    : `#${p.history.length - data.length + 2 + i}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      {!compact && (
        <>
          <View style={s.readout}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.eyebrow}>
                {pick.current ? "AKTUÁLNÍ SÉRIE" : "UKONČENÁ SÉRIE"}
              </Text>
              <Text style={s.value}>{durationLabel(pick.duration)}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={s.muted}>
                {date(pick.start)} → {pick.current ? "teď" : date(pick.end)}
              </Text>
              {pick.current && (
                <Text
                  style={{
                    color: statusColors.success,
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  ● BĚŽÍ
                </Text>
              )}
            </View>
          </View>
          <Text style={s.note}>
            Každý sloupec je jedna série. Obrys označuje tu, která právě běží.
            Klepnutím zobrazíš délku a datum.
          </Text>
        </>
      )}
    </View>
  );
}

export function ActivityChart({
  p,
  now,
  days = 14,
}: {
  p: Program;
  now: number;
  days?: number;
}) {
  const data = activityBuckets(p, now, days);
  const [selected, setSelected] = React.useState<number | null>(null);
  React.useEffect(() => setSelected(null), [days]);
  const max = Math.max(1, ...data.map((d) => d.resets + d.sos));
  const pick = selected === null ? null : data[selected];
  const total = data.reduce((sum, d) => sum + d.resets + d.sos, 0);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View
          style={{ width: 18, height: 120, justifyContent: "space-between" }}
        >
          <Text style={s.axis}>{max}</Text>
          <Text style={s.axis}>0</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { height: 120, justifyContent: "space-between" },
            ]}
          >
            {[0, 1, 2].map((n) => (
              <View key={n} style={s.grid} />
            ))}
          </View>
          <View
            style={{
              height: 146,
              flexDirection: "row",
              gap: data.length > 7 ? 4 : 14,
            }}
          >
            {data.map((day, i) => (
              <Pressable
                key={day.from}
                accessibilityRole="button"
                accessibilityLabel={`Události ${date(day.from)}${day.to !== day.from ? ` až ${date(day.to)}` : ""}`}
                accessibilityValue={{
                  text: `${day.resets} resetů, ${day.sos} návratů SOS`,
                }}
                accessibilityState={{ selected: selected === i }}
                onPress={() => setSelected(i)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    width: "100%",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: "72%",
                      maxWidth: 34,
                      opacity: selected === null || selected === i ? 1 : 0.4,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: (day.resets / max) * 112,
                        backgroundColor: statusColors.failure,
                      }}
                    />
                    <View
                      style={{
                        height: (day.sos / max) * 112,
                        backgroundColor: statusColors.success,
                      }}
                    />
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[s.axis, { height: 26, paddingTop: 8, fontSize: 9 }]}
                >
                  {data.length <= 7 ||
                  i === 0 ||
                  i === data.length - 1 ||
                  i === Math.floor(data.length / 2)
                    ? date(day.from)
                    : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Text style={[s.muted, { color: statusColors.failure }]}>● Reset</Text>
        <Text style={[s.muted, { color: statusColors.success }]}>
          ● Návrat ze SOS
        </Text>
      </View>
      {pick && (
        <View style={s.readout}>
          <Text style={s.muted}>
            {date(pick.from)}
            {pick.to !== pick.from ? ` – ${date(pick.to)}` : ""}
          </Text>
          <Text style={{ color: "#F5F5F5", fontSize: 12 }}>
            {pick.resets} resetů · {pick.sos} SOS
          </Text>
        </View>
      )}
      <Text style={s.note}>
        {!total ? "V tomto období nejsou uložené žádné události. " : ""}
        {days > 14
          ? "Sloupce shrnují vždy 7 dní; poslední může být kratší."
          : "Jeden sloupec odpovídá jednomu dni."}{" "}
        Návrat ze SOS není reset.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  axis: { color: "#777777", fontSize: 10, fontVariant: ["tabular-nums"] },
  grid: { height: 1, backgroundColor: "#ffffff0d" },
  muted: { color: "#A5A5A5", fontSize: 12, lineHeight: 19 },
  note: { color: "#888888", fontSize: 11, lineHeight: 18 },
  readout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff12",
  },
  eyebrow: { color: "#989898", fontSize: 9, letterSpacing: 1.4 },
  value: {
    color: "#F4F4F4",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.7,
    fontVariant: ["tabular-nums"],
  },
});
