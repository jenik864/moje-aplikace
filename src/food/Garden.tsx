import React from "react";
import { Text, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { dayKey, type Program } from "../model";
import { foodAnswers, type FoodPillar } from "./model";
export function HabitGarden({
  p,
  pillars,
  now,
  accent,
}: {
  p: Program;
  pillars: FoodPillar[];
  now: number;
  accent: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 7 + i);
    return dayKey(date);
  });
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {pillars.map((pillar, index) => {
        const statuses = days.map((key) =>
          key < pillar.startDay ||
          (pillar.endDay && key >= pillar.endDay) ||
          typeof p.days[key] !== "boolean"
            ? undefined
            : foodAnswers(p, key)[pillar.id],
        );
        const count = statuses.filter((v) => v === true).length;
        return (
          <View
            key={pillar.id}
            accessible
            accessibilityLabel={`${pillar.label}: ${count} dodržených dní za poslední týden, podle tvých zápisů`}
            style={{
              width: pillars.length === 1 ? 140 : 80,
              alignItems: "center",
              gap: 6,
            }}
          >
            <Svg
              width={pillars.length === 1 ? 120 : 76}
              height={112}
              viewBox="0 0 100 130"
            >
              <Path
                d="M50 106 C47 82 55 50 50 19"
                stroke={accent}
                strokeOpacity={0.6}
                strokeWidth={2}
                fill="none"
              />
              {statuses.map((value, i) => {
                const left = i % 2 === 0,
                  y = 91 - i * 10;
                return (
                  <Path
                    key={i}
                    d={
                      left
                        ? `M50 ${y} C25 ${y + 3} 20 ${y - 14} 24 ${y - 20} C40 ${y - 22} 51 ${y - 8} 50 ${y} Z`
                        : `M50 ${y} C75 ${y + 3} 80 ${y - 14} 76 ${y - 20} C60 ${y - 22} 49 ${y - 8} 50 ${y} Z`
                    }
                    fill={
                      value === true
                        ? accent
                        : value === false
                          ? "#d88996"
                          : "#1e2021"
                    }
                    stroke={
                      value === true
                        ? accent
                        : value === false
                          ? "#d88996"
                          : "#44403f"
                    }
                    strokeWidth={0.8}
                  />
                );
              })}
              <Circle
                cx={50}
                cy={18}
                r={5}
                fill={count === 7 ? accent : "#272424"}
                stroke={accent}
                strokeOpacity={0.5}
              />
              <Path
                d="M31 108 H69 L64 125 H36 Z"
                fill="#30251e"
                stroke={accent}
                strokeOpacity={0.5}
              />
            </Svg>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: "#bdb0a4",
                textAlign: "center",
              }}
            >
              {index + 1}. {pillar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
