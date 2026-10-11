import React, { useEffect, useRef, useState, useId } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  AccessibilityInfo,
} from "react-native";
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
  Line,
} from "react-native-svg";
import {
  frontParts,
  backParts,
  muscleNotes,
  roleFor,
  preferBack,
} from "./anatomy";
import { muscleNames, type Muscle, type Exercise } from "./catalog";
import { useBuildStyles, Chip } from "./components";
const AnimatedG = Animated.createAnimatedComponent(G);
const darkRed = "#9f2537",
  lightRed = "#ed8992";
const outline =
  "M111 59L129 59L133 73Q140 81 157 85Q177 90 183 108L185 132Q190 146 192 166L195 188Q201 205 205 224L211 249L216 264L215 280Q209 287 204 278L198 260L193 251L184 216Q176 205 175 191L173 166L165 141Q157 153 152 171L147 210Q149 232 154 250L161 279Q164 306 160 338L154 368Q152 383 155 404Q157 430 152 451L148 479L151 505Q158 510 158 519L136 522Q130 518 131 509L135 481L135 451Q128 425 131 399L132 379L124 350L120 310L116 350L108 379L109 399Q112 425 105 451L105 481L109 509Q110 518 104 522L82 519Q82 510 89 505L92 479L88 451Q83 430 85 404Q88 383 86 368L80 338Q76 306 79 279L86 250Q91 232 93 210L88 171Q83 153 75 141L67 166L65 191Q64 205 56 216L47 251L42 260L36 278Q31 287 25 280L24 264L29 249L35 224Q39 205 45 188L48 166Q50 146 55 132L57 108Q63 90 83 85Q100 81 107 73Z";
function Figure({
  exercise,
  back,
  onSelect,
  selected,
  mini = false,
  height = 365,
  pulse,
}: {
  exercise: Exercise;
  back: boolean;
  onSelect?: (m: Muscle) => void;
  selected?: Muscle | null;
  mini?: boolean;
  height?: number;
  pulse?: Animated.Value;
}) {
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, "");
  const parts = back ? backParts : frontParts;
  return (
    <Svg
      width="100%"
      height={mini ? 78 : height}
      viewBox="0 0 240 548"
      accessibilityLabel={`${back ? "Pohled zezadu" : "Pohled zepředu"}: hlavní svaly ${exercise.main.map((m) => muscleNames[m]).join(", ")}`}
    >
      <Defs>
        {[
          ["body", "#39424f", "#151b24"],
          ["main", "#cf4c5c", darkRed],
          ["secondary", "#f1a8ae", "#c56270"],
          ["other", "#586273", "#293342"],
        ].map(([id, a, b]) => (
          <LinearGradient
            key={id}
            id={prefix + id}
            x1="0"
            y1="0"
            x2="1"
            y2=".8"
          >
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        ))}
      </Defs>
      <Ellipse cx="120" cy="533" rx="45" ry="5" fill="#090b10" />
      <Path
        d={outline}
        fill={`url(#${prefix}body)`}
        stroke="#68717f"
        strokeWidth="1.1"
      />
      <Path
        d="M104 15Q120 4 136 15L140 35Q138 51 129 59L111 59Q102 51 100 35Z"
        fill={`url(#${prefix}body)`}
        stroke="#68717f"
        strokeWidth="1.1"
      />
      {!back && (
        <>
          <Path
            d="M104 32Q110 28 115 32M125 32Q130 28 136 32M120 33L117 43L123 43M113 49Q120 52 127 49"
            fill="none"
            stroke="#626b78"
            strokeWidth="1"
          />
          <Path
            d="M111 62L111 75L102 85M129 62L129 75L138 85"
            stroke="#65707e"
            fill="none"
          />
        </>
      )}
      {[false, true].map((mirror) => (
        <G
          key={String(mirror)}
          transform={mirror ? "translate(240 0) scale(-1 1)" : undefined}
        >
          <Path
            d="M57 191Q64 193 63 207L50 246L44 257L40 249L48 215Z M102 376Q109 385 104 401L97 451L93 475L91 469L94 430Z"
            fill={`url(#${prefix}other)`}
            stroke="#68717f"
            strokeWidth=".7"
          />
          {parts.map((part) => {
            const role = roleFor(part.muscle, exercise);
            return (
              <AnimatedG
                opacity={role === "main" && pulse ? pulse : 1}
                key={part.muscle}
                onPress={onSelect ? () => onSelect(part.muscle) : undefined}
              >
                {part.paths.map((d, i) => (
                  <Path
                    key={i}
                    d={d}
                    fill={`url(#${prefix}${role})`}
                    stroke={selected === part.muscle ? "#fff2f2" : "#161c26"}
                    strokeWidth={selected === part.muscle ? 1.8 : 0.9}
                  />
                ))}
                {!mini &&
                  part.fibers?.map((d, i) => (
                    <Path
                      key={`f${i}`}
                      d={d}
                      stroke={
                        role === "main"
                          ? "#e17f89"
                          : role === "secondary"
                            ? "#f5c2c6"
                            : "#8891a0"
                      }
                      strokeOpacity=".4"
                      strokeWidth=".7"
                      fill="none"
                    />
                  ))}
              </AnimatedG>
            );
          })}
          <Path
            d="M86 370Q95 365 104 370L105 379Q96 387 87 380Z M35 264L33 278M40 266L38 279"
            fill="none"
            stroke="#727c8b"
            strokeWidth=".8"
          />
        </G>
      ))}
      <Line
        x1="120"
        x2="120"
        y1={back ? 80 : 99}
        y2={back ? 279 : 244}
        stroke="#101722"
        strokeWidth="1.3"
      />
      {!back && <Ellipse cx="120" cy="218" rx="1.3" ry="2.2" fill="#161c26" />}
    </Svg>
  );
}
export function MuscleThumbnail({ exercise }: { exercise: Exercise }) {
  return (
    <View
      style={{
        width: 52,
        height: 82,
        backgroundColor: "#131821",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Figure exercise={exercise} back={preferBack(exercise)} mini />
    </View>
  );
}
export function MuscleMap({ exercise }: { exercise: Exercise }) {
  const s = useBuildStyles();
  const [side, setSide] = useState<"front" | "back" | "both">(() =>
    preferBack(exercise) ? "back" : "front",
  );
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [animate, setAnimate] = useState(true);
  const [reduce, setReduce] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setSelected(null);
    setSide(preferBack(exercise) ? "back" : "front");
  }, [exercise.id]);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    fade.stopAnimation();
    fade.setValue(1);
    if (!animate || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0.78,
          duration: 1300,
          useNativeDriver: false,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, reduce, fade]);
  const role = selected ? roleFor(selected, exercise) : null;
  return (
    <View style={{ gap: 14 }}>
      <View style={s.row}>
        {(
          [
            ["front", "Zepředu"],
            ["back", "Zezadu"],
            ["both", "Obě strany"],
          ] as const
        ).map(([value, title]) => (
          <Chip
            key={value}
            title={title}
            active={side === value}
            onPress={() => setSide(value)}
          />
        ))}
      </View>
      <View
        style={{
          backgroundColor: "#11151c",
          borderColor: "#303640",
          borderWidth: 1,
          borderRadius: 22,
          padding: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {side !== "back" && (
            <View style={{ flex: 1, maxWidth: 240 }}>
              <Figure
                exercise={exercise}
                back={false}
                selected={selected}
                onSelect={setSelected}
                pulse={fade}
                height={side === "both" ? 260 : 365}
              />
            </View>
          )}
          {side !== "front" && (
            <View style={{ flex: 1, maxWidth: 240 }}>
              <Figure
                exercise={exercise}
                back
                selected={selected}
                onSelect={setSelected}
                pulse={fade}
                height={side === "both" ? 260 : 365}
              />
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            padding: 6,
          }}
        >
          <Text style={s.small}>Klepni na sval pro detail.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: animate }}
            onPress={() => setAnimate(!animate)}
          >
            <Text style={s.link}>
              {animate ? "Zastavit efekt" : "Spustit efekt"}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={s.row}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: darkRed,
          }}
        />
        <Text style={s.small}>Hlavní svaly</Text>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: lightRed,
          }}
        />
        <Text style={s.small}>Pomocné svaly</Text>
      </View>
      <View style={s.row}>
        {[
          ...exercise.main,
          ...exercise.secondary.filter((m) => !exercise.main.includes(m)),
        ].map((m) => (
          <Chip
            key={m}
            title={muscleNames[m]}
            active={selected === m}
            onPress={() => setSelected(selected === m ? null : m)}
          />
        ))}
      </View>
      {selected && (
        <View
          style={{
            padding: 14,
            backgroundColor: "#20151a",
            borderRadius: 14,
            gap: 6,
          }}
        >
          <Text
            style={[
              s.h2,
              {
                fontSize: 18,
                color:
                  role === "main"
                    ? "#e96d7d"
                    : role === "secondary"
                      ? lightRed
                      : "#a8b1c0",
              },
            ]}
          >
            {muscleNames[selected]} ·{" "}
            {role === "main"
              ? "hlavní"
              : role === "secondary"
                ? "pomocné"
                : "ostatní"}
          </Text>
          <Text style={s.muted}>{muscleNotes[selected]}</Text>
        </View>
      )}
      <Text style={s.small}>
        Orientační anatomická mapa. Odstíny rozlišují roli svalů, ne naměřenou
        intenzitu. Efekt pouze zvýrazňuje mapu.
      </Text>
    </View>
  );
}
