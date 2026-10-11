import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
import { type Exercise, type Muscle, muscleNames } from "./catalog";
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
        fill="#101e30"
        stroke="#30455e"
        strokeWidth="1"
      />
      <Circle
        cx="64"
        cy="64"
        r="50"
        fill="none"
        stroke="#24364e"
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
const shapes: Record<Muscle, string> = {
  shoulders: "M36 37Q23 36 22 55L33 57L39 43Z M64 37Q77 36 78 55L67 57L61 43Z",
  chest: "M37 41L48 42L48 60L34 57Z M63 41L52 42L52 60L66 57Z",
  core: "M36 62L48 64L48 91L39 85Z M64 62L52 64L52 91L61 85Z",
  biceps: "M22 57L32 59L29 78L20 76Z M78 57L68 59L71 78L80 76Z",
  triceps: "M22 57L32 59L29 79L20 76Z M78 57L68 59L71 79L80 76Z",
  back: "M36 43L49 46L49 89L39 84L33 58Z M64 43L51 46L51 89L61 84L67 58Z",
  glutes: "M38 87L49 90L48 110L35 107Z M62 87L51 90L52 110L65 107Z",
  quads: "M36 96L48 100L46 137L34 136Z M64 96L52 100L54 137L66 136Z",
  hamstrings: "M36 112L48 114L46 137L34 136Z M64 112L52 114L54 137L66 136Z",
  calves: "M35 143L45 143L43 170L36 170Z M65 143L55 143L57 170L64 170Z",
};
function Body({ back, exercise }: { back: boolean; exercise: Exercise }) {
  const visible: Muscle[] = back
    ? ["shoulders", "triceps", "back", "glutes", "hamstrings", "calves"]
    : ["shoulders", "chest", "core", "biceps", "quads", "calves"];
  return (
    <View style={{ flex: 1, maxWidth: 120 }}>
      <Svg width="100%" height={205} viewBox="0 0 100 190">
        <Circle cx="50" cy="18" r="12" fill="#243040" stroke="#40506a" />
        <Path
          d="M42 30L58 30L62 36Q75 34 79 48L83 83L86 100L78 103L68 71L67 92L70 123L66 177L54 177L50 122L46 177L34 177L30 123L33 92L32 71L22 103L14 100L17 83L21 48Q25 34 38 36Z"
          fill="#202b3a"
          stroke="#40506a"
        />
        {visible.map((m) => (
          <Path
            key={m}
            d={shapes[m]}
            fill={
              exercise.main.includes(m)
                ? blue
                : exercise.secondary.includes(m)
                  ? "#4778a7"
                  : "#2e3d51"
            }
            opacity={0.95}
          />
        ))}
        <Line x1="50" x2="50" y1="43" y2="115" stroke="#17202d" />
        <SvgText x="50" y="189" textAnchor="middle" fontSize="8" fill="#95a3b7">
          {back ? "ZÁDA" : "ZEPŘEDU"}
        </SvgText>
      </Svg>
    </View>
  );
}
export function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  return (
    <View style={s.card}>
      <Text style={s.label}>TECHNIKA / {exercise.equipment.toUpperCase()}</Text>
      <Text style={s.h2}>{exercise.name}</Text>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
        <Body exercise={exercise} back={false} />
        <Body exercise={exercise} back />
      </View>
      <Text style={s.text}>
        Hlavní: {exercise.main.map((m) => muscleNames[m]).join(", ")}
      </Text>
      {exercise.secondary.length > 0 && (
        <Text style={s.muted}>
          Pomocné: {exercise.secondary.map((m) => muscleNames[m]).join(", ")}
        </Text>
      )}
      <Text style={s.small}>
        Modrá = hlavní svaly · tmavší modrá = pomocné. Schematická mapa.
      </Text>
      {exercise.steps.map((step, i) => (
        <View key={i} style={s.step}>
          <Text style={s.label}>{i + 1}.</Text>
          <Text style={[s.text, s.flex]}>{step}</Text>
        </View>
      ))}
      <Text style={s.muted}>{exercise.error}</Text>
      <Text style={s.small}>
        Zvol rozsah a zátěž bez bolesti. U nového cviku si nech zkontrolovat
        techniku.
      </Text>
    </View>
  );
}
