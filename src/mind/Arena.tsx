import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  AccessibilityInfo,
  useWindowDimensions,
  AppState,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  Button,
  Chip,
  Progress,
  useMindStyles,
  MindTheme,
  mint,
} from "./components";
import {
  acceptAnswer,
  problem,
  difficultyNames,
  sameMode,
  type Problem,
} from "./math";
import {
  uid,
  type ArenaPreferences,
  type Difficulty,
  type GameResult,
  type Operation,
} from "./model";
export function Arena({
  games,
  onResult,
  onActive,
  preferences,
  onPreferences,
}: {
  games: GameResult[];
  onResult: (g: GameResult) => number;
  onActive: (active: boolean) => void;
  preferences?: ArenaPreferences;
  onPreferences: (preferences: ArenaPreferences) => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme),
    { height } = useWindowDimensions();
  const compact = height < 800;
  const [availableHeight, setAvailableHeight] = useState(height - 100);
  const tight = availableHeight < 560;
  const [difficulty, setDifficulty] = useState<Difficulty>(
      preferences?.difficulty ?? "normal",
    ),
    [duration, setDuration] = useState(preferences?.duration ?? 120),
    [operations, setOperations] = useState<Operation[]>(
      preferences?.operations ?? ["+", "−"],
    ),
    [modeOnly, setModeOnly] = useState(true),
    [gainedXP, setGainedXP] = useState(0);
  const preview = useMemo(
    () => problem(difficulty, operations),
    [difficulty, operations],
  );
  const [round, setRound] = useState<{ id: string; end: number } | null>(null),
    [current, setCurrent] = useState(() => problem("normal", ["+", "−"])),
    [answer, setAnswer] = useState(""),
    [left, setLeft] = useState(120),
    [counts, setCounts] = useState({ correct: 0, mistakes: 0 }),
    [result, setResult] = useState<GameResult | null>(null),
    [bad, setBad] = useState(false),
    [combo, setCombo] = useState(0);
  const previousBest = useRef(0),
    comboRef = useRef(0),
    maxCombo = useRef(0),
    score = useRef(counts),
    ended = useRef(false),
    question = useRef(current),
    answerRef = useRef(""),
    mistake = useRef(false),
    run = useRef(round),
    input = useRef<React.ComponentRef<typeof TextInput>>(null),
    callback = useRef(onResult),
    reduced = useRef(true),
    flash = useRef(new Animated.Value(1)).current;
  callback.current = onResult;
  const best = Math.max(
    0,
    ...games
      .filter((g) => sameMode(g, { difficulty, duration, operations }))
      .map((g) => g.correct),
  );
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (v) => (reduced.current = v),
    );
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => (reduced.current = v),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!round) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((round.end - Date.now()) / 1000));
      setLeft(remain);
      if (!remain && !ended.current) {
        ended.current = true;
        const g: GameResult = {
          id: round.id,
          at: Date.now(),
          difficulty,
          duration,
          operations,
          maxCombo: maxCombo.current,
          ...score.current,
        };
        setGainedXP(callback.current(g));
        setResult(g);
        setRound(null);
        run.current = null;
        onActive(false);
      }
    };
    tick();
    const t = setInterval(tick, 100);
    const app = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(t);
      app.remove();
    };
  }, [round]);
  useEffect(() => () => onActive(false), []);
  function next() {
    let p: Problem = problem(difficulty, operations);
    for (let i = 0; i < 5 && p.text === question.current.text; i++)
      p = problem(difficulty, operations);
    question.current = p;
    setCurrent(p);
    answerRef.current = "";
    setAnswer("");
    mistake.current = false;
    setBad(false);
    if (!reduced.current) {
      flash.stopAnimation();
      flash.setValue(0.55);
      Animated.timing(flash, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }
  }
  function start() {
    previousBest.current = best;
    ended.current = false;
    score.current = { correct: 0, mistakes: 0 };
    setCounts(score.current);
    setResult(null);
    setCombo(0);
    comboRef.current = 0;
    maxCombo.current = 0;
    setLeft(duration);
    next();
    const r = { id: uid(), end: Date.now() + duration * 1000 };
    run.current = r;
    setRound(r);
    onActive(true);
    onPreferences({ difficulty, duration, operations });
    input.current?.focus();
  }
  function enter(raw: string) {
    const r = run.current;
    if (!r || ended.current || Date.now() >= r.end) return;
    const v = raw.replace(/\D/g, "").slice(0, 6);
    answerRef.current = v;
    setAnswer(v);
    if (acceptAnswer(v, question.current, Date.now(), r.end)) {
      score.current = { ...score.current, correct: score.current.correct + 1 };
      setCounts(score.current);
      const hadMistake = mistake.current;
      comboRef.current = hadMistake ? 1 : comboRef.current + 1;
      maxCombo.current = Math.max(maxCombo.current, comboRef.current);
      setCombo(comboRef.current);
      next();
      return;
    }
    const wrong =
      v.length >= String(question.current.answer).length && v !== "";
    setBad(wrong);
    if (wrong && !mistake.current) {
      mistake.current = true;
      score.current = {
        ...score.current,
        mistakes: score.current.mistakes + 1,
      };
      setCounts(score.current);
      setCombo(0);
      comboRef.current = 0;
    }
  }
  function skip() {
    if (!run.current || Date.now() >= run.current.end) return;
    if (!mistake.current) {
      score.current = {
        ...score.current,
        mistakes: score.current.mistakes + 1,
      };
      setCounts(score.current);
    }
    setCombo(0);
    comboRef.current = 0;
    next();
  }
  const precisionLine = (
    <View pointerEvents="none" style={{ height: 46, overflow: "hidden" }}>
      <Svg
        width="100%"
        height={46}
        viewBox="0 0 360 46"
        preserveAspectRatio="none"
      >
        <Path
          d="M0 24H68L82 16L96 32L111 7L128 39L144 18L158 24H245L266 9L288 36L310 24H360"
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.6}
        />
        <Circle cx="158" cy="24" r="3" fill={mint} />
        <Circle cx="310" cy="24" r="3" fill={mint} />
      </Svg>
    </View>
  );
  if (result)
    return (
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>KOLO DOKONČENO</Text>
        <Text style={s.muted}>
          {difficultyNames[result.difficulty]} · {result.duration / 60} min ·{" "}
          {result.operations.join(" ")}
        </Text>
        <View style={{ gap: 8, paddingVertical: 12 }}>
          <Text
            style={[
              s.title,
              {
                fontSize: 116,
                lineHeight: 124,
                fontWeight: "300",
                letterSpacing: -7,
                color,
              },
            ]}
          >
            {result.correct}
          </Text>
          <Text style={[s.h2, { fontSize: 24, fontWeight: "400" }]}>
            správných odpovědí
          </Text>
          {precisionLine}
          <Text style={[s.link, { color: mint }]}>
            {result.correct > previousBest.current
              ? "Nový osobní rekord!"
              : `Rekord režimu: ${Math.max(best, result.correct)}`}
          </Text>
        </View>
        <View style={[s.row, { alignItems: "stretch", gap: 8 }]}>
          {[
            [
              `${Math.round((result.correct / (result.duration / 60)) * 10) / 10}`,
              "správně / min",
            ],
            [`${result.maxCombo ?? 0}`, "nejlepší série"],
            [`+${gainedXP}`, "získaná XP"],
          ].map(([value, label]) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingVertical: 16,
                gap: 8,
                borderTopWidth: 1,
                borderColor: "#ffffff18",
              }}
            >
              <Text
                style={[
                  s.h2,
                  {
                    color: label === "získaná XP" ? mint : color,
                    fontWeight: "400",
                    fontSize: 30,
                  },
                ]}
              >
                {value}
              </Text>
              <Text style={[s.muted, { fontSize: 11, lineHeight: 16 }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
        <View style={s.between}>
          <Text style={s.muted}>{result.mistakes} chyb / přeskočení</Text>
          <Text style={s.muted}>
            {Math.round(
              (result.correct / Math.max(1, result.correct + result.mistakes)) *
                100,
            )}{" "}
            % přesnost
          </Text>
        </View>
        <Button onPress={start}>Znovu do arény</Button>
        <Button quiet onPress={() => setResult(null)}>
          Změnit režim
        </Button>
        <Text style={s.muted}>
          {gainedXP === 0
            ? "Denní příspěvek arény nebo celkový limit XP už může být vyčerpaný. "
            : ""}
          XP se přičítá jen za dokončené kolo. Rekordy porovnáváme při shodné
          obtížnosti, délce a operacích.
        </Text>
      </ScrollView>
    );
  if (!round)
    return (
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>MENTÁLNÍ ARÉNA</Text>
        <Text style={[s.title, { fontSize: 38 }]}>Najdi svůj rytmus.</Text>
        <View
          style={{
            paddingVertical: 12,
            gap: 12,
            borderBottomWidth: 1,
            borderColor: "#ffffff15",
          }}
        >
          <Text
            style={[
              s.title,
              { fontSize: 54, fontWeight: "400", letterSpacing: -2.5, color },
            ]}
          >
            {preview.text}
          </Text>
          {precisionLine}
          <Text style={[s.muted, { maxWidth: 270 }]}>
            Napiš správný výsledek. Další příklad přijde okamžitě.
          </Text>
        </View>
        <Text style={s.muted}>
          {difficulty === "easy"
            ? "Rozjezd: sčítání a odčítání do 10, lehčí násobilka."
            : difficulty === "normal"
              ? "Výzva: čísla do 30, násobení až 12 × 12."
              : "Expert: čísla do 99, násobení až 20 × 20."}{" "}
          Dělení má vždy celočíselný výsledek.
        </Text>
        <Text style={s.label}>OBTÍŽNOST</Text>
        <View style={s.wrap}>
          {(Object.keys(difficultyNames) as Difficulty[]).map((d) => (
            <Chip
              key={d}
              label={difficultyNames[d]}
              selected={difficulty === d}
              onPress={() => setDifficulty(d)}
            />
          ))}
        </View>
        <View style={s.between}>
          <View style={s.wrap}>
            {[60, 120].map((n) => (
              <Chip
                key={n}
                label={`${n / 60} min`}
                selected={duration === n}
                onPress={() => setDuration(n)}
              />
            ))}
          </View>
          <View>
            <Text style={s.muted}>Rekord</Text>
            <Text style={[s.h2, { color }]}>{best}</Text>
          </View>
        </View>
        <View style={s.wrap}>
          {(["+", "−", "×", "÷"] as Operation[]).map((o) => (
            <Chip
              key={o}
              label={o}
              selected={operations.includes(o)}
              onPress={() =>
                setOperations(
                  operations.includes(o)
                    ? operations.length === 1
                      ? operations
                      : operations.filter((v) => v !== o)
                    : [...operations, o],
                )
              }
            />
          ))}
        </View>
        <Button onPress={start}>Spustit kolo</Button>
        {games.length > 0 && (
          <View
            style={{
              gap: 18,
              paddingTop: 20,
              borderTopWidth: 1,
              borderColor: "#ffffff18",
            }}
          >
            <View style={[s.between, { flexWrap: "wrap" }]}>
              <Text style={s.label}>POSLEDNÍ VÝKONY</Text>
              <Chip
                label={modeOnly ? "Tento režim" : "Všechny režimy"}
                selected={modeOnly}
                onPress={() => setModeOnly(!modeOnly)}
              />
            </View>
            {!games.some(
              (g) =>
                !modeOnly || sameMode(g, { difficulty, duration, operations }),
            ) && (
              <Text style={s.muted}>
                V tomto režimu ještě nemáš dokončené kolo.
              </Text>
            )}
            {games
              .filter(
                (g) =>
                  !modeOnly ||
                  sameMode(g, { difficulty, duration, operations }),
              )
              .slice(-5)
              .reverse()
              .map((g) => (
                <View
                  key={g.id}
                  style={[
                    s.between,
                    {
                      paddingBottom: 14,
                      borderBottomWidth: 1,
                      borderColor: "#ffffff0c",
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.h2,
                      { color, minWidth: 48, fontSize: 36, fontWeight: "400" },
                    ]}
                  >
                    {g.correct}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.text}>
                      {difficultyNames[g.difficulty]} · {g.duration} s
                    </Text>
                    <Text style={s.muted}>
                      {g.operations.join(" ")} · {g.mistakes} chyb ·{" "}
                      {new Date(g.at).toLocaleDateString("cs-CZ")}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    );
  return (
    <ScrollView
      onLayout={(e) => setAvailableHeight(e.nativeEvent.layout.height)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        padding: compact ? 16 : 24,
        gap: compact ? 10 : 16,
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 10 }}>
        <View style={s.between}>
          <View>
            <Text style={s.label}>
              {difficultyNames[difficulty].toUpperCase()}
            </Text>
            <Text
              style={[
                s.h2,
                {
                  color: mint,
                  fontSize: compact ? 22 : 26,
                  fontVariant: ["tabular-nums"],
                },
              ]}
            >
              {counts.correct} správně
            </Text>
          </View>
          <Text
            style={[
              s.title,
              {
                fontSize: compact ? 34 : 44,
                fontWeight: "400",
                letterSpacing: -1.8,
                fontVariant: ["tabular-nums"],
                color: left <= 10 ? "#FFB3BE" : "#F4F4FF",
              },
            ]}
          >
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </Text>
        </View>
        <Progress value={left / duration} />
      </View>
      <Animated.View
        style={{
          opacity: flash,
          gap: tight ? 8 : 12,
          alignItems: "center",
          paddingVertical: compact ? 4 : 24,
          paddingHorizontal: 8,
        }}
      >
        <Text
          testID="mind-problem"
          accessibilityLiveRegion="polite"
          style={[
            s.title,
            {
              fontSize: tight ? 42 : compact ? 54 : 68,
              fontWeight: "400",
              letterSpacing: -2,
            },
          ]}
        >
          {current.text}
        </Text>
        <TextInput
          ref={input}
          autoFocus
          accessibilityLabel="Odpověď"
          value={answer}
          onChangeText={enter}
          keyboardType="number-pad"
          showSoftInputOnFocus={false}
          autoComplete="off"
          placeholder="?"
          placeholderTextColor="#696b70"
          style={[
            s.input,
            {
              width: "62%",
              maxWidth: 220,
              borderRadius: 0,
              backgroundColor: "transparent",
              borderWidth: 0,
              borderBottomWidth: 2,
              fontSize: compact ? 34 : 42,
              textAlign: "center",
              borderBottomColor: bad ? "#ff8995" : `${color}80`,
              padding: compact ? 8 : 12,
              minHeight: compact ? 46 : 58,
            },
          ]}
        />
        <Text
          accessibilityLiveRegion="polite"
          style={[s.muted, { color: bad ? "#ff8995" : mint, minHeight: 22 }]}
        >
          {bad
            ? "Oprav odpověď nebo smaž číslici."
            : combo > 1
              ? `${combo} správně v řadě`
              : "Správná odpověď = další příklad"}
        </Text>
      </Animated.View>
      <View style={{ gap: compact ? 7 : 10 }}>
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["⌫", "0", "↷"],
        ].map((row, i) => (
          <View key={i} style={[s.row, { gap: compact ? 7 : 10 }]}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={
                  key === "⌫"
                    ? "Smazat číslici"
                    : key === "↷"
                      ? "Přeskočit příklad"
                      : key
                }
                onPress={() =>
                  key === "↷"
                    ? skip()
                    : enter(
                        key === "⌫"
                          ? answerRef.current.slice(0, -1)
                          : answerRef.current + key,
                      )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  height: tight ? 44 : compact ? 48 : 60,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  backgroundColor: pressed
                    ? `${color}40`
                    : key === "↷"
                      ? `${color}16`
                      : "#FFFFFF07",
                  borderWidth: 0,
                  borderBottomWidth: 1,
                  borderColor: key === "↷" ? `${color}40` : "#ffffff18",
                })}
              >
                <Text
                  style={[
                    s.h2,
                    {
                      fontSize: compact ? 25 : 30,
                      fontWeight: "400",
                      color: key === "↷" ? color : "#f7f6f2",
                    },
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={s.between}>
          <Text style={[s.muted, { fontSize: 12 }]}>
            {counts.mistakes} chyb / přeskočení
          </Text>
          <Text style={[s.muted, { fontSize: 12 }]}>
            Rekord {best} · série {combo}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
