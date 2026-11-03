import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
} from "@expo-google-fonts/space-grotesk";
import { ranks } from "../model";
import { useRankTheme } from "./theme";

const atlas = require("../../assets/dials/material-atlas.png");

export function MaterialDial({
  seconds: rawSeconds,
  progress,
  preview = false,
}: {
  seconds: number;
  progress: number;
  preview?: boolean;
}) {
  const { rank, accent } = useRankTheme();
  const { width } = useWindowDimensions();
  const [loaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
  });
  const size = Math.max(
    180,
    Math.min(preview ? 280 : 350, width - (preview ? 72 : 36)),
  );
  const seconds = Number.isFinite(rawSeconds)
    ? Math.max(0, Math.floor(rawSeconds))
    : 0;
  const days = Math.floor(seconds / 86400);
  const font = loaded
    ? "SpaceGrotesk_600SemiBold"
    : Platform.OS === "ios"
      ? "Helvetica Neue"
      : "sans-serif";
  const medium = loaded ? "SpaceGrotesk_500Medium" : font;
  const scale = size / 350;
  const fraction = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const circumference = 2 * Math.PI * 113;
  return (
    <View
      accessible
      accessibilityLabel={`Ciferník ${ranks[rank]} · ${days} dní bez porna, ${Math.floor(seconds / 3600) % 24} hodin, ${Math.floor(seconds / 60) % 60} minut, ${seconds % 60} sekund`}
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      {/* Clip the original atlas in the renderer; each material is a separate cell. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { overflow: "hidden", borderRadius: size / 2 },
        ]}
      >
        <Image
          source={atlas}
          resizeMode="stretch"
          accessible={false}
          style={{
            position: "absolute",
            width: size * 3,
            height: size * 4,
            left: -(rank % 3) * size,
            top: -Math.floor(rank / 3) * size,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Svg
          width={size}
          height={size}
          viewBox="0 0 350 350"
          accessible={false}
        >
          <Circle
            cx={175}
            cy={175}
            r={113}
            stroke="#ffffff0e"
            strokeWidth={1.4}
            fill="none"
          />
          {fraction > 0 && (
            <Circle
              cx={175}
              cy={175}
              r={113}
              stroke={accent}
              strokeOpacity={0.6}
              strokeWidth={1.4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              rotation={-90}
              origin="175,175"
            />
          )}
        </Svg>
      </View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
            transform: [{ translateY: -4 * scale }],
          },
        ]}
      >
        <Text
          style={{
            fontFamily: medium,
            color: accent,
            fontSize: Math.max(9, 10 * scale),
            letterSpacing: 2.8 * scale,
            marginBottom: 8 * scale,
          }}
        >
          {ranks[rank].toUpperCase()}
        </Text>
        <Text
          style={{
            color: "#8F9295",
            fontSize: Math.max(8, 8 * scale),
            letterSpacing: 2 * scale,
          }}
        >
          BEZ PORNA
        </Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{
            fontFamily: font,
            color: "#FAFAFA",
            fontSize: (days > 999 ? 60 : 80) * scale,
            lineHeight: 83 * scale,
            letterSpacing: -5 * scale,
            fontVariant: ["tabular-nums"],
            maxWidth: "58%",
            textShadowColor: "#000000",
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 2 },
          }}
        >
          {days}
        </Text>
        <Text
          style={{
            fontFamily: medium,
            color: "#B1B1B1",
            fontSize: Math.max(8, 8 * scale),
            letterSpacing: 2 * scale,
          }}
        >
          {days === 1 ? "DEN" : days > 1 && days < 5 ? "DNY" : "DNÍ"} V SÉRII
        </Text>
        <View
          style={{
            width: 90 * scale,
            height: 1,
            backgroundColor: `${accent}35`,
            marginTop: 10 * scale,
            marginBottom: 6 * scale,
          }}
        />
        <View style={{ flexDirection: "row", gap: 13 * scale }}>
          {[
            { value: Math.floor(seconds / 3600) % 24, label: "HOD" },
            { value: Math.floor(seconds / 60) % 60, label: "MIN" },
            { value: seconds % 60, label: "SEK" },
          ].map(({ value, label }) => (
            <View
              key={label}
              style={{
                alignItems: "center",
                width: 35 * scale,
                gap: 3 * scale,
              }}
            >
              <Text
                style={{
                  fontFamily: medium,
                  color: "#E2E2E2",
                  fontSize: 19 * scale,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {String(value).padStart(2, "0")}
              </Text>
              <Text
                style={{
                  color: "#737373",
                  fontSize: Math.max(8, 7.5 * scale),
                  letterSpacing: 1.3 * scale,
                }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
