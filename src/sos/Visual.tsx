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
        <View
          style={{
            width: 230,
            height: 210,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg
            width={230}
            height={210}
            viewBox="0 0 230 210"
            accessible={false}
            style={{ position: "absolute" }}
          >
            <Rect
              x={58}
              y={7}
              width={114}
              height={194}
              rx={27}
              fill="#181818"
              stroke={accent}
              strokeWidth={1.5}
            />
            <Line
              x1={99}
              y1={20}
              x2={131}
              y2={20}
              stroke={accent}
              strokeWidth={3}
            />
            {Array.from({ length: 12 }, (_, i) => (
              <Rect
                key={i}
                x={18 + i * 17}
                y={102 - Math.sin(i * 0.8) * 20}
                width={5}
                height={25 + Math.sin(i * 0.8) * 20}
                rx={2.5}
                fill={i / 12 < fraction ? accent : "#3e3e3e"}
              />
            ))}
            <Circle cx={115} cy={185} r={3} fill={accent} />
          </Svg>
          <Text
            style={{
              color: accent,
              fontSize: 56,
              fontWeight: "500",
              fontVariant: ["tabular-nums"],
              backgroundColor: "#181818",
              paddingHorizontal: 10,
            }}
          >
            {time}
          </Text>
          <Text
            style={{
              color: "#aeaeae",
              fontSize: 9,
              letterSpacing: 2,
              marginTop: 8,
            }}
          >
            MIMO FEED
          </Text>
        </View>
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
