import React, { useId } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

// A static highlight and a deep lower edge give the emergency action depth
// without flashing or competing with the rank clock.
export function EmergencyAction({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const id = `sos${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        pressed && {
          transform: [{ translateY: 2 }],
          shadowOpacity: 0.18,
          opacity: 0.94,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { overflow: "hidden", borderRadius: 17 },
        ]}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 360 120"
          preserveAspectRatio="none"
          accessible={false}
        >
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset={0} stopColor="#FF6B70" />
              <Stop offset={0.18} stopColor="#F13F4A" />
              <Stop offset={0.65} stopColor="#D91E30" />
              <Stop offset={1} stopColor="#AF1022" />
            </LinearGradient>
          </Defs>
          <Rect width={360} height={120} fill={`url(#${id})`} />
        </Svg>
      </View>
      <View pointerEvents="none" style={styles.highlight} />
      {children}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  shell: {
    minHeight: 58,
    padding: 18,
    gap: 11,
    borderRadius: 18,
    backgroundColor: "#D91E30",
    borderWidth: 1,
    borderTopColor: "#FF9095",
    borderLeftColor: "#F55A64",
    borderRightColor: "#B9192A",
    borderBottomColor: "#790B18",
    borderBottomWidth: 4,
    shadowColor: "#F13245",
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  highlight: {
    position: "absolute",
    top: 1,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: "#ffffff55",
  },
});
