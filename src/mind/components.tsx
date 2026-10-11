import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
export const violet = "#b8a0ff",
  mint = "#8ae7d1";
export function Button({
  children,
  onPress,
  quiet = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, quiet && s.quiet, disabled && { opacity: 0.4 }]}
    >
      <Text style={[s.buttonText, quiet && { color: violet }]}>{children}</Text>
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        selected && { backgroundColor: "#302542", borderColor: violet },
      ]}
    >
      <Text
        style={{
          color: selected ? violet : "#b1aabc",
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  number = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  number?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          s.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={number ? "number-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#746f80"
        maxLength={multiline ? 1000 : 80}
      />
    </View>
  );
}
export function Progress({
  value,
  color = violet,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View style={s.track}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: 5,
          backgroundColor: color,
          borderRadius: 5,
        }}
      />
    </View>
  );
}
export function Orbit({ small = false }: { small?: boolean }) {
  return (
    <Svg
      width={small ? 75 : 140}
      height={small ? 75 : 140}
      viewBox="0 0 160 160"
    >
      <Defs>
        <LinearGradient id="mindOrb" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={violet} />
          <Stop offset="1" stopColor={mint} />
        </LinearGradient>
      </Defs>
      <Circle
        cx="80"
        cy="80"
        r="65"
        stroke="#45365f"
        strokeWidth="1"
        fill="#20182f"
      />
      <Path
        d="M24 108C-5 67 109 16 137 53C166 91 43 145 24 108Z"
        fill="none"
        stroke="url(#mindOrb)"
        strokeWidth="2"
      />
      <Path
        d="M53 103V57L80 85L107 57V103"
        stroke="url(#mindOrb)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="136" cy="59" r="5" fill={mint} />
      <Circle cx="29" cy="112" r="4" fill={violet} />
    </Svg>
  );
}
export const s = StyleSheet.create({
  body: { padding: 20, gap: 24, paddingBottom: 36 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: {
    color: "#f6f3ff",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -2,
  },
  h2: {
    color: "#f6f3ff",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  h3: { color: "#f6f3ff", fontSize: 19, fontWeight: "700" },
  text: { color: "#ece7f5", fontSize: 17, lineHeight: 26 },
  muted: { color: "#aaa2b9", fontSize: 14, lineHeight: 22 },
  label: { color: violet, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  link: { color: violet, fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: "#131019",
    borderColor: "#32293f",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  hero: {
    backgroundColor: "#20172f",
    borderColor: "#655085",
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    gap: 18,
  },
  button: {
    backgroundColor: violet,
    borderRadius: 15,
    padding: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonText: {
    color: "#170f24",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  quiet: { backgroundColor: "#211b2c", borderColor: "#4c3b65", borderWidth: 1 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#39303f",
    backgroundColor: "#121016",
  },
  input: {
    color: "#fff",
    backgroundColor: "#0c0a10",
    borderWidth: 1,
    borderColor: "#43364f",
    borderRadius: 13,
    padding: 14,
    fontSize: 17,
    minHeight: 52,
  },
  track: {
    height: 5,
    backgroundColor: "#332a42",
    borderRadius: 5,
    overflow: "hidden",
  },
  error: { color: "#ffb0ba", fontSize: 14, lineHeight: 22 },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: "#30283a",
  },
  divider: { height: 1, backgroundColor: "#30283a" },
  stat: {
    color: mint,
    fontSize: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
