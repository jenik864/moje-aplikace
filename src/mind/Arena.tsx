import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Button, Chip, Progress, s, mint } from "./components";
import { acceptAnswer, problem, difficultyNames, sameMode } from "./math";
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
  const [difficulty, setDifficulty] = useState<Difficulty>("normal"),
    [duration, setDuration] = useState(120),
    [operations, setOperations] = useState<Operation[]>(["+", "−"]);
  const [round, setRound] = useState<{ id: string; end: number } | null>(null),
    [current, setCurrent] = useState(() => problem("normal", ["+", "−"])),
    [answer, setAnswer] = useState(""),
    [left, setLeft] = useState(120),
    [counts, setCounts] = useState({ correct: 0, mistakes: 0 }),
    [result, setResult] = useState<GameResult | null>(null),
    [feedback, setFeedback] = useState(""),
    [confirm, setConfirm] = useState(false);
  const previousBest = useRef(0);
  const score = useRef(counts),
    ended = useRef(false),
    input = useRef<TextInput>(null),
    resultCallback = useRef(onResult);
  resultCallback.current = onResult;
  const previous = games.filter((g) =>
    sameMode(g, { difficulty, duration, operations }),
  );
  const best = Math.max(0, ...previous.map((g) => g.correct));
  useEffect(() => {
    if (!round) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((round.end - Date.now()) / 1000));
      setLeft(remain);
      if (remain === 0 && !ended.current) {
        ended.current = true;
        const g: GameResult = {
          id: round.id,
          at: Date.now(),
          difficulty,
          duration,
          operations,
          ...score.current,
        };
        resultCallback.current(g);
        setResult(g);
        setRound(null);
        onActive(false);
      }
    };
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [round]);
  useEffect(() => () => onActive(false), []);
  function start() {
    previousBest.current = best;
    ended.current = false;
    score.current = { correct: 0, mistakes: 0 };
    setCounts(score.current);
    setAnswer("");
    setFeedback("");
    setResult(null);
    setConfirm(false);
    setCurrent(problem(difficulty, operations));
    setLeft(duration);
    setRound({ id: uid(), end: Date.now() + duration * 1000 });
    onActive(true);
  }
  function submit() {
    if (
      !round ||
      ended.current ||
      Date.now() >= round.end ||
      !/^\d+$/.test(answer.trim())
    )
      return;
    if (acceptAnswer(answer, current, Date.now(), round.end)) {
      score.current = { ...score.current, correct: score.current.correct + 1 };
      setCurrent(problem(difficulty, operations));
      setFeedback("Správně. Další!");
    } else {
      score.current = {
        ...score.current,
        mistakes: score.current.mistakes + 1,
      };
      setFeedback("Zkus to znovu.");
    }
    setCounts(score.current);
    setAnswer("");
    input.current?.focus();
  }
  if (result)
    return (
      <View style={{ gap: 22 }}>
        <Text style={s.label}>KOLO DOKONČENO</Text>
        <Text style={s.title}>{result.correct}</Text>
        <Text style={s.h2}>správných odpovědí</Text>
        <View style={s.card}>
          <Text style={s.text}>
            {result.mistakes} chyb · {difficultyNames[result.difficulty]} ·{" "}
            {result.duration} s
          </Text>
          <Text style={s.text}>
            {result.correct > previousBest.current
              ? "Nový osobní rekord!"
              : `Nejlepší výsledek v tomto režimu: ${Math.max(best, result.correct)}`}
          </Text>
          <Text style={s.muted}>
            Rekordy porovnáváme jen při stejné obtížnosti, délce a operacích.
          </Text>
        </View>
        <Button onPress={start}>Hrát znovu</Button>
        <Button quiet onPress={() => setResult(null)}>
          Změnit režim
        </Button>
      </View>
    );
  if (!round)
    return (
      <View style={{ gap: 24 }}>
        <Text style={s.label}>MENTÁLNÍ ARÉNA</Text>
        <Text style={s.title}>Rozhýbej hlavu.</Text>
        <Text style={s.text}>
          Počítej, potvrď a pokračuj. Kolik příkladů zvládneš?
        </Text>
        <View style={s.card}>
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
          <Text style={s.label}>DÉLKA KOLA</Text>
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
          <Text style={s.label}>OPERACE</Text>
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
        </View>
        <View style={s.between}>
          <Text style={s.muted}>Rekord tohoto režimu</Text>
          <Text style={s.stat}>{best}</Text>
        </View>
        <Button onPress={start}>Spustit kolo</Button>
        {games.length > 0 && (
          <View style={s.card}>
            <Text style={s.label}>POSLEDNÍ KOLA</Text>
            {games
              .slice(-5)
              .reverse()
              .map((g) => (
                <View key={g.id} style={s.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.text}>
                      {g.correct} správně · {g.mistakes} chyb
                    </Text>
                    <Text style={s.muted}>
                      {difficultyNames[g.difficulty]} · {g.duration} s ·{" "}
                      {g.operations.join(" ")} ·{" "}
                      {new Date(g.at).toLocaleDateString("cs-CZ")}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </View>
    );
  return (
    <View style={{ gap: 20 }}>
      <View style={s.between}>
        <Text style={s.label}>
          ARÉNA / {difficultyNames[difficulty].toUpperCase()}
        </Text>
        <Text style={s.stat}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </Text>
      </View>
      <Progress value={left / duration} color={mint} />
      <View style={[s.hero, { alignItems: "center", paddingVertical: 32 }]}>
        <Text style={[s.title, { fontSize: 42, letterSpacing: -1 }]}>
          {current.text}
        </Text>
        <TextInput
          ref={input}
          accessibilityLabel="Odpověď"
          value={answer}
          onChangeText={(v) => setAnswer(v.replace(/\D/g, "").slice(0, 6))}
          onSubmitEditing={submit}
          keyboardType="number-pad"
          showSoftInputOnFocus={false}
          placeholder="?"
          placeholderTextColor="#796789"
          style={[
            s.input,
            { fontSize: 36, width: "100%", maxWidth: 220, textAlign: "center" },
          ]}
        />
        <Text
          style={[
            s.muted,
            {
              color: feedback === "Zkus to znovu." ? "#ffb0ba" : mint,
              minHeight: 22,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          {feedback || "Tvoje další správná odpověď."}
        </Text>
      </View>
      <View style={s.between}>
        <Text style={s.text}>Správně: {counts.correct}</Text>
        <Text style={s.muted}>Chyby: {counts.mistakes}</Text>
      </View>
      <View style={{ gap: 8 }}>
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["⌫", "0", "OK"],
        ].map((row, i) => (
          <View key={i} style={s.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={
                  key === "⌫"
                    ? "Smazat číslici"
                    : key === "OK"
                      ? "Potvrdit odpověď"
                      : key
                }
                onPress={() =>
                  key === "OK"
                    ? submit()
                    : setAnswer((v) =>
                        key === "⌫" ? v.slice(0, -1) : `${v}${key}`.slice(0, 6),
                      )
                }
                style={[
                  s.quiet,
                  {
                    flex: 1,
                    padding: 16,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: key === "OK" ? mint : "#211b2c",
                  },
                ]}
              >
                <Text
                  style={[
                    s.h2,
                    { color: key === "OK" ? "#10251f" : "#f6f3ff" },
                  ]}
                >
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
      {confirm ? (
        <View style={s.card}>
          <Text style={s.text}>
            Ukončit rozehrané kolo? Výsledek se neuloží.
          </Text>
          <Button quiet onPress={() => setConfirm(false)}>
            Pokračovat
          </Button>
          <Button
            onPress={() => {
              ended.current = true;
              setRound(null);
              onActive(false);
              setConfirm(false);
            }}
          >
            Ukončit bez výsledku
          </Button>
        </View>
      ) : (
        <Button quiet onPress={() => setConfirm(true)}>
          Ukončit kolo
        </Button>
      )}
    </View>
  );
}
