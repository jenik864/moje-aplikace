import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
export function Action({
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
      accessibilityLabel={title}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#DDD" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Option({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        s.option,
        selected && { backgroundColor: "#F0F0F0", borderColor: "#F0F0F0" },
      ]}
    >
      <Text
        style={{
          color: selected ? "#111" : "#AAA",
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <Text style={[s.h2, { flex: 1 }]}>{title}</Text>
      {action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.link}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  label: {
    color: "#919191",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.8,
  },
  heading: {
    color: "#F6F6F6",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "600",
    letterSpacing: -1.6,
  },
  h2: {
    color: "#F3F3F3",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "600",
    letterSpacing: -0.7,
  },
  body: { color: "#BDBDBD", fontSize: 14, lineHeight: 23 },
  muted: { color: "#898989", fontSize: 12, lineHeight: 20 },
  note: { color: "#777", fontSize: 11, lineHeight: 18 },
  link: { color: "#DDD", fontSize: 12, fontWeight: "600" },
  section: {
    gap: 18,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderColor: "#ffffff12",
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: "#F1F1F1",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ffffff24",
  },
  option: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 54,
    borderBottomWidth: 1,
    borderColor: "#ffffff28",
    backgroundColor: "#ffffff04",
    padding: 14,
    color: "#F5F5F5",
    fontSize: 16,
    lineHeight: 23,
    borderRadius: 4,
  },
  metric: {
    color: "#F4F4F4",
    fontSize: 31,
    fontWeight: "600",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  error: { color: "#FF98A2", fontSize: 13, lineHeight: 21 },
});
