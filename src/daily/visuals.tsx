import React from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Path,
} from "react-native-svg";
import { tint } from "../porn/theme";

export function BudgetDial({
  minutes,
  limit,
  accent,
}: {
  minutes: number | null;
  limit: number;
  accent: string;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(250, Math.max(180, width - 100));
  const over = minutes !== null && minutes > limit;
  const color = over ? "#ff919e" : accent;
  const progress = Math.min(
    1,
    Math.max(0, (minutes ?? 0) / Math.max(1, limit)),
  );
  const displayMinutes =
    minutes === null ? "—" : minutes.toLocaleString("cs-CZ");
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const font =
    Platform.OS === "ios"
      ? "Helvetica Neue"
      : Platform.OS === "android"
        ? "sans-serif"
        : "Arial";
  const circumference = 2 * Math.PI * 108;
  return (
    <View
      accessible
      accessibilityLabel={`Dnešní čas: ${minutes === null ? "zatím nezapsán" : `${minutes} minut`}. Denní limit ${limit} minut.`}
      style={{ width: size, height: size, alignSelf: "center" }}
    >
      <Svg width={size} height={size} viewBox="0 0 260 260">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset={0} stopColor={tint(accent, 0.4)} />
            <Stop offset={0.5} stopColor="#181619" />
            <Stop offset={1} stopColor={tint(accent, 0.3)} />
          </LinearGradient>
        </Defs>
        <Circle cx={130} cy={130} r={125} fill={`url(#${id})`} />
        <Circle cx={130} cy={130} r={114} fill="#0b0b0d" />
        <Circle
          cx={130}
          cy={130}
          r={108}
          stroke={tint(color, 0.18)}
          strokeWidth={3}
          fill="none"
        />
        {progress > 0 && (
          <Circle
            cx={130}
            cy={130}
            r={108}
            stroke={color}
            strokeWidth={3}
            strokeDasharray={`${progress * circumference} ${circumference}`}
            rotation={-90}
            origin="130,130"
            strokeLinecap="round"
            fill="none"
          />
        )}
        <SvgText
          x={130}
          y={72}
          textAnchor="middle"
          fontFamily={font}
          fontSize={10}
          letterSpacing={2}
          fill="#bdb3ae"
        >
          DNEŠNÍ ČAS
        </SvgText>
        <SvgText
          x={130}
          y={141}
          textAnchor="middle"
          fontFamily={font}
          fontSize={
            displayMinutes.length > 5 ? 40 : displayMinutes.length > 3 ? 48 : 62
          }
          fontWeight="300"
          fill={color}
        >
          {displayMinutes}
        </SvgText>
        <SvgText
          x={130}
          y={164}
          textAnchor="middle"
          fontFamily={font}
          fontSize={11}
          fill="#ded1c8"
        >
          z {limit.toLocaleString("cs-CZ")} min
        </SvgText>
        <Path d="M107 181 H153" stroke={tint(color, 0.25)} />
        <SvgText
          x={130}
          y={202}
          textAnchor="middle"
          fontFamily={font}
          fontSize={9}
          letterSpacing={1}
          fill={color}
        >
          {minutes === null
            ? "ZAPIŠ SVŮJ ČAS"
            : over
              ? "NAD LIMITEM"
              : "V TVÉM ROZPOČTU"}
        </SvgText>
      </Svg>
    </View>
  );
}
