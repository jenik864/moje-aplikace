import React from "react";
import {
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Line,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { RankArtwork } from "../RankArtwork";
import { rankColors } from "../ui";
import { ranks } from "../model";
import { useRankTheme, tint } from "./theme";
export const palette = {
  violet: "#F5F5F5",
  text: "#F5F5F5",
  muted: "#999999",
  border: "#ffffff10",
  panel: "#151515",
  red: "#ff777e",
};
export function RankMark({ rank, size = 42 }: { rank: number; size?: number }) {
  return <RankArtwork rank={rank} color={rankColors[rank]} size={size} />;
}
// Material artwork and live native typography share one dial across screens and SOS.
export { MaterialDial as TimerDial } from "./Dial";
export function SosSymbol({ size = 58 }: { size?: number }) {
  const { accent } = useRankTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={30} fill={accent} />
      <Path
        d="M25 23 V41 M39 23 V41"
        stroke="#17120f"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
export function PauseDial({
  remaining,
  duration,
}: {
  remaining: number;
  duration: number;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(224, Math.max(144, width - 96));
  const font =
    Platform.OS === "ios"
      ? "Helvetica Neue"
      : Platform.OS === "android"
        ? "sans-serif"
        : "Arial";
  const progress = Math.max(0, Math.min(1, remaining / duration));
  const circumference = 2 * Math.PI * 103;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      accessibilityLabel={`Pauza: ${Math.floor(remaining / 60)} minut ${remaining % 60} sekund`}
    >
      <Circle cx={120} cy={120} r={115} fill="#171116" />
      <Circle
        cx={120}
        cy={120}
        r={103}
        stroke="#38212a"
        strokeWidth={3}
        fill="none"
      />
      {progress > 0 && (
        <Circle
          cx={120}
          cy={120}
          r={103}
          stroke="#ffb0b7"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          rotation={-90}
          origin="120,120"
          fill="none"
        />
      )}
      <Path
        d="M112 57 V70 M128 57 V70"
        stroke="#ffb0b7"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <SvgText
        x={120}
        y={136}
        fontFamily={font}
        fontSize={53}
        fontWeight="300"
        textAnchor="middle"
        fill="#fff0f1"
      >
        {`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
      </SvgText>
      <SvgText
        x={120}
        y={164}
        fontFamily={font}
        fontSize={8}
        letterSpacing={1.8}
        textAnchor="middle"
        fill="#c59aa4"
      >
        CHVÍLE PRO TEBE
      </SvgText>
    </Svg>
  );
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
const s = StyleSheet.create({
  label: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
  },
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
