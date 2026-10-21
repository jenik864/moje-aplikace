import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { Program } from "../model";
import { seriesData, durationLabel, trendDays } from "./analytics";
import { useRankTheme, tint } from "./theme";
import { palette } from "./visuals";
export function SeriesChart({
  p,
  now,
  compact = false,
}: {
  p: Program;
  now: number;
  compact?: boolean;
}) {
  const { accent } = useRankTheme();
  const data = seriesData(p, now).slice(-8);
  const [selected, setSelected] = React.useState<string | null>("current");
  const maximum = Math.max(60000, ...data.map((d) => d.duration));
  const points = data.map((item, i) => ({
    x:
      data.length === 1
        ? 150
        : (compact ? 12 : 62) + (i * (compact ? 276 : 222)) / (data.length - 1),
    y: 140 - (item.duration / maximum) * 105,
  }));
  const path = points
    .map((pt, i) => `${i ? "L" : "M"} ${pt.x} ${pt.y}`)
    .join(" ");
  const pick = data.find((d) => d.id === selected);
  const gradient = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View>
      <Svg
        width="100%"
        height={compact ? 165 : 210}
        viewBox="0 0 300 190"
        preserveAspectRatio="none"
        accessibilityLabel="Délky posledních sérií"
      >
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity={0.18} />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[35, 87, 140].map((y, i) => (
          <React.Fragment key={y}>
            <Line
              x1={compact ? 12 : 62}
              x2="288"
              y1={y}
              y2={y}
              stroke="#ffffff12"
              strokeDasharray="3 5"
            />
            {!compact && (
              <SvgText x="4" y={y + 3} fontSize="10" fill="#beb7b1">
                {axisDuration(maximum * (1 - i / 2))}
              </SvgText>
            )}
          </React.Fragment>
        ))}
        {data.length > 1 && (
          <>
            <Path
              d={`${path} L ${points[points.length - 1].x} 145 L ${points[0].x} 145 Z`}
              fill={`url(#${gradient})`}
            />
            {points.length > 2 && (
              <Path
                d={points
                  .slice(0, -1)
                  .map((pt, i) => `${i ? "L" : "M"} ${pt.x} ${pt.y}`)
                  .join(" ")}
                fill="none"
                stroke={accent}
                strokeWidth="2"
              />
            )}
            <Path
              d={`M ${points[points.length - 2].x} ${points[points.length - 2].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeDasharray="4 5"
            />
          </>
        )}
        {points.map((point, i) => (
          <React.Fragment key={data[i].id}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={data[i].current ? 5 : 3}
              fill={data[i].current ? "#070a12" : accent}
              stroke={accent}
              strokeWidth={data[i].current ? 2 : 0}
              onPress={() => setSelected(data[i].id)}
            />
            <SvgText
              x={point.x}
              y="169"
              textAnchor="middle"
              fontSize="10"
              fill="#b0a49c"
            >
              {data[i].current
                ? "Teď"
                : `#${p.history.length - data.length + 2 + i}`}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
      {!compact && (
        <>
          <View style={s.selectors}>
            {data.map((item, i) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Detail ${item.current ? "aktuální série" : `série ${p.history.length - data.length + 2 + i}`}`}
                accessibilityState={{ selected: selected === item.id }}
                onPress={() => setSelected(item.id)}
                style={[
                  s.chip,
                  selected === item.id && {
                    borderColor: accent,
                    backgroundColor: tint(accent, 0.1),
                  },
                ]}
              >
                <Text
                  style={[s.muted, selected === item.id && { color: accent }]}
                >
                  {item.current
                    ? "Teď"
                    : `#${p.history.length - data.length + 2 + i}`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.muted}>
            ● Ukončené série · ○ Běžící série (přerušovaně)
          </Text>
          <Text style={[s.muted, { color: palette.text, marginTop: 8 }]}>
            {pick
              ? `${pick.current ? "Aktuální série" : "Ukončená série"} · ${durationLabel(pick.duration)}`
              : "Vyber sérii pro přesnou délku."}
          </Text>
        </>
      )}
    </View>
  );
}
export function ActivityChart({ p, now }: { p: Program; now: number }) {
  const { accent } = useRankTheme();
  const [selected, setSelected] = React.useState<number | null>(null);
  const data = trendDays(p, now);
  const peak = Math.max(0, ...data.map((d) => d.resets.length + d.sos.length));
  const max = Math.max(2, Math.ceil(peak / 2) * 2);
  const selectedDay = selected === null ? null : data[selected];
  return (
    <View>
      <Svg
        width="100%"
        height={150}
        viewBox="0 0 300 150"
        accessibilityLabel="Počty resetů a SOS za posledních 14 dní"
      >
        <SvgText x="4" y="18" fontSize="10" fill="#beb7b1">
          Počet událostí
        </SvgText>
        {[35, 72, 110].map((y, i) => (
          <React.Fragment key={y}>
            <Line
              x1="30"
              x2="288"
              y1={y}
              y2={y}
              stroke="#ffffff12"
              strokeDasharray="3 5"
            />
            <SvgText x="8" y={y + 3} fontSize="10" fill="#beb7b1">
              {Math.round(max * (1 - i / 2))}
            </SvgText>
          </React.Fragment>
        ))}
        {data.map((day, i) => {
          const resets = (day.resets.length * 75) / max;
          const sos = (day.sos.length * 75) / max;
          return (
            <React.Fragment key={i}>
              <Rect
                x={34 + i * 18}
                y={110 - resets}
                width="11"
                height={resets}
                rx="2"
                fill={palette.red}
              />
              <Rect
                x={34 + i * 18}
                y={110 - resets - sos}
                width="11"
                height={sos}
                rx="2"
                fill={accent}
              />
              {[0, 6, 13].includes(i) && (
                <SvgText
                  x={39 + i * 18}
                  y="134"
                  textAnchor="middle"
                  fontSize="10"
                  fill="#b0a49c"
                >
                  {`${day.date.getDate()}. ${day.date.getMonth() + 1}.`}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={s.selectors}>
        <Text style={[s.muted, { color: palette.red }]}>● Reset</Text>
        <Text style={[s.muted, { color: accent }]}>● Návrat ze SOS</Text>
      </View>
      <View style={s.selectors}>
        {data.map((day, i) =>
          day.resets.length + day.sos.length > 0 ? (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Události ${day.date.toLocaleDateString("cs-CZ")}`}
              onPress={() => setSelected(i)}
              style={[s.chip, selected === i && { borderColor: accent }]}
            >
              <Text style={s.muted}>
                {day.date.getDate()}. {day.date.getMonth() + 1}.
              </Text>
            </Pressable>
          ) : null,
        )}
      </View>
      {selectedDay && (
        <Text style={s.muted}>
          {selectedDay.date.toLocaleDateString("cs-CZ")} · Resety:{" "}
          {selectedDay.resets.length} · Návraty SOS: {selectedDay.sos.length}
        </Text>
      )}
      <Text style={s.muted}>
        Výška sloupců odpovídá počtu uložených událostí. Prázdný den znamená
        žádnou uloženou událost.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  muted: { color: palette.muted, fontSize: 12, lineHeight: 20 },
  selectors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderBottomWidth: 1,
    borderColor: "#ffffff14",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 0,
  },
});

function axisDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  const days = Math.floor(minutes / 1440);
  if (days) return `${days} ${days === 1 ? "den" : days < 5 ? "dny" : "dní"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours
    ? `${hours} h${remainder ? ` ${remainder} min` : ""}`
    : `${minutes} min`;
}
