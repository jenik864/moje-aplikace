import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
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
import { uid, type Difficulty, type GameResult, type Operation } from "./model";
export function Arena({
  games,
  onResult,
  onActive,
}: {
  games: GameResult[];
  onResult: (g: GameResult) => void;
  onActive: (active: boolean) => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme),
    { height } = useWindowDimensions();
  const compact = height < 760;
  const [difficulty, setDifficulty] = useState<Difficulty>("normal"),
    [duration, setDuration] = useState(120),
    [operations, setOperations] = useState<Operation[]>(["+", "−"]);
  const [round, setRound] = useState<{ id: string; end: number } | null>(null),
    [current, setCurrent] = useState(() => problem("normal", ["+", "−"])),
    [answer, setAnswer] = useState(""),
    [left, setLeft] = useState(120),
    [counts, setCounts] = useState({ correct: 0, mistakes: 0 }),
    [result, setResult] = useState<GameResult | null>(null),
    [bad, setBad] = useState(false),
    [combo, setCombo] = useState(0);
  const previousBest = useRef(0),
    score = useRef(counts),
    ended = useRef(false),
    question = useRef(current),
    answerRef = useRef(""),
    mistake = useRef(false),
    run = useRef(round),
    input = useRef<TextInput>(null),
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
          ...score.current,
        };
        callback.current(g);
        setResult(g);
        setRound(null);
        run.current = null;
        onActive(false);
      }
    };
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
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
    setLeft(duration);
    next();
    const r = { id: uid(), end: Date.now() + duration * 1000 };
    run.current = r;
    setRound(r);
    onActive(true);
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
      setCombo((n) => (hadMistake ? 1 : n + 1));
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
    next();
  }
  if (result)
    return (
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>KOLO DOKONČENO</Text>
        <View style={[s.hero, { alignItems: "center", paddingVertical: 32 }]}>
          <Text style={[s.title, { fontSize: 80, color }]}>
            {result.correct}
          </Text>
          <Text style={s.h2}>správných odpovědí</Text>
          <Text style={[s.link, { color: mint }]}>
            {result.correct > previousBest.current
              ? "Nový osobní rekord!"
              : `Rekord režimu: ${Math.max(best, result.correct)}`}
          </Text>
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
          XP se přičítá jen za dokončené kolo. Rekordy porovnáváme při shodné
          obtížnosti, délce a operacích.
        </Text>
      </ScrollView>
    );
  if (!round)
    return (
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.label}>MENTÁLNÍ ARÉNA</Text>
        <Text style={[s.title, { fontSize: 38 }]}>Mysli rychle.</Text>
        <View style={[s.hero, { paddingVertical: 26 }]}>
          <Text style={[s.title, { fontSize: 48, textAlign: "center", color }]}>
            {"12 × 8"}
          </Text>
          <Text style={[s.muted, { textAlign: "center" }]}>
            Napiš správný výsledek. Další příklad přijde okamžitě.
          </Text>
        </View>
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
          <View style={s.card}>
            <Text style={s.label}>POSLEDNÍ VÝKONY</Text>
            {games
              .slice(-5)
              .reverse()
              .map((g) => (
                <View key={g.id} style={s.between}>
                  <Text style={[s.h2, { color }]}>{g.correct}</Text>
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
    <View
      style={{
        flex: 1,
        padding: compact ? 16 : 20,
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
            <Text style={[s.h2, { color, fontVariant: ["tabular-nums"] }]}>
              {counts.correct} správně
            </Text>
          </View>
          <Text
            style={[
              s.title,
              { fontSize: compact ? 32 : 40, fontVariant: ["tabular-nums"] },
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
          gap: 12,
          alignItems: "center",
          paddingVertical: compact ? 6 : 18,
        }}
      >
        <Text
          testID="mind-problem"
          accessibilityLiveRegion="polite"
          style={[s.title, { fontSize: compact ? 44 : 56, letterSpacing: -1 }]}
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
              width: "100%",
              maxWidth: 240,
              fontSize: compact ? 30 : 36,
              textAlign: "center",
              borderColor: bad ? "#ff8995" : color,
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
                  height: compact ? 48 : 60,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 13,
                  backgroundColor: pressed
                    ? `${color}45`
                    : key === "↷"
                      ? `${color}20`
                      : "#16181c",
                  borderWidth: 1,
                  borderColor: key === "↷" ? `${color}55` : "#2c2e33",
                })}
              >
                <Text
                  style={[
                    s.h2,
                    {
                      fontSize: compact ? 23 : 27,
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
          <Text style={s.muted}>{counts.mistakes} chyb / přeskočení</Text>
          <Text style={s.muted}>↷ přeskočit</Text>
        </View>
      </View>
    </View>
  );
}
