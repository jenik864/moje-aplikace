import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  AppState,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { Screen } from "../ui";
import { AppIcon, ProjectArtwork, palette } from "../design";
import { useBusiness } from "./useBusiness";
import {
  BusinessTheme,
  Button,
  Chip,
  ProjectCard,
  TaskRow,
  colors,
  s,
} from "./components";
import {
  dayKey,
  displayDate,
  saveProject,
  saveTask,
  toggleTask,
  removeTask,
  tasksForToday,
  type BusinessData,
  type Task,
} from "./model";
import { ProjectDetail, StepDetail } from "./ProjectDetail";
import { ProjectEditor, TaskEditor } from "./Editors";

type Route =
  | { type: "project"; id: string }
  | { type: "editProject"; id?: string }
  | { type: "task"; projectId: string; id?: string }
  | { type: "step"; projectId: string; id: string };
type Filter = "active" | "paused" | "done" | "archive";
export function BusinessScreen({
  store,
}: {
  store: ReturnType<typeof useBusiness>;
}) {
  const { data, loaded, loadError, saveError, saving } = store;
  const [today, setToday] = useState(dayKey()),
    [route, setRoute] = useState<Route | null>(null),
    [view, setView] = useState<"overview" | "projects">("overview"),
    [filter, setFilter] = useState<Filter>("active"),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false),
    [confirmExit, setConfirmExit] = useState(false);
  const modalScroll = useRef<ScrollView>(null);
  useEffect(() => {
    const tick = () => setToday(dayKey());
    const timer = setInterval(tick, 15000),
      app = AppState.addEventListener("change", (state) => {
        if (state === "active") tick();
      });
    return () => {
      clearInterval(timer);
      app.remove();
    };
  }, []);
  useEffect(() => {
    setNotice("");
    setDirty(false);
    setConfirmExit(false);
    modalScroll.current?.scrollTo({ y: 0, animated: false });
  }, [route]);
  function change(fn: (d: BusinessData) => BusinessData) {
    try {
      store.update(fn);
      setNotice("");
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Změnu se nepodařilo provést.",
      );
      return false;
    }
  }
  function leave() {
    if (route?.type === "task" || route?.type === "step")
      setRoute({ type: "project", id: route.projectId });
    else if (route?.type === "editProject" && route.id)
      setRoute({ type: "project", id: route.id });
    else setRoute(null);
  }
  function close() {
    if (dirty) setConfirmExit(true);
    else leave();
  }
  const projectId =
    route?.type === "task" || route?.type === "step"
      ? route.projectId
      : route?.id;
  const project = data.projects.find((p) => p.id === projectId);
  const accent = project ? colors[project.color] : palette.Business;
  const statusNotice = (
    <>
      {saveError && (
        <View style={s.card}>
          <Text accessibilityRole="alert" style={s.error}>
            {saveError}
          </Text>
          <Button quiet onPress={store.retrySave}>
            Zkusit uložení znovu
          </Button>
        </View>
      )}
      {saving && <Text style={s.small}>Ukládám změny…</Text>}
    </>
  );
  if (!loaded)
    return (
      <Screen accent={palette.Business}>
        <View style={[s.body, { flex: 1, justifyContent: "center" }]}>
          {loadError ? (
            <>
              <Text style={s.error}>{loadError}</Text>
              <Button onPress={() => void store.retryLoad()}>
                Zkusit načtení znovu
              </Button>
            </>
          ) : (
            <ActivityIndicator color={palette.Business} />
          )}
        </View>
      </Screen>
    );
  const active = data.projects.filter(
    (p) => p.archivedAt === undefined && p.status === "active",
  );
  const daily = tasksForToday(data, today),
    pending = daily.filter((t) => t.doneAt === undefined),
    done = daily.filter((t) => t.doneAt !== undefined);
  const backlog = data.tasks
    .filter(
      (t) =>
        active.some((p) => p.id === t.projectId) &&
        t.doneAt === undefined &&
        t.plannedFor === undefined,
    )
    .sort(
      (a, b) =>
        Number(b.priority === "high") - Number(a.priority === "high") ||
        a.createdAt - b.createdAt,
    );
  const next = pending[0];
  const visible = data.projects
    .filter((p) =>
      filter === "archive"
        ? p.archivedAt !== undefined
        : p.archivedAt === undefined && p.status === filter,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const openTask = (task: Task) =>
    setRoute({ type: "step", projectId: task.projectId, id: task.id });
  return (
    <BusinessTheme.Provider value={accent}>
      <Screen accent={palette.Business}>
        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.between}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.label}>TVŮJ VLASTNÍ SMĚR</Text>
              <Text style={s.title}>Business.</Text>
            </View>
            <View
              style={{
                paddingLeft: 12,
                borderLeftWidth: 1,
                borderColor: "#ffffff20",
              }}
            >
              <AppIcon name="Business" color={palette.Business} size={27} />
            </View>
          </View>
          {statusNotice}
          {notice && !route && (
            <Text accessibilityRole="alert" style={s.error}>
              {notice}
            </Text>
          )}
          <View style={s.workspaceTabs}>
            {(
              [
                ["overview", "Dnešní práce"],
                ["projects", "Moje projekty"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: view === id }}
                aria-pressed={view === id}
                onPress={() => setView(id)}
                style={{
                  paddingVertical: 15,
                  borderBottomWidth: 2,
                  borderBottomColor:
                    view === id ? palette.Business : "transparent",
                  minHeight: 48,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: view === id ? "#edf5ff" : "#7f8da4",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {view === "overview" ? (
            <>
              {!data.projects.length ? (
                <View style={[s.hero, { paddingTop: 4 }]}>
                  <View style={s.between}>
                    <Text style={s.label}>ZAČNI NĚČÍM VLASTNÍM</Text>
                    <Text style={s.number}>01 / ZAČÁTEK</Text>
                  </View>
                  <View
                    style={{
                      marginHorizontal: -12,
                      marginVertical: -8,
                      height: 150,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        transform: [{ scale: 0.88 }, { translateY: -15 }],
                      }}
                    >
                      <ProjectArtwork />
                    </View>
                  </View>
                  <Text style={s.emptyHeadline}>Pusť svůj{`\n`}nápad ven.</Text>
                  <Text
                    style={[
                      s.muted,
                      { fontSize: 15, lineHeight: 24, maxWidth: 330 },
                    ]}
                  >
                    Vyber výsledek, rozděl ho na malé kroky a jeden z nich
                    udělej dnes.
                  </Text>
                  <Button onPress={() => setRoute({ type: "editProject" })}>
                    Vytvořit první projekt
                  </Button>
                </View>
              ) : (
                <View style={s.hero}>
                  <View style={s.between}>
                    <Text style={s.label}>
                      {next ? "JEDEN DALŠÍ KROK" : "PROSTOR PRO TVOU PRÁCI"}
                    </Text>
                    <Text style={s.small}>{displayDate(today)}</Text>
                  </View>
                  <Text
                    style={[
                      s.h2,
                      { fontSize: 34, lineHeight: 39, letterSpacing: -1.1 },
                    ]}
                  >
                    {next
                      ? next.title
                      : done.length
                        ? "Dnešní kroky jsou hotové."
                        : "Co dnes posuneš dál?"}
                  </Text>
                  <Text style={s.muted}>
                    {next
                      ? `${data.projects.find((p) => p.id === next.projectId)?.title}${next.minutes ? ` · ${next.minutes} min v plánu` : ""}`
                      : backlog.length
                        ? `${backlog.length} ${backlog.length === 1 ? "krok čeká" : backlog.length < 5 ? "kroky čekají" : "kroků čeká"} bez data. Vyber si jeden na dnešek.`
                        : "Vyber projekt a přidej konkrétní další krok."}
                  </Text>
                  <Button
                    onPress={() => {
                      if (next) openTask(next);
                      else if (backlog[0]) openTask(backlog[0]);
                      else {
                        setView("projects");
                        setFilter("active");
                      }
                    }}
                  >
                    {next
                      ? "Otevřít další krok →"
                      : backlog.length
                        ? "Vybrat krok na dnešek →"
                        : "Otevřít moje projekty →"}
                  </Button>
                  <View style={s.summary}>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={s.summaryNumber}>{active.length}</Text>
                      <Text style={s.summaryLabel}>rozpracované projekty</Text>
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text
                        style={[s.summaryNumber, { color: palette.Business }]}
                      >
                        {done.length}
                      </Text>
                      <Text style={s.summaryLabel}>kroky hotové dnes</Text>
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Text style={s.summaryNumber}>{pending.length}</Text>
                      <Text style={s.summaryLabel}>kroky před tebou</Text>
                    </View>
                  </View>
                </View>
              )}
              {data.projects.length > 0 && (
                <>
                  <View style={s.between}>
                    <Text style={s.h3}>Dnes a rozpracované</Text>
                    <Text style={s.small}>{pending.length} zbývá</Text>
                  </View>
                  {!daily.length ? (
                    <View style={s.card}>
                      <Text style={s.muted}>
                        Na dnešek nemáš vybraný žádný krok. V projektu otevři
                        úkol a zvol „Dnes“.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 0 }}>
                      {daily.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={
                            data.projects.find((p) => p.id === task.projectId)!
                          }
                          today={today}
                          showProject
                          onToggle={() => change((d) => toggleTask(d, task.id))}
                          onOpen={() => openTask(task)}
                        />
                      ))}
                    </View>
                  )}
                  {pending.some((t) => t.plannedFor! < today) && (
                    <Text style={s.small}>
                      Nedokončené starší kroky tu zůstávají, dokud je nesplníš
                      nebo nepřeplánuješ.
                    </Text>
                  )}
                  <View style={s.between}>
                    <Text style={s.h3}>Rozpracované projekty</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setView("projects");
                        setFilter("active");
                      }}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Text style={s.link}>Všechny →</Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: 0 }}>
                    {active.slice(0, 3).map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        data={data}
                        onPress={() => setRoute({ type: "project", id: p.id })}
                      />
                    ))}
                  </View>
                  <Button
                    quiet
                    onPress={() => setRoute({ type: "editProject" })}
                  >
                    + Nový projekt
                  </Button>
                </>
              )}
              {!data.projects.length && (
                <View style={s.card}>
                  {[
                    "Pojmenuj konkrétní výsledek.",
                    "Rozděl ho na zvládnutelné kroky.",
                    "Vyber si jeden na dnešek.",
                  ].map((text, i) => (
                    <View
                      key={text}
                      style={[
                        s.row,
                        {
                          paddingVertical: 8,
                          alignItems: "flex-start",
                          gap: 17,
                        },
                      ]}
                    >
                      <Text style={[s.number, { paddingTop: 3 }]}>
                        0{i + 1}
                      </Text>
                      <Text style={[s.muted, { flex: 1 }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={s.between}>
                <Text style={s.h2}>Tvoje projekty</Text>
                <Text style={s.small}>Celkem: {visible.length}</Text>
              </View>
              <Button onPress={() => setRoute({ type: "editProject" })}>
                + Nový projekt
              </Button>
              <View style={s.wrap}>
                {(
                  [
                    ["active", "V práci"],
                    ["paused", "Pozastavené"],
                    ["done", "Dokončené"],
                    ["archive", "Archiv"],
                  ] as const
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    selected={filter === value}
                    onPress={() => setFilter(value)}
                  >
                    {label}
                  </Chip>
                ))}
              </View>
              {visible.length ? (
                <View style={{ gap: 0 }}>
                  {visible.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      data={data}
                      onPress={() => setRoute({ type: "project", id: p.id })}
                    />
                  ))}
                </View>
              ) : (
                <View style={s.card}>
                  <Text style={s.h3}>
                    {filter === "archive"
                      ? "Archiv je zatím prázdný."
                      : "Tady zatím žádný projekt není."}
                  </Text>
                  <Text style={s.muted}>
                    {filter === "active"
                      ? "Začni konkrétním výsledkem. Další kroky si doplníš postupně."
                      : "Projekty sem přesuneš z jejich detailu."}
                  </Text>
                </View>
              )}
            </>
          )}
          <Text style={[s.small, { paddingTop: 10, color: "#68778e" }]}>
            Projekty se ukládají na tomto zařízení. Spolupráce a AI zatím nejsou
            připojené.
          </Text>
        </ScrollView>
        <Modal
          visible={route !== null}
          animationType="slide"
          onRequestClose={close}
        >
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <Screen modal accent={accent}>
              <View
                style={[s.header, s.between]}
                accessibilityElementsHidden={confirmExit}
                importantForAccessibility={
                  confirmExit ? "no-hide-descendants" : "auto"
                }
                aria-hidden={confirmExit}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={[s.link, { color: accent }]}>
                    {route?.type === "project" ? "× Zavřít" : "← Zpět"}
                  </Text>
                </Pressable>
                <Text style={[s.label, { color: accent }]}>
                  BUSINESS /{" "}
                  {route?.type === "task" || route?.type === "step"
                    ? "KROK"
                    : route?.type === "editProject"
                      ? "PROJEKT"
                      : "DETAIL"}
                </Text>
              </View>
              <ScrollView
                ref={modalScroll}
                accessibilityElementsHidden={confirmExit}
                importantForAccessibility={
                  confirmExit ? "no-hide-descendants" : "auto"
                }
                aria-hidden={confirmExit}
                contentContainerStyle={s.body}
                keyboardShouldPersistTaps="handled"
              >
                {statusNotice}
                {notice && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {notice}
                  </Text>
                )}
                {route?.type === "editProject" && (
                  <ProjectEditor
                    key={route.id ?? "new"}
                    project={project}
                    onDirty={setDirty}
                    onSave={(input, template) => {
                      if (change((d) => saveProject(d, input, template)))
                        setRoute({ type: "project", id: input.id });
                    }}
                  />
                )}
                {route?.type === "project" && project && (
                  <ProjectDetail
                    data={data}
                    project={project}
                    today={today}
                    onEdit={() =>
                      setRoute({ type: "editProject", id: project.id })
                    }
                    onAdd={() =>
                      setRoute({ type: "task", projectId: project.id })
                    }
                    onOpen={openTask}
                    change={change}
                  />
                )}
                {route?.type === "step" && project && (
                  <StepDetail
                    task={data.tasks.find((t) => t.id === route.id)!}
                    project={project}
                    today={today}
                    onEdit={() =>
                      setRoute({
                        type: "task",
                        projectId: project.id,
                        id: route.id,
                      })
                    }
                    onProject={() =>
                      setRoute({ type: "project", id: project.id })
                    }
                    onToggle={() => change((d) => toggleTask(d, route.id))}
                    onPlanToday={() => {
                      const task = data.tasks.find((t) => t.id === route.id);
                      if (task)
                        change((d) =>
                          saveTask(d, {
                            id: task.id,
                            projectId: task.projectId,
                            title: task.title,
                            priority: task.priority,
                            minutes: task.minutes,
                            plannedFor: today,
                          }),
                        );
                    }}
                  />
                )}
                {route?.type === "task" && project && (
                  <TaskEditor
                    key={route.id ?? `new-${project.id}`}
                    project={project}
                    task={data.tasks.find((t) => t.id === route.id)}
                    today={today}
                    onDirty={setDirty}
                    onProject={() =>
                      setRoute({ type: "project", id: project.id })
                    }
                    onSave={(input) => {
                      if (change((d) => saveTask(d, input)))
                        setRoute({ type: "project", id: project.id });
                    }}
                    onRemove={(id) => {
                      if (change((d) => removeTask(d, id)))
                        setRoute({ type: "project", id: project.id });
                    }}
                  />
                )}
              </ScrollView>
              {confirmExit && (
                <View
                  accessibilityViewIsModal
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "#080b12f5",
                    padding: 24,
                    justifyContent: "center",
                  }}
                >
                  <View style={s.card}>
                    <Text style={s.h2}>Zahodit rozepsané změny?</Text>
                    <Text style={s.muted}>
                      Změny v tomto formuláři ještě nejsou uložené.
                    </Text>
                    <Button onPress={() => setConfirmExit(false)}>
                      Pokračovat v úpravách
                    </Button>
                    <Button
                      quiet
                      onPress={() => {
                        setConfirmExit(false);
                        setDirty(false);
                        leave();
                      }}
                    >
                      Zahodit změny
                    </Button>
                  </View>
                </View>
              )}
            </Screen>
          </SafeAreaProvider>
        </Modal>
      </Screen>
    </BusinessTheme.Provider>
  );
}
