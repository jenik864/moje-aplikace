import React, { createContext, useContext, useMemo, useId } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Ellipse,
} from "react-native-svg";
import { type Exercise, muscleNames } from "./catalog";
import { palette } from "../design";
export const blue = palette.Build;
export const s = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 28 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: "transparent",
    borderColor: "#ffffff16",
    borderTopWidth: 1,
    borderRadius: 0,
    paddingVertical: 22,
    paddingHorizontal: 0,
    gap: 16,
  },
  label: { color: blue, fontSize: 9, fontWeight: "700", letterSpacing: 1.8 },
  title: {
    color: "#f6f6f6",
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.8,
  },
  h2: {
    color: "#f2f2f2",
    fontSize: 25,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  text: { color: "#e2e2e2", fontSize: 15, lineHeight: 24 },
  muted: { color: "#a0a0a0", fontSize: 13, lineHeight: 21 },
  small: { color: "#a1a1a1", fontSize: 12, lineHeight: 18 },
  button: {
    backgroundColor: blue,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonText: { color: "#161616", fontSize: 14, fontWeight: "700" },
  secondary: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderColor: "#ffffff1b",
  },
  secondaryText: { color: "#d6d6d6" },
  chip: {
    borderBottomWidth: 1,
    borderColor: "#ffffff18",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 0,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#cccccc12", borderColor: blue },
  input: {
    backgroundColor: "#ffffff04",
    color: "#f2f2f2",
    borderBottomWidth: 1,
    borderColor: "#ffffff30",
    borderRadius: 4,
    padding: 14,
    fontSize: 16,
    minHeight: 50,
  },
  divider: { height: 1, backgroundColor: "#ffffff0e" },
  error: { color: "#ffb5a7", fontSize: 14, lineHeight: 21 },
  icon: { color: blue, fontSize: 30, fontWeight: "600" },
  pill: {
    backgroundColor: "#292929",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
    backgroundColor: "#121212ee",
  },
  link: { color: blue, fontSize: 14, fontWeight: "600" },
  field: { gap: 7 },
  metric: { color: "#f6f6f6", fontSize: 32, fontWeight: "600" },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 28,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    gap: 9,
    minHeight: 88,
  },
  done: { backgroundColor: "#cccccc12", borderColor: "#cccccc" },
  badge: {
    width: 58,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: blue,
    backgroundColor: "#cccccc12",
    borderRadius: 30,
  },
  step: { flexDirection: "row", gap: 12 },
  empty: {
    paddingVertical: 22,
    backgroundColor: "transparent",
    borderRadius: 0,
    gap: 8,
  },
  flex: { flex: 1 },
});
export const BuildTheme = createContext(blue);
export function useBuildStyles() {
  const color = useContext(BuildTheme);
  return useMemo(
    () => ({
      ...s,
      label: { ...s.label, color },
      link: { ...s.link, color },
      icon: { ...s.icon, color },
      button: { ...s.button, backgroundColor: color },
      chipOn: {
        ...s.chipOn,
        backgroundColor: color + "14",
        borderColor: color,
      },
      card: {
        ...s.card,
        backgroundColor: "transparent",
        borderColor: "#ffffff16",
      },
      secondary: {
        ...s.secondary,
        backgroundColor: "transparent",
        borderColor: "#ffffff22",
      },
      secondaryText: { ...s.secondaryText, color },
      pill: { ...s.pill, backgroundColor: color + "20" },
      badge: { ...s.badge, backgroundColor: color + "20", borderColor: color },
    }),
    [color],
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const s = useBuildStyles();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
export function Chip({
  title,
  onPress,
  active = false,
}: {
  title: string;
  onPress: () => void;
  active?: boolean;
}) {
  const s = useBuildStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.chip, active && s.chipOn]}
    >
      <Text style={s.text}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const s = useBuildStyles();
  return (
    <View style={s.field}>
      <Text style={s.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          s.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#737373"
      />
    </View>
  );
}
export function Progress({ value }: { value: number }) {
  const s = useBuildStyles();
  const blue = useContext(BuildTheme);
  return (
    <View
      style={{
        height: 3,
        backgroundColor: "#ffffff12",
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 3,
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          backgroundColor: blue,
        }}
      />
    </View>
  );
}
export function MissionArtwork({
  icon,
  done,
  total,
  size = 128,
}: {
  size?: number;
  icon: string;
  done: number;
  total: number;
}) {
  const blue = useContext(BuildTheme);
  const progress = total ? Math.min(1, done / total) : 0;
  const artId = `build${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      accessibilityLabel={`${done} z ${total} tréninků týdne dokončeno`}
    >
      <Defs>
        <LinearGradient id={`${artId}Track`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#eeeeee" />
          <Stop offset={0.5} stopColor={blue} />
          <Stop offset="1" stopColor="#858585" />
        </LinearGradient>
        <RadialGradient id={`${artId}Glow`}>
          <Stop offset="0" stopColor={blue} stopOpacity=".25" />
          <Stop offset="1" stopColor={blue} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="90" cy="90" r="88" fill={`url(#${artId}Glow)`} />
      {[57, 67, 77].map((r, i) => (
        <Circle
          key={r}
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={`url(#${artId}Track)`}
          strokeOpacity={0.18 + i * 0.14}
          strokeWidth={i === 2 ? 1 : 2}
          strokeDasharray={`${r * 4.7} ${r * 1.58}`}
          rotation={-115 + i * 13}
          origin="90,90"
        />
      ))}
      <Circle
        cx="90"
        cy="90"
        r="57"
        fill="none"
        stroke={`url(#${artId}Track)`}
        strokeWidth="6"
        strokeDasharray={`${progress * 358} 358`}
        strokeLinecap="round"
        rotation="-90"
        origin="90,90"
      />
      <Path
        d={
          icon === "↔"
            ? "M47 91C62 68 73 114 89 91S116 68 132 91"
            : "M55 104L74 78L93 94L125 58M109 58H125V74"
        }
        fill="none"
        stroke="#f5f5f5"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="90" cy="13" r="4" fill="#eeeeee" />
      <Circle cx="151" cy="138" r="2.5" fill="#b3b3b3" />
      <SvgText
        x="90"
        y="134"
        textAnchor="middle"
        fontSize="10"
        letterSpacing="2"
        fill={blue}
      >
        {total ? `${done} / ${total}` : "RECHARGE"}
      </SvgText>
    </Svg>
  );
}
