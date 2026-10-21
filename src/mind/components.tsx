import React, { createContext, useContext, useId } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  Ellipse,
} from "react-native-svg";
export const violet = "#B7A0FF",
  mint = "#8ae7d1";
export const MindTheme = createContext("#B7A0FF");
export function useMindStyles() {
  const color = useContext(MindTheme);
  return {
    ...s,
    label: { ...s.label, color },
    link: { ...s.link, color },
    card: {
      ...s.card,
      backgroundColor: "transparent",
      borderColor: "#ffffff12",
    },
    hero: {
      ...s.hero,
      backgroundColor: "transparent",
      borderColor: `${color}25`,
    },
    button: { ...s.button, backgroundColor: color },
    quiet: {
      ...s.quiet,
      backgroundColor: "transparent",
      borderColor: "#ffffff1a",
    },
    chip: {
      ...s.chip,
      backgroundColor: "#ffffff05",
      borderColor: "transparent",
    },
    track: { ...s.track, backgroundColor: `${color}22` },
    input: { ...s.input, borderColor: "#ffffff18" },
  };
}
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
  const s = useMindStyles();
  const color = useContext(MindTheme);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet && s.quiet,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={[s.buttonText, quiet && { color }]}>{children}</Text>
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
  const s = useMindStyles();
  const color = useContext(MindTheme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-selected={!!selected}
      onPress={onPress}
      style={[
        s.chip,
        selected && {
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? color : "#b8b5ae",
          fontSize: 13,
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
  const s = useMindStyles();
  const color = useContext(MindTheme);
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
export function Progress({ value, color }: { value: number; color?: string }) {
  const s = useMindStyles();
  const useColor = useContext(MindTheme);
  return (
    <View style={s.track}>
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height: 5,
          backgroundColor: color ?? useColor,
          borderRadius: 5,
        }}
      />
    </View>
  );
}
export function Orbit({ small = false }: { small?: boolean }) {
  const id = `orb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const color = useContext(MindTheme);
  return (
    <Svg
      width={small ? 75 : 140}
      height={small ? 75 : 140}
      viewBox="0 0 160 160"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor={mint} />
        </LinearGradient>
      </Defs>
      <Circle
        cx="80"
        cy="80"
        r="65"
        stroke={`${color}40`}
        strokeWidth="1"
        fill={`${color}12`}
      />
      <Path
        d="M24 108C-5 67 109 16 137 53C166 91 43 145 24 108Z"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="2"
      />
      <Path
        d="M53 103V57L80 85L107 57V103"
        stroke={`url(#${id})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="136" cy="59" r="5" fill={mint} />
      <Circle cx="29" cy="112" r="4" fill={color} />
    </Svg>
  );
}
export function MindSignal({
  width = 160,
  height = 140,
}: {
  width?: number;
  height?: number;
}) {
  const color = useContext(MindTheme),
    id = `signal${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 260 220" accessible={false}>
      <Defs>
        <RadialGradient id={`${id}glow`}>
          <Stop offset="0" stopColor={color} stopOpacity=".36" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}line`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mint} />
          <Stop offset=".5" stopColor={color} />
          <Stop offset="1" stopColor="#7658EF" stopOpacity=".15" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="132" cy="106" rx="114" ry="108" fill={`url(#${id}glow)`} />
      {Array.from({ length: 9 }, (_, i) => (
        <Path
          key={i}
          d={`M${25 + i * 3} ${145 + i * 4}C${11 + i * 2} ${40 - i * 2} ${169 + i * 4} ${21 + i * 5} ${211 - i * 2} ${82 + i * 5}C${250 - i * 3} ${146 + i * 3} ${94 - i * 2} ${211 - i * 2} ${43 + i * 3} ${142 - i * 2}`}
          fill="none"
          stroke={`url(#${id}line)`}
          strokeWidth={i === 4 ? 2.5 : 1}
          opacity={i === 4 ? 1 : 0.35 + i * 0.05}
        />
      ))}
      <Path
        d="M52 126L93 77L132 133L180 70L209 103"
        fill="none"
        stroke={mint}
        strokeWidth="1.5"
        opacity=".65"
      />
      {[
        [52, 126],
        [93, 77],
        [132, 133],
        [180, 70],
        [209, 103],
      ].map(([cx, cy], i) => (
        <React.Fragment key={i}>
          <Circle
            cx={cx}
            cy={cy}
            r={i === 2 ? 13 : 8}
            fill={i === 2 ? `${mint}15` : `${color}20`}
          />
          <Circle
            cx={cx}
            cy={cy}
            r={i === 2 ? 4 : 2.5}
            fill={i === 2 ? mint : color}
          />
        </React.Fragment>
      ))}
    </Svg>
  );
}
export const s = StyleSheet.create({
  body: { padding: 24, gap: 26, paddingBottom: 34 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: {
    color: "#f4f6fa",
    fontSize: 46,
    fontWeight: "600",
    letterSpacing: -2.2,
  },
  h2: {
    color: "#f6f3ff",
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: -0.9,
  },
  h3: { color: "#f6f3ff", fontSize: 19, fontWeight: "700" },
  text: { color: "#dce3ee", fontSize: 15, lineHeight: 24 },
  muted: { color: "#94a1b4", fontSize: 13, lineHeight: 21 },
  label: { color: violet, fontSize: 9, fontWeight: "700", letterSpacing: 1.8 },
  link: { color: violet, fontSize: 15, fontWeight: "700" },
  card: {
    backgroundColor: "transparent",
    borderColor: "#ffffff12",
    borderTopWidth: 1,
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 22,
    paddingHorizontal: 0,
    gap: 16,
  },
  hero: {
    backgroundColor: "transparent",
    borderColor: "#B7A0FF25",
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 18,
  },
  button: {
    backgroundColor: violet,
    borderRadius: 28,
    padding: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonText: {
    color: "#10131a",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  quiet: {
    backgroundColor: "transparent",
    borderColor: "#ffffff20",
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#39303f",
    backgroundColor: "#121016",
  },
  input: {
    color: "#fff",
    backgroundColor: "#ffffff04",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: "#ffffff20",
    borderRadius: 3,
    padding: 14,
    fontSize: 16,
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
    borderRadius: 24,
    gap: 8,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  divider: { height: 1, backgroundColor: "#ffffff0e" },
  stat: {
    color: mint,
    fontSize: 30,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
});
