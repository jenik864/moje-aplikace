import React, { useContext, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Rect, Path, Circle, Text as SvgText } from "react-native-svg";
import { Chip, MindTheme, useMindStyles, mint } from "./components";
import { ExtraLabs } from "./ExtraLabs";
export function LessonArt({ id, size = 90 }: { id: string; size?: number }) {
  const color = useContext(MindTheme);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle
        cx="60"
        cy="60"
        r="53"
        fill={`${color}16`}
        stroke={`${color}45`}
      />
      {id === "python-start" ? (
        <>
          <Path
            d="M42 40L22 60L42 80M78 40L98 60L78 80M68 33L52 87"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx="90" cy="22" r="5" fill={mint} />
        </>
      ) : id === "oil-to-fuel" ? (
        <>
          <Rect
            x="41"
            y="25"
            width="38"
            height="70"
            rx="12"
            stroke={color}
            strokeWidth="3"
            fill="#15191d"
          />
          <Path
            d="M42 44H78M42 62H78M42 80H78M79 44H98V31M79 62H102M41 80H21V99"
            stroke={color}
            strokeWidth="3"
            fill="none"
          />
          <Circle cx="60" cy="35" r="4" fill={mint} />
        </>
      ) : id === "compound-interest" ? (
        <>
          <Path
            d="M24 88H96M26 78V69M44 78V55M62 78V40M80 78V24"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <Path
            d="M22 51L54 32L82 13"
            stroke={mint}
            strokeWidth="2"
            fill="none"
          />
        </>
      ) : (
        <>
          <Path
            d={
              id === "internet"
                ? "M25 60H95M60 25V95M29 37H91M29 83H91M60 25C28 40 28 80 60 95M60 25C92 40 92 80 60 95"
                : id === "percentages"
                  ? "M37 85L83 35M42 39A8 8 0 1 0 42 55A8 8 0 1 0 42 39M78 65A8 8 0 1 0 78 81A8 8 0 1 0 78 65"
                  : id === "electricity"
                    ? "M67 24L37 65H57L51 96L84 52H64Z"
                    : id === "algorithms"
                      ? "M29 34H91M43 60H77M54 86H66M60 34V86"
                      : id === "memory"
                        ? "M41 85C20 80 23 57 33 53C20 36 49 20 60 37C75 20 99 37 87 53C101 65 91 85 77 85M60 37V94M38 55L50 62M80 56L70 67"
                        : "M60 24L89 35V59C89 79 60 97 60 97C60 97 31 79 31 59V35ZM46 59L56 69L76 47"
            }
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="91" cy="27" r="4" fill={mint} />
        </>
      )}
    </Svg>
  );
}
export function LessonLab({ id, step }: { id: string; step: number }) {
  const s = useMindStyles(),
    color = useContext(MindTheme);
  const [count, setCount] = useState(3),
    [age, setAge] = useState(17),
    [years, setYears] = useState(3),
    [rate, setRate] = useState(5),
    [fraction, setFraction] = useState(1);
  if (!["python-start", "oil-to-fuel", "compound-interest"].includes(id))
    return <ExtraLabs id={id} step={step} />;
  if (id === "python-start") {
    const code =
      step === 0
        ? `cena = 80\npocet = ${count}\nprint(cena * pocet)`
        : step === 1
          ? `vek = ${age}\nif vek >= 18:\n    print("Dospělý")\nelse:\n    print("Mladší než 18")`
          : `for i in range(${count}):\n    print(i)`;
    const output =
      step === 0
        ? String(80 * count)
        : step === 1
          ? age >= 18
            ? "Dospělý"
            : "Mladší než 18"
          : Array.from({ length: count }, (_, i) => i).join("  ");
    return (
      <View
        style={[s.card, { backgroundColor: "#0e161a", gap: 12, padding: 16 }]}
      >
        <View style={s.between}>
          <Text style={[s.label, { color: mint }]}>ŽIVÝ PŘÍKLAD / PYTHON</Text>
          <Text style={s.muted}>.py</Text>
        </View>
        <Text
          style={{
            color: "#dfe5e8",
            fontFamily: "monospace",
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {code}
        </Text>
        <View style={s.divider} />
        <Text style={[s.label, { color: mint }]}>VÝSTUP</Text>
        <Text accessibilityLiveRegion="polite" style={[s.h2, { color: mint }]}>
          {output}
        </Text>
        <View style={s.wrap}>
          {(step === 1 ? [16, 17, 18, 21] : [1, 3, 5]).map((n) => (
            <Chip
              key={n}
              label={
                step === 1
                  ? `${n} let`
                  : `${n} ${step === 0 ? (n === 1 ? "kniha" : n < 5 ? "knihy" : "knih") : n === 1 ? "průchod" : n < 5 ? "průchody" : "průchodů"}`
              }
              selected={step === 1 ? age === n : count === n}
              onPress={() => (step === 1 ? setAge(n) : setCount(n))}
            />
          ))}
        </View>
        <Text style={s.muted}>
          Změň hodnotu a sleduj výstup. Ukázka simuluje tento konkrétní kód.
        </Text>
      </View>
    );
  }
  if (id === "oil-to-fuel") {
    const names = [
      "Plyny",
      "Benzínová frakce",
      "Petrolej / nafta",
      "Těžký zbytek",
    ];
    const notes = [
      "Lehké složky odcházejí vysoko v koloně.",
      "Benzínová frakce je jednou ze surovin pro hotové palivo.",
      "Tyto frakce slouží mimo jiné pro letecká a naftová paliva.",
      "Nejtěžší část zůstává dole a dále se zpracovává.",
    ];
    return (
      <View style={[s.card, { padding: 16, gap: 12 }]}>
        <Text style={s.label}>
          {step === 0
            ? "JEDNA SUROVINA / VÍCE PRODUKTŮ"
            : step === 1
              ? "PROZKOUMEJ DESTILAČNÍ KOLONU"
              : "CESTA K HOTOVÉMU PALIVU"}
        </Text>
        {step < 2 ? (
          <>
            <View style={[s.row, { justifyContent: "center" }]}>
              <Svg width={125} height={180} viewBox="0 0 140 190">
                <Rect
                  x="41"
                  y="12"
                  width="52"
                  height="164"
                  rx="15"
                  fill="#151a1f"
                  stroke={color}
                  strokeWidth="2"
                />
                {names.map((_, i) => (
                  <React.Fragment key={i}>
                    <Rect
                      x="43"
                      y={24 + i * 38}
                      width="48"
                      height="25"
                      rx="4"
                      fill={i === fraction ? color : `${color}30`}
                    />
                    <Path
                      d={`M93 ${36 + i * 38}H124`}
                      stroke={i === fraction ? mint : color}
                      strokeWidth="3"
                    />
                    <Circle
                      cx="124"
                      cy={36 + i * 38}
                      r="4"
                      fill={i === fraction ? mint : color}
                    />
                  </React.Fragment>
                ))}
                <Path
                  d="M9 151H41M9 145L18 151L9 157"
                  stroke={color}
                  strokeWidth="3"
                  fill="none"
                />
                <SvgText
                  x="68"
                  y="187"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#aaa"
                >
                  tepleji dole
                </SvgText>
              </Svg>
              <View style={{ flex: 1, gap: 7 }}>
                {names.map((name, i) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fraction === i }}
                    onPress={() => setFraction(i)}
                    style={{
                      padding: 9,
                      borderRadius: 9,
                      backgroundColor:
                        fraction === i ? `${color}25` : "#191c20",
                      borderWidth: 1,
                      borderColor: fraction === i ? color : "#303238",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: fraction === i ? color : "#e4e1dd",
                        fontWeight: "700",
                      }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Text accessibilityLiveRegion="polite" style={s.muted}>
              {notes[fraction]}
            </Text>
          </>
        ) : (
          <>
            <View style={s.wrap}>
              {["Oddělení", "Kraking", "Míchání"].map((label, i) => (
                <Chip
                  key={label}
                  label={label}
                  selected={fraction === i}
                  onPress={() => setFraction(i)}
                />
              ))}
            </View>
            <View
              style={{
                height: 110,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg width="100%" height={100} viewBox="0 0 300 100">
                {(fraction === 1
                  ? [
                      [45, 50, 17],
                      [95, 50, 17],
                      [145, 50, 17],
                      [235, 30, 10],
                      [235, 70, 10],
                    ]
                  : fraction === 2
                    ? [
                        [40, 30, 10],
                        [40, 70, 10],
                        [95, 50, 14],
                        [230, 50, 25],
                      ]
                    : [
                        [40, 50, 22],
                        [230, 25, 12],
                        [230, 75, 12],
                      ]
                ).map(([x, y, r], i) => (
                  <Circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={r}
                    fill={i % 2 ? mint : color}
                    opacity=".8"
                  />
                ))}
                <Path
                  d="M165 50H200M190 40L200 50L190 60"
                  stroke="#e4e1dd"
                  strokeWidth="3"
                  fill="none"
                />
              </Svg>
            </View>
            <Text accessibilityLiveRegion="polite" style={s.text}>
              {fraction === 0
                ? "Destilace odděluje složky podle jejich teplot varu."
                : fraction === 1
                  ? "Kraking štěpí větší molekuly na menší."
                  : "Smícháním upravených složek vzniká palivo s požadovanými vlastnostmi."}
            </Text>
          </>
        )}
        <Text style={[s.muted, { fontSize: 12 }]}>
          Zjednodušené schéma. Skutečná rafinerie má více propojených provozů.
        </Text>
      </View>
    );
  }
  const initial = 1000,
    result = initial * Math.pow(1 + rate / 100, years),
    values = Array.from(
      { length: Math.min(years, 10) },
      (_, i) =>
        initial *
        Math.pow(1 + rate / 100, ((i + 1) * years) / Math.min(years, 10)),
    );
  return (
    <View style={[s.card, { padding: 16, gap: 12 }]}>
      <Text style={s.label}>ZKUS ZMĚNIT ČAS A SAZBU</Text>
      <View style={s.wrap}>
        {[1, 3, 10].map((n) => (
          <Chip
            key={n}
            label={`${n} ${n === 1 ? "rok" : n < 5 ? "roky" : "let"}`}
            selected={years === n}
            onPress={() => setYears(n)}
          />
        ))}
      </View>
      <View style={s.wrap}>
        {[3, 5, 10].map((n) => (
          <Chip
            key={n}
            label={`${n} %`}
            selected={rate === n}
            onPress={() => setRate(n)}
          />
        ))}
      </View>
      <View
        style={{
          height: 82,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {values.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(10, (v / result) * 80),
              backgroundColor: i === values.length - 1 ? mint : `${color}80`,
              borderRadius: 4,
            }}
          />
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={[s.h2, { color: mint }]}>
        {result.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč
      </Text>
      <Text style={s.muted}>
        Z počátečních 1 000 Kč při stálé roční sazbě. Bez daní, poplatků a
        inflace; nejde o předpověď výnosu.
      </Text>
    </View>
  );
}
