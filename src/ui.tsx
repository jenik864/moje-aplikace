import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Text,
} from "react-native";
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { ranks } from "./model";

// Native tab screens and modal roots can initially report zero insets.
// Window metrics preserve the status-bar clearance while their measurement settles.
export function Screen({
  children,
  modal = false,
}: {
  children: React.ReactNode;
  modal?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        paddingTop: top,
        paddingBottom: modal
          ? Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0)
          : 0,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
export const rankColors = [
  "#cf956e",
  "#b58a5d",
  "#c8d1dc",
  "#f2cf75",
  "#e1f0f4",
  "#6f9fff",
  "#ff687b",
  "#7cebaf",
  "#b3e8ff",
  "#bd9aff",
];
export function RankEmblem({
  value,
  size = 36,
}: {
  value: number;
  size?: number;
}) {
  const color = rankColors[value];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityLabel={`${ranks[value]} emblém`}
    >
      <Path
        d="M50 5 L87 26 L87 73 L50 95 L13 73 L13 26 Z"
        stroke={color}
        strokeWidth="3"
        fill={`${color}15`}
      />
      <Path
        d="M50 24 L71 50 L50 76 L29 50 Z"
        stroke={color}
        strokeWidth="3"
        fill={`${color}25`}
      />
      {value >= 3 && (
        <Path
          d="M50 13 L78 32 L78 68 L50 85 L22 68 L22 32 Z"
          stroke={color}
          strokeWidth="1"
          fill="none"
        />
      )}
      {value >= 6 && (
        <Path d="M29 50 H71 M50 24 V76" stroke={color} strokeWidth="2" />
      )}
      {value >= 8 && <Circle cx="50" cy="50" r="7" fill={color} />}
      {Array.from({ length: value + 1 }, (_, i) => (
        <Circle
          key={i}
          cx={30 + (i % 5) * 10}
          cy={i < 5 ? 83 : 17}
          r="2"
          fill={color}
        />
      ))}
    </Svg>
  );
}
export function RankBadge({ value }: { value: number }) {
  return (
    <View style={[styles.badge, { borderColor: `${rankColors[value]}70` }]}>
      <RankEmblem value={value} size={30} />
      <Text
        style={{
          color: rankColors[value],
          fontWeight: "800",
          fontSize: 12,
          letterSpacing: 1,
        }}
      >
        {ranks[value].toUpperCase()}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    backgroundColor: "#131313",
  },
});
