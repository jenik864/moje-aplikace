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
  const data = seriesData(p, now).slice(-8);
  const [selected, setSelected] = React.useState<string | null>(null);
  const maximum = Math.max(60000, ...data.map((d) => d.duration));
  const points = data.map((item, i) => ({
    x: data.length === 1 ? 150 : 30 + (i * 240) / (data.length - 1),
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
        height={compact ? 112 : 190}
        viewBox="0 0 300 190"
        accessibilityLabel="Délky posledních sérií"
      >
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.green} stopOpacity=".18" />
            <Stop offset="1" stopColor={palette.green} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {!compact && (
          <SvgText x="24" y="18" fontSize="10" fill="#8a9582">
            {durationLabel(maximum)}
          </SvgText>
        )}
        {[35, 87, 140].map((y) => (
          <Line
            key={y}
            x1="24"
            x2="282"
            y1={y}
            y2={y}
            stroke="#272d25"
            strokeDasharray="3 5"
          />
        ))}
        {data.length > 1 && (
          <>
            <Path
              d={`${path} L ${points[points.length - 1].x} 145 L ${points[0].x} 145 Z`}
              fill={`url(#${gradient})`}
            />
            <Path d={path} fill="none" stroke={palette.green} strokeWidth="2" />
          </>
        )}
        {points.map((point, i) => (
          <React.Fragment key={data[i].id}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={data[i].current ? 5 : 3}
              fill={data[i].current ? palette.green : "#a4b394"}
            />
            <SvgText
              x={point.x}
              y="169"
              textAnchor="middle"
              fontSize="10"
              fill="#8a9582"
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
                onPress={() => setSelected(item.id)}
                style={[
                  s.chip,
                  selected === item.id && { borderColor: palette.green },
                ]}
              >
                <Text style={s.muted}>
                  {item.current
                    ? "Teď"
                    : `#${p.history.length - data.length + 2 + i}`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.muted}>
            {pick
              ? `${pick.current ? "Aktuální série" : "Ukončená série"} · ${durationLabel(pick.duration)}`
              : "Délka jednotlivých sérií; poslední bod je stále rozpracovaný."}
          </Text>
        </>
      )}
    </View>
  );
}
export function ActivityChart({ p, now }: { p: Program; now: number }) {
  const data = trendDays(p, now);
  const max = Math.max(1, ...data.map((d) => d.resets.length + d.sos.length));
  return (
    <View>
      <Svg
        width="100%"
        height={150}
        viewBox="0 0 300 150"
        accessibilityLabel="Počty resetů a SOS za posledních 14 dní"
      >
        <SvgText x="4" y="18" fontSize="10" fill="#8a9582">
          {max} {max === 1 ? "událost" : max < 5 ? "události" : "událostí"}
        </SvgText>
        <Line x1="4" x2="296" y1="110" y2="110" stroke="#333" />
        {data.map((day, i) => {
          const resets = (day.resets.length * 75) / max;
          const sos = (day.sos.length * 75) / max;
          return (
            <React.Fragment key={i}>
              <Rect
                x={8 + i * 21}
                y={110 - resets}
                width="12"
                height={resets}
                rx="2"
                fill={palette.red}
              />
              <Rect
                x={8 + i * 21}
                y={110 - resets - sos}
                width="12"
                height={sos}
                rx="2"
                fill={palette.violet}
              />
              {i % 3 === 0 && (
                <SvgText
                  x={14 + i * 21}
                  y="134"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#8a9582"
                >
                  {day.date.getDate()}.{day.date.getMonth() + 1}.
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={s.selectors}>
        <Text style={[s.muted, { color: palette.red }]}>● Reset</Text>
        <Text style={[s.muted, { color: palette.violet }]}>
          ● Návrat ze SOS
        </Text>
      </View>
      <Text style={s.muted}>
        Výška sloupců odpovídá počtu uložených událostí. Prázdný den znamená
        žádnou uloženou událost.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  muted: { color: palette.muted, fontSize: 12, lineHeight: 19 },
  selectors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
    borderRadius: 8,
  },
});
