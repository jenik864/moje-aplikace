import React, { useState } from "react";
import { View, Text } from "react-native";
import { lessons, type Lesson } from "./lessons";
import { s, Button, Progress, mint } from "./components";
export function Learning({
  completed,
  onComplete,
  onNavigate,
}: {
  completed: Record<string, number>;
  onComplete: (id: string) => void;
  onNavigate: () => void;
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  if (lesson)
    return (
      <LessonPlayer
        key={lesson.id}
        lesson={lesson}
        onComplete={() => onComplete(lesson.id)}
        onBack={() => {
          setLesson(null);
          onNavigate();
        }}
        onNavigate={onNavigate}
      />
    );
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>MALÉ LEKCE / VELKÉ SOUVISLOSTI</Text>
      <Text style={s.title}>Objev něco nového.</Text>
      <Text style={s.text}>Vyber téma. Pochop princip. Vyzkoušej si ho.</Text>
      <Button
        onPress={() => {
          const pool = lessons.filter((l) => !completed[l.id]);
          const options = pool.length ? pool : lessons;
          setLesson(options[Math.floor(Math.random() * options.length)]);
          onNavigate();
        }}
      >
        Překvap mě
      </Button>
      {lessons.map((l) => (
        <View key={l.id} style={s.card}>
          <Text style={s.label}>
            {l.category}
            {completed[l.id] ? " · SPLNĚNO" : ""}
          </Text>
          <Text style={s.h2}>{l.title}</Text>
          <Text style={s.muted}>{l.subtitle}</Text>
          <Text style={s.muted}>3 části · otázky · závěrečný úkol</Text>
          <Button
            quiet
            onPress={() => {
              setLesson(l);
              onNavigate();
            }}
          >
            {completed[l.id] ? "Zopakovat lekci" : "Otevřít lekci"}
          </Button>
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.h3}>Od lekce k dovednosti</Text>
        <Text style={s.text}>
          Přidej si do plánu pravidelné učení. Krátkou lekci doplň vlastní
          praxí: napiš kód, vysvětli princip vlastními slovy nebo si zkus nový
          příklad.
        </Text>
        <Text style={s.muted}>
          Tato verze obsahuje připravené lekce Quitteru. Osobní AI tutor a
          vlastní generovaná témata zatím nejsou připojené.
        </Text>
      </View>
    </View>
  );
}
function LessonPlayer({
  lesson,
  onComplete,
  onBack,
  onNavigate,
}: {
  lesson: Lesson;
  onComplete: () => void;
  onBack: () => void;
  onNavigate: () => void;
}) {
  const [step, setStep] = useState(0),
    [choice, setChoice] = useState<number | null>(null),
    [done, setDone] = useState(false);
  const practice = step === lesson.steps.length;
  const item = practice ? lesson.practice : lesson.steps[step];
  const correct = choice === item.answer;
  if (done)
    return (
      <View style={{ gap: 24 }}>
        <Text style={[s.label, { color: mint }]}>NOVÝ OBZOR ODEMČEN</Text>
        <Text style={s.title}>Teď tomu rozumíš víc.</Text>
        <View style={s.hero}>
          <Text style={s.h2}>{lesson.title}</Text>
          <Text style={s.text}>{lesson.takeaway}</Text>
        </View>
        <Text style={s.muted}>
          Dokončení lekce je uložené. Splnění svého denního cíle učení potvrď v
          osobním plánu.
        </Text>
        <Button onPress={onBack}>Další témata</Button>
      </View>
    );
  return (
    <View style={{ gap: 22 }}>
      <Text style={s.label}>
        {lesson.category} / {step + 1} ZE {lesson.steps.length + 1}
      </Text>
      <Progress value={(step + 1) / (lesson.steps.length + 1)} />
      <Text style={s.h2}>
        {practice ? "Vyzkoušej si to" : lesson.steps[step].title}
      </Text>
      {!practice && (
        <>
          <Text style={s.text}>{lesson.steps[step].text}</Text>
          <View
            style={[
              s.card,
              { backgroundColor: "#111e20", borderColor: "#274342" },
            ]}
          >
            <Text
              style={[
                s.text,
                { fontFamily: "monospace", color: mint, fontSize: 15 },
              ]}
            >
              {lesson.steps[step].example}
            </Text>
          </View>
        </>
      )}
      <Text style={s.h3}>
        {practice ? lesson.practice.prompt : lesson.steps[step].question}
      </Text>
      {item.options.map((option, i) => (
        <Button key={i} quiet disabled={correct} onPress={() => setChoice(i)}>
          {choice === i ? (correct ? "✓ " : "↻ ") : ""}
          {option}
        </Button>
      ))}
      {choice !== null && (
        <View style={s.card}>
          <Text style={[s.h3, { color: correct ? mint : "#ffb0ba" }]}>
            {correct ? "Přesně tak." : "Ještě to zkus."}
          </Text>
          <Text style={s.text}>
            {correct
              ? item.explanation
              : "Vrať se k vysvětlení a vyber jinou možnost."}
          </Text>
        </View>
      )}
      <Button
        disabled={!correct}
        onPress={() => {
          onNavigate();
          if (practice) {
            onComplete();
            setDone(true);
          } else {
            setStep(step + 1);
            setChoice(null);
          }
        }}
      >
        {practice ? "Dokončit lekci" : "Pokračovat"}
      </Button>
      <Button quiet onPress={onBack}>
        Zpět na témata
      </Button>
    </View>
  );
}
