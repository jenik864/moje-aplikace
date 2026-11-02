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
      contentContainerStyle={[s.body, { gap: 22 }]}
    >
      <View style={{ gap: 14, paddingTop: 4 }}>
        <Text style={s.label}>OBJEVOVÁNÍ / MALÁ LABORATOŘ</Text>
        <View style={[s.row, { alignItems: "flex-start" }]}>
          <Text
            style={[s.title, { fontSize: 36, flex: 1, letterSpacing: -1.5 }]}
          >
            Každý den nový obzor.
          </Text>
          <View style={{ paddingTop: 8 }}>
            <LessonArt id="memory" size={70} />
          </View>
        </View>
        <Text style={s.muted}>
          Krátké vysvětlení. Vlastní pokus. Otázka, která ověří porozumění.
        </Text>
        <View style={[s.between, { paddingTop: 10 }]}>
          <Text style={[s.link, { color: mint }]}>
            {count}/{lessons.length} dokončeno
          </Text>
          <Text style={[s.muted, { fontSize: 12 }]}>
            {saved.length} uložených · 4 oblasti
          </Text>
        </View>
        <Progress value={count / lessons.length} />
      </View>
      {next.resume && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pokračovat v tématu ${next.resume.title}`}
          onPress={() => setLesson(next.resume!)}
          style={{
            borderLeftWidth: 2,
            borderColor: color,
            paddingLeft: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <Text style={s.label}>NAVÁŽEME TAM, KDE JSI SKONČIL</Text>
          <Text style={s.h3}>{next.resume.title}</Text>
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
          style={{
            borderLeftWidth: 2,
            borderColor: mint,
            paddingLeft: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <Text style={[s.label, { color: mint }]}>VYBAV SI ZNOVU</Text>
          <Text style={s.h3}>{next.review.title}</Text>
          <Text style={s.muted}>
            Osvěž znalost po odstupu. Opakování nepřidává XP.
          </Text>
          <Text style={[s.link, { color: mint }]}>Osvěžit znalost →</Text>
        </Pressable>
      )}
      <Field
        label="Hledat téma"
        value={query}
        onChangeText={setQuery}
        placeholder="Paměť, energie, Python…"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingVertical: 2 }}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 20,
          borderBottomWidth: 1,
          borderColor: "#ffffff14",
        }}
      >
        {[
          ["all", "Všechna témata"],
          ["saved", "Uložená"],
          ["progress", "Rozpracovaná"],
          ["done", "Dokončená"],
        ].map(([id, label]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: status === id }}
            aria-selected={status === id}
            key={id}
            onPress={() => setStatus(id)}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderColor: status === id ? color : "transparent",
            }}
          >
            <Text
              style={{
                color: status === id ? "#f7f7f7" : "#8a8a8a",
                fontSize: 13,
                fontWeight: status === id ? "600" : "400",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.between}>
        <Text style={[s.muted, { fontSize: 12 }]}>
          Nalezená témata: {visible.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={!visible.length}
          onPress={() => {
            const pool = visible.filter((l) => !Object.hasOwn(completed, l.id)),
              choices = pool.length ? pool : visible;
            if (choices.length)
              setLesson(choices[Math.floor(Math.random() * choices.length)]);
          }}
        >
          <Text
            style={[
              s.link,
              { fontSize: 13 },
              !visible.length && { opacity: 0.4 },
            ]}
          >
            Překvap mě →
          </Text>
        </Pressable>
      </View>
      {visible.length === 0 && (
        <View style={{ gap: 15, paddingVertical: 22 }}>
          <Text style={s.h3}>Tady zatím žádné téma není.</Text>
          <Text style={s.muted}>
            {status === "saved"
              ? "U tématu zvol Uložit a vrať se k němu později."
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
      <View>
        {visible.map((l, i) => {
          const done = Object.hasOwn(completed, l.id),
            step = progress[l.id] ?? 0;
          return (
            <View
              key={l.id}
              style={{
                borderTopWidth: 1,
                borderColor: "#ffffff13",
                paddingVertical: 23,
                gap: 12,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Otevřít téma ${l.title}`}
                onPress={() => setLesson(l)}
                style={({ pressed }) => [
                  { gap: 13 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[s.row, { alignItems: "flex-start", gap: 14 }]}>
                  <Text
                    style={{
                      color: `${color}80`,
                      fontSize: 11,
                      paddingTop: 3,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={s.label}>{l.category}</Text>
                    <Text style={[s.h2, { fontSize: 25, fontWeight: "500" }]}>
                      {l.title}
                    </Text>
                    <Text style={[s.muted, { fontSize: 12, lineHeight: 19 }]}>
                      {l.subtitle}
                    </Text>
                  </View>
                  <LessonArt id={l.id} size={54} />
                </View>
                <View
                  style={[s.between, { paddingLeft: 28, flexWrap: "wrap" }]}
                >
                  <Text style={[s.muted, { fontSize: 12 }]}>
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
                {(done || step > 0) && (
                  <View style={[s.row, { gap: 4, paddingLeft: 28 }]}>
                    {Array.from({ length: l.steps.length + 1 }, (_, n) => (
                      <View
                        key={n}
                        style={{
                          flex: 1,
                          height: 2,
                          backgroundColor: done
                            ? mint
                            : n < step
                              ? color
                              : "#ffffff10",
                        }}
                      />
                    ))}
                  </View>
                )}
              </Pressable>
              <View style={[s.between, { paddingLeft: 28 }]}>
                <Text style={[s.muted, { fontSize: 11 }]}>
                  {done
                    ? "Opakování bez dalších XP"
                    : "První dokončení: až +15 XP"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${saved.includes(l.id) ? "Odebrat uložené téma" : "Uložit téma"} ${l.title}`}
                  accessibilityState={{ selected: saved.includes(l.id) }}
                  onPress={() => onSaved(l.id)}
                  style={{ paddingVertical: 9, paddingLeft: 10 }}
                >
                  <Text style={[s.link, { fontSize: 12 }]}>
                    {saved.includes(l.id) ? "✓ Uloženo" : "+ Uložit"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={[s.muted, { fontSize: 11 }]}>
        Připravené lekce fungují i bez připojení. Vlastní AI témata zatím nejsou
        součástí knihovny.
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
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
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
              borderRadius: 0,
              borderWidth: 0,
              borderBottomWidth: 1,
              borderColor:
                choice === i ? (correct ? mint : "#ff8995") : "#383838",
              backgroundColor:
                choice === i
                  ? correct
                    ? "#d2d2d210"
                    : "#ff899510"
                  : "transparent",
            }}
          >
            <Text
              style={[
                s.text,
                {
                  fontSize: 15,
                  color:
                    choice === i ? (correct ? mint : "#ffb5be") : "#e6e6e6",
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
          paddingHorizontal: 24,
          paddingVertical: 16,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderColor: "#323232",
          backgroundColor: "#0a0a0a",
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
