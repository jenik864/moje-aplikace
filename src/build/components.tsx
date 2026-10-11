import React, { createContext, useContext, useMemo } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import { type Exercise, muscleNames } from "./catalog";
export const blue = "#8cbfff";
export const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32, gap: 20 },
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
    backgroundColor: "#10151d",
    borderColor: "#263345",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  label: { color: blue, fontSize: 11, fontWeight: "700", letterSpacing: 1.8 },
  title: {
    color: "#f2f6fc",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
  },
  h2: {
    color: "#edf3fc",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  text: { color: "#e1e8f3", fontSize: 16, lineHeight: 24 },
  muted: { color: "#95a3b7", fontSize: 14, lineHeight: 22 },
  small: { color: "#95a3b7", fontSize: 12, lineHeight: 18 },
  button: {
    backgroundColor: blue,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonText: { color: "#0b1728", fontSize: 14, fontWeight: "700" },
  secondary: {
    backgroundColor: "#192333",
    borderWidth: 1,
    borderColor: "#354862",
  },
  secondaryText: { color: "#c2d9f7" },
  chip: {
    borderWidth: 1,
    borderColor: "#354156",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: "#254468", borderColor: blue },
  input: {
    backgroundColor: "#0a1018",
    color: "#edf3fc",
    borderWidth: 1,
    borderColor: "#354156",
    borderRadius: 13,
    padding: 14,
    fontSize: 16,
    minHeight: 50,
  },
  divider: { height: 1, backgroundColor: "#283344" },
  error: { color: "#ffb5a7", fontSize: 14, lineHeight: 21 },
  icon: { color: blue, fontSize: 30, fontWeight: "600" },
  pill: {
    backgroundColor: "#182b41",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#253043",
  },
  link: { color: blue, fontSize: 14, fontWeight: "600" },
  field: { gap: 7 },
  metric: { color: "#f1f6ff", fontSize: 32, fontWeight: "600" },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2c3747",
    gap: 8,
    minHeight: 78,
  },
  done: { backgroundColor: "#173b35", borderColor: "#71c9af" },
  badge: {
    width: 58,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: blue,
    backgroundColor: "#1b3553",
    borderRadius: 17,
  },
  step: { flexDirection: "row", gap: 12 },
  empty: { padding: 18, backgroundColor: "#0b1017", borderRadius: 15, gap: 8 },
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
        backgroundColor: color + "26",
        borderColor: color,
      },
      card: {
        ...s.card,
        backgroundColor: color + "0d",
        borderColor: color + "33",
      },
      secondary: {
        ...s.secondary,
        backgroundColor: color + "18",
        borderColor: color + "55",
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
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.4 }]}
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
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#65758c"
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
        height: 5,
        backgroundColor: "#293445",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 5,
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
  const s = useBuildStyles();
  const blue = useContext(BuildTheme);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      accessibilityLabel={`${done} z ${total} tréninků týdne dokončeno`}
    >
      <Circle
        cx="64"
        cy="64"
        r="58"
        fill={blue + "12"}
        stroke={blue + "44"}
        strokeWidth="1"
      />
      <Circle
        cx="64"
        cy="64"
        r="50"
        fill="none"
        stroke={blue + "30"}
        strokeWidth="4"
      />
      <Circle
        cx="64"
        cy="64"
        r="50"
        fill="none"
        stroke={blue}
        strokeWidth="4"
        strokeDasharray={`${total ? Math.min(1, done / total) * 314 : 0} 314`}
        rotation="-90"
        origin="64,64"
        strokeLinecap="round"
      />
      <Path d="M64 18 L67 23 L64 28 L61 23 Z" fill={blue} />
      <SvgText x="64" y="79" textAnchor="middle" fontSize="48" fill={blue}>
        {icon}
      </SvgText>
    </Svg>
  );
}
