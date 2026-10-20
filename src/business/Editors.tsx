import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Chip, Field, colors, colorNames, s } from "./components";
import {
  uid,
  templates,
  displayDate,
  parseDate,
  shiftDay,
  type Project,
  type ProjectInput,
  type Task,
} from "./model";

export function ProjectEditor({
  project,
  onDirty,
  onSave,
}: {
  project?: Project;
  onDirty: (dirty: boolean) => void;
  onSave: (input: ProjectInput, template: string) => void;
}) {
  const id = useRef(project?.id ?? uid()).current;
  const [title, setTitle] = useState(project?.title ?? ""),
    [outcome, setOutcome] = useState(project?.outcome ?? ""),
    [notes, setNotes] = useState(project?.notes ?? ""),
    [color, setColor] = useState(project?.color ?? 0),
    [template, setTemplate] = useState("empty"),
    [error, setError] = useState("");
  useEffect(() => {
    onDirty(
      title !== (project?.title ?? "") ||
        outcome !== (project?.outcome ?? "") ||
        notes !== (project?.notes ?? "") ||
        color !== (project?.color ?? 0) ||
        template !== "empty",
    );
  }, [title, outcome, notes, color, template, project, onDirty]);
  return (
    <>
      <Text style={s.h2}>
        {project ? "Dolaď svůj projekt." : "Co chceš dostat do světa?"}
      </Text>
      <Text style={s.muted}>
        Napiš výsledek, podle kterého poznáš, že máš hotovo.
      </Text>
      <Field
        label="Název projektu"
        value={title}
        onChange={setTitle}
        placeholder="Např. První vlastní web"
        maxLength={80}
      />
      <Field
        label="Jak poznám, že je hotovo"
        value={outcome}
        onChange={setOutcome}
        placeholder="Např. Web je venku a otestují ho tři lidé."
        multiline
        maxLength={300}
      />
      {!project && (
        <>
          <Text style={s.label}>JAK CHCEŠ ZAČÍT</Text>
          {templates.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: template === t.id }}
              aria-checked={template === t.id}
              onPress={() => setTemplate(t.id)}
              style={[
                s.card,
                { padding: 16 },
                template === t.id && {
                  borderColor: `${colors[color]}70`,
                  backgroundColor: `${colors[color]}0d`,
                },
              ]}
            >
              <Text style={s.h3}>{t.name}</Text>
              <Text style={s.muted}>{t.description}</Text>
              {t.tasks.length > 0 && (
                <Text style={s.small}>
                  {t.tasks.length} upravitelných kroků · termíny si vybereš sám
                </Text>
              )}
            </Pressable>
          ))}
        </>
      )}
      <Text style={s.label}>BARVA PROJEKTU</Text>
      <View style={s.wrap}>
        {colors.map((c, i) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Barva ${colorNames[i]}`}
            accessibilityState={{ selected: color === i }}
            aria-pressed={color === i}
            onPress={() => setColor(i)}
            style={[
              s.chip,
              {
                width: 48,
                alignItems: "center",
                paddingHorizontal: 0,
                borderColor: color === i ? c : "#ffffff12",
              },
            ]}
          >
            <View
              style={{
                width: 17,
                height: 17,
                borderRadius: 9,
                backgroundColor: c,
              }}
            />
          </Pressable>
        ))}
      </View>
      <Field
        label="Poznámky (volitelné)"
        value={notes}
        onChange={setNotes}
        multiline
        maxLength={4000}
        placeholder="Nápady, odkazy a podstatné souvislosti…"
      />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        onPress={() => {
          if (!title.trim() || !outcome.trim()) {
            setError("Doplň název projektu a výsledek, ke kterému míříš.");
            return;
          }
          setError("");
          onSave({ id, title, outcome, notes, color }, template);
        }}
      >
        {project ? "Uložit projekt" : "Vytvořit projekt"}
      </Button>
    </>
  );
}

export function TaskEditor({
  project,
  task,
  today,
  onDirty,
  onSave,
  onRemove,
  onProject,
}: {
  project: Project;
  task?: Task;
  today: string;
  onDirty: (dirty: boolean) => void;
  onSave: (input: Omit<Task, "createdAt" | "updatedAt" | "doneAt">) => void;
  onRemove: (id: string) => void;
  onProject: () => void;
}) {
  const id = useRef(task?.id ?? uid()).current;
  const [title, setTitle] = useState(task?.title ?? ""),
    [date, setDate] = useState(
      displayDate(task?.plannedFor ?? (task ? undefined : today)),
    ),
    [minutes, setMinutes] = useState(task?.minutes?.toString() ?? ""),
    [priority, setPriority] = useState<Task["priority"]>(
      task?.priority ?? "normal",
    ),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState(false);
  useEffect(() => {
    onDirty(
      title !== (task?.title ?? "") ||
        date !== displayDate(task?.plannedFor ?? (task ? undefined : today)) ||
        minutes !== (task?.minutes?.toString() ?? "") ||
        priority !== (task?.priority ?? "normal"),
    );
  }, [title, date, minutes, priority, task, today, onDirty]);
  if (project.status !== "active" || project.archivedAt !== undefined)
    return (
      <>
        <Text style={s.h2}>{task?.title}</Text>
        <Text style={s.muted}>
          Pro úpravu kroků nejdřív obnov nebo znovu otevři projekt.
        </Text>
        <Button onPress={onProject}>Otevřít projekt</Button>
      </>
    );
  return (
    <>
      <Text style={s.label}>{project.title.toUpperCase()}</Text>
      <Text style={s.h2}>
        {task ? "Dolaď další krok." : "Malý krok. Jasný výsledek."}
      </Text>
      <Field
        label="Co konkrétně udělám"
        value={title}
        onChange={setTitle}
        placeholder="Např. Poslat návrh prvním třem lidem"
      />
      <Text style={s.label}>KDY SE TOMU BUDEŠ VĚNOVAT</Text>
      <View style={s.wrap}>
        <Chip
          selected={date === displayDate(today)}
          onPress={() => setDate(displayDate(today))}
        >
          Dnes
        </Chip>
        <Chip
          selected={date === displayDate(shiftDay(today, 1))}
          onPress={() => setDate(displayDate(shiftDay(today, 1)))}
        >
          Zítra
        </Chip>
        <Chip selected={!date} onPress={() => setDate("")}>
          Bez data
        </Chip>
      </View>
      <Field
        label="Datum (den. měsíc. rok)"
        value={date}
        onChange={setDate}
        placeholder="Např. 20. 10. 2026"
        maxLength={20}
      />
      <Field
        label="Odhad času v minutách (volitelné)"
        value={minutes}
        onChange={setMinutes}
        numeric
        placeholder="5–240 min"
        maxLength={3}
      />
      <Text style={s.label}>PRIORITA</Text>
      <View style={s.wrap}>
        <Chip
          selected={priority === "normal"}
          onPress={() => setPriority("normal")}
        >
          Běžná
        </Chip>
        <Chip
          selected={priority === "high"}
          onPress={() => setPriority("high")}
        >
          Důležité
        </Chip>
      </View>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        onPress={() => {
          try {
            if (!title.trim())
              throw new Error("Pojmenuj konkrétní další krok.");
            const plannedFor = parseDate(date),
              estimate = minutes.trim() ? Number(minutes) : undefined;
            if (
              estimate !== undefined &&
              (!Number.isInteger(estimate) || estimate < 5 || estimate > 240)
            )
              throw new Error(
                "Odhad nastav od 5 do 240 minut, nebo ho nech prázdný.",
              );
            setError("");
            onSave({
              id,
              projectId: project.id,
              title,
              plannedFor,
              minutes: estimate,
              priority,
            });
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Zkontroluj zadání úkolu.",
            );
          }
        }}
      >
        {task ? "Uložit krok" : "Přidat krok"}
      </Button>
      {task &&
        (removing ? (
          <View style={s.card}>
            <Text style={s.h3}>Odstranit tento krok?</Text>
            <Text style={s.muted}>
              Krok i jeho případné splnění se z projektu odstraní. Tuhle změnu
              nelze vrátit.
            </Text>
            <Button quiet onPress={() => setRemoving(false)}>
              Zachovat krok
            </Button>
            <Button quiet onPress={() => onRemove(task.id)}>
              Odstranit natrvalo
            </Button>
          </View>
        ) : (
          <Button quiet onPress={() => setRemoving(true)}>
            Odstranit krok
          </Button>
        ))}
    </>
  );
}
