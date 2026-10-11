import React, { useEffect, useRef, useState } from "react";
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
import { Screen } from "../ui";
import { useMind } from "./useMind";
import {
  s,
  Button,
  Chip,
  Field,
  Orbit,
  Progress,
  mint,
  violet,
} from "./components";
import { Arena } from "./Arena";
import { Learning } from "./Learning";
import { PlanEditor, weekdays } from "./PlanEditor";
import {
  award,
  badges,
  badgeValue,
  dayKey,
  shift,
  weekStart,
  habitsFor,
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
  | { habit: Habit; day: string };
const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function MindScreen() {
  const store = useMind();
  const { data, update, loaded, loadError, saveError } = store;
  const [today, setToday] = useState(dayKey()),
    [selected, setSelected] = useState(dayKey()),
    [week, setWeek] = useState(weekStart(dayKey())),
    [route, setRoute] = useState<Route | null>(null),
    [notice, setNotice] = useState(""),
    [arenaActive, setArenaActive] = useState(false),
    [exitArena, setExitArena] = useState(false);
  const modalScroll = useRef<ScrollView>(null);
  const tasks = habitsFor(data, selected),
    days = Array.from({ length: 7 }, (_, i) => shift(week, i));
  const todayTasks = habitsFor(data, today),
    done = todayTasks.filter((h) => data.checks[today]?.[h.id]).length;
  const currentPlan =
    [...data.plans]
      .filter((p) => p.from <= today)
      .sort((a, b) => a.from.localeCompare(b.from))
      .at(-1)?.habits ?? [];
  useEffect(() => {
    const tick = () => setToday(dayKey());
    const timer = setInterval(tick, 15000);
    const app = AppState.addEventListener("change", tick);
    return () => {
      clearInterval(timer);
      app.remove();
    };
  }, []);
  useEffect(() => {
    setNotice("");
    setExitArena(false);
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
            <ActivityIndicator color={violet} />
          )}
        </View>
      </Screen>
    );
  const storageNotice = (
    <>
      {saveError && (
        <View style={s.card}>
          <Text style={s.error}>{saveError}</Text>
          <Button quiet onPress={store.retrySave}>
            Zkusit uložení znovu
          </Button>
        </View>
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
          <View style={{ gap: 8, flex: 1 }}>
            <Text style={s.label}>QUITTER / PROSTOR PRO TVOU HLAVU</Text>
            <Text style={s.title}>Mind.</Text>
          </View>
          <Orbit small />
        </View>
        <View style={s.hero}>
          <View style={s.between}>
            <Text style={s.label}>MALÝ KROK KAŽDÝ DEN</Text>
            <Text style={[s.link, { color: mint }]}>
              {done}/{todayTasks.length}
            </Text>
          </View>
          <Text style={[s.h2, { fontSize: 30 }]}>
            {todayTasks.length
              ? done === todayTasks.length
                ? "Dnes máš splněno."
                : "Dej své hlavě prostor."
              : "Tvoje hlava. Tvůj plán."}
          </Text>
          <Text style={s.text}>
            {todayTasks.length
              ? "Čti, uč se nebo se soustřeď. Ty rozhoduješ, co chceš dodržovat."
              : "Vyber si aktivity, které chceš pravidelně dělat. Začni klidně jednou."}
          </Text>
          {todayTasks.length > 0 && (
            <Progress value={done / todayTasks.length} />
          )}
          <Button
            onPress={() => setRoute(currentPlan.length ? "focus" : "plan")}
          >
            {currentPlan.length ? "Otevřít časový blok" : "Sestavit můj plán"}
          </Button>
        </View>
        {data.focus && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setRoute("focus")}
            style={[s.card, { borderColor: mint }]}
          >
            <Text style={[s.label, { color: mint }]}>TVŮJ ČASOVÝ BLOK</Text>
            <FocusSummary end={data.focus.end} />
            <Text style={s.link}>Pokračovat →</Text>
          </Pressable>
        )}
        <View style={s.between}>
          <Text style={s.h2}>Můj plán</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRoute("plan")}
          >
            <Text style={s.link}>Upravit →</Text>
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
            const dayTasks = habitsFor(data, day);
            const n = dayTasks.filter((h) => data.checks[day]?.[h.id]).length;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${weekdays[i]} ${pretty(day)}`}
                accessibilityState={{ selected: day === selected }}
                onPress={() => setSelected(day)}
                style={[
                  s.day,
                  selected === day && {
                    backgroundColor: "#302542",
                    borderColor: violet,
                  },
                  day === today && { borderColor: mint },
                ]}
              >
                <Text style={[s.muted, { fontSize: 12 }]}>{weekdays[i]}</Text>
                <Text style={s.h3}>{Number(day.slice(-2))}</Text>
                <Text
                  style={{
                    color: n && n === dayTasks.length ? mint : violet,
                    fontSize: 11,
                  }}
                >
                  {dayTasks.length ? `${n}/${dayTasks.length}` : "—"}
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
                style={[s.card, { padding: 16 }]}
              >
                <View style={s.between}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.h3}>{h.title}</Text>
                    <Text style={s.muted}>
                      {h.minutes} min · {habitKindsLabel(h)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.h2,
                      { color: data.checks[selected]?.[h.id] ? mint : violet },
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
              <Text style={s.text}>Na tento den nemáš žádnou aktivitu.</Text>
              <Button quiet onPress={() => setRoute("plan")}>
                Nastavit aktivity a dny
              </Button>
            </View>
          )}
        </View>
        <View
          style={[
            s.hero,
            { backgroundColor: "#102421", borderColor: "#315c53" },
          ]}
        >
          <Text style={[s.label, { color: mint }]}>MENTÁLNÍ ARÉNA</Text>
          <Text style={s.h2}>Dvě minuty. Ostrá hlava.</Text>
          <Text style={s.muted}>
            Počítání na čas, osobní rekordy a výzvy. Stačí se pustit do prvního
            kola.
          </Text>
          <Button onPress={() => setRoute("arena")}>Vstoupit do arény</Button>
        </View>
        <View style={s.card}>
          <Text style={s.label}>NAUČ SE NĚCO NOVÉHO</Text>
          <Text style={s.h2}>Dnes kód. Zítra nový obzor.</Text>
          <Text style={s.muted}>
            Programování, cesta od ropy k benzínu nebo úrok z úroku. Krátké
            vysvětlení a vlastní pokus.
          </Text>
          <Progress value={Object.keys(data.lessons).length / 3} />
          <Text style={s.muted}>
            {Object.keys(data.lessons).length}/3 úvodních lekcí dokončeno
          </Text>
          <Button quiet onPress={() => setRoute("learn")}>
            Vybrat téma →
          </Button>
        </View>
        <View style={s.between}>
          <Text style={s.h2}>Tvoje odznaky</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRoute("badges")}
          >
            <Text style={s.link}>Všechny →</Text>
          </Pressable>
        </View>
        <View style={s.wrap}>
          {badges.map((b, i) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Odznak ${b.name}`}
              onPress={() => setRoute("badges")}
              style={[
                s.chip,
                {
                  flexBasis: "46%",
                  flexGrow: 1,
                  padding: 16,
                  opacity: data.earned[b.id] ? 1 : 0.6,
                  borderColor: data.earned[b.id] ? mint : "#39303f",
                },
              ]}
            >
              <Text
                style={[s.h2, { color: data.earned[b.id] ? mint : violet }]}
              >
                {["✓", "7", "10", "100", "◎", "↗", "3", "∞"][i]}
              </Text>
              <Text style={[s.text, { fontSize: 14 }]}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
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
                { padding: 20, borderBottomWidth: 1, borderColor: "#30283a" },
              ]}
            >
              <Pressable accessibilityRole="button" onPress={close}>
                <Text style={s.link}>× Zavřít</Text>
              </Pressable>
              <Text style={s.label}>
                MIND /{" "}
                {typeof route === "object"
                  ? "AKTIVITA"
                  : route === "arena"
                    ? "ARÉNA"
                    : route === "learn"
                      ? "UČENÍ"
                      : route === "plan"
                        ? "MŮJ PLÁN"
                        : route === "focus"
                          ? "SOUSTŘEDĚNÍ"
                          : "ODZNAKY"}
              </Text>
            </View>
            <ScrollView
              ref={modalScroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.body}
            >
              {storageNotice}
              {notice && <Text style={s.error}>{notice}</Text>}
              {exitArena && (
                <View style={s.card}>
                  <Text style={s.text}>
                    Opustit rozehrané kolo? Výsledek se neuloží.
                  </Text>
                  <Button quiet onPress={() => setExitArena(false)}>
                    Pokračovat ve hře
                  </Button>
                  <Button
                    onPress={() => {
                      setArenaActive(false);
                      setRoute(null);
                    }}
                  >
                    Opustit kolo
                  </Button>
                </View>
              )}
              {route === "plan" && (
                <PlanEditor
                  initial={currentPlan}
                  onSave={(habits) => {
                    change((d) => setPlan(d, habits));
                    setRoute(null);
                    setWeek(weekStart(today));
                    setSelected(today);
                  }}
                />
              )}
              {route === "arena" && (
                <Arena
                  games={data.games}
                  onActive={setArenaActive}
                  onResult={(g) => change((d) => recordGame(d, g))}
                />
              )}
              {route === "learn" && (
                <Learning
                  onNavigate={() =>
                    modalScroll.current?.scrollTo({ y: 0, animated: false })
                  }
                  completed={data.lessons}
                  onComplete={(id) => change((d) => completeLesson(d, id))}
                />
              )}
              {route === "badges" && (
                <View style={{ gap: 24 }}>
                  <Text style={s.title}>Zvědavost má stopu.</Text>
                  <Text style={s.muted}>
                    Odznaky jsou za skutečně splněné aktivity a dokončená kola.
                    Po získání ti zůstávají.
                  </Text>
                  {badges.map((b, i) => (
                    <View
                      key={b.id}
                      style={[
                        s.card,
                        !!data.earned[b.id] && { borderColor: mint },
                      ]}
                    >
                      <Text
                        style={[
                          s.label,
                          { color: data.earned[b.id] ? mint : violet },
                        ]}
                      >
                        {data.earned[b.id] ? "ODEMČENO" : "VÝZVA"} /{" "}
                        {String(i + 1).padStart(2, "0")}
                      </Text>
                      <Text style={s.h2}>{b.name}</Text>
                      <Text style={s.text}>{b.description}</Text>
                      <Progress
                        value={badgeValue(data, b.id) / b.target}
                        color={data.earned[b.id] ? mint : violet}
                      />
                      <Text style={s.muted}>
                        {Math.min(b.target, badgeValue(data, b.id))}/{b.target}
                        {data.earned[b.id]
                          ? ` · získáno ${new Date(data.earned[b.id]).toLocaleDateString("cs-CZ")}`
                          : ""}
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
                    change((d) =>
                      toggleHabit(d, route.day, route.habit.id, note),
                    )
                  }
                  onFocus={() => {
                    change((d) =>
                      startFocus(d, route.habit.minutes, route.habit.id),
                    );
                    setRoute("focus");
                  }}
                />
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}
function habitKindsLabel(h: Habit) {
  return {
    reading: "Četba",
    learning: "Učení",
    focus: "Soustředění",
    reflection: "Reflexe",
    custom: "Vlastní aktivita",
  }[h.kind];
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
  const checked = data.checks[day]?.[habit.id];
  const [note, setNote] = useState(checked?.note ?? "");
  const future = day > dayKey();
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>
        {pretty(day)} / {habitKindsLabel(habit).toUpperCase()}
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
