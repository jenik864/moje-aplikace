import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  View,
  Pressable,
  AppState,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { Screen, RankEmblem, rankColors } from "../ui";
import { ranks } from "../model";
import { useMind } from "./useMind";
import {
  useMindStyles,
  Button,
  Chip,
  Field,
  Orbit,
  Progress,
  mint,
  MindTheme,
} from "./components";
import { Arena } from "./Arena";
import { Learning } from "./Learning";
import { LessonArt } from "./LessonLab";
import { MindRanks } from "./Ranks";
import { PlanEditor, weekdays } from "./PlanEditor";
import { mindRank, mindXP, mindMilestones, dailyMindXP } from "./ranking";
import {
  badges,
  badgeValue,
  dayKey,
  shift,
  weekStart,
  habitsFor,
  habitKinds,
  setPlan,
  toggleHabit,
  recordGame,
  completeLesson,
  startFocus,
  finishFocus,
  type Habit,
  type MindData,
} from "./model";
type Route =
  | "plan"
  | "arena"
  | "learn"
  | "badges"
  | "focus"
  | "ranks"
  | { habit: Habit; day: string };
const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function MindScreen({
  onAccent,
}: {
  onAccent?: (color: string) => void;
}) {
  const store = useMind(),
    color = rankColors[mindRank(store.data)];
  useEffect(() => {
    if (store.loaded) onAccent?.(color);
  }, [color, store.loaded, onAccent]);
  return (
    <MindTheme.Provider value={color}>
      <MindContent store={store} />
    </MindTheme.Provider>
  );
}
function MindContent({ store }: { store: ReturnType<typeof useMind> }) {
  const s = useMindStyles(),
    color = useContext(MindTheme),
    { data, update, loaded, loadError, saveError } = store;
  const [today, setToday] = useState(dayKey()),
    [selected, setSelected] = useState(dayKey()),
    [week, setWeek] = useState(weekStart(dayKey())),
    [route, setRoute] = useState<Route | null>(null),
    [notice, setNotice] = useState(""),
    [arenaActive, setArenaActive] = useState(false),
    [exitArena, setExitArena] = useState(false);
  const modalScroll = useRef<ScrollView>(null);
  const tasks = habitsFor(data, selected),
    days = Array.from({ length: 7 }, (_, i) => shift(week, i)),
    todayTasks = habitsFor(data, today),
    done = todayTasks.filter((h) => data.checks[today]?.[h.id]).length,
    nextTask = todayTasks.find((h) => !data.checks[today]?.[h.id]);
  const currentPlan =
    [...data.plans]
      .filter((p) => p.from <= today)
      .sort((a, b) => a.from.localeCompare(b.from))
      .at(-1)?.habits ?? [];
  const rank = mindRank(data),
    xp = mindXP(data),
    prime = Math.max(rank, data.prime ?? 0),
    nextXP = mindMilestones[rank + 1],
    earnedCount = Object.keys(data.earned).length;
  useEffect(() => {
    const tick = () => setToday(dayKey());
    const t = setInterval(tick, 15000);
    const app = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(t);
      app.remove();
    };
  }, []);
  useEffect(() => {
    setNotice("");
    setExitArena(false);
    modalScroll.current?.scrollTo({ y: 0, animated: false });
  }, [route]);
  function change(fn: (d: MindData) => MindData) {
    try {
      update(fn);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Změnu se nepodařilo provést.",
      );
    }
  }
  function close() {
    if (arenaActive) {
      setExitArena(true);
      return;
    }
    setRoute(null);
  }
  if (!loaded)
    return (
      <Screen>
        <View style={s.body}>
          {loadError ? (
            <>
              <Text style={s.error}>{loadError}</Text>
              <Button onPress={store.retryLoad}>Zkusit načtení znovu</Button>
            </>
          ) : (
            <ActivityIndicator color={color} />
          )}
        </View>
      </Screen>
    );
  const storageNotice = saveError ? (
    <View style={s.card}>
      <Text style={s.error}>{saveError}</Text>
      <Button quiet onPress={store.retrySave}>
        Zkusit uložení znovu
      </Button>
    </View>
  ) : null;
  const weekly = days.reduce(
    (n, d) =>
      n + habitsFor(data, d).filter((h) => data.checks[d]?.[h.id]).length,
    0,
  );
  const routeLabel =
    typeof route === "object"
      ? "AKTIVITA"
      : ((
          {
            plan: "PLÁN",
            arena: "ARÉNA",
            learn: "OBJEVUJ",
            badges: "ODZNAKY",
            focus: "ČASOVÝ BLOK",
            ranks: "RANKY",
          } as Record<string, string>
        )[route ?? ""] ?? "");
  const content = (
    <>
      {notice && <Text style={s.error}>{notice}</Text>}
      {route === "plan" && (
        <PlanEditor
          onNavigate={() =>
            modalScroll.current?.scrollTo({ y: 0, animated: false })
          }
          initial={currentPlan}
          onSave={(habits) => {
            change((d) => setPlan(d, habits));
            setRoute(null);
            setWeek(weekStart(today));
            setSelected(today);
          }}
        />
      )}
      {route === "ranks" && <MindRanks data={data} />}
      {route === "badges" && (
        <View style={{ gap: 18 }}>
          <Text style={s.h2}>Tvoje milníky.</Text>
          <Text style={s.muted}>
            {earnedCount}/{badges.length} odemčeno. Odznak po získání zůstává.
          </Text>
          {badges.map((b, i) => (
            <View
              key={b.id}
              style={[s.card, !!data.earned[b.id] && { borderColor: color }]}
            >
              <View style={s.between}>
                <Text style={s.label}>
                  {data.earned[b.id] ? "ODEMČENO" : "VÝZVA"} /{" "}
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text style={[s.h2, { color }]}>
                  {data.earned[b.id] ? "✓" : ""}
                </Text>
              </View>
              <Text style={s.h2}>{b.name}</Text>
              <Text style={s.muted}>{b.description}</Text>
              <Progress value={badgeValue(data, b.id) / b.target} />
              <Text style={s.muted}>
                {Math.min(b.target, badgeValue(data, b.id))}/{b.target}
              </Text>
            </View>
          ))}
        </View>
      )}
      {route === "focus" && <FocusPanel data={data} change={change} />}
      {route && typeof route === "object" && (
        <HabitDetail
          key={`${route.day}-${route.habit.id}`}
          habit={route.habit}
          day={route.day}
          data={data}
          onToggle={(note) =>
            change((d) => toggleHabit(d, route.day, route.habit.id, note))
          }
          onFocus={() => {
            change((d) => startFocus(d, route.habit.minutes, route.habit.id));
            setRoute("focus");
          }}
        />
      )}
    </>
  );
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
      >
        {storageNotice}
        <View style={s.between}>
          <View>
            <Text style={s.label}>QUITTER / ROZVÍJEJ SVOU HLAVU</Text>
            <Text style={s.title}>Mind.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Otevřít ranky Mind"
            onPress={() => setRoute("ranks")}
          >
            <RankEmblem value={rank} size={60} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detail ranku Mind"
          onPress={() => setRoute("ranks")}
          style={[s.card, { gap: 12, padding: 17 }]}
        >
          <View style={s.between}>
            <View style={s.row}>
              <RankEmblem value={rank} size={42} />
              <View>
                <Text style={s.label}>CURRENT</Text>
                <Text style={[s.h2, { color }]}>{ranks[rank]}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={s.label}>PRIME</Text>
              <Text style={[s.h3, { color: rankColors[prime] }]}>
                {ranks[prime]}
              </Text>
            </View>
          </View>
          <Progress
            value={
              rank === 11
                ? 1
                : (xp - mindMilestones[rank]) / (nextXP - mindMilestones[rank])
            }
          />
          <View style={s.between}>
            <Text style={s.muted}>{xp} XP</Text>
            <Text style={[s.muted, { color }]}>
              {rank === 11
                ? "Nejvyšší rank"
                : `${nextXP - xp} XP do ${ranks[rank + 1]} →`}
            </Text>
          </View>
        </Pressable>
        <View style={[s.hero, { padding: 18, gap: 12 }]}>
          <View style={s.between}>
            <Text style={s.label}>DNES / {pretty(today)}</Text>
            <Text style={[s.link, { color }]}>
              {todayTasks.length
                ? `${done}/${todayTasks.length} splněno`
                : "Tvůj start"}
            </Text>
          </View>
          <Text style={s.h2}>
            {nextTask
              ? nextTask.title
              : todayTasks.length
                ? "Dnešní plán splněn."
                : "Začni jedním návykem."}
          </Text>
          <View style={s.between}>
            <Text style={s.muted}>
              {nextTask
                ? `${nextTask.minutes} min · ${habitKinds[nextTask.kind]}`
                : todayTasks.length
                  ? "Ještě máš prostor něco objevit."
                  : "Četba, učení, meditace…"}
            </Text>
            <Text style={[s.muted, { color }]}>
              {dailyMindXP(data)[today] ?? 0}/60 XP
            </Text>
          </View>
          <Button
            onPress={() =>
              nextTask
                ? setRoute({ habit: nextTask, day: today })
                : setRoute(todayTasks.length ? "learn" : "plan")
            }
          >
            {nextTask
              ? "Otevřít dnešní aktivitu →"
              : todayTasks.length
                ? "Objevit něco nového →"
                : "Sestavit můj plán"}
          </Button>
        </View>
        <View style={[s.row, { alignItems: "stretch", gap: 10 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vstoupit do arény"
            onPress={() => setRoute("arena")}
            style={[s.card, { flex: 1, padding: 16, gap: 9 }]}
          >
            <Text style={[s.h2, { fontSize: 30, color }]}>{"× ÷"}</Text>
            <Text style={s.h3}>Aréna</Text>
            <Text style={s.muted}>Rychlost a přesnost</Text>
            <Text style={s.link}>Hrát →</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vybrat téma"
            onPress={() => setRoute("learn")}
            style={[s.card, { flex: 1, padding: 16, gap: 9 }]}
          >
            <Text style={[s.h2, { fontSize: 30, color }]}>{"</>"}</Text>
            <Text style={s.h3}>Objevuj</Text>
            <Text style={s.muted}>Učení v praxi</Text>
            <Text style={s.link}>Prozkoumat →</Text>
          </Pressable>
        </View>
        {data.focus ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pokračovat v časovém bloku"
            onPress={() => setRoute("focus")}
            style={[s.card, { borderColor: color }]}
          >
            <Text style={s.label}>ČASOVÝ BLOK</Text>
            <FocusSummary end={data.focus.end} />
            <Text style={s.link}>Pokračovat →</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Otevřít časový blok"
            onPress={() => setRoute("focus")}
            style={[s.between, { paddingVertical: 4 }]}
          >
            <Text style={s.muted}>Potřebuješ klid na jednu věc?</Text>
            <Text style={s.link}>Časový blok →</Text>
          </Pressable>
        )}
        <View style={s.between}>
          <Text style={s.h2}>Můj týden</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRoute("plan")}
          >
            <Text style={s.link}>Upravit plán →</Text>
          </Pressable>
        </View>
        <View style={s.between}>
          <Chip
            label="←"
            onPress={() => {
              const w = shift(week, -7);
              setWeek(w);
              setSelected(w);
            }}
          />
          <Text style={s.muted}>
            {pretty(week)} – {pretty(shift(week, 6))}
          </Text>
          <Chip
            label="→"
            onPress={() => {
              const w = shift(week, 7);
              setWeek(w);
              setSelected(w);
            }}
          />
        </View>
        <View style={[s.row, { gap: 5 }]}>
          {days.map((day, i) => {
            const ds = habitsFor(data, day),
              n = ds.filter((h) => data.checks[day]?.[h.id]).length;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${weekdays[i]} ${pretty(day)}`}
                accessibilityState={{ selected: day === selected }}
                onPress={() => setSelected(day)}
                style={[
                  s.day,
                  day === selected && {
                    backgroundColor: `${color}22`,
                    borderColor: color,
                  },
                  day === today &&
                    day !== selected && { borderColor: `${color}80` },
                ]}
              >
                <Text style={[s.muted, { fontSize: 12 }]}>{weekdays[i]}</Text>
                <Text style={s.h3}>{Number(day.slice(-2))}</Text>
                <Text style={{ color, fontSize: 11 }}>
                  {ds.length ? `${n}/${ds.length}` : "—"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.between}>
          <Text style={s.label}>{pretty(selected)} / AKTIVITY</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setWeek(weekStart(today));
              setSelected(today);
            }}
          >
            <Text style={s.link}>Dnes</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10 }}>
          {tasks.length ? (
            tasks.map((h) => (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityLabel={`Aktivita ${h.title}`}
                onPress={() => setRoute({ habit: h, day: selected })}
                style={[s.card, { padding: 16, gap: 8 }]}
              >
                <View style={s.between}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.h3}>{h.title}</Text>
                    <Text style={s.muted}>
                      {h.minutes} min · {habitKinds[h.kind]}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.h2,
                      { color: data.checks[selected]?.[h.id] ? mint : color },
                    ]}
                  >
                    {data.checks[selected]?.[h.id] ? "✓" : "→"}
                  </Text>
                </View>
                {data.checks[selected]?.[h.id]?.note && (
                  <Text style={s.muted} numberOfLines={2}>
                    {data.checks[selected][h.id].note}
                  </Text>
                )}
              </Pressable>
            ))
          ) : (
            <View style={s.card}>
              <Text style={s.muted}>
                Na tento den nemáš naplánovanou aktivitu.
              </Text>
              <Button quiet onPress={() => setRoute("plan")}>
                Nastavit aktivity a dny
              </Button>
            </View>
          )}
        </View>
        <View style={s.between}>
          <Text style={s.muted}>{weekly} splnění v tomto týdnu</Text>
          <Text style={s.muted}>
            {Object.keys(data.lessons).length}/3 lekcí
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Otevřít odznaky Mind"
          onPress={() => setRoute("badges")}
          style={[s.card, s.between, { padding: 16 }]}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.label}>TVOJE MILNÍKY</Text>
            <Text style={s.h3}>Odznaky</Text>
            <Text style={s.muted}>
              {earnedCount}/{badges.length} odemčeno
            </Text>
          </View>
          <Text style={[s.h2, { color }]}>→</Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={route !== null}
        animationType="slide"
        onRequestClose={close}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal>
            <View
              style={[
                s.between,
                {
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "#282b30",
                },
              ]}
            >
              <Pressable accessibilityRole="button" onPress={close}>
                <Text style={s.link}>× Zavřít</Text>
              </Pressable>
              <Text style={s.label}>MIND / {routeLabel}</Text>
            </View>
            {storageNotice}
            {notice && <Text style={[s.error, { padding: 12 }]}>{notice}</Text>}
            {route === "arena" ? (
              <Arena
                games={data.games}
                onActive={setArenaActive}
                onResult={(g) => change((d) => recordGame(d, g))}
              />
            ) : route === "learn" ? (
              <Learning
                completed={data.lessons}
                progress={data.lessonProgress ?? {}}
                onProgress={(id, step) =>
                  change((d) => ({
                    ...d,
                    lessonProgress: { ...d.lessonProgress, [id]: step },
                  }))
                }
                onComplete={(id) => {
                  const gained =
                    mindXP(completeLesson(data, id)) - mindXP(data);
                  change((d) => completeLesson(d, id));
                  return gained;
                }}
              />
            ) : (
              <ScrollView
                ref={modalScroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.body}
              >
                {content}
              </ScrollView>
            )}
            {exitArena && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "#000d",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <View style={s.card}>
                  <Text style={s.h2}>Opustit rozehrané kolo?</Text>
                  <Text style={s.muted}>
                    Čas zatím běží. Nedokončené kolo se nezapíše.
                  </Text>
                  <Button onPress={() => setExitArena(false)}>
                    Pokračovat ve hře
                  </Button>
                  <Button
                    quiet
                    onPress={() => {
                      setArenaActive(false);
                      setRoute(null);
                    }}
                  >
                    Opustit kolo
                  </Button>
                </View>
              </View>
            )}
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 500);
    const app = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(t);
      app.remove();
    };
  }, []);
  return now;
}
function FocusSummary({ end }: { end: number }) {
  const s = useMindStyles();
  const now = useNow();
  return (
    <Text style={s.h2}>
      {end <= now
        ? "Blok doběhl. Potvrď dokončení."
        : clock(Math.ceil((end - now) / 1000))}
    </Text>
  );
}
function FocusPanel({
  data,
  change,
}: {
  data: MindData;
  change: (fn: (d: MindData) => MindData) => void;
}) {
  const s = useMindStyles();
  const [minutes, setMinutes] = useState(20),
    [cancel, setCancel] = useState(false);
  const now = useNow(),
    f = data.focus,
    left = f ? Math.max(0, Math.ceil((f.end - now) / 1000)) : 0;
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>JEDNA VĚC / PLNÁ POZORNOST</Text>
      <Text style={s.title}>
        {f ? "Teď jen tento blok." : "Udělej si prostor."}
      </Text>
      <Text style={s.text}>
        Vyber si jednu činnost. Odlož ostatní věci a dej jí svůj čas.
      </Text>
      {f ? (
        <>
          <View style={[s.hero, { alignItems: "center", paddingVertical: 40 }]}>
            <Orbit />
            <Text
              style={[s.title, { fontVariant: ["tabular-nums"], fontSize: 60 }]}
            >
              {clock(left)}
            </Text>
            <Text style={s.muted}>
              {left
                ? "Čas běží i mimo aplikaci."
                : "Čas vypršel. Jak se ti dařilo?"}
            </Text>
            <Progress value={1 - left / (f.minutes * 60)} />
          </View>
          <Text style={s.muted}>
            Časovač nesleduje, zda jsi činnost opravdu dělal. Dokončení potvrď
            podle skutečnosti.
          </Text>
          {!left && (
            <Button onPress={() => change((d) => finishFocus(d))}>
              Potvrdit dokončený blok
            </Button>
          )}
          {cancel ? (
            <View style={s.card}>
              <Text style={s.text}>
                Zrušit blok bez zápisu a bez minut do odznaků?
              </Text>
              <Button quiet onPress={() => setCancel(false)}>
                Pokračovat
              </Button>
              <Button
                onPress={() => {
                  change((d) => ({ ...d, focus: undefined }));
                  setCancel(false);
                }}
              >
                Zrušit bez zápisu
              </Button>
            </View>
          ) : (
            <Button quiet onPress={() => setCancel(true)}>
              Ukončit bez dokončení
            </Button>
          )}
        </>
      ) : (
        <>
          <View style={s.wrap}>
            {[10, 20, 30, 45].map((n) => (
              <Chip
                key={n}
                label={`${n} min`}
                selected={minutes === n}
                onPress={() => setMinutes(n)}
              />
            ))}
          </View>
          <Button onPress={() => change((d) => startFocus(d, minutes))}>
            Spustit blok · {minutes} min
          </Button>
          <View style={s.card}>
            <Text style={s.label}>DOKONČENÉ BLOKY</Text>
            <Text style={s.stat}>
              {Object.values(data.sessions).reduce((n, v) => n + v.minutes, 0)}{" "}
              min
            </Text>
            <Text style={s.muted}>
              Časový blok spuštěný z konkrétní aktivity po potvrzení označí i
              její splnění.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
function HabitDetail({
  habit,
  day,
  data,
  onToggle,
  onFocus,
}: {
  habit: Habit;
  day: string;
  data: MindData;
  onToggle: (note: string) => void;
  onFocus: () => void;
}) {
  const s = useMindStyles();
  const checked = data.checks[day]?.[habit.id];
  const [note, setNote] = useState(checked?.note ?? "");
  const future = day > dayKey();
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>
        {pretty(day)} / {habitKinds[habit.kind].toUpperCase()}
      </Text>
      <Text style={s.title}>{habit.title}</Text>
      <View style={s.hero}>
        <Text style={s.stat}>{habit.minutes} min</Text>
        <Text style={s.text}>
          {checked
            ? "Splněno. Malý krok se počítá."
            : "Tvůj naplánovaný cíl. Splnění potvrď podle toho, co jsi skutečně udělal."}
        </Text>
      </View>
      <Field
        label={
          habit.kind === "reading"
            ? "Kniha, stránka nebo myšlenka (volitelné)"
            : "Co sis odnesl? (volitelné)"
        }
        value={note}
        onChangeText={setNote}
        multiline
      />
      <Button disabled={future} onPress={() => onToggle(note)}>
        {checked ? "Zrušit označení splnění" : "✓ Označit jako splněné"}
      </Button>
      {future && (
        <Text style={s.muted}>Budoucí aktivitu zatím nelze potvrdit.</Text>
      )}
      {!checked && day === dayKey() && (
        <Button quiet disabled={!!data.focus} onPress={onFocus}>
          {data.focus
            ? "Nejprve dokonči běžící blok"
            : `Spustit časový blok · ${habit.minutes} min`}
        </Button>
      )}
      {checked && (
        <Text style={s.muted}>
          Poznámka byla uložená při potvrzení. Pro její změnu zruš označení a
          potvrď aktivitu znovu.
        </Text>
      )}
    </View>
  );
}
