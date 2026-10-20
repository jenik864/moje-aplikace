import React, { useContext, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { findLessons, lessons, lessonGroups, type Lesson } from "./lessons";
import { learningNext } from "./insights";
import type { MindData } from "./model";
import {
  useMindStyles,
  Button,
  Progress,
  MindTheme,
  mint,
  Chip,
  Field,
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
  data,
  initialLessonId,
  onComplete,
  onProgress,
  onSaved,
  onNote,
}: {
  data: MindData;
  initialLessonId?: string;
  onComplete: (id: string) => number;
  onProgress: (id: string, step: number) => void;
  onSaved: (id: string) => void;
  onNote: (id: string, note: string) => void;
}) {
  const s = useMindStyles(),
    color = useContext(MindTheme);
  const [lesson, setLesson] = useState<Lesson | null>(
      () => lessons.find((l) => l.id === initialLessonId) ?? null,
    ),
    [tab, setTab] = useState("all"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all");
  const completed = data.lessons,
    progress = data.lessonProgress ?? {},
    saved = data.learning?.saved ?? [];
  const next = learningNext(data),
    count = lessons.filter((l) => Object.hasOwn(completed, l.id)).length;
  if (lesson)
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        initialStep={
          Object.hasOwn(completed, lesson.id) ? 0 : (progress[lesson.id] ?? 0)
        }
        wasCompleted={Object.hasOwn(completed, lesson.id)}
        note={data.learning?.notes[lesson.id] ?? ""}
        saved={saved.includes(lesson.id)}
        onSaved={() => onSaved(lesson.id)}
        onNote={(note) => onNote(lesson.id, note)}
        onComplete={() => onComplete(lesson.id)}
        onProgress={(step) => onProgress(lesson.id, step)}
        onBack={() => setLesson(null)}
        onNext={() =>
          setLesson(
            lessons.find(
              (l) => l.id !== lesson.id && !Object.hasOwn(completed, l.id),
            ) ?? null,
          )
        }
      />
    );
  const visible = findLessons(query, tab).filter(
    (l) =>
      status === "all" ||
      (status === "saved"
        ? saved.includes(l.id)
        : status === "done"
          ? Object.hasOwn(completed, l.id)
          : !Object.hasOwn(completed, l.id) && (progress[l.id] ?? 0) > 0),
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.body}
    >
      <View style={{ gap: 8 }}>
        <Text style={s.label}>OBJEVOVÁNÍ / MALÁ LABORATOŘ</Text>
        <Text style={[s.title, { fontSize: 34 }]}>Každý den nový obzor.</Text>
        <Text style={s.muted}>
          Krátké vysvětlení. Vlastní pokus. Otázka, která ověří porozumění.
        </Text>
      </View>
      <View style={[s.hero, { padding: 18, gap: 12 }]}>
        <View style={s.between}>
          <Text style={s.label}>TVOJE KNIHOVNA</Text>
          <Text style={[s.link, { color: mint }]}>
            {count}/{lessons.length} dokončeno
          </Text>
        </View>
        <Progress value={count / lessons.length} />
        <View style={s.between}>
          <Text style={s.muted}>4 oblasti · 9 témat · 10–14 min</Text>
          <Text style={s.muted}>{saved.length} uložených</Text>
        </View>
      </View>
      {next.resume && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pokračovat v tématu ${next.resume.title}`}
          onPress={() => setLesson(next.resume!)}
          style={[s.card, { borderColor: color, gap: 10 }]}
        >
          <Text style={s.label}>NAVÁZAT TAM, KDE JSI SKONČIL</Text>
          <Text style={s.h2}>{next.resume.title}</Text>
          <Text style={s.link}>
            Krok {(progress[next.resume.id] ?? 0) + 1} ze 4 · Pokračovat →
          </Text>
        </Pressable>
      )}
      {next.review && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Zopakovat téma ${next.review.title}`}
          onPress={() => setLesson(next.review!)}
          style={[
            s.card,
            { backgroundColor: "#0e1b1b", borderColor: `${mint}30`, gap: 8 },
          ]}
        >
          <Text style={[s.label, { color: mint }]}>VYBAV SI ZNOVU</Text>
          <Text style={s.h3}>{next.review.title}</Text>
          <Text style={s.muted}>
            Zkus téma projít po odstupu bez nápovědy. Opakování nepřidává XP.
          </Text>
          <Text style={[s.link, { color: mint }]}>Osvěžit znalost →</Text>
        </Pressable>
      )}
      <Field
        label="Hledat téma"
        value={query}
        onChangeText={setQuery}
        placeholder="Např. paměť, energie, Python…"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        <Chip
          label="Všechny oblasti"
          selected={tab === "all"}
          onPress={() => setTab("all")}
        />
        {Object.entries(lessonGroups).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={tab === id}
            onPress={() => setTab(id)}
          />
        ))}
      </ScrollView>
      <View style={s.wrap}>
        {[
          ["all", "Všechna témata"],
          ["saved", "Uložená"],
          ["progress", "Rozpracovaná"],
          ["done", "Dokončená"],
        ].map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            selected={status === id}
            onPress={() => setStatus(id)}
          />
        ))}
      </View>
      <View style={s.between}>
        <Text style={s.muted}>Nalezená témata: {visible.length}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const pool = visible.filter((l) => !Object.hasOwn(completed, l.id));
            const choices = pool.length ? pool : visible;
            if (choices.length)
              setLesson(choices[Math.floor(Math.random() * choices.length)]);
          }}
          disabled={!visible.length}
        >
          <Text style={[s.link, !visible.length && { opacity: 0.4 }]}>
            Překvap mě →
          </Text>
        </Pressable>
      </View>
      {visible.length === 0 && (
        <View style={s.card}>
          <Text style={s.h3}>Tady zatím žádné téma není.</Text>
          <Text style={s.muted}>
            {status === "saved"
              ? "Témata si uložíš tlačítkem Uložit na jejich kartě."
              : "Zkus jiný výraz nebo obnov všechny filtry."}
          </Text>
          <Button
            quiet
            onPress={() => {
              setQuery("");
              setStatus("all");
              setTab("all");
            }}
          >
            Zobrazit všechna témata
          </Button>
        </View>
      )}
      {visible.map((l) => {
        const done = Object.hasOwn(completed, l.id),
          step = progress[l.id] ?? 0;
        return (
          <View key={l.id} style={[s.card, { padding: 18, gap: 14 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Otevřít téma ${l.title}`}
              onPress={() => setLesson(l)}
              style={({ pressed }) => [
                { gap: 14 },
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={s.row}>
                <LessonArt id={l.id} size={72} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.label}>{l.category}</Text>
                  <Text style={s.h2}>{l.title}</Text>
                </View>
              </View>
              <Text style={s.muted}>{l.subtitle}</Text>
              <View style={[s.row, { gap: 5 }]}>
                {Array.from({ length: l.steps.length + 1 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 4,
                      backgroundColor: done
                        ? mint
                        : i < step
                          ? color
                          : "#ffffff16",
                    }}
                  />
                ))}
              </View>
              <View style={[s.between, { flexWrap: "wrap" }]}>
                <Text style={s.muted}>
                  {done
                    ? "✓ Dokončeno"
                    : step
                      ? `${step}/4 kroků · pokračovat`
                      : `${l.minutes} min · 4 kroky`}
                </Text>
                <Text style={[s.link, { fontSize: 13 }]}>
                  {done ? "Zopakovat →" : step ? "Pokračovat →" : "Otevřít →"}
                </Text>
              </View>
            </Pressable>
            <View
              style={[
                s.between,
                { borderTopWidth: 1, borderColor: "#ffffff0b", paddingTop: 10 },
              ]}
            >
              <Text style={[s.muted, { fontSize: 12 }]}>
                {done
                  ? "Opakování bez dalších XP"
                  : "První dokončení: až +15 XP"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${saved.includes(l.id) ? "Odebrat uložené téma" : "Uložit téma"} ${l.title}`}
                accessibilityState={{ selected: saved.includes(l.id) }}
                onPress={() => onSaved(l.id)}
                style={{ paddingVertical: 8, paddingLeft: 10 }}
              >
                <Text style={[s.link, { fontSize: 13 }]}>
                  {saved.includes(l.id) ? "✓ Uloženo" : "+ Uložit"}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <Text style={[s.muted, { fontSize: 12 }]}>
        Připravené lekce fungují i bez připojení. Učení navazuje na tvůj uložený
        postup; vlastní AI témata zatím nejsou součástí knihovny.
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
  onNext,
  note,
  saved,
  onSaved,
  onNote,
}: {
  onNext: () => void;
  note: string;
  saved: boolean;
  onSaved: () => void;
  onNote: (note: string) => void;
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
    [details, setDetails] = useState(false),
    [notesOpen, setNotesOpen] = useState(false);
  const [awarded, setAwarded] = useState(0);
  const wasAlreadyCompleted = useRef(wasCompleted).current;
  const total = lesson.steps.length + 1;
  const noteField = (
    <Field
      label="Moje poznámka · ukládá se automaticky"
      value={note}
      onChangeText={(text) => onNote(text.slice(0, 1000))}
      multiline
      placeholder="Jak to použiješ nebo co si chceš zapamatovat?"
    />
  );
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
        {noteField}
        <Button onPress={onNext}>Další objev →</Button>
        <Button quiet onPress={onBack}>
          Zpět do knihovny
        </Button>
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
            {step + 1}/{total} · {practice ? "VÝZVA" : "OBJEV"}
          </Text>
        </View>
        <Progress value={step / total} />
        <View style={s.between}>
          <Text style={[s.muted, { flex: 1 }]}>
            {lesson.title} · cca {lesson.minutes} min
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Uložit aktuální téma"
            onPress={onSaved}
          >
            <Text style={s.link}>{saved ? "✓ Uloženo" : "+ Uložit"}</Text>
          </Pressable>
        </View>
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
            <Text style={s.text}>
              {summaries[lesson.id]?.[step] ?? lesson.steps[step].text}
            </Text>
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
                {details
                  ? "Skrýt vysvětlení ↑"
                  : summaries[lesson.id]
                    ? "Proč to tak je? ↓"
                    : "Konkrétní příklad ↓"}
              </Text>
            </Pressable>
            {details && (
              <Text style={s.muted}>
                {summaries[lesson.id]
                  ? lesson.steps[step].text
                  : lesson.steps[step].example}
              </Text>
            )}
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
        {!practice && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: notesOpen }}
            onPress={() => setNotesOpen(!notesOpen)}
          >
            <Text style={s.link}>
              {notesOpen
                ? "Skrýt poznámku ↑"
                : note
                  ? "Moje uložená poznámka ↓"
                  : "+ Poznámka k tématu"}
            </Text>
          </Pressable>
        )}
        {(practice || notesOpen) && noteField}
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
