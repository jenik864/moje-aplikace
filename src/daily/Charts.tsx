import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import type { Program } from "../model";
import { dailyTrend, type DailyId } from "./analytics";
import { dailyStyles } from "./styles";
import { tint } from "../porn/theme";
export function DailyChart({
  id,
  p,
  now,
  accent,
  compact = false,
}: {
  id: DailyId;
  p: Program;
  now: number;
  accent: string;
  compact?: boolean;
}) {
  const trend = dailyTrend(p, now, 14);
  const [selected, setSelected] = React.useState<string | null>(null);
  const selectedDay = trend.find((d) => d.key === selected);
  const s = dailyStyles(accent);
  const { width } = useWindowDimensions();
  const size = Math.min(330, Math.max(180, width - 88));
  const maximum =
    Math.ceil(Math.max(p.limit, 1, ...trend.map((d) => d.minutes ?? 0)) / 2) *
    2;
  const recorded = trend.filter((d) =>
    id === "scroll" ? d.minutes !== null : d.confirmed || d.draft !== null,
  );
  return (
    <View style={{ gap: 12 }}>
      <Svg
        width={size}
        height={compact ? 130 : 170}
        viewBox="0 0 320 170"
        accessibilityLabel={
          id === "scroll"
            ? "Ručně zaznamenané minuty za posledních 14 dní"
            : "Dodržení pravidla za posledních 14 dní"
        }
      >
        {[35, 75, 115].map((y, i) => (
          <React.Fragment key={y}>
            <Line
              x1={38}
              x2={310}
              y1={y}
              y2={y}
              stroke="#ffffff13"
              strokeDasharray="3 5"
            />
            {id === "scroll" && (
              <SvgText x={2} y={y + 3} fontSize={9} fill="#b5b5b5">
                {Math.round(maximum * (1 - i / 2))}
              </SvgText>
            )}
          </React.Fragment>
        ))}
        {id === "scroll" && (
          <Line
            x1={38}
            x2={310}
            y1={115 - (p.limit / maximum) * 80}
            y2={115 - (p.limit / maximum) * 80}
            stroke={tint(accent, 0.6)}
            strokeDasharray="4 4"
          />
        )}
        {trend.map((d, i) => {
          const x = 40 + i * 19.4;
          const known =
            id === "scroll"
              ? d.minutes !== null
              : d.confirmed || d.draft !== null;
          const success = d.pending ? d.draft : d.success;
          const color = success === false ? "#ff919e" : accent;
          const height =
            id === "scroll"
              ? Math.max(3, ((d.minutes ?? 0) / maximum) * 80)
              : 56;
          return known ? (
            <Rect
              key={d.key}
              x={x}
              y={115 - height}
              width={12}
              height={height}
              rx={1.5}
              fill={d.pending ? tint(color, 0.12) : tint(color, 0.75)}
              stroke={d.pending ? color : "none"}
              strokeWidth={1}
              strokeDasharray={d.pending ? "3 2" : undefined}
            />
          ) : (
            <Rect
              key={d.key}
              x={x}
              y={112}
              width={12}
              height={3}
              rx={1}
              fill="#ffffff25"
            />
          );
        })}
        {[0, 6, 13].map((i) => (
          <SvgText
            key={i}
            x={46 + i * 19.4}
            y={140}
            fontSize={9}
            textAnchor="middle"
            fill="#b5b5b5"
          >
            {trend[i].date.getDate()}. {trend[i].date.getMonth() + 1}.
          </SvgText>
        ))}
      </Svg>
      {!compact && (
        <>
          <Text style={s.muted}>
            {id === "scroll"
              ? "Čárkovaná čára = denní limit. "
              : "Barva ranku = dodrženo, růžová = mimo plán. "}
            {id === "scroll"
              ? "Obrys = dnešní koncept. Prázdný den nemá zapsaný čas."
              : "Obrys = dnešní koncept. Prázdný den nemá zápis."}
          </Text>
          {recorded.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {recorded.map((d) => (
                <Pressable
                  key={d.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Detail záznamu ${d.date.toLocaleDateString("cs-CZ")}`}
                  accessibilityState={{ selected: selected === d.key }}
                  onPress={() => setSelected(d.key)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 12,
                    justifyContent: "center",
                    borderRadius: 0,
                    borderBottomWidth: 1,
                    borderColor: selected === d.key ? accent : "#ffffff22",
                    backgroundColor:
                      selected === d.key ? tint(accent, 0.12) : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selected === d.key ? accent : "#bcbcbc",
                      fontSize: 12,
                    }}
                  >
                    {d.date.getDate()}. {d.date.getMonth() + 1}.
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={s.body}>Zatím nemáš žádné záznamy pro graf.</Text>
          )}
          {selectedDay && (
            <Text style={s.body}>
              {selectedDay.date.toLocaleDateString("cs-CZ")} ·{" "}
              {id === "scroll"
                ? `${selectedDay.minutes?.toLocaleString("cs-CZ")} min · `
                : ""}
              {selectedDay.pending
                ? "Průběžný zápis"
                : selectedDay.success
                  ? "Dodrženo"
                  : "Mimo plán"}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
