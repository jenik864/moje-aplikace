import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { reasonLines } from "./reasons";

export function PersonalReasons({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const lines = reasonLines(value);
  return (
    <View style={{ gap: compact ? 14 : 0 }}>
      {(compact ? lines.slice(0, 1) : lines).map((line, i) => (
        <View
          key={i}
          style={[
            s.reason,
            compact && { paddingVertical: 6, borderBottomWidth: 0 },
          ]}
        >
          {!compact && (
            <Text style={s.index}>{String(i + 1).padStart(2, "0")}</Text>
          )}
          <Text
            numberOfLines={compact ? 3 : undefined}
            style={[s.text, compact && { fontSize: 22, lineHeight: 31 }]}
          >
            {line}
          </Text>
        </View>
      ))}
      {lines.length === 0 && (
        <Text style={s.empty}>
          Napiš si vlastní důvod. Stačí jedna věta, která ti něco připomene.
        </Text>
      )}
      {compact && (
        <Text style={s.empty}>
          {lines.length > 1
            ? `+ ${lines.length - 1} ${lines.length === 2 ? "další důvod" : lines.length < 6 ? "další důvody" : "dalších důvodů"} · Otevřít moje proč →`
            : "Moje vlastní rozhodnutí · Otevřít →"}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  reason: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff12",
  },
  index: {
    color: "#666666",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    paddingTop: 7,
    minWidth: 20,
  },
  text: {
    flex: 1,
    color: "#F3F3F3",
    fontSize: 23,
    lineHeight: 34,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  empty: { color: "#929292", fontSize: 12, lineHeight: 20 },
});
