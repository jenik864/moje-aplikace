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
import { RankArtwork } from "./RankArtwork";
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
  "#929fae",
  "#c8d1dc",
  "#f2cf75",
  "#e1f0f4",
  "#6f9fff",
  "#b58aff",
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
  return <RankArtwork rank={value} color={rankColors[value]} size={size} />;
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
