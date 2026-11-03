import { applyProgramChange } from "./src/model";
import { isAttention } from "./src/scroll/attention";
import { ProgramPicker } from "./src/ProgramPicker";
import { MeScreen } from "./src/profile/MeScreen";
import { profileSummary } from "./src/profile/model";
import { useProfile } from "./src/profile/useProfile";
import { BackupPanel } from "./src/profile/BackupPanel";
import { useBuild } from "./src/build/useBuild";
import { useMind } from "./src/mind/useMind";
import { useBusiness } from "./src/business/useBusiness";
import {
  readBackup,
  restoreBackup as applyBackup,
  recoverBackup,
} from "./src/profile/backupStorage";
import { BusinessScreen } from "./src/business/BusinessScreen";
import { MindScreen } from "./src/mind/MindScreen";
import { BuildScreen } from "./src/build/BuildScreen";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Platform,
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
  rankOf,
  migrateRanks,
  dayKey,
} from "./src/model";

import { Screen, rankColors } from "./src/ui";

import { PremiumTabs, surface, ink, border, palette } from "./src/design";

import { programContent } from "./src/programContent";
import { SosProtocol } from "./src/SosProtocol";

import { DailyDashboard, DailyWelcome } from "./src/daily/Dashboard";

import { PornDashboard, PornWelcome } from "./src/porn/Dashboard";

import { foodPresets, type FoodPillar } from "./src/food/model";

const Tab = createBottomTabNavigator();
const ids: ProgramId[] = ["porn", "scroll", "food"];
const STORAGE = "quitter.v1";
const purple = "#a4a4a4";
function Button({
  title,
  onPress,
  color = "#e4e4e4",
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
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? "#ffffff08" : color,
          borderWidth: secondary ? 1 : 0,
          borderColor: "#ffffff14",
        },
        pressed && { opacity: 0.75 },
      ]}
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
  const d = { ...definitions[id], color: rankColors[0] };
  const [step, setStep] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const setupScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const moveStep = (next: number) => {
    setStep(next);
    setDrawing(false);
    setupScroll.current?.scrollTo({ y: 0, animated: false });
  };
  const [reasons, setReasons] = useState("");
  const [target, setTarget] = useState(d.target);
  const [foodSelection, setFoodSelection] = useState<string[]>([
    foodPresets[0].label,
  ]);
  const [customFood, setCustomFood] = useState("");
  const [limit, setLimit] = useState("45");
  const [signature, setSignature] = useState("");
  const valid =
    reasons.trim().length > 0 &&
    (id === "food" ? foodSelection.length > 0 : target.trim().length > 0) &&
    (id !== "scroll" || (Number(limit) >= 1 && Number(limit) <= 1440));
  return (
    <Screen modal accent={d.color}>
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
              {id === "scroll"
                ? "SLEDOVANÉ SOCIÁLNÍ APLIKACE"
                : id === "food"
                  ? "MOJE PILÍŘE"
                  : "MOJE PRAVIDLO"}
            </Text>
            {id === "food" ? (
              <>
                <Text style={s.muted}>
                  Vyber 1 až 6 pilířů. Všechny přispívají do jednoho ranku.
                  Během programu výběr zatím zůstává stejný.
                </Text>
                {foodPresets.map((preset) => (
                  <Pressable
                    key={preset.label}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: foodSelection.includes(preset.label),
                    }}
                    onPress={() =>
                      setFoodSelection((previous) =>
                        previous.includes(preset.label)
                          ? previous.filter((v) => v !== preset.label)
                          : previous.length < 6
                            ? [...previous, preset.label]
                            : previous,
                      )
                    }
                    style={s.reasonChip}
                  >
                    <Text style={s.body}>
                      {foodSelection.includes(preset.label) ? "✓ " : "○ "}
                      {preset.label}
                    </Text>
                    <Text style={s.muted}>
                      {preset.mode === "periods"
                        ? "Ráno · den · večer"
                        : preset.mode === "meals"
                          ? "Snídaně · oběd · večeře"
                          : "Celý den"}
                    </Text>
                  </Pressable>
                ))}
                {foodSelection
                  .filter(
                    (label) => !foodPresets.some((v) => v.label === label),
                  )
                  .map((label) => (
                    <Pressable
                      key={label}
                      onPress={() =>
                        setFoodSelection((previous) =>
                          previous.filter((v) => v !== label),
                        )
                      }
                      style={s.reasonChip}
                    >
                      <Text style={s.body}>✓ {label} · celý den</Text>
                    </Pressable>
                  ))}
                <TextInput
                  accessibilityLabel="Vlastní pilíř před začátkem"
                  value={customFood}
                  onChangeText={setCustomFood}
                  maxLength={80}
                  placeholder="Vlastní celodenní pravidlo"
                  placeholderTextColor="#7d7d7d"
                  style={s.input}
                />
                <Button
                  title="PŘIDAT DO VÝBĚRU"
                  color={d.color}
                  onPress={() => {
                    const label = customFood.trim();
                    if (
                      label &&
                      foodSelection.length < 6 &&
                      !foodSelection.some(
                        (v) =>
                          v.toLocaleLowerCase() === label.toLocaleLowerCase(),
                      )
                    ) {
                      setFoodSelection((previous) => [...previous, label]);
                      setCustomFood("");
                    }
                  }}
                />
              </>
            ) : (
              <TextInput
                value={target}
                onChangeText={setTarget}
                editable={false}
                style={s.input}
              />
            )}
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
                  Rank vychází z měření systému, ne z ručního potvrzení. V Expo
                  Go a na iPhonu zatím není měření dostupné. Denní limit je
                  osobní cíl.
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
              <Text style={s.cardTitle}>
                {id === "food" ? foodSelection.join("\n") : target}
              </Text>
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
                      target:
                        id === "food"
                          ? foodSelection.join(" · ")
                          : target.trim(),
                      ...(id === "food"
                        ? {
                            foodPillars: foodSelection.map(
                              (label, index): FoodPillar => ({
                                id: `food-${index}`,
                                label,
                                startDay: dayKey(new Date()),
                                mode:
                                  foodPresets.find((v) => v.label === label)
                                    ?.mode ?? "day",
                              }),
                            ),
                          }
                        : {}),
                      limit: Number(limit),
                      signature,
                      signedAt: Date.now(),
                      triggers: [],
                      prime: 0,
                      rankVersion: 2,
                      ...(id === "scroll"
                        ? { screenTimeVersion: 1 as const }
                        : {}),
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
export default function App() {
  const [recovered, setRecovered] = useState(false);
  const [boot, setBoot] = useState<"loading" | "ready" | "error">("loading"),
    [generation, setGeneration] = useState(0),
    [restored, setRestored] = useState(false);
  async function recover() {
    setBoot("loading");
    try {
      await recoverBackup(AsyncStorage);
      setBoot("ready");
    } catch {
      setBoot("error");
    }
  }
  useEffect(() => {
    void recover();
  }, []);
  if (boot !== "ready")
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Screen accent={palette.Me}>
          <View style={[s.center, { flex: 1, gap: 18 }]}>
            {boot === "loading" ? (
              <ActivityIndicator color={palette.Me} />
            ) : (
              <>
                <Text style={s.sectionTitle}>Obnova čeká na dokončení.</Text>
                <Text style={s.body}>
                  Před načtením aplikace potřebujeme bezpečně dokončit
                  přerušenou obnovu dat.
                </Text>
                <Button
                  title="Zkusit dokončení obnovy"
                  onPress={() => void recover()}
                />
              </>
            )}
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  return (
    <AppSession
      key={generation}
      restored={restored}
      recovered={recovered}
      restart={(success = true) => {
        setRestored(success);
        setRecovered(!success);
        setGeneration((n) => n + 1);
      }}
    />
  );
}
function AppSession({
  restart,
  restored,
  recovered,
}: {
  restart: (success?: boolean) => void;
  restored: boolean;
  recovered: boolean;
}) {
  const [bootBackup, setBootBackup] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false),
    [recoveryError, setRecoveryError] = useState(false);
  const operationLock = useRef(false),
    quitWriteFailed = useRef(false);
  const buildStore = useBuild(transferBusy, operationLock);
  const mindStore = useMind(transferBusy, operationLock);
  const businessStore = useBusiness(transferBusy, operationLock);
  const [persistedQuit, setPersistedQuit] = useState<Data | null>(null);
  const [buildAccent, setBuildAccent] = useState(rankColors[0]);
  const [mindAccent, setMindAccent] = useState(rankColors[0]);
  const [data, setData] = useState<Data>({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [setup, setSetup] = useState<ProgramId | null>(null);
  const [sos, setSos] = useState<ProgramId | null>(null);
  const [sosPillar, setSosPillar] = useState<string | undefined>();
  const [activeProgram, setActiveProgram] = useState<ProgramId>("porn");
  const { width } = useWindowDimensions();
  const pager = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    AsyncStorage.getItem(STORAGE)
      .then((raw) => {
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed) ||
            ids.some(
              (id) =>
                parsed[id] &&
                (typeof parsed[id].startedAt !== "number" ||
                  !parsed[id].days ||
                  !Array.isArray(parsed[id].history) ||
                  (parsed[id].attention !== undefined &&
                    !isAttention(parsed[id].attention))),
            )
          )
            throw new Error("Invalid data");
          setData(migrateRanks(parsed));
        }
        setReady(true);
      })
      .catch(() => setLoadError(true));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready || operationLock.current) return;
    const raw = JSON.stringify(data);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(STORAGE, raw))
      .then(() => {
        quitWriteFailed.current = false;
        setPersistedQuit(data);
        setSaveError(false);
      })
      .catch(() => {
        quitWriteFailed.current = true;
        setSaveError(true);
      });
  }, [data, ready]);
  useEffect(() => {
    if (!ready || operationLock.current) return;
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
  const update = (
    id: ProgramId,
    value: Program | ((current: Program) => Program),
  ) => {
    if (!operationLock.current)
      setData((prev) =>
        operationLock.current ? prev : applyProgramChange(prev, id, value),
      );
  };
  const quitAccent = palette.Quit;
  const Quit = () => (
    <Screen accent={quitAccent}>
      <View style={[s.header, { paddingTop: 8, paddingBottom: 8 }]}>
        <View>
          <Text style={[s.brand, { color: palette.Quit }]}>Q U I T T E R</Text>
          <Text style={[s.heading, { fontSize: 42, letterSpacing: -1.8 }]}>
            Quit.
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              backgroundColor: quitAccent,
            }}
          />
          <Text style={s.headerNote}>TVŮJ PROSTOR</Text>
        </View>
      </View>
      <ProgramPicker
        selected={activeProgram}
        data={data}
        onChange={(id) => {
          setActiveProgram(id);
          pager.current?.scrollTo({
            x: ids.indexOf(id) * width,
            animated: true,
          });
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ref={pager}
        onLayout={() =>
          pager.current?.scrollTo({
            x: ids.indexOf(activeProgram) * width,
            animated: false,
          })
        }
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
          const p = data[id];
          return (
            <ScrollView
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              key={id}
              accessibilityElementsHidden={activeProgram !== id}
              importantForAccessibility={
                activeProgram === id ? "auto" : "no-hide-descendants"
              }
              aria-hidden={activeProgram !== id}
              style={{ width }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[s.content, { padding: 20, gap: 16 }]}
            >
              {id === "porn" ? (
                p ? (
                  <PornDashboard
                    p={p}
                    now={now}
                    update={(p) => update(id, p)}
                    sos={() => {
                      setSosPillar(undefined);
                      setSos(id);
                    }}
                  />
                ) : (
                  <PornWelcome activate={() => setSetup(id)} />
                )
              ) : p ? (
                <DailyDashboard
                  id={id}
                  p={p}
                  now={now}
                  update={(p) => update(id, p)}
                  saveError={saveError}
                  retrySave={() => setData((prev) => ({ ...prev }))}
                  sos={(pillarId?: string) => {
                    setSosPillar(
                      typeof pillarId === "string" ? pillarId : undefined,
                    );
                    setSos(id);
                  }}
                />
              ) : (
                <DailyWelcome id={id} activate={() => setSetup(id)} />
              )}
            </ScrollView>
          );
        })}
      </ScrollView>
    </Screen>
  );
  const combined = useMemo(
    () =>
      profileSummary(
        data,
        buildStore.loaded ? buildStore.data : null,
        mindStore.loaded ? mindStore.data : null,
        now,
      ),
    [
      data,
      buildStore.data,
      buildStore.loaded,
      mindStore.data,
      mindStore.loaded,
      now,
    ],
  );
  const settled =
    ready &&
    data === persistedQuit &&
    buildStore.loaded &&
    buildStore.persisted === buildStore.data &&
    mindStore.loaded &&
    mindStore.persisted === mindStore.data;
  const profile = useProfile(
    ready ? combined.score : null,
    settled,
    transferBusy,
    now,
    operationLock,
  );
  const backupReady =
    ready &&
    settled &&
    !saveError &&
    profile.loaded &&
    !profile.saving &&
    !profile.saveError &&
    businessStore.loaded &&
    !businessStore.saving &&
    !businessStore.saveError &&
    !buildStore.saveError &&
    !mindStore.saveError;
  async function drainStores() {
    const result = await Promise.all([
      queue.current.then(() => !quitWriteFailed.current),
      buildStore.flush(),
      mindStore.flush(),
      businessStore.flush(),
      profile.flush(),
    ]);
    return result.every((ok) => ok);
  }
  async function exportData() {
    if (operationLock.current || !backupReady)
      throw new Error("Nejprve dokonči načtení a uložení všech sekcí.");
    operationLock.current = true;
    setTransferBusy(true);
    try {
      if (!(await drainStores()))
        throw new Error(
          "Některé změny se nepodařilo uložit. Nejdřív zopakuj uložení a potom vytvoř zálohu.",
        );
      return await readBackup(AsyncStorage);
    } finally {
      operationLock.current = false;
      setTransferBusy(false);
    }
  }
  async function importData(raw: string) {
    if (operationLock.current)
      throw new Error("Jiná operace s daty právě běží.");
    operationLock.current = true;
    setTransferBusy(true);
    try {
      await drainStores();
      await applyBackup(AsyncStorage, raw);
      restart();
    } catch (error) {
      try {
        await recoverBackup(AsyncStorage);
      } catch {
        setRecoveryError(true);
        throw error;
      }
      if (
        error &&
        typeof error === "object" &&
        "recoveryRequired" in error &&
        error.recoveryRequired
      ) {
        restart(false);
        throw error;
      }
      operationLock.current = false;
      setTransferBusy(false);
      throw error;
    }
  }
  if (recoveryError)
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Screen accent={palette.Me}>
          <View style={[s.center, { flex: 1, gap: 18 }]}>
            <Text style={s.sectionTitle}>Původní data čekají na obnovení.</Text>
            <Text style={s.body}>
              Zápis se nepodařil dokončit. Ostatní změny jsou pozastavené, dokud
              se původní data nevrátí.
            </Text>
            <Button
              title="Zkusit obnovit původní data"
              onPress={() =>
                void recoverBackup(AsyncStorage)
                  .then(() => restart(false))
                  .catch(() => setRecoveryError(true))
              }
            />
          </View>
        </Screen>
      </SafeAreaProvider>
    );
  if (!ready)
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Screen accent={palette.Me}>
          <ScrollView
            contentContainerStyle={[s.center, { flexGrow: 1, gap: 20 }]}
          >
            {loadError ? (
              <>
                {bootBackup ? (
                  <>
                    <Button
                      secondary
                      title="Zpět k přehledu načtení"
                      onPress={() => {
                        if (!transferBusy) setBootBackup(false);
                      }}
                    />
                    <BackupPanel
                      createBackup={exportData}
                      restoreBackup={importData}
                      ready={false}
                    />
                  </>
                ) : (
                  <>
                    <Text style={s.sectionTitle}>
                      Data se nepodařilo načíst.
                    </Text>
                    <Text style={s.body}>
                      Původní data zůstala zachovaná. Můžeš znovu otevřít
                      aplikaci nebo obnovit ověřenou zálohu.
                    </Text>
                    <Button
                      title="Obnovit data ze zálohy"
                      onPress={() => setBootBackup(true)}
                    />
                  </>
                )}
              </>
            ) : (
              <ActivityIndicator color={palette.Me} />
            )}
          </ScrollView>
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
            background: ink,
            card: surface,
            primary: purple,
            border,
          },
        }}
      >
        <Tab.Navigator
          tabBar={(props) => (
            <PremiumTabs
              {...props}
              accents={{
                Quit: quitAccent,
                Build: buildAccent,
                Mind: mindAccent,
                Business: palette.Business,
                Me: palette.Me,
              }}
            />
          )}
          initialRouteName={restored || recovered ? "Me" : "Quit"}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Quit">{Quit}</Tab.Screen>
          <Tab.Screen name="Build">
            {() => <BuildScreen store={buildStore} onAccent={setBuildAccent} />}
          </Tab.Screen>
          <Tab.Screen name="Mind">
            {() => <MindScreen store={mindStore} onAccent={setMindAccent} />}
          </Tab.Screen>
          <Tab.Screen name="Business">
            {() => <BusinessScreen store={businessStore} />}
          </Tab.Screen>
          <Tab.Screen name="Me">
            {({ navigation }) => (
              <MeScreen
                summary={combined}
                profile={profile}
                build={buildStore}
                mind={mindStore}
                quitPending={data !== persistedQuit || saveError}
                quit={ready ? data : null}
                business={businessStore}
                createBackup={exportData}
                restoreBackup={importData}
                backupReady={backupReady}
                transferBusy={transferBusy}
                restored={restored}
                recovered={recovered}
                open={(section, program) => {
                  if (section === "Quit" && program) {
                    setActiveProgram(program);
                    navigation.navigate("Quit");
                    requestAnimationFrame(() =>
                      pager.current?.scrollTo({
                        x: ids.indexOf(program) * width,
                        animated: false,
                      }),
                    );
                  } else navigation.navigate(section);
                }}
              />
            )}
          </Tab.Screen>
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
        animationType={Platform.OS === "web" ? "fade" : "slide"}
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
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setSos(null)}
      >
        {sos && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <SosProtocol
              id={sos}
              program={data[sos]}
              pillarId={sosPillar}
              rank={data[sos] ? rankOf(sos, data[sos]!, now) : 0}
              reasons={data[sos]?.reasons ?? ""}
              close={() => setSos(null)}
              complete={(trigger, elapsed, pauseStarted, outcome, pillarId) => {
                const at = Date.now();
                update(sos, (p) => ({
                  ...p,
                  triggers: [
                    ...(p.triggers ?? []),
                    {
                      at,
                      trigger: trigger || "Neuvedeno",
                      durationSeconds: elapsed,
                      pauseStarted,
                      outcome,
                      pillarId,
                    },
                  ],
                }));
                setSos(null);
              }}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  programTab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderRadius: 0,
  },
  stepTrack: { flexDirection: "row", gap: 6 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2 },
  reasonChip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff16",
    backgroundColor: surface,
  },
  progressPanel: {
    gap: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: surface,
  },
  track: {
    height: 4,
    backgroundColor: "#303030",
    borderRadius: 2,
    overflow: "hidden",
  },
  progress: { height: 4, borderRadius: 2 },
  screen: { flex: 1, backgroundColor: ink },
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
  brand: { color: "#c2c2c2", fontSize: 9, letterSpacing: 3, fontWeight: "700" },
  heading: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1.5,
  },
  headerNote: {
    color: "#a0a0a0",
    fontSize: 8,
    letterSpacing: 1.3,
    lineHeight: 16,
  },
  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 0,
    marginHorizontal: 22,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 0,
    gap: 8,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  smallTab: { fontSize: 12, fontWeight: "700" },
  eyebrow: { color: "#aaa", fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  sectionTitle: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  body: { color: "#c8c8c8", fontSize: 15, lineHeight: 24 },
  muted: { color: "#a0a0a0", fontSize: 12, lineHeight: 19 },
  panel: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: border,
  },
  cardTitle: { color: "#eee", fontSize: 14, fontWeight: "700" },
  button: {
    borderRadius: 28,
    minHeight: 52,
    paddingVertical: 17,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  buttonText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  input: {
    backgroundColor: "#ffffff04",
    color: "#fff",
    padding: 16,
    borderRadius: 10,
    borderColor: "#ffffff18",
    borderBottomWidth: 1,
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
  big: { color: "#f4f6fa", fontSize: 32, fontWeight: "600", letterSpacing: -1 },
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
  chip: {
    padding: 12,
    borderColor: "#ffffff18",
    borderWidth: 1,
    borderRadius: 10,
  },
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
    backgroundColor: surface,
  },
  error: { backgroundColor: "#681b23", padding: 12, gap: 8 },
});
