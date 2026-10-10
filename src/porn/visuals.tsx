import React from "react";
import { Text, View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from "react-native-svg";
import { rankColors } from "../ui";
import { ranks } from "../model";
export const palette = {
  green: "#c4f879",
  violet: "#b79afa",
  text: "#f3f3ed",
  muted: "#92968e",
  border: "#252824",
  panel: "#121512",
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
      <Path d="M40 24 V61 M26 43 H54" stroke={c} strokeWidth=".7" />
      {rank >= 4 && (
        <Path d="M13 57 L40 80 L67 57" stroke={c} strokeWidth="2" fill="none" />
      )}
      {rank >= 7 && <Circle cx="40" cy="43" r="4" fill={c} />}
    </Svg>
  );
}
export function TimerDial({
  seconds,
  progress,
}: {
  seconds: number;
  progress: number;
}) {
  const radius = 132;
  const circ = 2 * Math.PI * radius;
  return (
    <View style={s.dial}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Circle
          cx="150"
          cy="150"
          r="147"
          stroke="#1b2119"
          strokeWidth="1"
          fill="#0a0d0a"
        />
        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i * Math.PI) / 30;
          const major = i % 5 === 0;
          return (
            <Line
              key={i}
              x1={150 + Math.sin(angle) * 140}
              y1={150 - Math.cos(angle) * 140}
              x2={150 + Math.sin(angle) * (major ? 135 : 138)}
              y2={150 - Math.cos(angle) * (major ? 135 : 138)}
              stroke={major ? "#586449" : "#30362b"}
              strokeWidth={major ? 1.5 : 1}
            />
          );
        })}
        <Circle
          cx="150"
          cy="150"
          r={radius}
          stroke="#263020"
          strokeWidth="3"
          fill="none"
        />
        <Circle
          cx="150"
          cy="150"
          r={radius}
          stroke={palette.green}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${circ * progress} ${circ}`}
          strokeLinecap="round"
          rotation="-90"
          origin="150,150"
        />
        <Circle
          cx="150"
          cy="150"
          r="119"
          stroke="#1d2418"
          strokeWidth=".5"
          fill="none"
        />
      </Svg>
      <View pointerEvents="none" style={s.dialText}>
        <Text style={s.label}>BEZ PORNA</Text>
        <Text style={s.days}>{Math.floor(seconds / 86400)}</Text>
        <Text style={s.dayLabel}>
          {Math.floor(seconds / 86400) === 1 ? "DEN" : "DNÍ"} V AKTUÁLNÍ SÉRII
        </Text>
        <View style={s.clock}>
          {[
            { v: Math.floor(seconds / 3600) % 24, l: "HOD" },
            { v: Math.floor(seconds / 60) % 60, l: "MIN" },
            { v: seconds % 60, l: "SEK" },
          ].map(({ v, l }) => (
            <View key={l} style={s.clockUnit}>
              <Text style={s.clockNumber}>{String(v).padStart(2, "0")}</Text>
              <Text style={s.clockLabel}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
const s = StyleSheet.create({
  dial: {
    width: "100%",
    maxWidth: 304,
    aspectRatio: 1,
    alignSelf: "center",
    marginVertical: 8,
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
  dayLabel: { color: "#8a9a7b", fontSize: 9, letterSpacing: 1.5 },
  clock: { flexDirection: "row", gap: 22, marginTop: 18 },
  clockUnit: { alignItems: "center", gap: 5 },
  clockNumber: {
    fontVariant: ["tabular-nums"],
    fontSize: 20,
    fontWeight: "500",
    color: "#dbe4d4",
  },
  clockLabel: { fontSize: 8, color: "#717c67", letterSpacing: 1.5 },
});

export function ArrowIcon({
  color = palette.green,
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
