import React from "react";
import { View, Text } from "react-native";
import {
  Button,
  Progress,
  TaskRow,
  colors,
  statusNames,
  s,
} from "./components";
import {
  projectProgress,
  toggleTask,
  setProjectStatus,
  archiveProject,
  displayDate,
  dayKey,
  type BusinessData,
  type Project,
  type Task,
} from "./model";

export function ProjectDetail({
  data,
  project,
  today,
  onEdit,
  onAdd,
  onOpen,
  change,
}: {
  data: BusinessData;
  project: Project;
  today: string;
  onEdit: () => void;
  onAdd: () => void;
  onOpen: (task: Task) => void;
  change: (fn: (d: BusinessData) => BusinessData) => boolean;
}) {
  const progress = projectProgress(data, project.id),
    archived = project.archivedAt !== undefined,
    active = project.status === "active" && !archived,
    color = colors[project.color];
  const tasks = data.tasks
    .filter((t) => t.projectId === project.id)
    .sort(
      (a, b) =>
        Number(a.doneAt !== undefined) - Number(b.doneAt !== undefined) ||
        Number(b.priority === "high") - Number(a.priority === "high") ||
        a.createdAt - b.createdAt,
    );
  return (
    <>
      <View style={s.hero}>
        <View style={s.between}>
          <Text style={[s.label, { color }]}>
            {archived ? "V ARCHIVU" : statusNames[project.status].toUpperCase()}
          </Text>
          <View style={[s.dot, { backgroundColor: color }]} />
        </View>
        <Text style={[s.h2, { fontSize: 29 }]}>{project.title}</Text>
        <Text style={s.label}>VÝSLEDEK, KE KTERÉMU MÍŘÍŠ</Text>
        <Text style={s.text}>{project.outcome}</Text>
        <Progress value={progress.fraction} color={color} />
        <Text style={s.small}>
          {progress.done}/{progress.total} kroků dokončeno
          {project.completedAt !== undefined
            ? ` · projekt dokončen ${displayDate(dayKey(new Date(project.completedAt)))}`
            : ""}
        </Text>
      </View>
      {!archived && (
        <Button quiet onPress={onEdit}>
          Upravit projekt a poznámky
        </Button>
      )}
      {!!project.notes.trim() && (
        <View style={s.card}>
          <Text style={s.label}>POZNÁMKY K PROJEKTU</Text>
          <Text style={s.text}>{project.notes}</Text>
        </View>
      )}
      <View style={s.between}>
        <Text style={s.h2}>Konkrétní kroky</Text>
        <Text style={s.small}>
          {progress.done}/{progress.total}
        </Text>
      </View>
      {tasks.length ? (
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            project={project}
            today={today}
            onToggle={() => change((d) => toggleTask(d, task.id))}
            onOpen={() => onOpen(task)}
          />
        ))
      ) : (
        <View style={s.card}>
          <Text style={s.muted}>
            Přidej první malý krok, který má jasný výsledek. Třeba „Napsat
            prvnímu zákazníkovi“.
          </Text>
        </View>
      )}
      {active && (
        <>
          <Button onPress={onAdd}>+ Přidat další krok</Button>
          <View style={s.divider} />
          <Text style={s.muted}>
            {progress.total && progress.done === progress.total
              ? "Všechny kroky jsou hotové. Pokud jsi dosáhl výsledku, můžeš projekt uzavřít."
              : "Projekt dokončíš po splnění všech jeho kroků."}
          </Text>
          <Button
            disabled={!progress.total || progress.done !== progress.total}
            onPress={() =>
              change((d) => setProjectStatus(d, project.id, "done"))
            }
          >
            Dokončit projekt
          </Button>
          <Button
            quiet
            onPress={() =>
              change((d) => setProjectStatus(d, project.id, "paused"))
            }
          >
            Pozastavit projekt
          </Button>
        </>
      )}
      {!archived && project.status !== "active" && (
        <>
          <Text style={s.muted}>
            {project.status === "paused"
              ? "Pozastavené nedokončené kroky nejsou v dnešním přehledu. Při pokračování se vrátí i s původními daty."
              : "Hotové kroky i poznámky zůstávají uložené. Pro další změny projekt znovu otevři."}
          </Text>
          <Button
            onPress={() =>
              change((d) => setProjectStatus(d, project.id, "active"))
            }
          >
            {project.status === "paused"
              ? "Pokračovat v projektu"
              : "Znovu otevřít projekt"}
          </Button>
        </>
      )}
      <Button
        quiet
        onPress={() => change((d) => archiveProject(d, project.id, !archived))}
      >
        {archived ? "Obnovit z archivu" : "Přesunout do archivu"}
      </Button>
      <Text style={s.small}>
        {archived
          ? "Obnovení zachová původní stav, všechny kroky a poznámky."
          : "Archiv projekt skryje z přehledu. Kroky ani poznámky se nesmažou."}
      </Text>
    </>
  );
}

export function StepDetail({
  task,
  project,
  today,
  onEdit,
  onProject,
  onToggle,
  onPlanToday,
}: {
  task: Task;
  project: Project;
  today: string;
  onEdit: () => void;
  onProject: () => void;
  onToggle: () => void;
  onPlanToday: () => void;
}) {
  if (!task) return <Button onPress={onProject}>Zpět k projektu</Button>;
  const done = task.doneAt !== undefined,
    active = project.status === "active" && project.archivedAt === undefined;
  return (
    <>
      <Text style={s.label}>{project.title.toUpperCase()}</Text>
      <View style={s.hero}>
        <Text style={s.label}>
          {done
            ? "KROK DOKONČEN"
            : task.plannedFor === today
              ? "DNEŠNÍ KROK"
              : "TVŮJ DALŠÍ KROK"}
        </Text>
        <Text style={[s.h2, { fontSize: 29 }]}>{task.title}</Text>
        <Text style={s.muted}>
          {task.plannedFor
            ? `V plánu: ${displayDate(task.plannedFor)}`
            : "Zatím bez data"}
          {task.minutes ? ` · odhad ${task.minutes} min` : ""}
        </Text>
        {task.priority === "high" && <Text style={s.link}>Důležitý krok</Text>}
      </View>
      <View style={s.card}>
        <Text style={s.label}>PROČ NA TOM ZÁLEŽÍ</Text>
        <Text style={s.text}>{project.outcome}</Text>
      </View>
      {done && (
        <Text style={s.muted}>
          Splněno {displayDate(dayKey(new Date(task.doneAt!)))}. Splnění můžeš v
          otevřeném projektu opravit.
        </Text>
      )}
      {active ? (
        <>
          {!done && task.plannedFor !== today && (
            <Button onPress={onPlanToday}>Naplánovat na dnešek</Button>
          )}
          <Button quiet={done || task.plannedFor !== today} onPress={onToggle}>
            {done ? "Vrátit mezi nedokončené" : "✓ Dokončit krok"}
          </Button>
          <Button quiet onPress={onEdit}>
            Upravit krok a datum
          </Button>
        </>
      ) : (
        <Text style={s.muted}>
          Pro změny nejdřív obnov nebo znovu otevři projekt.
        </Text>
      )}
      <Button quiet onPress={onProject}>
        Zpět k projektu
      </Button>
    </>
  );
}
