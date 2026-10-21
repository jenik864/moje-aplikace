import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { ranks } from "../model";
import { RankStage, AppIcon, palette } from "../design";
import { buildRank, buildPoints, buildMilestones } from "./ranking";
import { rankColors, RankEmblem } from "../ui";
import { Calendar } from "./Calendar";
import { BuildTheme, useBuildStyles } from "./components";
import { Screen } from "../ui";
import { useBuild } from "./useBuild";
import { s, blue, Button, Progress, MissionArtwork } from "./components";
import {
  dateKey,
  shiftDay,
  monday,
  uid,
  kinds,
  badges,
  badgeProgress,
  award,
  applyPlan,
  complete,
  type Activity,
} from "./model";
import { PlanEditor, dayNames } from "./PlanEditor";
import { ActivityDetail } from "./ActivityDetail";
import { Library } from "./Library";
import { Routines } from "./Routines";
const nice = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
type Route =
  | {
      type:
        | "plan"
        | "planner"
        | "calendar"
        | "ranks"
        | "library"
        | "badges"
        | "routines";
    }
  | { type: "activity"; id?: string; day: string };
function RestBanner({ end, onStop }: { end: number; onStop: () => void }) {
  const s = useBuildStyles();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  if (!seconds) return null;
  return (
    <View
      style={[
        s.between,
        {
          backgroundColor: "#172b43",
          paddingHorizontal: 20,
          paddingVertical: 12,
        },
      ]}
    >
      <View style={{ gap: 4 }}>
        <Text style={s.label}>PAUZA MEZI SÉRIEMI</Text>
        <Text style={s.h2}>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onStop} style={s.chip}>
        <Text style={s.link}>Ukončit pauzu</Text>
      </Pressable>
    </View>
  );
}
export function BuildScreen({
  store,
  onAccent,
}: {
  onAccent?: (color: string) => void;
  store: ReturnType<typeof useBuild>;
}) {
  const color = palette.Build;
  useEffect(() => {
    if (store.loaded) onAccent?.(color);
  }, [color, store.loaded, onAccent]);
  return (
    <BuildTheme.Provider value={color}>
      <BuildContent store={store} />
    </BuildTheme.Provider>
  );
}
function BuildContent({ store }: { store: ReturnType<typeof useBuild> }) {
  const s = useBuildStyles();
  const blue = useContext(BuildTheme);
  const rank = buildRank(store.data),
    points = buildPoints(store.data);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const weekY = useRef(0);
  const {
    data,
    update,
    loaded,
    loadError,
    saveError,
    saving,
    retryLoad,
    retrySave,
  } = store;
  const [today, setToday] = useState(dateKey());
  const [week, setWeek] = useState(monday(dateKey()));
  const [selected, setSelected] = useState(dateKey());
  const [route, setRoute] = useState<Route | null>(null);
  const [notice, setNotice] = useState("");
  const [showAllWeek, setShowAllWeek] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setToday(dateKey()), 30000);
    return () => clearInterval(t);
  }, []);
  const weekdays = Array.from({ length: 7 }, (_, i) => shiftDay(week, i));
  const weekActivities = data.activities
    .filter((a) => monday(a.day) === week)
    .sort((a, b) => a.day.localeCompare(b.day));
  const weekDone = weekActivities.filter((a) => data.logs[a.id]);
  const missions = data.activities.filter((a) => a.day === today);
  const next = missions.find((a) => !data.logs[a.id]);
  const todayDone = missions.filter((a) => data.logs[a.id]);
  const pinned = badges.find((b) => b.id === data.pinnedBadgeId) ?? badges[0];
  const pinnedProgress = badgeProgress(data, pinned.id);
  function plan() {
    const currentWeek = monday(today);
    if (
      week === currentWeek &&
      !data.profile.days.some((d) => shiftDay(week, d) >= today)
    ) {
      setWeek(shiftDay(currentWeek, 7));
      setSelected(shiftDay(currentWeek, 7));
    }
    setRoute({ type: "planner" });
  }
  function changeWeek(delta: number) {
    const next = shiftDay(week, delta * 7);
    setWeek(next);
    setSelected(next);
    setNotice("");
  }
  if (!loaded)
    return (
      <Screen>
        <View style={[s.page, { flex: 1, justifyContent: "center" }]}>
          {loadError ? (
            <>
              <Text style={s.error}>{loadError}</Text>
              <Button
                title="Zkusit načtení znovu"
                onPress={() => void retryLoad()}
              />
            </>
          ) : (
            <ActivityIndicator color={blue} />
          )}
        </View>
      </Screen>
    );
  const status = (
    <>
      {saveError && (
        <View style={s.card}>
          <Text style={s.error}>{saveError}</Text>
          <Button title="Zkusit uložení znovu" onPress={retrySave} />
        </View>
      )}
      {saving && <Text style={s.small}>Ukládám změny…</Text>}
    </>
  );
  return (
    <Screen accent={blue}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.between}>
          <View style={{ gap: 5, flex: 1 }}>
            <Text style={s.label}>QUITTER / TVOJE FYZICKÁ STRÁNKA</Text>
            <Text style={[s.title, { fontSize: 40 }]}>Build.</Text>
          </View>
          <AppIcon name="Build" color={blue} size={32} />
        </View>
        <RankStage
          rank={rank}
          prime={Math.max(rank, data.prime ?? 0)}
          color={rankColors[rank]}
          label="BUILD / TVŮJ POSTUP"
          value={points.toLocaleString("cs-CZ")}
          unit="BODŮ POHYBU"
          progress={
            rank === 11
              ? 1
              : (points - buildMilestones[rank]) /
                (buildMilestones[rank + 1] - buildMilestones[rank])
          }
          nextLabel={
            rank === 11
              ? "Nejvyšší rank"
              : `Další ${ranks[rank + 1]} za ${(buildMilestones[rank + 1] - points).toLocaleString("cs-CZ")} bodů`
          }
          onPress={() => setRoute({ type: "ranks" })}
          accessibilityLabel="Otevřít ranky Build"
        />
        {status}
        {notice !== "" && (
          <Text accessibilityLiveRegion="polite" style={s.link}>
            {notice}
          </Text>
        )}
        <View style={{ gap: 18, paddingVertical: 10 }}>
          <View style={s.between}>
            <Text style={s.label}>DNEŠNÍ MISE</Text>
            <Text style={s.small}>{nice(today)}</Text>
          </View>
          <View
            style={[
              s.row,
              { flexWrap: "nowrap", alignItems: "center", gap: 4 },
            ]}
          >
            <View style={{ flex: 1, gap: 12 }}>
              <Text
                style={[
                  s.h2,
                  {
                    fontSize: width < 360 ? 28 : 34,
                    lineHeight: width < 360 ? 31 : 37,
                    letterSpacing: -1.1,
                  },
                ]}
              >
                {next
                  ? next.title
                  : todayDone.length
                    ? "Dnes splněno."
                    : "Síla začíná i odpočinkem."}
              </Text>
              <Text style={s.muted}>
                {next
                  ? `${next.targetMinutes} min · ${kinds[next.kind].name}`
                  : todayDone.length
                    ? `${todayDone.length} dokončených aktivit`
                    : "Dnes má tvoje tělo prostor na regeneraci."}
              </Text>
            </View>
            <MissionArtwork
              size={width < 360 ? 110 : 130}
              icon={
                next ? kinds[next.kind].icon : todayDone.length ? "✓" : "↔"
              }
              done={
                data.activities.filter(
                  (a) => monday(a.day) === monday(today) && data.logs[a.id],
                ).length
              }
              total={
                data.activities.filter((a) => monday(a.day) === monday(today))
                  .length
              }
            />
          </View>
          <Button
            title={
              next
                ? "Otevřít dnešní trénink"
                : data.activities.length
                  ? "+ Přidat dnešní aktivitu"
                  : "Vytvořit můj plán"
            }
            onPress={() =>
              next
                ? setRoute({ type: "activity", id: next.id, day: next.day })
                : data.activities.length
                  ? setRoute({ type: "activity", day: today })
                  : plan()
            }
          />
          {missions.length > 1 && (
            <Text style={s.small}>
              Dnes {todayDone.length} / {missions.length} hotovo. Všechny
              aktivity najdeš v týdnu níže.
            </Text>
          )}
        </View>
        <View
          style={{ gap: 16 }}
          onLayout={(e) => {
            weekY.current = e.nativeEvent.layout.y;
          }}
        >
          <View style={s.between}>
            <Text style={s.h2}>Tvůj týden</Text>
            <Pressable
              accessibilityRole="button"
              onPress={plan}
              style={{ padding: 8 }}
            >
              <Text style={s.link}>Sestavit týden →</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Měsíční kalendář →"
            onPress={() => setRoute({ type: "calendar" })}
            style={{ paddingVertical: 4 }}
          >
            <Text style={s.link}>Měsíční kalendář →</Text>
          </Pressable>
          <View style={s.between}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Předchozí týden"
              onPress={() => changeWeek(-1)}
              style={s.chip}
            >
              <Text style={s.link}>←</Text>
            </Pressable>
            <Text style={s.muted}>
              {nice(week)} – {nice(shiftDay(week, 6))}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Další týden"
              onPress={() => changeWeek(1)}
              style={s.chip}
            >
              <Text style={s.link}>→</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {weekdays.map((day, i) => {
              const activities = weekActivities.filter((a) => a.day === day);
              const done =
                activities.length > 0 &&
                activities.every((a) => data.logs[a.id]);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayNames[i]} ${nice(day)}${done ? " dokončeno" : ""}`}
                  accessibilityState={{ selected: selected === day }}
                  onPress={() => setSelected(day)}
                  style={[
                    s.day,
                    done && s.done,
                    selected === day && {
                      borderColor: blue,
                      backgroundColor: blue + "20",
                    },
                  ]}
                >
                  <Text style={s.small}>{dayNames[i]}</Text>
                  <Text style={[s.text, { fontSize: 15 }]}>
                    {new Date(`${day}T12:00:00`).getDate()}
                  </Text>
                  <Text
                    style={{ color: done ? "#84d7bd" : blue, fontSize: 12 }}
                  >
                    {done ? "✓" : activities.length ? "•" : "—"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.between}>
            <Text style={s.small}>
              {weekDone.length} / {weekActivities.length} aktivit dokončeno
            </Text>
            <Pressable
              accessibilityRole="button"
              style={{ padding: 8 }}
              onPress={() => {
                setWeek(monday(today));
                setSelected(today);
              }}
            >
              <Text style={s.link}>Dnes</Text>
            </Pressable>
          </View>
          <Progress
            value={
              weekActivities.length
                ? weekDone.length / weekActivities.length
                : 0
            }
          />
          <View style={{ gap: 8, paddingTop: 8 }}>
            <View style={s.between}>
              <Text style={s.label}>
                {showAllWeek
                  ? "CELÝ TÝDEN / CO TĚ ČEKÁ"
                  : `${nice(selected)} / TVŮJ POHYB`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showAllWeek }}
                onPress={() => setShowAllWeek(!showAllWeek)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={[s.link, { fontSize: 12 }]}>
                  {showAllWeek ? "Jen vybraný den" : "Celý týden"}
                </Text>
              </Pressable>
            </View>
            {(showAllWeek ? weekdays : [selected]).map((day) => {
              const items = weekActivities.filter((a) => a.day === day),
                i = weekdays.indexOf(day);
              return (
                <View
                  key={day}
                  style={{
                    gap: 4,
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderColor: "#ffffff13",
                  }}
                >
                  <View style={s.between}>
                    <Text
                      style={[
                        s.text,
                        {
                          fontWeight: "600",
                          color: day === selected ? blue : "#e8f1f2",
                        },
                      ]}
                    >
                      {dayNames[i]} · {nice(day)}
                      {day === today ? " · dnes" : ""}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Přidat aktivitu ${day}`}
                      onPress={() => setRoute({ type: "activity", day })}
                      style={{ paddingVertical: 10, paddingLeft: 12 }}
                    >
                      <Text style={s.link}>+ Přidat</Text>
                    </Pressable>
                  </View>
                  {items.length ? (
                    items.map((a) => (
                      <Pressable
                        key={a.id}
                        accessibilityRole="button"
                        onPress={() =>
                          setRoute({ type: "activity", id: a.id, day })
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <View
                          style={{
                            width: 3,
                            height: 38,
                            backgroundColor: data.logs[a.id] ? blue : "#79bdff",
                            borderRadius: 2,
                          }}
                        />
                        <View style={{ flex: 1, gap: 5 }}>
                          <Text style={[s.h2, { fontSize: 21 }]}>
                            {data.logs[a.id] ? "✓ " : ""}
                            {a.title} →
                          </Text>
                          <Text style={s.small}>
                            {kinds[a.kind].name} ·{" "}
                            {data.logs[a.id]
                              ? `${data.logs[a.id].minutes} min dokončeno`
                              : `${a.targetMinutes} min${a.targetKm ? ` · ${a.targetKm} km` : ""}`}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={[s.muted, { paddingVertical: 8 }]}>
                      Volno / regenerace
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          <Button
            secondary
            title="+ Přidat aktivitu na vybraný den"
            onPress={() => setRoute({ type: "activity", day: selected })}
          />
        </View>
        <View style={[s.card, { gap: 18 }]}>
          <View style={s.between}>
            <Text style={s.label}>TVOJE VÝZVA</Text>
            <Pressable
              accessibilityRole="button"
              style={{ padding: 8 }}
              onPress={() => setRoute({ type: "badges" })}
            >
              <Text style={s.link}>Odznaky →</Text>
            </Pressable>
          </View>
          <View style={s.row}>
            <View style={s.badge}>
              <Text style={s.icon}>{pinned.icon}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.h2}>{pinned.title}</Text>
              <Text style={s.small}>
                {data.earned[pinned.id]
                  ? "✓ Odznak získán"
                  : `${Math.min(pinned.target, Math.round(pinnedProgress * 10) / 10)} / ${pinned.target} ${pinned.unit}`}
              </Text>
            </View>
          </View>
          <Progress value={pinnedProgress / pinned.target} />
          <Text style={s.muted}>{pinned.description}</Text>
        </View>
        <View style={s.between}>
          <Text style={s.h2}>Každodenní péče</Text>
          <Pressable
            accessibilityRole="button"
            style={{ padding: 8 }}
            onPress={() => setRoute({ type: "routines" })}
          >
            <Text style={s.link}>Upravit →</Text>
          </Pressable>
        </View>
        {data.routines.length === 0 && (
          <Text style={s.muted}>Přidej si vlastní rutinu péče o tělo.</Text>
        )}
        {data.routines.map((r) => {
          const checked = (data.routineChecks[today] ?? []).includes(r.id);
          return (
            <View key={r.id} style={[s.card, { gap: 12, paddingVertical: 18 }]}>
              <View style={s.between}>
                <Text style={s.label}>
                  {r.period === "morning" ? "RÁNO" : "VEČER"}
                </Text>
                <Text style={s.small}>{checked ? "✓ HOTOVO" : "DNES"}</Text>
              </View>
              <Text style={s.h2}>{r.title}</Text>
              {r.steps.map((step, i) => (
                <Text key={i} style={s.muted}>
                  {i + 1}. {step}
                </Text>
              ))}
              <Button
                secondary={checked}
                title={
                  checked ? "✓ Splněno · změnit" : "Dnes jsem dokončil rutinu"
                }
                onPress={() =>
                  update((d) => {
                    const ids = d.routineChecks[today] ?? [];
                    return award({
                      ...d,
                      routineChecks: {
                        ...d.routineChecks,
                        [today]: ids.includes(r.id)
                          ? ids.filter((id) => id !== r.id)
                          : [...ids, r.id],
                      },
                    });
                  })
                }
              />
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => setRoute({ type: "library" })}
          style={[s.card, { borderColor: blue + "60", paddingVertical: 26 }]}
        >
          <Text style={s.label}>KNIHOVNA POHYBU / 51 CVIKŮ</Text>
          <View style={s.between}>
            <Text style={[s.h2, s.flex]}>Technika, kterou máš po ruce.</Text>
            <Text style={s.icon}>→</Text>
          </View>
          <Text style={s.muted}>
            Přes 50 cviků, svalové mapy a varianty podle vybavení.
          </Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={route !== null}
        animationType="slide"
        onRequestClose={() => setRoute(null)}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal accent={blue}>
            <View style={[s.header, s.between]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRoute(null)}
                style={{ padding: 8 }}
              >
                <Text style={s.link}>× Zavřít</Text>
              </Pressable>
              <Text style={s.label}>
                BUILD /{" "}
                {route?.type === "calendar"
                  ? "KALENDÁŘ"
                  : route?.type === "ranks"
                    ? "RANKY"
                    : route?.type === "planner"
                      ? "TVŮJ TÝDEN"
                      : route?.type === "plan"
                        ? "PLÁN"
                        : route?.type === "activity"
                          ? "TRÉNINK"
                          : route?.type === "library"
                            ? "CVIKY"
                            : route?.type === "badges"
                              ? "ODZNAKY"
                              : "PÉČE"}
              </Text>
            </View>
            {route?.type === "activity" &&
              route.id &&
              data.restEnds?.[route.id] !== undefined && (
                <RestBanner
                  end={data.restEnds[route.id]}
                  onStop={() =>
                    update((d) => ({
                      ...d,
                      restEnds: { ...d.restEnds, [route.id!]: 0 },
                    }))
                  }
                />
              )}
            <ScrollView
              contentContainerStyle={s.page}
              keyboardShouldPersistTaps="handled"
            >
              {status}
              {route?.type === "planner" && (
                <View style={{ gap: 20 }}>
                  <Text style={s.title}>Jak sestavíš svůj týden?</Text>
                  <Text style={s.muted}>
                    {nice(week)} – {nice(shiftDay(week, 6))}. Existující
                    tréninky najdeš v přehledu; každému dni můžeš přidat další
                    aktivitu.
                  </Text>
                  <Button
                    title="Navrhnout s Quitterem"
                    onPress={() => setRoute({ type: "plan" })}
                  />
                  <Button
                    secondary
                    title="Sestavit si plán"
                    onPress={() => {
                      setRoute(null);
                      setNotice("Vyber den v rozvrhu a klepni na + Přidat.");
                      scrollRef.current?.scrollTo({
                        y: weekY.current,
                        animated: true,
                      });
                    }}
                  />
                  <Text style={s.small}>
                    Quitter připraví návrh podle tvého nastavení. Po použití
                    otevři aktivitu a uprav název, datum, délku nebo cviky.
                  </Text>
                </View>
              )}
              {route?.type === "calendar" && (
                <Calendar
                  data={data}
                  day={selected}
                  onSelect={(day) => {
                    setSelected(day);
                    setWeek(monday(day));
                  }}
                  onOpen={(id, day) => setRoute({ type: "activity", id, day })}
                  onAdd={(day) => setRoute({ type: "activity", day })}
                />
              )}
              {route?.type === "ranks" && (
                <View style={{ gap: 20 }}>
                  <Text style={s.title}>Síla vzniká postupně.</Text>
                  <View style={s.card}>
                    <RankEmblem value={rank} size={76} />
                    <Text style={[s.title, { color: blue }]}>
                      {ranks[rank]}
                    </Text>
                    <Text style={s.text}>
                      {points.toLocaleString("cs-CZ")} bodů pohybu
                    </Text>
                    <Text style={s.muted}>
                      1 bod = 30 skutečně zapsaných minut pohybu. Všechny
                      aktivity jednoho dne mají společný strop 3 body (90
                      minut). Započítávají se i kratší aktivity.
                    </Text>
                    <Text style={s.muted}>
                      Odpočinek ani vynechaný den nic neresetují. Plánování a
                      péče o pleť body nedávají. Oprava výkonu přepočítá
                      Current; PRIME uchová nejvyšší dosažený rank.
                    </Text>
                  </View>
                  {ranks.map((name, i) => (
                    <View
                      key={name}
                      style={[s.card, { borderColor: rankColors[i] + "55" }]}
                    >
                      <View style={s.row}>
                        <RankEmblem value={i} size={40} />
                        <Text style={[s.h2, { color: rankColors[i] }]}>
                          {name}
                        </Text>
                      </View>
                      <Text style={s.muted}>
                        Od {buildMilestones[i]} bodů
                        {rank === i ? " · CURRENT" : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {route?.type === "plan" && (
                <PlanEditor
                  profile={data.profile}
                  week={week}
                  onApply={(profile, activities) => {
                    update((d) => ({
                      ...applyPlan(d, activities, week),
                      profile,
                    }));
                    setRoute(null);
                    setNotice(
                      "Plán je připravený. Klepni na aktivitu a dolaď ji podle sebe.",
                    );
                  }}
                />
              )}
              {route?.type === "activity" && (
                <ActivityDetail
                  key={route.id ?? "new"}
                  activity={data.activities.find((a) => a.id === route.id)}
                  day={route.day}
                  data={data}
                  onSave={(a) => {
                    update((d) => ({
                      ...d,
                      activities: d.activities.some((v) => v.id === a.id)
                        ? d.activities.map((v) => (v.id === a.id ? a : v))
                        : [...d.activities, a],
                    }));
                    setRoute({ type: "activity", id: a.id, day: a.day });
                    setWeek(monday(a.day));
                    setSelected(a.day);
                  }}
                  onMetrics={(id, metrics) =>
                    update((d) => ({
                      ...d,
                      metricDrafts: { ...d.metricDrafts, [id]: metrics },
                    }))
                  }
                  onDraft={(id, draft) =>
                    update((d) => ({
                      ...d,
                      drafts: { ...d.drafts, [id]: draft },
                    }))
                  }
                  onRest={(id, end) =>
                    update((d) => ({
                      ...d,
                      restEnds: { ...d.restEnds, [id]: end },
                    }))
                  }
                  onComplete={(a, l) => {
                    update((d) => {
                      const next = complete(d, a, l);
                      const drafts = { ...next.drafts };
                      delete drafts[a.id];
                      const restEnds = { ...next.restEnds };
                      delete restEnds[a.id];
                      const metricDrafts = { ...next.metricDrafts };
                      delete metricDrafts[a.id];
                      return { ...next, drafts, restEnds, metricDrafts };
                    });
                    setRoute(null);
                    setNotice("Výkon uložený. Každý krok se počítá.");
                  }}
                  onDelete={(id) => {
                    update((d) => {
                      const drafts = { ...d.drafts };
                      delete drafts[id];
                      const metricDrafts = { ...d.metricDrafts };
                      delete metricDrafts[id];
                      const restEnds = { ...d.restEnds };
                      delete restEnds[id];
                      return {
                        ...d,
                        activities: d.activities.filter((a) => a.id !== id),
                        drafts,
                        restEnds,
                        metricDrafts,
                      };
                    });
                    setRoute(null);
                    setNotice("Aktivita odebraná z plánu.");
                  }}
                />
              )}
              {route?.type === "library" && <Library />}
              {route?.type === "routines" && (
                <Routines
                  routines={data.routines}
                  onSave={(r) =>
                    update((d) => ({
                      ...d,
                      routines: d.routines.some((v) => v.id === r.id)
                        ? d.routines.map((v) => (v.id === r.id ? r : v))
                        : [...d.routines, r],
                    }))
                  }
                  onRemove={(id) =>
                    update((d) => ({
                      ...d,
                      routines: d.routines.filter((r) => r.id !== id),
                    }))
                  }
                />
              )}
              {route?.type === "badges" && (
                <View style={{ gap: 20 }}>
                  <Text style={s.title}>Výkony mají příběh.</Text>
                  <Text style={s.muted}>
                    Jeden společný sborník odznaků Build. Počítají se skutečné
                    zapsané aktivity, ne plán. Odznak po získání zůstane
                    odemčený.
                  </Text>
                  {badges.map((b) => {
                    const progress = badgeProgress(data, b.id);
                    const earned = data.earned[b.id];
                    return (
                      <View
                        key={b.id}
                        style={[s.card, !earned && { borderColor: "#263345" }]}
                      >
                        <View style={s.row}>
                          <View
                            style={[
                              s.badge,
                              !earned && {
                                backgroundColor: "#101820",
                                borderColor: "#41526a",
                              },
                            ]}
                          >
                            <Text style={s.icon}>{b.icon}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 7 }}>
                            <Text style={s.h2}>{b.title}</Text>
                            <Text style={s.small}>
                              {earned
                                ? `✓ Získáno ${nice(dateKey(new Date(earned)))}`
                                : `${Math.min(b.target, Math.round(progress * 10) / 10)} / ${b.target} ${b.unit}`}
                            </Text>
                          </View>
                        </View>
                        <Text style={s.muted}>{b.description}</Text>
                        <Progress value={progress / b.target} />
                        <Button
                          secondary
                          title={
                            data.pinnedBadgeId === b.id
                              ? "✓ Připnutá výzva"
                              : "Připnout na hlavní obrazovku"
                          }
                          onPress={() =>
                            update((d) => ({ ...d, pinnedBadgeId: b.id }))
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}
