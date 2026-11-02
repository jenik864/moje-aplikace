import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Path,
  Rect,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { definitions, ProgramId } from "./model";
import { programContent } from "./programContent";
import { surface } from "./design";
export function ProgramIntro({
  id,
  accent,
}: {
  id: ProgramId;
  accent?: string;
}) {
  const d = { ...definitions[id], color: accent ?? definitions[id].color };
  const c = programContent[id];
  const gradient = `intro${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={[styles.hero, { borderColor: `${d.color}25` }]}>
      <Text style={[styles.label, { color: d.color }]}>{c.focus}</Text>
      <View style={styles.art}>
        <Svg
          width={180}
          height={130}
          viewBox="0 0 180 130"
          accessibilityLabel={`${d.title} ilustrace`}
        >
          <Defs>
            <RadialGradient id={`${gradient}halo`}>
              <Stop offset="0" stopColor={d.color} stopOpacity={0.16} />
              <Stop offset="1" stopColor={d.color} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={d.color} stopOpacity={0.28} />
              <Stop offset="0.5" stopColor="#1d1d1d" />
              <Stop offset="1" stopColor="#111111" />
            </LinearGradient>
          </Defs>
          <Circle cx={90} cy={65} r={64} fill={`url(#${gradient}halo)`} />
          {id === "porn" ? (
            <>
              <Circle
                cx="90"
                cy="65"
                r="50"
                stroke={`${d.color}35`}
                strokeWidth="2"
                fill={`url(#${gradient})`}
              />
              <Circle
                cx="90"
                cy="65"
                r="40"
                stroke={d.color}
                strokeWidth="3"
                fill="none"
                strokeDasharray="190 62"
                rotation="-90"
                origin="90,65"
              />
              <Path
                d="M90 35 V65 L109 76"
                stroke={d.color}
                strokeWidth="3"
                fill="none"
              />
              <Circle cx="90" cy="65" r="4" fill={d.color} />
            </>
          ) : id === "scroll" ? (
            <>
              <Rect
                x="55"
                y="12"
                width="70"
                height="106"
                rx="13"
                stroke={d.color}
                strokeWidth="2"
                fill={`url(#${gradient})`}
              />
              <Line
                x1="73"
                x2="107"
                y1="36"
                y2="36"
                stroke={`${d.color}70`}
                strokeWidth="5"
              />
              <Line
                x1="73"
                x2="107"
                y1="53"
                y2="53"
                stroke={`${d.color}50`}
                strokeWidth="5"
              />
              <Line
                x1="73"
                x2="107"
                y1="70"
                y2="70"
                stroke={`${d.color}30`}
                strokeWidth="5"
              />
              <Path d="M38 89 H142" stroke={d.color} strokeWidth="3" />
              <Circle cx="90" cy="103" r="3" fill={d.color} />
            </>
          ) : (
            <>
              <Circle
                cx="90"
                cy="65"
                r="48"
                stroke={`${d.color}45`}
                strokeWidth="2"
                fill="none"
              />
              <Circle
                cx="90"
                cy="65"
                r="34"
                stroke={d.color}
                strokeWidth="2"
                fill={`url(#${gradient})`}
              />
              <Path
                d="M74 64 L85 76 L108 51"
                stroke={d.color}
                strokeWidth="4"
                fill="none"
              />
              <Path
                d="M28 30 V100 M22 30 V45 Q28 52 34 45 V30 M152 30 V100"
                stroke={`${d.color}75`}
                strokeWidth="2"
                fill="none"
              />
            </>
          )}
        </Svg>
      </View>
      <Text style={styles.headline}>{c.headline}</Text>
      <Text style={styles.body}>{c.intro}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    paddingVertical: 24,
    gap: 16,
    borderRadius: 0,
    borderBottomWidth: 1,
    backgroundColor: "transparent",
  },
  label: { fontSize: 9, letterSpacing: 1.8, fontWeight: "700" },
  art: { alignItems: "center" },
  headline: {
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.8,
    fontWeight: "600",
    color: "#fff",
  },
  body: { fontSize: 14, lineHeight: 23, color: "#b0b0b0" },
});
