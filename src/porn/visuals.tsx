import React from "react";
import { Text, View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  RadialGradient,
  Polygon,
} from "react-native-svg";
import { rankColors } from "../ui";
import { ranks } from "../model";
import { useRankTheme, tint } from "./theme";
export const palette = {
  violet: "#b79afa",
  text: "#f3f3ed",
  muted: "#ada9a5",
  border: "#2b2928",
  panel: "#141313",
  red: "#ff777e",
};
export function RankMark({ rank, size = 42 }: { rank: number; size?: number }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const c = rankColors[rank];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 80 88"
      accessibilityLabel={`${ranks[rank]} emblém`}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c} />
          <Stop offset="1" stopColor="#252925" />
        </LinearGradient>
      </Defs>
      <Path
        d="M40 3 L70 19 V56 L40 84 L10 56 V19 Z"
        fill={`url(#${id})`}
        stroke={c}
        strokeWidth="1"
      />
      <Path
        d="M40 13 L60 25 V52 L40 72 L20 52 V25 Z"
        fill="#121512"
        stroke={c}
        strokeWidth="1"
      />
      <Path
        d="M40 24 L54 43 L40 61 L26 43 Z"
        fill={`${c}25`}
        stroke={c}
        strokeWidth="1.5"
      />
      <Path d="M40 24 V61 M26 43 H54" stroke={c} strokeWidth={0.7} />
      {rank >= 4 && (
        <Path d="M13 57 L40 80 L67 57" stroke={c} strokeWidth="2" fill="none" />
      )}
      {rank >= 7 && <Circle cx="40" cy="43" r="4" fill={c} />}
    </Svg>
  );
}
// Each rank unlocks a distinct silhouette, not just a recolored circle.
const designs = [
  { name: "Origin", ticks: 12, frame: 0 },
  { name: "Forged", ticks: 24, frame: 1 },
  { name: "Precision", ticks: 60, frame: 2 },
  { name: "Radiance", ticks: 60, frame: 3 },
  { name: "Orbit", ticks: 60, frame: 4 },
  { name: "Prism", ticks: 60, frame: 5 },
  { name: "Sovereign", ticks: 60, frame: 6 },
  { name: "Sanctum", ticks: 60, frame: 7 },
  { name: "Celestial", ticks: 60, frame: 8 },
  { name: "Eclipse", ticks: 60, frame: 9 },
];
export function TimerDial({
  seconds,
  progress,
  preview = false,
}: {
  seconds: number;
  progress: number;
  preview?: boolean;
}) {
  const { rank, accent } = useRankTheme();
  const design = designs[rank];
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = 125,
    circ = 2 * Math.PI * r;
  const polygon = (radius: number, sides: number, rotation = 0) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 + rotation;
      return `${150 + Math.sin(a) * radius},${150 - Math.cos(a) * radius}`;
    }).join(" ");
  return (
    <View
      accessibilityLabel={`Ciferník ${ranks[rank]} · ${design.name}`}
      style={[s.dial, preview && { maxWidth: 220 }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor="#101010" />
            <Stop offset={0.72} stopColor="#101010" />
            <Stop
              offset="1"
              stopColor={accent}
              stopOpacity={rank >= 5 ? 0.19 : 0.06}
            />
          </RadialGradient>
          <LinearGradient id={`${id}metal`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} />
            <Stop offset={0.5} stopColor="#383332" />
            <Stop offset="1" stopColor={accent} />
          </LinearGradient>
        </Defs>
        <Circle
          cx="150"
          cy="150"
          r="146"
          fill={`url(#${id})`}
          stroke={tint(accent, 0.22)}
          strokeWidth={rank === 0 ? 0.7 : 1}
        />
        {rank === 1 &&
          [0, 1, 2, 3].map((i) => (
            <Circle
              key={i}
              cx={150 + Math.sin((i * Math.PI) / 2) * 140}
              cy={150 - Math.cos((i * Math.PI) / 2) * 140}
              r="2.4"
              stroke={accent}
              fill="#131110"
            />
          ))}
        {rank === 2 && (
          <>
            <Circle
              cx="150"
              cy="150"
              r="143"
              fill="none"
              stroke={tint(accent, 0.55)}
              strokeDasharray="40 14"
            />
            <Circle
              cx="150"
              cy="150"
              r="114"
              fill="none"
              stroke={tint(accent, 0.3)}
            />
          </>
        )}
        {rank === 3 &&
          Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return (
              <Path
                key={i}
                d={`M ${150 + Math.sin(a) * 139} ${150 - Math.cos(a) * 139} L ${150 + Math.sin(a) * 145} ${150 - Math.cos(a) * 145}`}
                stroke={accent}
                strokeWidth="3"
              />
            );
          })}
        {rank === 4 && (
          <>
            <Circle
              cx="150"
              cy="150"
              r="140"
              stroke={accent}
              strokeWidth="1.5"
              strokeDasharray="85 30"
              fill="none"
            />
            <Circle
              cx="150"
              cy="150"
              r="116"
              stroke={tint(accent, 0.4)}
              fill="none"
            />
          </>
        )}
        {rank === 5 && (
          <>
            <Polygon
              points={polygon(146, 6)}
              fill="none"
              stroke={accent}
              strokeWidth="1.3"
            />
            <Polygon
              points={polygon(138, 6)}
              fill="none"
              stroke={tint(accent, 0.35)}
            />
          </>
        )}
        {rank === 6 && (
          <>
            <Polygon
              points={polygon(146, 12)}
              fill="none"
              stroke={`url(#${id}metal)`}
              strokeWidth="2"
            />
            <Circle
              cx="150"
              cy="150"
              r="137"
              fill="none"
              stroke={tint(accent, 0.65)}
              strokeWidth="3"
            />
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2;
              const x = 150 + Math.sin(a) * 139,
                y = 150 - Math.cos(a) * 139;
              return (
                <Path
                  key={i}
                  d={`M ${x} ${y - 5} L ${x + 4} ${y} L ${x} ${y + 5} L ${x - 4} ${y} Z`}
                  fill={accent}
                />
              );
            })}
          </>
        )}
        {rank === 7 && (
          <>
            <Polygon
              points={polygon(146, 8, Math.PI / 8)}
              stroke={accent}
              strokeWidth="1.6"
              fill="none"
            />
            <Polygon
              points={polygon(140, 8)}
              stroke={tint(accent, 0.5)}
              fill="none"
            />
            <Circle
              cx="150"
              cy="150"
              r="116"
              stroke={tint(accent, 0.4)}
              fill="none"
            />
          </>
        )}
        {rank === 8 && (
          <>
            {[0, 1].map((i) => (
              <Polygon
                key={i}
                points={polygon(i ? 138 : 146, 12, (i * Math.PI) / 12)}
                fill="none"
                stroke={tint(accent, i ? 0.4 : 0.8)}
                strokeWidth={i ? 1 : 1.5}
              />
            ))}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              return (
                <Circle
                  key={i}
                  cx={150 + Math.sin(a) * 143}
                  cy={150 - Math.cos(a) * 143}
                  r={i % 3 === 0 ? 3 : 1.5}
                  fill={accent}
                />
              );
            })}
          </>
        )}
        {rank === 9 && (
          <>
            <Circle
              cx="150"
              cy="150"
              r="141"
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeOpacity={0.15}
            />
            <Circle
              cx="150"
              cy="150"
              r="141"
              fill="none"
              stroke={accent}
              strokeWidth="1"
            />
            <Polygon
              points={polygon(146, 16)}
              stroke={tint(accent, 0.65)}
              fill="none"
            />
            {[0, 1, 2, 3].map((i) => (
              <Path
                key={i}
                d="M142 9 L150 2 L158 9 L150 17 Z"
                fill={accent}
                rotation={i * 90}
                origin="150,150"
              />
            ))}
            <Circle
              cx="150"
              cy="150"
              r="113"
              stroke={tint(accent, 0.4)}
              fill="none"
            />
          </>
        )}
        {Array.from({ length: design.ticks }, (_, i) => {
          const a = (i * Math.PI * 2) / design.ticks;
          const major = i % (design.ticks / 12) === 0;
          return (
            <Line
              key={i}
              x1={150 + Math.sin(a) * 134}
              y1={150 - Math.cos(a) * 134}
              x2={150 + Math.sin(a) * (major ? 130 : 132)}
              y2={150 - Math.cos(a) * (major ? 130 : 132)}
              stroke={tint(accent, major ? 0.65 : 0.25)}
              strokeWidth={major ? 1.5 : 1}
            />
          );
        })}
        <Circle
          cx="150"
          cy="150"
          r={r}
          stroke={tint(accent, 0.15)}
          strokeWidth={rank >= 6 ? 3 : 2}
          fill="none"
        />
        {progress > 0 && (
          <Circle
            cx="150"
            cy="150"
            r={r}
            stroke={accent}
            strokeWidth={rank >= 6 ? 3 : 2}
            fill="none"
            strokeDasharray={`${circ * progress} ${circ}`}
            strokeLinecap="round"
            rotation="-90"
            origin="150,150"
          />
        )}
      </Svg>
      <View pointerEvents="none" style={s.dialText}>
        <Text style={[s.label, { fontSize: preview ? 8 : 10 }]}>BEZ PORNA</Text>
        <Text
          style={[
            s.days,
            {
              color: accent,
              fontSize: preview ? 48 : 68,
              lineHeight: preview ? 58 : 78,
            },
          ]}
        >
          {Math.floor(seconds / 86400)}
        </Text>
        <Text
          style={[s.dayLabel, { color: "#b7aca4", fontSize: preview ? 7 : 9 }]}
        >
          {Math.floor(seconds / 86400) === 1 ? "DEN" : "DNÍ"} V AKTUÁLNÍ SÉRII
        </Text>
        <View style={[s.clock, preview && { marginTop: 10, gap: 16 }]}>
          {[
            { v: Math.floor(seconds / 3600) % 24, l: "HOD" },
            { v: Math.floor(seconds / 60) % 60, l: "MIN" },
            { v: seconds % 60, l: "SEK" },
          ].map(({ v, l }) => (
            <View key={l} style={s.clockUnit}>
              <Text
                style={[
                  s.clockNumber,
                  { color: accent, fontSize: preview ? 15 : 22 },
                ]}
              >
                {String(v).padStart(2, "0")}
              </Text>
              <Text style={s.clockLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
export function SosSymbol({ size = 58 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="29" fill="#221419" stroke="#713640" />
      <Path
        d="M32 10 L48 20 V36 L32 53 L16 36 V20 Z"
        stroke="#ff969e"
        strokeWidth="1.3"
        fill="#351b23"
      />
      <Path
        d="M24 30 V27 M28 27 V24 M32 27 V23 M36 28 V26 M24 28 V36 Q24 43 32 43 Q40 43 40 35 V31 Q40 28 37 31 L36 33"
        stroke="#ffb6bc"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <Circle
        cx="32"
        cy="32"
        r="24"
        stroke="#713640"
        strokeDasharray="2 5"
        fill="none"
      />
    </Svg>
  );
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
const s = StyleSheet.create({
  dial: {
    width: "100%",
    maxWidth: 286,
    aspectRatio: 1,
    alignSelf: "center",
    marginVertical: 0,
  },
  dialText: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  days: {
    color: palette.text,
    fontSize: 74,
    fontWeight: "600",
    letterSpacing: -4,
    fontVariant: ["tabular-nums"],
    lineHeight: 86,
  },
  dayLabel: { color: "#b7aca4", fontSize: 9, letterSpacing: 1.5 },
  clock: { flexDirection: "row", gap: 22, marginTop: 18 },
  clockUnit: { alignItems: "center", gap: 5 },
  clockNumber: {
    fontVariant: ["tabular-nums"],
    fontSize: 20,
    fontWeight: "500",
    color: "#ddd2cc",
  },
  clockLabel: { fontSize: 9, color: "#ada49e", letterSpacing: 1.5 },
});

export function ArrowIcon({
  color = rankColors[0],
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 18 L18 6 M7 6 H18 V17"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
