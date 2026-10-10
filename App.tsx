import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  PanResponder,
  Alert,
  AppState,
} from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import {
  Data,
  Program,
  ProgramId,
  definitions,
  ranks,
  milestones,
  rankOf,
  streak,
  dayKey,
  resetProgram,
  formatDuration,
} from "./src/model";

import { Screen, RankBadge, RankEmblem } from "./src/ui";

import { programContent } from "./src/programContent";
import { ProgramIntro } from "./src/ProgramIntro";
import { SosProtocol } from "./src/SosProtocol";

import { DailyCheckIn } from "./src/DailyCheckIn";
import { ConsistencyMatrix } from "./src/ConsistencyMatrix";

const Tab = createBottomTabNavigator();
const ids: ProgramId[] = ["porn", "scroll", "food"];
const STORAGE = "quitter.v1";
const purple = "#b994ff";
function Button({
  title,
  onPress,
  color = "#c5fa67",
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.button, { backgroundColor: secondary ? "#202020" : color }]}
    >
      <Text style={[s.buttonText, { color: secondary ? "#fff" : "#050505" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Signature({
  initialValue,
  color,
  onChange,
  onDrawing,
}: {
  initialValue: string;
  color: string;
  onChange: (value: string) => void;
  onDrawing: (drawing: boolean) => void;
}) {
  const [path, setPath] = useState(initialValue);
  const current = useRef(initialValue);
  const width = useRef(300);
  const callbacks = useRef({ onChange, onDrawing });
  callbacks.current = { onChange, onDrawing };
  const point = (x: number, y: number) =>
    `${Math.max(0, Math.min(300, (x / width.current) * 300))} ${Math.max(0, Math.min(130, y))}`;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        callbacks.current.onDrawing(true);
        current.current += ` M ${point(e.nativeEvent.locationX, e.nativeEvent.locationY)}`;
        setPath(current.current);
      },
      onPanResponderMove: (e) => {
        current.current += ` L ${point(e.nativeEvent.locationX, e.nativeEvent.locationY)}`;
        setPath(current.current);
      },
      onPanResponderRelease: () => {
        callbacks.current.onChange(current.current);
        callbacks.current.onDrawing(false);
      },
      onPanResponderTerminate: () => {
        callbacks.current.onChange(current.current);
        callbacks.current.onDrawing(false);
      },
    }),
  ).current;
  return (
    <>
      <View
        accessibilityLabel="Pole pro podpis"
        onLayout={(e) => {
          width.current = Math.max(1, e.nativeEvent.layout.width);
        }}
        {...responder.panHandlers}
        style={s.signature}
      >
        <Svg
          width="100%"
          height="130"
          viewBox="0 0 300 130"
          preserveAspectRatio="none"
        >
          <Path d={path} stroke={color} strokeWidth={3} fill="none" />
        </Svg>
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => {
          current.current = "";
          setPath("");
          onChange("");
        }}
      >
        <Text style={s.muted}>Vymazat podpis</Text>
      </Pressable>
    </>
  );
}
function Setup({
  id,
  close,
  save,
}: {
  id: ProgramId;
  close: () => void;
  save: (p: Program) => void;
}) {
  const d = definitions[id];
  const [step, setStep] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const setupScroll = useRef<ScrollView>(null);
  const moveStep = (next: number) => {
    setStep(next);
    setDrawing(false);
    setupScroll.current?.scrollTo({ y: 0, animated: false });
  };
  const [reasons, setReasons] = useState("");
  const [target, setTarget] = useState(d.target);
  const [limit, setLimit] = useState("45");
  const [signature, setSignature] = useState("");
  const valid =
    reasons.trim().length > 0 &&
    target.trim().length > 0 &&
    (id !== "scroll" || (Number(limit) >= 1 && Number(limit) <= 1440));
  return (
    <Screen modal>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ref={setupScroll}
        scrollEnabled={!drawing}
        contentContainerStyle={s.modalContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={close}>
          <Text style={s.muted}>✕ ZAVŘÍT</Text>
        </Pressable>
        <Text style={[s.eyebrow, { color: d.color }]}>
          {d.title.toUpperCase()} · {step + 1} / 3
        </Text>
        <View style={s.stepTrack}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                s.stepSegment,
                { backgroundColor: i <= step ? d.color : "#292929" },
              ]}
            />
          ))}
        </View>
        <Text style={s.heading}>
          {step === 0
            ? programContent[id].headline
            : step === 1
              ? "Tvoje vlastní proč."
              : "Slib sám sobě."}
        </Text>
        {step === 0 && (
          <>
            <Text style={s.body}>{programContent[id].intro}</Text>
            <View style={s.panel}>
              <Text style={s.cardTitle}>TVŮJ PRVNÍ KROK</Text>
              {programContent[id].steps.map((text, i) => (
                <View style={s.row} key={text}>
                  <Text style={{ color: d.color, fontWeight: "800" }}>
                    0{i + 1}
                  </Text>
                  <Text style={[s.body, { flex: 1 }]}>{text}</Text>
                </View>
              ))}
            </View>
            <Text style={s.muted}>{d.description}</Text>
            <Button
              title="CHCI ZAČÍT"
              color={d.color}
              onPress={() => moveStep(1)}
            />
          </>
        )}
        {step === 1 && (
          <>
            <Text style={s.body}>{d.prompt}</Text>
            <TextInput
              multiline
              placeholder="Končím, protože…"
              placeholderTextColor="#777"
              value={reasons}
              onChangeText={setReasons}
              style={[s.input, { minHeight: 120 }]}
            />
            <Text style={s.muted}>
              Inspirace — vyber, co je pro tebe pravdivé:
            </Text>
            <View style={s.row}>
              {programContent[id].examples.map((example) => (
                <Pressable
                  accessibilityRole="button"
                  key={example}
                  onPress={() =>
                    setReasons((prev) =>
                      prev.includes(example)
                        ? prev
                        : prev.trim()
                          ? `${prev.trim()}\n${example}`
                          : example,
                    )
                  }
                  style={s.reasonChip}
                >
                  <Text style={s.muted}>{example}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.eyebrow}>
              {id === "scroll" ? "OMEZOVANÉ APLIKACE / WEBY" : "MOJE PRAVIDLO"}
            </Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              editable={id !== "porn"}
              style={s.input}
            />
            {id === "scroll" && (
              <>
                <Text style={s.eyebrow}>DENNÍ LIMIT V MINUTÁCH</Text>
                <TextInput
                  value={limit}
                  onChangeText={setLimit}
                  keyboardType="number-pad"
                  style={s.input}
                />
                <Text style={s.muted}>
                  V této verzi jde o ruční záznam. Systémové měření a blokování
                  zatím nejsou aktivní.
                </Text>
              </>
            )}
            <Button
              title="POKRAČOVAT K PODPISU"
              color={d.color}
              onPress={() =>
                valid
                  ? moveStep(2)
                  : Alert.alert(
                      "Doplň závazek",
                      "Vyplň důvody, pravidlo a platný limit.",
                    )
              }
            />
          </>
        )}
        {step === 2 && (
          <>
            <View style={s.panel}>
              <Text style={s.cardTitle}>{target}</Text>
              <Text style={s.body}>{reasons}</Text>
            </View>
            <Text style={s.body}>
              Podepiš se prstem nebo myší. Je to osobní připomínka tvého
              rozhodnutí.
            </Text>
            <Signature
              initialValue={signature}
              color={d.color}
              onChange={setSignature}
              onDrawing={setDrawing}
            />
            <Button
              title="PODEPSAT A ZAČÍT"
              color={d.color}
              onPress={() =>
                signature.includes(" L ")
                  ? save({
                      startedAt: Date.now(),
                      reasons: reasons.trim(),
                      target: target.trim(),
                      limit: Number(limit),
                      signature,
                      signedAt: Date.now(),
                      triggers: [],
                      prime: 0,
                      days: {},
                      history: [],
                    })
                  : Alert.alert(
                      "Chybí podpis",
                      "Podepiš svůj závazek do vyznačeného pole.",
                    )
              }
            />
          </>
        )}
        {step > 0 && (
          <Button secondary title="ZPĚT" onPress={() => moveStep(step - 1)} />
        )}
      </ScrollView>
    </Screen>
  );
}
function HoldReset({ reset }: { reset: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", cancel);
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reset série, podržte tři sekundy"
      onPressIn={() => {
        setHolding(true);
        timer.current = setTimeout(() => {
          cancel();
          reset();
        }, 3000);
      }}
      onPressOut={cancel}
      style={s.reset}
    >
      <Text style={s.muted}>
        {holding
          ? "Drž… reset po 3 sekundách"
          : "Zaznamenat porušení · podrž 3 s"}
      </Text>
    </Pressable>
  );
}
function Dashboard({
  id,
  p,
  now,
  update,
  sos,
  edit,
}: {
  id: ProgramId;
  p: Program;
  now: number;
  update: (p: Program) => void;
  sos: () => void;
  edit: () => void;
}) {
  const d = definitions[id];
  const rank = rankOf(id, p, now);
  const seconds = Math.max(0, Math.floor((now - p.startedAt) / 1000));
  const days = Math.floor(seconds / 86400);
  const reset = () => update(resetProgram(p));
  return (
    <>
      <View style={s.rankRow}>
        <RankBadge value={rank} />
        <Text style={s.muted}>PRIME · {ranks[Math.max(p.prime, rank)]}</Text>
      </View>
      <Pressable onPress={sos} style={s.sos}>
        <Text style={s.sosTitle}>SOS — ZASTAVIT IMPULZ</Text>
        <Text style={{ color: "#ffb3b8", marginTop: 5 }}>
          Připomeň si, pro co ses rozhodl. →
        </Text>
      </Pressable>
      {id === "porn" ? (
        <View style={[s.ring, { borderColor: d.color }]}>
          <Text style={s.eyebrow}>BEZ PORNA</Text>
          <Text style={s.timer}>
            {days}
            <Text style={{ fontSize: 20 }}> dní</Text>
          </Text>
          <Text style={s.clock}>
            {String(Math.floor(seconds / 3600) % 24).padStart(2, "0")} :{" "}
            {String(Math.floor(seconds / 60) % 60).padStart(2, "0")} :{" "}
            {String(seconds % 60).padStart(2, "0")}
          </Text>
          <Text style={s.muted}>HODINY · MINUTY · SEKUNDY</Text>
        </View>
      ) : (
        <View style={s.panel}>
          <Text style={[s.eyebrow, { color: d.color }]}>
            {id === "scroll" ? "DENNÍ ČASOVÝ ROZPOČET" : "MOJE PRAVIDLO"}
          </Text>
          <Text style={[s.big, id === "food" && { fontSize: 26 }]}>
            {id === "scroll"
              ? `${p.dailyLogs?.[dayKey(new Date(now))]?.minutes ?? "—"} / ${p.limit} min`
              : p.target}
          </Text>
          <Text style={s.body}>
            {id === "scroll" ? p.target : "Pravidelnost, ne dokonalost."}
          </Text>
          {id === "scroll" && (
            <>
              <View style={s.track}>
                <View
                  style={[
                    s.progress,
                    {
                      backgroundColor:
                        (p.dailyLogs?.[dayKey(new Date(now))]?.minutes ?? 0) >
                        p.limit
                          ? "#ff7882"
                          : d.color,
                      width: `${Math.min(100, ((p.dailyLogs?.[dayKey(new Date(now))]?.minutes ?? 0) / p.limit) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={s.muted}>
                {p.dailyLogs?.[dayKey(new Date(now))]?.minutes === undefined
                  ? "Dnešní čas zatím není zaznamenaný."
                  : `Zbývá ${Math.max(0, p.limit - p.dailyLogs[dayKey(new Date(now))].minutes!)} min z limitu.`}{" "}
                Ruční přehled.
              </Text>
            </>
          )}
          <Text style={s.cardTitle}>
            {streak(p, now)} dokončených dní v řadě
          </Text>
        </View>
      )}
      <View style={s.progressPanel}>
        <Text style={s.cardTitle}>
          {rank < 9
            ? `DALŠÍ RANK · ${ranks[rank + 1].toUpperCase()}`
            : "OBSIDIAN · NEJVYŠŠÍ RANK"}
        </Text>
        {rank < 9 && (
          <>
            <View style={s.track}>
              <View
                style={[
                  s.progress,
                  {
                    backgroundColor: d.color,
                    width: `${Math.min(100, Math.max(0, (((id === "porn" ? seconds / 86400 : streak(p, now)) - milestones[rank]) / (milestones[rank + 1] - milestones[rank])) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.muted}>
              {id === "porn"
                ? `Zbývá ${Math.ceil(Math.max(0, milestones[rank + 1] * 86400 - seconds) / 3600)} hodin`
                : `${streak(p, now)} / ${milestones[rank + 1]} dokončených dní`}
            </Text>
          </>
        )}
      </View>
      {id !== "porn" && (
        <DailyCheckIn id={id} p={p} now={now} update={update} />
      )}
      <View style={s.panel}>
        <View style={s.rankRow}>
          <Text style={s.cardTitle}>MOJE PROČ</Text>
          <Pressable accessibilityRole="button" onPress={edit} hitSlop={12}>
            <Text style={{ color: purple, fontSize: 12 }}>UPRAVIT</Text>
          </Pressable>
        </View>
        <Text style={s.body}>{p.reasons}</Text>
        <Text style={s.muted}>
          Podepsáno{" "}
          {new Date(
            p.signedAt ??
              (p.history[0]
                ? p.history[0].at - p.history[0].duration
                : p.startedAt),
          ).toLocaleDateString("cs-CZ")}
        </Text>
      </View>
      <ConsistencyMatrix id={id} p={p} now={now} />
      {id === "porn" && (
        <>
          <View style={s.panel}>
            <Text style={s.cardTitle}>HISTORIE SÉRIÍ</Text>
            <Text style={s.muted}>
              Nejdelší série:{" "}
              {formatDuration(
                Math.max(
                  now - p.startedAt,
                  ...p.history.map((h) => h.duration),
                ),
              )}
            </Text>
            {p.history.length === 0 ? (
              <Text style={s.muted}>Tvoje první série právě běží.</Text>
            ) : (
              p.history
                .slice(-5)
                .reverse()
                .map((h) => (
                  <View key={h.at} style={s.rankRow}>
                    <Text style={s.muted}>
                      {new Date(h.at).toLocaleString("cs-CZ", {
                        day: "numeric",
                        month: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={s.cardTitle}>
                      {formatDuration(h.duration)}
                    </Text>
                  </View>
                ))
            )}
          </View>
          <View style={s.panel}>
            <Text style={s.cardTitle}>ZÁZNAMY SOS</Text>
            <Text style={s.muted}>
              {(p.triggers ?? []).length} uložených návratů k plánu
            </Text>
            {(p.triggers ?? [])
              .slice(-3)
              .reverse()
              .map((e) => (
                <View key={e.at} style={s.rankRow}>
                  <Text style={s.cardTitle}>{e.trigger}</Text>
                  <Text style={s.muted}>
                    {new Date(e.at).toLocaleString("cs-CZ", {
                      day: "numeric",
                      month: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
          </View>
          <HoldReset reset={reset} />
        </>
      )}
    </>
  );
}
const Placeholder = ({
  title,
  label,
  text,
  items,
}: {
  title: string;
  label: string;
  text: string;
  items: string[];
}) => (
  <Screen>
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentContainerStyle={s.content}
    >
      <Text style={[s.eyebrow, { color: purple }]}>{label}</Text>
      <Text style={s.heading}>{title}.</Text>
      <Text style={s.body}>{text}</Text>
      {items.map((item, i) => (
        <View key={item} style={s.panel}>
          <Text style={s.muted}>0{i + 1} / PŘIPRAVUJEME</Text>
          <Text style={s.sectionTitle}>{item}</Text>
        </View>
      ))}
      <Text style={s.muted}>Tato sekce zatím nepřidává body ani ranky.</Text>
    </ScrollView>
  </Screen>
);

export default function App() {
  const [data, setData] = useState<Data>({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [setup, setSetup] = useState<ProgramId | null>(null);
  const [sos, setSos] = useState<ProgramId | null>(null);
  const [activeProgram, setActiveProgram] = useState<ProgramId>("porn");
  const [editing, setEditing] = useState<ProgramId | null>(null);
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    AsyncStorage.getItem(STORAGE)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            ids.some(
              (id) =>
                parsed[id] &&
                (typeof parsed[id].startedAt !== "number" ||
                  !parsed[id].days ||
                  !Array.isArray(parsed[id].history)),
            )
          )
            throw new Error("Invalid data");
          setData(parsed);
        }
        setReady(true);
      })
      .catch(() => setLoadError(true));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const raw = JSON.stringify(data);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(STORAGE, raw))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));
  }, [data, ready]);
  useEffect(() => {
    if (!ready) return;
    setData((prev) => {
      let changed = false;
      const next = { ...prev };
      ids.forEach((id) => {
        const p = next[id];
        if (p) {
          const rank = rankOf(id, p, now);
          if (rank > p.prime) {
            changed = true;
            next[id] = { ...p, prime: rank };
          }
        }
      });
      return changed ? next : prev;
    });
  }, [now, ready]);
  const update = (id: ProgramId, p: Program) =>
    setData((prev) => ({ ...prev, [id]: p }));
  const Quit = () => (
    <Screen>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>QUITTER</Text>
          <Text style={s.heading}>Quit.</Text>
        </View>
        <Text style={s.headerNote}>{"ZÍSKEJ ZPĚT\nKONTROLU."}</Text>
      </View>
      <View style={s.tabs}>
        {ids.map((id, i) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeProgram === id }}
            aria-selected={activeProgram === id}
            style={[
              s.programTab,
              {
                borderBottomColor:
                  activeProgram === id ? definitions[id].color : "transparent",
              },
            ]}
            onPress={() => {
              setActiveProgram(id);
              pager.current?.scrollTo({ x: i * width, animated: true });
            }}
          >
            <Text
              style={[
                s.smallTab,
                {
                  color: activeProgram === id ? definitions[id].color : "#888",
                },
              ]}
            >
              {definitions[id].title}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ref={pager}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={(e) =>
          setActiveProgram(
            ids[
              Math.max(
                0,
                Math.min(2, Math.round(e.nativeEvent.contentOffset.x / width)),
              )
            ],
          )
        }
        showsHorizontalScrollIndicator={false}
      >
        {ids.map((id) => {
          const d = definitions[id];
          const p = data[id];
          return (
            <ScrollView
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              key={id}
              style={{ width }}
              contentContainerStyle={s.content}
            >
              <Text style={[s.eyebrow, { color: d.color }]}>{d.label}</Text>
              <Text style={s.sectionTitle}>{d.title}</Text>
              {p ? (
                <Dashboard
                  id={id}
                  p={p}
                  now={now}
                  update={(p) => update(id, p)}
                  edit={() => setEditing(id)}
                  sos={() => {
                    setSos(id);
                  }}
                />
              ) : (
                <>
                  <ProgramIntro id={id} />
                  <Text style={s.body}>{programContent[id].detail}</Text>
                  <View style={s.rankRow}>
                    <RankBadge value={0} />
                    <Text style={s.muted}>Tady začíná tvoje série.</Text>
                  </View>
                  <Button
                    title="AKTIVOVAT PROGRAM"
                    color={d.color}
                    onPress={() => setSetup(id)}
                  />
                </>
              )}
            </ScrollView>
          );
        })}
      </ScrollView>
    </Screen>
  );
  const Me = () => (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={s.content}
      >
        <Text style={[s.eyebrow, { color: purple }]}>TVŮJ OSOBNÍ PROFIL</Text>
        <Text style={s.heading}>Me.</Text>
        <View style={[s.profile, { borderColor: purple }]}>
          <RankEmblem value={0} size={110} />
          <Text style={s.eyebrow}>CURRENT RANK</Text>
          <Text style={s.big}>Copper</Text>
          <Text style={{ color: purple }}>PRIME · COPPER</Text>
        </View>
        <Text style={s.body}>
          Celkový rank čeká na společná pravidla pro Quit, Build a Mind. Zatím
          zobrazujeme startovní Copper, ne vypočtené skóre.
        </Text>
        <Text style={s.sectionTitle}>Tvoje disciplíny</Text>
        {ids.map((id) => (
          <View key={id} style={s.panel}>
            <Text style={s.cardTitle}>{definitions[id].title}</Text>
            {data[id] ? (
              <>
                <RankBadge value={rankOf(id, data[id]!, now)} />
                <Text style={s.muted}>
                  PRIME ·{" "}
                  {ranks[Math.max(data[id]!.prime, rankOf(id, data[id]!, now))]}
                </Text>
              </>
            ) : (
              <Text style={s.muted}>Program zatím není aktivní</Text>
            )}
          </View>
        ))}
        <Text style={s.muted}>
          Data jsou uložená pouze na tomto zařízení. Odinstalování nebo vymazání
          dat je může odstranit.
        </Text>
      </ScrollView>
    </Screen>
  );
  if (!ready)
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Screen>
          <View style={s.center}>
            {loadError ? (
              <>
                <Text style={s.cardTitle}>Data se nepodařilo načíst.</Text>
                <Text style={s.body}>
                  Nechali jsme je zachovaná. Zkus aplikaci znovu otevřít.
                </Text>
              </>
            ) : (
              <ActivityIndicator color={purple} />
            )}
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: "#050505",
            card: "#111111",
            primary: purple,
            border: "#242424",
          },
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: "#c5fa67",
            tabBarInactiveTintColor: "#777",
            tabBarStyle: {
              backgroundColor: "#111",
              borderTopColor: "#242424",
              paddingTop: 8,
            },
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 22 }}>
                {
                  (
                    {
                      Quit: "◎",
                      Build: "↗",
                      Mind: "◉",
                      Business: "▤",
                      Me: "◇",
                    } as Record<string, string>
                  )[route.name]
                }
              </Text>
            ),
          })}
        >
          <Tab.Screen name="Quit">{Quit}</Tab.Screen>
          <Tab.Screen name="Build">
            {() => (
              <Placeholder
                title="Build"
                label="POSTAV SILNÝ ZÁKLAD"
                text="Pohyb, regenerace a péče o tělo. Tvůj plán, tvoje pravidelnost."
                items={[
                  "Trénink a pohyb",
                  "Spánek a regenerace",
                  "Péče o tělo",
                ]}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Mind">
            {() => (
              <Placeholder
                title="Mind"
                label="PROSTOR PRO TVOU HLAVU"
                text="Učení, soustředění a sebereflexe. Malé kroky, dlouhodobý rozvoj."
                items={["Čtení a vzdělávání", "Soustředění", "Sebereflexe"]}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Business">
            {() => (
              <Placeholder
                title="Business"
                label="OD NÁPADU K AKCI"
                text="Prostor pro vlastní projekty a budoucí spolupracovníky. Samostatně od hlavního ranku."
                items={["Moje projekty", "Síť spolupracovníků", "AI pomocník"]}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Me">{Me}</Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      {saveError && (
        <View style={s.error}>
          <Text style={{ color: "#fff" }}>
            Změny se nepodařilo uložit. Nezavírej aplikaci.
          </Text>
          <Button
            secondary
            title="ZKUSIT ULOŽIT"
            onPress={() => setData((prev) => ({ ...prev }))}
          />
        </View>
      )}
      <Modal
        visible={setup !== null}
        animationType="slide"
        onRequestClose={() => setSetup(null)}
      >
        {setup && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <Setup
              id={setup}
              close={() => setSetup(null)}
              save={(p) => {
                update(setup, p);
                setSetup(null);
              }}
            />
          </SafeAreaProvider>
        )}
      </Modal>
      <Modal
        visible={sos !== null}
        animationType="slide"
        onRequestClose={() => setSos(null)}
      >
        {sos && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <SosProtocol
              id={sos}
              reasons={data[sos]?.reasons ?? ""}
              close={() => setSos(null)}
              complete={(trigger, elapsed) => {
                const p = data[sos];
                if (p)
                  update(sos, {
                    ...p,
                    triggers: [
                      ...(p.triggers ?? []),
                      { at: Date.now(), trigger: trigger || "Neuvedeno", durationSeconds: elapsed },
                    ],
                  });
                setSos(null);
              }}
            />
          </SafeAreaProvider>
        )}
      </Modal>
      <Modal
        visible={editing !== null}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing && data[editing] && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <ManifestEditor
              key={editing}
              p={data[editing]!}
              close={() => setEditing(null)}
              save={(reasons) => {
                update(editing, { ...data[editing]!, reasons });
                setEditing(null);
              }}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </SafeAreaProvider>
  );
}
function ManifestEditor({
  p,
  close,
  save,
}: {
  p: Program;
  close: () => void;
  save: (reasons: string) => void;
}) {
  const [reasons, setReasons] = useState(p.reasons);
  return (
    <Screen modal>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={s.modalContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.eyebrow, { color: purple }]}>OSOBNÍ MANIFEST</Text>
        <Text style={s.heading}>Tvoje proč.</Text>
        <Text style={s.body}>
          Důvody se mohou vyvíjet. Úprava nezmění tvoji sérii ani původní
          podpis.
        </Text>
        <TextInput
          accessibilityLabel="Moje důvody"
          multiline
          value={reasons}
          onChangeText={setReasons}
          style={[s.input, { minHeight: 180 }]}
        />
        <Button
          title="ULOŽIT DŮVODY"
          color={purple}
          onPress={() =>
            reasons.trim()
              ? save(reasons.trim())
              : Alert.alert("Doplň důvody", "Napiš alespoň jeden důvod.")
          }
        />
        <Button secondary title="ZRUŠIT" onPress={close} />
      </ScrollView>
    </Screen>
  );
}
const s = StyleSheet.create({
  programTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  stepTrack: { flexDirection: "row", gap: 6 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2 },
  reasonChip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#141414",
  },
  progressPanel: {
    gap: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#111",
  },
  track: {
    height: 4,
    backgroundColor: "#303030",
    borderRadius: 2,
    overflow: "hidden",
  },
  progress: { height: 4, borderRadius: 2 },
  screen: { flex: 1, backgroundColor: "#050505" },
  center: { justifyContent: "center", alignItems: "center", padding: 24 },
  content: { padding: 22, gap: 18, paddingBottom: 40 },
  modalContent: { padding: 24, gap: 24, paddingBottom: 50 },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: "#ccc", fontSize: 11, letterSpacing: 4, fontWeight: "900" },
  heading: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  headerNote: { color: "#777", fontSize: 10, letterSpacing: 2, lineHeight: 17 },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: "#242424",
    paddingVertical: 0,
  },
  smallTab: { fontSize: 12, fontWeight: "700" },
  eyebrow: { color: "#aaa", fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  sectionTitle: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  body: { color: "#bbb", fontSize: 15, lineHeight: 24 },
  muted: { color: "#888", fontSize: 12, lineHeight: 19 },
  panel: {
    backgroundColor: "#1a1a1a",
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#292929",
  },
  cardTitle: { color: "#eee", fontSize: 14, fontWeight: "700" },
  button: {
    borderRadius: 12,
    paddingVertical: 17,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  buttonText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 16,
    borderRadius: 12,
    borderColor: "#444",
    borderWidth: 1,
    fontSize: 16,
    textAlignVertical: "top",
  },
  signature: {
    height: 134,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#777",
    borderRadius: 12,
    backgroundColor: "#161616",
  },
  rankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 9,
    alignSelf: "flex-start",
  },
  ring: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#101010",
    marginVertical: 12,
  },
  timer: { color: "#fff", fontSize: 66, fontWeight: "800" },
  clock: {
    color: "#ddd",
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    letterSpacing: 3,
  },
  big: { color: "#fff", fontSize: 34, fontWeight: "800" },
  sos: {
    backgroundColor: "#321216",
    borderColor: "#ff5964",
    borderWidth: 1,
    borderRadius: 16,
    padding: 23,
  },
  sosTitle: {
    color: "#ff5964",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  matrix: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  cell: { width: 22, height: 22, borderRadius: 4 },
  reset: { alignItems: "center", paddingVertical: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { padding: 12, borderColor: "#444", borderWidth: 1, borderRadius: 10 },
  emptySymbol: {
    width: 155,
    height: 155,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
  },
  profile: {
    alignItems: "center",
    padding: 28,
    gap: 14,
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: "#16111e",
  },
  error: { backgroundColor: "#681b23", padding: 12, gap: 8 },
});
