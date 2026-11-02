import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { palette } from "../design";
import { dayKey, shift } from "../mind/model";
import { ranks } from "../model";
import { rankForScore, type RankSnapshot } from "./model";
export function RankJourney({
  snapshots,
  now = Date.now(),
}: {
  snapshots: RankSnapshot[];
  now?: number;
}) {
  const [period, setPeriod] = useState(30),
    [selected, setSelected] = useState<string | null>(null);
  const today = dayKey(new Date(now)),
    from = shift(today, -period + 1),
    points = snapshots.filter((s) => s.day >= from && s.day <= today),
    last = points.at(-1),
    chosen = points.find((s) => s.day === selected) ?? last;
  const range = Math.max(100, ...points.map((p) => p.score * 100)),
    max = Math.min(1100, Math.ceil(range / 100) * 100);
  const x = (day: string) =>
    28 +
    ((new Date(`${day}T12:00:00`).getTime() -
      new Date(`${from}T12:00:00`).getTime()) /
      (new Date(`${today}T12:00:00`).getTime() -
        new Date(`${from}T12:00:00`).getTime())) *
      280;
  const y = (score: number) => 154 - ((score * 100) / max) * 125;
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.day)} ${y(p.score)}`)
    .join(" ");
  return (
    <View style={{ gap: 22 }}>
      <Text
        style={{
          color: palette.Me,
          fontSize: 10,
          letterSpacing: 2,
          fontWeight: "700",
        }}
      >
        TVŮJ POSTUP V ČASE
      </Text>
      <Text
        style={{
          color: "#f4f6fa",
          fontSize: 34,
          fontWeight: "600",
          letterSpacing: -1,
        }}
      >
        Cesta, kterou tvoříš.
      </Text>
      <Text style={{ color: "#a9a9a9", fontSize: 14, lineHeight: 23 }}>
        Skutečně zaznamenané body celkového ranku. V každém dni zůstává poslední
        uložená hodnota.
      </Text>
      <View style={{ flexDirection: "row", gap: 14 }}>
        {[7, 30, 365].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: period === n }}
            onPress={() => {
              setPeriod(n);
              setSelected(null);
            }}
            style={{
              minHeight: 44,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderColor: period === n ? palette.Me : "transparent",
            }}
          >
            <Text
              style={{
                color: period === n ? palette.Me : "#a9a9a9",
                fontWeight: "600",
              }}
            >
              {n === 365 ? "Rok" : `${n} dní`}
            </Text>
          </Pressable>
        ))}
      </View>
      <Svg width="100%" height={190} viewBox="0 0 336 190" accessible={false}>
        <Defs>
          <LinearGradient id="journeyArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.Me} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.Me} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((v) => (
          <React.Fragment key={v}>
            <Line
              x1={28}
              x2={308}
              y1={154 - v * 125}
              y2={154 - v * 125}
              stroke="#ffffff12"
            />
            <SvgText x={25} y={150 - v * 125} fill="#8f8f8f" fontSize={9}>
              {Math.round(v * max)}
            </SvgText>
          </React.Fragment>
        ))}
        {points.length > 1 && (
          <>
            <Path
              d={`${line} L${x(last!.day)} 154 L${x(points[0].day)} 154 Z`}
              fill="url(#journeyArea)"
            />
            <Path
              d={line}
              stroke={palette.Me}
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          </>
        )}
        {points.map((p) => (
          <Circle
            key={p.day}
            cx={x(p.day)}
            cy={y(p.score)}
            r={p.day === chosen?.day ? 5 : 3}
            fill={palette.Me}
          />
        ))}
        <SvgText x={28} y={178} fill="#8f8f8f" fontSize={10}>
          {from.slice(8)}. {Number(from.slice(5, 7))}.
        </SvgText>
        <SvgText x={308} y={178} textAnchor="end" fill="#8f8f8f" fontSize={10}>
          Dnes
        </SvgText>
      </Svg>
      {chosen ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.Me, fontSize: 28, fontWeight: "600" }}>
            {(chosen.score * 100).toLocaleString("cs-CZ", {
              maximumFractionDigits: 1,
            })}{" "}
            bodů · {ranks[rankForScore(chosen.score)]}
          </Text>
          <Text style={{ color: "#a9a9a9", fontSize: 13 }}>
            Záznam {new Date(chosen.at).toLocaleString("cs-CZ")}
          </Text>
        </View>
      ) : (
        <Text style={{ color: "#e2e2e2", fontSize: 16 }}>
          V tomto období zatím nemáš uložený bod.
        </Text>
      )}
      <Text style={{ color: "#a9a9a9", fontSize: 13, lineHeight: 21 }}>
        Historie začíná prvním záznamem tohoto updatu. Chybějící dny
        nedopočítáváme; přerušovaná čára pouze spojuje pozorování. Oprava
        aktivity může změnit dnešní hodnotu, dosažený PRIME zůstává.
      </Text>
      {points
        .slice()
        .reverse()
        .slice(0, 30)
        .map((p) => (
          <Pressable
            key={p.day}
            accessibilityRole="button"
            accessibilityLabel={`Záznam ranku ${p.day}`}
            onPress={() => setSelected(p.day)}
            style={{
              minHeight: 50,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              borderTopWidth: 1,
              borderColor: "#ffffff12",
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#c8c8c8" }}>
              {new Date(`${p.day}T12:00:00`).toLocaleDateString("cs-CZ")}
            </Text>
            <Text style={{ color: palette.Me }}>
              {(p.score * 100).toLocaleString("cs-CZ", {
                maximumFractionDigits: 1,
              })}{" "}
              b
            </Text>
          </Pressable>
        ))}
    </View>
  );
}
