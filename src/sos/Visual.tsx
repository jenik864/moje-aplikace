import { AttentionArtwork } from "../scroll/Artwork";
import React from "react";
import { AccessibilityInfo, Animated, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { TimerDial } from "../porn/visuals";
import { RankThemeProvider } from "../porn/theme";
import { milestones, ranks, type ProgramId } from "../model";
export function SosVisual({
  id,
  rank,
  seconds,
  remaining,
  duration,
  active,
  label,
  accent,
}: {
  id: ProgramId;
  rank: number;
  seconds: number;
  remaining: number;
  duration: number;
  active: boolean;
  label: string;
  accent: string;
}) {
  const pulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined,
      disposed = false;
    const configure = (reduce: boolean) => {
      animation?.stop();
      pulse.setValue(1);
      if (!reduce && !disposed) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1.018,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
        );
        animation.start();
      }
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(configure);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      configure,
    );
    return () => {
      disposed = true;
      animation?.stop();
      listener.remove();
    };
  }, [pulse]);
  const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const fraction = active ? 1 - remaining / duration : 0;
  if (id === "porn")
    return (
      <Animated.View
        style={{ alignItems: "center", transform: [{ scale: pulse }] }}
      >
        <RankThemeProvider rank={rank}>
          <TimerDial
            seconds={seconds}
            progress={
              rank === ranks.length - 1
                ? 1
                : Math.max(
                    0,
                    Math.min(
                      1,
                      (seconds / 86400 - milestones[rank]) /
                        (milestones[rank + 1] - milestones[rank]),
                    ),
                  )
            }
            preview
          />
        </RankThemeProvider>
      </Animated.View>
    );
  if (id === "scroll")
    return (
      <Animated.View
        style={{
          alignItems: "center",
          paddingVertical: 8,
          transform: [{ scale: pulse }],
        }}
      >
        <AttentionArtwork size={190} quiet />
        <Text
          style={{
            color: "#F5F5F5",
            fontSize: 56,
            fontWeight: "500",
            fontVariant: ["tabular-nums"],
            letterSpacing: -2,
            marginTop: -25,
          }}
        >
          {time}
        </Text>
        <Text
          style={{
            color: "#999999",
            fontSize: 9,
            letterSpacing: 2,
            marginTop: 6,
          }}
        >
          MIMO FEED
        </Text>
      </Animated.View>
    );
  const drink = /nápoj/i.test(label),
    meal = /jíd/i.test(label),
    sweets = /sladk/i.test(label);
  return (
    <Animated.View
      style={{
        alignItems: "center",
        paddingVertical: 5,
        transform: [{ scale: pulse }],
      }}
    >
      <Svg
        width={185}
        height={165}
        viewBox="0 0 185 165"
        accessibilityLabel={
          drink
            ? "Nápoj podle tvého plánu"
            : meal
              ? "Běžné syté jídlo"
              : sweets
                ? "Vědomá porce"
                : "Vědomá volba"
        }
      >
        <Circle cx={92.5} cy={82.5} r={67} fill="#1c1c1c" stroke="#47362b" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <Circle
              key={i}
              cx={92.5 + 76 * Math.cos(a)}
              cy={82.5 + 76 * Math.sin(a)}
              r={2.5}
              fill={i / 12 < fraction ? accent : "#6b4e3d"}
            />
          );
        })}
        {drink ? (
          <>
            <Path
              d="M 68 52 L 75 115 L 111 115 L 118 52 Z"
              fill="#493324"
              stroke={accent}
              strokeWidth={2}
            />
            <Path
              d="M 76 79 Q 92 69 111 79 L 107 108 L 80 108 Z"
              fill={accent}
            />
            <Path
              d="M 98 73 L 109 37 L 126 32"
              fill="none"
              stroke={accent}
              strokeWidth={3}
            />
          </>
        ) : meal ? (
          <>
            <Path
              d="M 51 77 Q 92 147 134 77 Z"
              fill="#493324"
              stroke={accent}
              strokeWidth={2}
            />
            <Path
              d="M 68 64 Q 60 53 70 41 M 93 64 Q 85 53 95 41 M 116 64 Q 108 53 118 41"
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
          </>
        ) : sweets ? (
          <>
            <Rect
              x={63}
              y={46}
              width={59}
              height={74}
              rx={8}
              fill="#493324"
              stroke={accent}
              strokeWidth={2}
            />
            <Path
              d="M 83 48 V 118 M 102 48 V 118 M 65 72 H 120 M 65 95 H 120"
              stroke={accent}
            />
          </>
        ) : (
          <>
            <Path
              d="M 56 62 L 92 42 L 130 62 L 130 105 L 92 125 L 56 105 Z"
              fill="#493324"
              stroke={accent}
              strokeWidth={2}
            />
            <Path
              d="M 75 83 L 87 95 L 111 69"
              fill="none"
              stroke={accent}
              strokeWidth={3}
            />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}
