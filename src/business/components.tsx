import React, { createContext, useContext } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { surface, border } from "../design";
import {
  projectProgress,
  displayDate,
  type BusinessData,
  type Project,
  type Task,
} from "./model";
export const colors = ["#c5d3ec", "#8cbfff", "#c2a5fa", "#91d6b3", "#d4a181"];
export const colorNames = ["Perleťová", "Modrá", "Fialová", "Zelená", "Měděná"];
export const BusinessTheme = createContext(colors[0]);
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: quiet ? "#ffffff05" : color,
          borderColor: quiet ? "#ffffff14" : "transparent",
        },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[s.buttonText, { color: quiet ? color : "#10151e" }]}>
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
          borderColor: `${color}65`,
          backgroundColor: `${color}14`,
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
      style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}
    >
      <View style={s.between}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={s.small}>
          {project.archivedAt !== undefined
            ? "V archivu"
            : statusNames[project.status]}
        </Text>
      </View>
      <Text style={s.h2}>{project.title}</Text>
      <Text numberOfLines={2} style={s.muted}>
        {project.outcome}
      </Text>
      <Progress value={progress.fraction} color={color} />
      <View style={s.between}>
        <Text style={s.small}>
          {progress.done}/{progress.total} kroků hotovo
        </Text>
        <Text style={[s.link, { color }]}>Otevřít →</Text>
      </View>
      {next &&
        project.status === "active" &&
        project.archivedAt === undefined && (
          <Text numberOfLines={1} style={s.small}>
            Další: {next.title}
          </Text>
        )}
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
    <View style={[s.task, overdue && { borderColor: "#d4a18130" }]}>
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
  body: { padding: 20, paddingBottom: 32, gap: 22 },
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
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.7,
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
    color: colors[0],
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  link: { color: colors[0], fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: surface,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 23,
    padding: 20,
    gap: 15,
  },
  hero: {
    backgroundColor: "#111924",
    borderColor: "#c5d3ec25",
    borderWidth: 1,
    borderRadius: 27,
    padding: 20,
    gap: 18,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  chip: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffffff14",
    backgroundColor: "#ffffff03",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#090e17",
    color: "#f4f6fa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffffff18",
    padding: 14,
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
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 18,
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
    backgroundColor: "#0d121bee",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: "#ffffff0d" },
});
