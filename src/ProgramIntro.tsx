import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Rect, Line } from "react-native-svg";
import { definitions, ProgramId } from "./model";
import { programContent } from "./programContent";
export function ProgramIntro({
  id,
  accent,
}: {
  id: ProgramId;
  accent?: string;
}) {
  const d = { ...definitions[id], color: accent ?? definitions[id].color };
  const c = programContent[id];
  return (
    <View style={[styles.hero, { borderColor: `${d.color}40` }]}>
      <Text style={[styles.label, { color: d.color }]}>{c.focus}</Text>
      <View style={styles.art}>
        <Svg
          width={180}
          height={130}
          viewBox="0 0 180 130"
          accessibilityLabel={`${d.title} ilustrace`}
        >
          {id === "porn" ? (
            <>
              <Circle
                cx="90"
                cy="65"
                r="50"
                stroke={`${d.color}35`}
                strokeWidth="2"
                fill="none"
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
                fill={`${d.color}08`}
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
                fill={`${d.color}08`}
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
    padding: 22,
    gap: 16,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "#111",
  },
  label: { fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  art: { alignItems: "center" },
  headline: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: "600",
    color: "#fff",
  },
  body: { fontSize: 14, lineHeight: 23, color: "#aaa" },
});
