import React, { createContext, useContext, useId } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { border, palette } from "../design";
import {
  projectProgress,
  displayDate,
  type BusinessData,
  type Project,
  type Task,
} from "./model";
export const colors = ["#c7d6f4", "#79bdff", "#b7a0ff", "#62edbc", "#f5bba0"];
export const colorNames = ["Perleťová", "Modrá", "Fialová", "Zelená", "Měděná"];
export const BusinessTheme = createContext<string>(palette.Business);
export const statusNames = {
  active: "V práci",
  paused: "Pozastaveno",
  done: "Dokončeno",
};
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
  const color = useContext(BusinessTheme);
  const gradient = `action${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: quiet ? "transparent" : color,
          borderBottomColor: quiet ? "#ffffff18" : "transparent",
          borderBottomWidth: quiet ? 1 : 0,
        },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
      ]}
    >
      {!quiet && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            viewBox="0 0 300 60"
          >
            <Defs>
              <LinearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
                <Stop offset=".55" stopColor={color} stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity=".09" />
              </LinearGradient>
            </Defs>
            <Rect width="300" height="60" fill={`url(#${gradient})`} />
          </Svg>
        </View>
      )}
      <Text style={[s.buttonText, { color: quiet ? color : "#071322" }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Chip({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  const color = useContext(BusinessTheme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        s.chip,
        selected && {
          borderBottomColor: color,
          backgroundColor: "transparent",
        },
      ]}
    >
      <Text
        style={{
          color: selected ? color : "#9aa8bb",
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  numeric,
  maxLength = 120,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#637187"
        keyboardType={numeric ? "number-pad" : "default"}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          s.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Progress({ value, color }: { value: number; color: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      style={s.track}
    >
      <View
        style={{
          height: 3,
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          backgroundColor: color,
          borderRadius: 3,
        }}
      />
    </View>
  );
}
export function ProjectCard({
  project,
  data,
  onPress,
}: {
  project: Project;
  data: BusinessData;
  onPress: () => void;
}) {
  const progress = projectProgress(data, project.id),
    color = colors[project.color];
  const next = data.tasks.find(
    (t) => t.projectId === project.id && t.doneAt === undefined,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Projekt ${project.title}`}
      onPress={onPress}
      style={({ pressed }) => [s.projectRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.projectAccent, { backgroundColor: color }]} />
      <View style={{ gap: 11, flex: 1 }}>
        <View style={s.between}>
          <View style={[s.row, { gap: 7 }]}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={[s.label, { color }]}>
              {project.archivedAt !== undefined
                ? "V ARCHIVU"
                : statusNames[project.status].toUpperCase()}
            </Text>
          </View>
          <Text style={[s.small, { fontVariant: ["tabular-nums"] }]}>
            {progress.done} / {progress.total}
          </Text>
        </View>
        <View style={s.between}>
          <Text style={[s.h2, { flex: 1 }]}>{project.title}</Text>
          <Text style={[s.projectArrow, { color }]}>→</Text>
        </View>
        <Text numberOfLines={2} style={s.muted}>
          {project.outcome}
        </Text>
        <Progress value={progress.fraction} color={color} />
        {next &&
          project.status === "active" &&
          project.archivedAt === undefined && (
            <Text numberOfLines={1} style={s.small}>
              Další: {next.title}
            </Text>
          )}
        <Text style={[s.link, { color, alignSelf: "flex-start" }]}>
          Otevřít →
        </Text>
      </View>
    </Pressable>
  );
}
export function TaskRow({
  task,
  project,
  today,
  showProject = false,
  onToggle,
  onOpen,
}: {
  task: Task;
  project: Project;
  today: string;
  showProject?: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const done = task.doneAt !== undefined,
    editable = project.status === "active" && project.archivedAt === undefined;
  const color = colors[project.color],
    overdue = !done && task.plannedFor !== undefined && task.plannedFor < today;
  return (
    <View style={[s.task, overdue && { borderBottomColor: "#f5bba040" }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${done ? "Splněný úkol" : "Dokončit úkol"} ${task.title}`}
        accessibilityState={{ checked: done, disabled: !editable }}
        aria-checked={done}
        disabled={!editable}
        onPress={onToggle}
        style={s.check}
      >
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Circle
            cx={12}
            cy={12}
            r={10}
            stroke={done ? color : "#67778d"}
            fill={done ? `${color}22` : "none"}
            strokeWidth={1.3}
          />
          {done && (
            <Path
              d="M7 12L10 15L17 8"
              fill="none"
              stroke={color}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Otevřít úkol ${task.title}`}
        onPress={onOpen}
        style={{ flex: 1, gap: 6, paddingVertical: 14, paddingRight: 14 }}
      >
        {showProject && (
          <Text style={[s.label, { color }]}>
            {project.title.toUpperCase()}
          </Text>
        )}
        <Text
          style={[
            s.text,
            { fontWeight: "500" },
            done && { color: "#8997aa", textDecorationLine: "line-through" },
          ]}
        >
          {task.title}
        </Text>
        <Text style={[s.small, overdue && { color: "#d4a181" }]}>
          {[
            done ? "Hotovo" : task.priority === "high" ? "Důležité" : undefined,
            task.plannedFor
              ? task.plannedFor === today
                ? "Dnes"
                : `${overdue ? "Čeká od " : ""}${displayDate(task.plannedFor)}`
              : "Bez data",
            task.minutes ? `${task.minutes} min · odhad` : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Pressable>
    </View>
  );
}
export const s = StyleSheet.create({
  body: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 38, gap: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: {
    color: "#f4f6fa",
    fontSize: 44,
    fontWeight: "700",
    letterSpacing: -2.1,
  },
  h2: {
    color: "#f4f6fa",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  h3: {
    color: "#f4f6fa",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  text: { color: "#dce3ee", fontSize: 15, lineHeight: 23 },
  muted: { color: "#94a1b4", fontSize: 13, lineHeight: 21 },
  small: { color: "#94a1b4", fontSize: 11, lineHeight: 17 },
  label: {
    color: palette.Business,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  link: { color: palette.Business, fontSize: 13, fontWeight: "600" },
  card: {
    borderTopWidth: 1,
    borderColor: "#ffffff12",
    paddingVertical: 20,
    gap: 15,
  },
  hero: { paddingVertical: 16, gap: 20 },
  projectRow: {
    flexDirection: "row",
    gap: 18,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff12",
  },
  projectAccent: { width: 2, borderRadius: 2, marginVertical: 4 },
  projectArrow: { fontSize: 25, fontWeight: "400" },
  section: {
    paddingTop: 22,
    gap: 18,
    borderTopWidth: 1,
    borderColor: "#ffffff12",
  },
  summary: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff14",
    paddingVertical: 18,
    gap: 12,
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: -1.2,
    color: "#edf5ff",
    fontVariant: ["tabular-nums"],
  },
  summaryLabel: { fontSize: 11, color: "#91a2ba", lineHeight: 17 },
  workspaceTabs: {
    flexDirection: "row",
    gap: 22,
    borderBottomWidth: 1,
    borderColor: "#ffffff14",
  },
  emptyHeadline: {
    color: "#f6f7ff",
    fontSize: 42,
    fontWeight: "600",
    letterSpacing: -1.8,
    lineHeight: 46,
  },
  template: {
    paddingVertical: 20,
    paddingLeft: 17,
    borderLeftWidth: 2,
    borderLeftColor: "#ffffff16",
    gap: 10,
  },
  number: {
    color: palette.Business,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  button: {
    minHeight: 50,
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 17,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  chip: {
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    paddingHorizontal: 2,
    paddingVertical: 13,
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#ffffff03",
    color: "#f4f6fa",
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff24",
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 50,
    fontSize: 16,
  },
  dot: { height: 7, width: 7, borderRadius: 4 },
  track: {
    height: 3,
    borderRadius: 3,
    backgroundColor: "#ffffff0c",
    overflow: "hidden",
  },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff12",
  },
  check: {
    width: 48,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: "#ffb0ba", fontSize: 13, lineHeight: 21 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: border,
    backgroundColor: "#070a12ee",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: "#ffffff0d" },
});
