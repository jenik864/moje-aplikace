import React, { useContext, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { lessons, type Lesson } from "./lessons";
import {
  useMindStyles,
  Button,
  Progress,
  MindTheme,
  mint,
  Chip,
} from "./components";
import { LessonArt, LessonLab } from "./LessonLab";
const summaries: Record<string, string[]> = {
  "python-start": [
    "Proměnná uchová hodnotu pod jménem. Změň počet knih a sleduj, co program vypíše.",
    "Podmínka if vybere cestu podle výsledku porovnání. Zkus věk pod a nad 18 let.",
    "Cyklus for opakuje kód. range(3) projde hodnoty 0, 1 a 2.",
  ],
  "oil-to-fuel": [
    "Ropa je směs mnoha uhlovodíků. Jedna surovina může dát různé produkty.",
    "V koloně je dole tepleji a nahoře chladněji. Frakce se oddělují podle rozsahu teplot varu.",
    "Destilace odděluje, kraking mění molekuly a míchání spojuje vhodné složky do paliva.",
  ],
  "compound-interest": [
    "Úrok ponechaný na účtu se přidá k původní částce. Zkus změnit sazbu.",
    "Další úrok se počítá i z předchozího úroku. Delší čas účinek zesílí.",
    "Zůstatek a kupní síla nejsou totéž. Výsledek ovlivňují sazby, inflace i poplatky.",
  ],
};
export function Learning({
  completed,
  progress,
  onComplete,
  onProgress,
}: {
  completed: Record<string, number>;
  progress: Record<string, number>;
  onComplete: (id: string) => number;
  onProgress: (id: string, step: number) => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme);
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [tab, setTab] = useState("all");
  if (lesson)
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        initialStep={completed[lesson.id] ? 0 : (progress[lesson.id] ?? 0)}
        wasCompleted={!!completed[lesson.id]}
        onComplete={() => onComplete(lesson.id)}
        onProgress={(step) => onProgress(lesson.id, step)}
        onBack={() => setLesson(null)}
      />
    );
  const visible = lessons.filter(
    (l) =>
      tab === "all" ||
      (tab === "skills" ? l.id === "python-start" : l.id !== "python-start"),
  );
  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.label}>OBJEVOVÁNÍ / DOVEDNOSTI</Text>
      <Text style={[s.title, { fontSize: 36 }]}>
        Pochop. Vyzkoušej. Zapamatuj.
      </Text>
      <View style={s.wrap}>
        {[
          ["all", "Vše"],
          ["skills", "Dovednosti"],
          ["world", "Jak svět funguje"],
        ].map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={tab === id}
            onPress={() => setTab(id)}
          />
        ))}
      </View>
      <Button
        quiet
        onPress={() => {
          const pool = lessons.filter((l) => !completed[l.id]);
          const choices = pool.length ? pool : lessons;
          setLesson(choices[Math.floor(Math.random() * choices.length)]);
        }}
      >
        Překvap mě
      </Button>
      {visible.map((l) => (
        <Pressable
          key={l.id}
          accessibilityRole="button"
          accessibilityLabel={`Otevřít téma ${l.title}`}
          onPress={() => setLesson(l)}
          style={[s.card, { gap: 18, padding: 18 }]}
        >
          <View style={s.row}>
            <LessonArt id={l.id} size={82} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.label}>{l.category}</Text>
              <Text style={s.h2}>{l.title}</Text>
            </View>
          </View>
          <Text style={s.muted}>{l.subtitle}</Text>
          <View style={[s.row, { gap: 6 }]}>
            {l.steps.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 4,
                  backgroundColor:
                    completed[l.id] || i < (progress[l.id] ?? 0)
                      ? color
                      : "#33353b",
                }}
              />
            ))}
          </View>
          <View style={s.between}>
            <Text style={s.muted}>
              {completed[l.id]
                ? "✓ Dokončeno"
                : progress[l.id]
                  ? `${progress[l.id]}/3 kroků · pokračovat`
                  : "3 kroky + závěrečný úkol"}
            </Text>
            <Text style={s.link}>
              {completed[l.id] ? "Zopakovat →" : "Prozkoumat →"}
            </Text>
          </View>
        </Pressable>
      ))}
      <Text style={s.muted}>
        Připravené úvodní lekce s interaktivními ukázkami. Generování vlastních
        témat a AI tutor zatím nejsou připojené.
      </Text>
    </ScrollView>
  );
}
function LessonPlayer({
  lesson,
  initialStep,
  wasCompleted,
  onComplete,
  onProgress,
  onBack,
}: {
  lesson: Lesson;
  initialStep: number;
  wasCompleted: boolean;
  onComplete: () => number;
  onProgress: (step: number) => void;
  onBack: () => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme),
    scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState(initialStep),
    [choice, setChoice] = useState<number | null>(null),
    [done, setDone] = useState(false),
    [details, setDetails] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const wasAlreadyCompleted = useRef(wasCompleted).current;
  const practice = step === lesson.steps.length,
    item = practice ? lesson.practice : lesson.steps[step],
    correct = choice === item.answer;
  const resetScroll = () => scroll.current?.scrollTo({ y: 0, animated: false });
  if (done)
    return (
      <ScrollView contentContainerStyle={s.body}>
        <Text style={[s.label, { color: mint }]}>LEKCE DOKONČENA</Text>
        <View style={[s.hero, { alignItems: "center" }]}>
          <LessonArt id={lesson.id} size={130} />
          <Text style={[s.h2, { textAlign: "center" }]}>{lesson.title}</Text>
          <Text style={[s.stat, { color }]}>
            {wasAlreadyCompleted ? "Znalost osvěžena" : `+${awarded} XP`}
          </Text>
          <Text style={s.muted}>
            {wasAlreadyCompleted
              ? "Opakování stejné lekce další XP nepřidává."
              : "XP se započítá do denního limitu."}
          </Text>
        </View>
        <Text style={s.text}>{lesson.takeaway}</Text>
        <Button onPress={onBack}>Další objev</Button>
        <Text style={s.muted}>
          Pro dlouhodobou dovednost si naplánuj pravidelnou praxi v Mém plánu.
        </Text>
      </ScrollView>
    );
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[s.body, { gap: 16, paddingBottom: 20 }]}
      >
        <View style={s.between}>
          <Pressable accessibilityRole="button" onPress={onBack}>
            <Text style={s.link}>← Témata</Text>
          </Pressable>
          <Text style={s.label}>
            {step + 1}/4 · {practice ? "VÝZVA" : "OBJEV"}
          </Text>
        </View>
        <Progress value={(step + 1) / 4} />
        <Text style={[s.h2, { fontSize: 27 }]}>
          {practice ? "Teď je řada na tobě." : lesson.steps[step].title}
        </Text>
        {practice ? (
          <View style={[s.row, s.card]}>
            <LessonArt id={lesson.id} size={66} />
            <Text style={[s.text, { flex: 1 }]}>
              Použij to, co sis právě vyzkoušel.
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.text}>{summaries[lesson.id][step]}</Text>
            <LessonLab
              key={`${lesson.id}-${step}`}
              id={lesson.id}
              step={step}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: details }}
              onPress={() => setDetails(!details)}
            >
              <Text style={s.link}>
                {details ? "Skrýt vysvětlení ↑" : "Proč to tak je? ↓"}
              </Text>
            </Pressable>
            {details && <Text style={s.muted}>{lesson.steps[step].text}</Text>}
          </>
        )}
        <Text style={s.h3}>
          {practice ? lesson.practice.prompt : lesson.steps[step].question}
        </Text>
        {item.options.map((option, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: choice === i }}
            onPress={() => {
              if (!correct) setChoice(i);
            }}
            style={{
              padding: 14,
              borderRadius: 13,
              borderWidth: 1,
              borderColor:
                choice === i ? (correct ? mint : "#ff8995") : "#36383e",
              backgroundColor:
                choice === i ? (correct ? "#142821" : "#2a171b") : "#15171b",
            }}
          >
            <Text
              style={[
                s.text,
                {
                  fontSize: 15,
                  color:
                    choice === i ? (correct ? mint : "#ffb5be") : "#e9e6e1",
                },
              ]}
            >
              {choice === i ? (correct ? "✓ " : "↻ ") : ""}
              {option}
            </Text>
          </Pressable>
        ))}
        {choice !== null && (
          <Text
            accessibilityLiveRegion="polite"
            style={[s.muted, { color: correct ? mint : "#ffb5be" }]}
          >
            {correct
              ? item.explanation
              : "Ještě to zkus. Podívej se znovu na ukázku."}
          </Text>
        )}
      </ScrollView>
      <View
        style={{
          padding: 14,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderColor: "#303238",
          backgroundColor: "#0b0c0f",
        }}
      >
        <Button
          disabled={!correct}
          onPress={() => {
            if (practice) {
              setAwarded(onComplete());
              setDone(true);
            } else {
              const next = step + 1;
              onProgress(next);
              setStep(next);
              setChoice(null);
              setDetails(false);
            }
            resetScroll();
          }}
        >
          {practice ? "Dokončit lekci" : "Pokračovat →"}
        </Button>
      </View>
    </View>
  );
}
