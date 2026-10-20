import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { Screen, rankColors, RankEmblem } from "../ui";
import { RankStage, RankStageArt, AppIcon, surface, border } from "../design";
import { definitions, ranks, type ProgramId } from "../model";
import { buildPoints } from "../build/ranking";
import { mindXP } from "../mind/ranking";
import { rankForScore, type profileSummary, type Profile } from "./model";
import type { useBuild } from "../build/useBuild";
import type { useMind } from "../mind/useMind";
import type { useProfile } from "./useProfile";
type Props = {
  summary: ReturnType<typeof profileSummary>;
  profile: ReturnType<typeof useProfile>;
  build: ReturnType<typeof useBuild>;
  mind: ReturnType<typeof useMind>;
  quitPending: boolean;
  open: (
    section: "Quit" | "Build" | "Mind" | "Business",
    program?: ProgramId,
  ) => void;
};
const number = (n: number) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
function Button({
  children,
  onPress,
  quiet = false,
  disabled = false,
  color,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: quiet ? "#ffffff05" : color,
          borderColor: quiet ? "#ffffff14" : "transparent",
        },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={{
          color: quiet ? color : "#0d121b",
          fontSize: 14,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function MeScreen({
  summary,
  profile,
  build,
  mind,
  quitPending,
  open,
}: Props) {
  const modalScroll = useRef<ScrollView>(null);
  const previewY = useRef(0);
  const [route, setRoute] = useState<"ranks" | "edit" | "data" | null>(null),
    [preview, setPreview] = useState(0),
    [dirty, setDirty] = useState(false),
    [confirm, setConfirm] = useState(false);
  const rank = summary.rank,
    color = rank === null ? "#c5d3ec" : rankColors[rank];
  const stats = useMemo(
    () => ({
      workouts: build.loaded
        ? build.data.activities.filter((a) => !!build.data.logs[a.id]).length
        : null,
      habits: mind.loaded
        ? Object.values(mind.data.checks).reduce(
            (n, d) => n + Object.keys(d).length,
            0,
          )
        : null,
      badges:
        build.loaded && mind.loaded
          ? Object.keys(build.data.earned).length +
            Object.keys(mind.data.earned).length
          : null,
    }),
    [build.loaded, build.data, mind.loaded, mind.data],
  );
  const pending = quitPending || build.saving || mind.saving || profile.saving;
  const hasSaveError =
    !!build.saveError || !!mind.saveError || !!profile.saveError;
  function close() {
    if (dirty) setConfirm(true);
    else setRoute(null);
  }
  function show(next: "ranks" | "edit" | "data") {
    setDirty(false);
    setConfirm(false);
    setPreview(rank ?? 0);
    setRoute(next);
  }
  const alerts = (
    <>
      {build.loadError && (
        <ErrorCard
          message={build.loadError}
          retry={build.retryLoad}
          color={color}
        />
      )}
      {mind.loadError && (
        <ErrorCard
          message={mind.loadError}
          retry={mind.retryLoad}
          color={color}
        />
      )}
      {profile.loadError && (
        <ErrorCard
          message={profile.loadError}
          retry={profile.retryLoad}
          color={color}
        />
      )}
      {build.saveError && (
        <ErrorCard
          message={build.saveError}
          retry={build.retrySave}
          color={color}
        />
      )}
      {mind.saveError && (
        <ErrorCard
          message={mind.saveError}
          retry={mind.retrySave}
          color={color}
        />
      )}
      {profile.saveError && (
        <ErrorCard
          message={profile.saveError}
          retry={profile.retrySave}
          color={color}
        />
      )}
    </>
  );
  return (
    <Screen accent={color}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.between}>
          <View style={{ gap: 5, flex: 1 }}>
            <Text style={[s.label, { color }]}>TVŮJ OSOBNÍ PROFIL</Text>
            <Text style={s.title}>Me.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upravit můj profil"
            disabled={!profile.loaded}
            onPress={() => show("edit")}
            style={[s.iconButton, { borderColor: `${color}30` }]}
          >
            <AppIcon name="Me" color={color} size={26} />
          </Pressable>
        </View>
        {profile.loaded &&
          (!!profile.data.name || !!profile.data.intention) && (
            <View style={{ gap: 8 }}>
              {!!profile.data.name && (
                <Text style={s.h2}>{profile.data.name}</Text>
              )}
              {!!profile.data.intention && (
                <Text style={s.text}>{profile.data.intention}</Text>
              )}
            </View>
          )}
        {alerts}
        {rank !== null && summary.score !== null ? (
          <RankStage
            label="TVŮJ CELKOVÝ POSTUP"
            rank={rank}
            prime={profile.loaded ? profile.data.prime : null}
            color={color}
            value={number(Math.floor(summary.score * 1000) / 10)}
            unit="BODŮ PROFILU"
            progress={rank === 11 ? 1 : Math.max(0, summary.score - rank)}
            nextLabel={
              rank === 11
                ? "Nejvyšší rank. Pokračuj ve svém tempu."
                : `Do ${ranks[rank + 1]} zbývá ${number(Math.ceil((rank + 1 - summary.score) * 1000) / 10)} bodů`
            }
            accessibilityLabel="Detail celkového ranku"
            onPress={() => show("ranks")}
          />
        ) : (
          <View style={s.card}>
            {!build.loadError &&
            !mind.loadError &&
            !summary.programs.some((p) => p.state === "invalid") ? (
              <ActivityIndicator color={color} />
            ) : (
              <Text style={s.h2}>Čekáme na úplná data.</Text>
            )}
            <Text style={s.muted}>
              Celkový rank zobrazíme až po načtení všech tří oblastí.
            </Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => show("ranks")}
          style={[s.between, { minHeight: 44 }]}
        >
          <Text style={[s.muted, { flex: 1 }]}>
            Quit, Build a Mind mají stejnou váhu.
          </Text>
          <Text style={[s.link, { color }]}>Jak to funguje →</Text>
        </Pressable>
        {pending && !hasSaveError && (
          <Text accessibilityLiveRegion="polite" style={s.small}>
            Ukládáme změny a aktualizujeme tvůj postup…
          </Text>
        )}
        <View style={s.row}>
          {(
            [
              [stats.workouts, "Tréninky"],
              [stats.habits, "Aktivity Mind"],
              [stats.badges, "Odznaky"],
            ] as const
          ).map(([value, label]) => (
            <View
              key={label}
              style={[s.card, { flex: 1, padding: 12, gap: 7 }]}
            >
              <Text style={[s.metric, { color }]}>
                {value === null ? "—" : value}
              </Text>
              <Text style={s.small}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h2}>Tvoje disciplíny</Text>
        <View style={s.card}>
          <GroupHeader
            title="Quit"
            score={summary.quitScore}
            color={color}
            onPress={() => open("Quit")}
          />
          <Text style={s.small}>
            Třetina celkového skóre · průměr započtených programů
          </Text>
          {summary.programs.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`Otevřít ${definitions[p.id].title} z profilu`}
              onPress={() => open("Quit", p.id)}
              style={s.discipline}
            >
              {p.rank !== null ? (
                <RankEmblem value={p.rank} size={40} />
              ) : (
                <AppIcon name="Quit" color="#7d8ba0" size={30} />
              )}
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.h3}>{definitions[p.id].title}</Text>
                <Text style={s.small}>{p.detail}</Text>
                {p.rank !== null && (
                  <Text style={[s.small, { color: rankColors[p.rank] }]}>
                    {ranks[p.rank]}
                    {p.prime !== null ? ` · PRIME ${ranks[p.prime]}` : ""}
                  </Text>
                )}
                {p.state === "unmeasured" && (
                  <Text style={s.small}>Do průměru se zatím nezapočítává.</Text>
                )}
              </View>
              <Text style={[s.link, { color }]}>→</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.card}>
          <GroupHeader
            title="Build"
            score={summary.buildScore}
            color={color}
            onPress={() => open("Build")}
          />
          <Text style={s.muted}>
            {build.loaded
              ? `Body pohybu: ${number(buildPoints(build.data))} · Tréninky: ${stats.workouts}`
              : "Čekáme na načtení pohybových aktivit."}
          </Text>
          {build.loaded && summary.buildScore !== null && (
            <Text style={s.small}>
              PRIME ·{" "}
              {
                ranks[
                  Math.max(
                    rankForScore(summary.buildScore),
                    build.data.prime ?? 0,
                  )
                ]
              }
            </Text>
          )}
          <Button quiet color={color} onPress={() => open("Build")}>
            Otevřít Build →
          </Button>
        </View>
        <View style={s.card}>
          <GroupHeader
            title="Mind"
            score={summary.mindScore}
            color={color}
            onPress={() => open("Mind")}
          />
          <Text style={s.muted}>
            {mind.loaded
              ? `${number(mindXP(mind.data))} XP · Splněné aktivity: ${stats.habits}`
              : "Čekáme na načtení mentálních aktivit."}
          </Text>
          {mind.loaded && summary.mindScore !== null && (
            <Text style={s.small}>
              PRIME ·{" "}
              {
                ranks[
                  Math.max(
                    rankForScore(summary.mindScore),
                    mind.data.prime ?? 0,
                  )
                ]
              }
            </Text>
          )}
          <Button quiet color={color} onPress={() => open("Mind")}>
            Otevřít Mind →
          </Button>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => open("Business")}
          style={[s.card, s.between]}
        >
          <AppIcon name="Business" color="#c5d3ec" />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.h3}>Tvoje vlastní projekty</Text>
            <Text style={s.small}>
              Business má vlastní přehled a neovlivňuje celkový rank.
            </Text>
          </View>
          <Text style={s.link}>→</Text>
        </Pressable>
        <Button
          quiet
          color={color}
          disabled={!profile.loaded}
          onPress={() => show("edit")}
        >
          Upravit jméno a osobní záměr
        </Button>
        <Button quiet color={color} onPress={() => show("data")}>
          Moje data a ukládání
        </Button>
      </ScrollView>
      <Modal
        visible={route !== null}
        animationType="slide"
        onRequestClose={close}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal accent={color}>
            <View
              style={[s.header, s.between]}
              accessibilityElementsHidden={confirm}
              importantForAccessibility={
                confirm ? "no-hide-descendants" : "auto"
              }
              aria-hidden={confirm}
            >
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={[s.link, { color }]}>× Zavřít</Text>
              </Pressable>
              <Text style={[s.label, { color }]}>
                ME /{" "}
                {route === "ranks"
                  ? "POSTUP"
                  : route === "edit"
                    ? "PROFIL"
                    : "DATA"}
              </Text>
            </View>
            <ScrollView
              ref={modalScroll}
              contentContainerStyle={s.body}
              keyboardShouldPersistTaps="handled"
              accessibilityElementsHidden={confirm}
              importantForAccessibility={
                confirm ? "no-hide-descendants" : "auto"
              }
              aria-hidden={confirm}
            >
              {route === "edit" && profile.loaded && (
                <ProfileEditor
                  profile={profile.data}
                  color={color}
                  onDirty={setDirty}
                  save={(name, intention) => {
                    profile.edit(name, intention);
                    setDirty(false);
                    setRoute(null);
                  }}
                />
              )}
              {route === "ranks" && (
                <>
                  <Text style={s.h2}>Rosteš ve třech směrech.</Text>
                  <Text style={s.text}>
                    Quit, Build a Mind tvoří každá třetinu celkového skóre. U
                    každé oblasti počítáme dosažený rank i postup k dalšímu.
                    Jeden celý rank odpovídá 100 bodům profilu.
                  </Text>
                  <View style={s.card}>
                    {(
                      [
                        ["Quit", summary.quitScore],
                        ["Build", summary.buildScore],
                        ["Mind", summary.mindScore],
                      ] as const
                    ).map(([label, score]) => (
                      <View key={label} style={s.between}>
                        <Text style={s.h3}>{label}</Text>
                        <Text style={[s.text, { color }]}>
                          {score === null
                            ? "Čeká na data"
                            : `${number(Math.floor((score * 1000) / 3) / 10)} bodů do celku`}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.muted}>
                    Quit je průměr aktivních programů, které lze vyhodnotit.
                    Nepřipojené nebo neúplné měření Doomscrollingu se nezapočítá
                    jako nula. Bez aktivního programu začíná oblast Quit od
                    nuly. Aktivace dalšího programu může změnit aktuální průměr.
                  </Text>
                  <View style={s.card}>
                    <Text style={s.h3}>Current a PRIME</Text>
                    <Text style={s.muted}>
                      Current se přepočítává ze současných záznamů. PRIME si
                      pamatuje nejvyšší skutečně dosažený celkový rank od
                      zavedení tohoto profilu, i po opravách záznamů nebo resetu
                      série. Není průměrem historických PRIME jednotlivých
                      disciplín.
                    </Text>
                    <Text style={s.small}>
                      PRIME zaznamenáváme po úspěšném uložení zdrojových dat.
                      Samotný plán, náhled ranku ani úprava jména body
                      nepřidávají.
                    </Text>
                  </View>
                  <View
                    onLayout={(event) => {
                      previewY.current = event.nativeEvent.layout.y;
                    }}
                    style={[s.card, { alignItems: "center" }]}
                  >
                    <Text style={[s.label, { color: rankColors[preview] }]}>
                      NÁHLED / {ranks[preview].toUpperCase()}
                    </Text>
                    <RankStageArt rank={preview} color={rankColors[preview]} />
                    <Text style={s.h2}>{ranks[preview]}</Text>
                    <Text style={s.small}>
                      Náhled nemění tvůj rank ani uložená data.
                    </Text>
                  </View>
                  {ranks.map((name, i) => (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={`Náhled celkového ranku ${name}`}
                      accessibilityState={{ selected: preview === i }}
                      aria-pressed={preview === i}
                      onPress={() => {
                        setPreview(i);
                        modalScroll.current?.scrollTo({
                          y: Math.max(0, previewY.current - 12),
                          animated: true,
                        });
                      }}
                      style={[
                        s.card,
                        s.row,
                        { padding: 14 },
                        i === rank && { borderColor: `${color}60` },
                      ]}
                    >
                      <RankEmblem value={i} size={42} />
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={s.h3}>{name}</Text>
                        <Text style={s.small}>
                          {i * 100} bodů profilu{i === rank ? " · CURRENT" : ""}
                          {profile.loaded && i === profile.data.prime
                            ? " · PRIME"
                            : ""}
                        </Text>
                      </View>
                      <Text style={{ color: rankColors[i] }}>→</Text>
                    </Pressable>
                  ))}
                </>
              )}
              {route === "data" && (
                <>
                  <Text style={s.h2}>Tvoje data, na tvém zařízení.</Text>
                  <Text style={s.text}>
                    Profil, aktivity a projekty se ukládají do aplikace na tomto
                    zařízení. Účet ani cloudová synchronizace zatím nejsou
                    připojené.
                  </Text>
                  {[
                    ["Quit", !quitPending],
                    [
                      "Build",
                      build.loaded && !build.saving && !build.saveError,
                    ],
                    ["Mind", mind.loaded && !mind.saving && !mind.saveError],
                    [
                      "Profil",
                      profile.loaded && !profile.saving && !profile.saveError,
                    ],
                  ].map(([label, saved]) => (
                    <View key={String(label)} style={[s.card, s.between]}>
                      <Text style={s.h3}>{label}</Text>
                      <Text style={s.small}>
                        {saved
                          ? "Uloženo v zařízení"
                          : "Čeká na načtení nebo uložení"}
                      </Text>
                    </View>
                  ))}
                  {alerts}
                  <Text style={s.muted}>
                    Odinstalování aplikace nebo vymazání jejích dat může záznamy
                    odstranit. Přenos na jiné zařízení zatím není dostupný přímo
                    z profilu.
                  </Text>
                </>
              )}
            </ScrollView>
            {confirm && (
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
                  <Button color={color} onPress={() => setConfirm(false)}>
                    Pokračovat v úpravách
                  </Button>
                  <Button
                    quiet
                    color={color}
                    onPress={() => {
                      setConfirm(false);
                      setDirty(false);
                      setRoute(null);
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
  );
}
function GroupHeader({
  title,
  score,
  onPress,
  color,
}: {
  title: string;
  score: number | null;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Otevřít oblast ${title}`}
      onPress={onPress}
      style={s.between}
    >
      <View style={[s.row, { flex: 1 }]}>
        {score !== null && <RankEmblem value={rankForScore(score)} size={42} />}
        <View style={{ gap: 5, flex: 1 }}>
          <Text style={s.h2}>{title}</Text>
          <Text style={s.small}>
            {score === null
              ? "Postup není dostupný"
              : `${ranks[rankForScore(score)]} · ${number(Math.floor(score * 1000) / 10)} bodů oblasti`}
          </Text>
        </View>
      </View>
      <Text style={[s.link, { color }]}>→</Text>
    </Pressable>
  );
}
function ErrorCard({
  message,
  retry,
  color,
}: {
  message: string;
  retry: () => void;
  color: string;
}) {
  return (
    <View style={s.card}>
      <Text accessibilityRole="alert" style={s.error}>
        {message}
      </Text>
      <Button quiet color={color} onPress={retry}>
        Zkusit znovu
      </Button>
    </View>
  );
}
function ProfileEditor({
  profile,
  color,
  onDirty,
  save,
}: {
  profile: Profile;
  color: string;
  onDirty: (value: boolean) => void;
  save: (name: string, intention: string) => void;
}) {
  const [name, setName] = useState(profile.name),
    [intention, setIntention] = useState(profile.intention);
  useEffect(() => {
    onDirty(name !== profile.name || intention !== profile.intention);
  }, [name, intention, profile, onDirty]);
  return (
    <>
      <Text style={s.h2}>Dej profilu svůj směr.</Text>
      <Text style={s.muted}>
        Obě pole jsou volitelná. Jméno a záměr zůstávají na tomto zařízení.
      </Text>
      <Text style={s.muted}>Jak ti máme říkat</Text>
      <TextInput
        accessibilityLabel="Jméno v profilu"
        value={name}
        onChangeText={setName}
        maxLength={40}
        placeholder="Tvoje jméno nebo přezdívka"
        placeholderTextColor="#637187"
        style={s.input}
      />
      <Text style={s.muted}>Na čem ti teď záleží</Text>
      <TextInput
        accessibilityLabel="Osobní záměr"
        value={intention}
        onChangeText={setIntention}
        maxLength={160}
        multiline
        placeholder="Např. Víc energie, klidnější hlava a čas na vlastní projekty."
        placeholderTextColor="#637187"
        style={[s.input, { minHeight: 110, textAlignVertical: "top" }]}
      />
      <Button color={color} onPress={() => save(name, intention)}>
        Uložit profil
      </Button>
    </>
  );
}
const s = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32, gap: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#f4f6fa",
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.7,
  },
  h2: {
    color: "#f4f6fa",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  h3: { color: "#f4f6fa", fontSize: 16, fontWeight: "600" },
  text: { color: "#dce3ee", fontSize: 15, lineHeight: 24 },
  muted: { color: "#94a1b4", fontSize: 13, lineHeight: 21 },
  small: { color: "#94a1b4", fontSize: 11, lineHeight: 18 },
  label: { fontSize: 9, fontWeight: "700", letterSpacing: 1.8 },
  link: { fontSize: 12, fontWeight: "600" },
  metric: { fontSize: 26, fontWeight: "600", fontVariant: ["tabular-nums"] },
  card: {
    backgroundColor: surface,
    borderColor: border,
    borderWidth: 1,
    borderRadius: 23,
    padding: 20,
    gap: 15,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    minHeight: 48,
    minWidth: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff04",
  },
  discipline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 16,
    minHeight: 70,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: border,
    backgroundColor: "#0d121bee",
  },
  input: {
    backgroundColor: "#090e17",
    color: "#f4f6fa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffffff18",
    padding: 14,
    minHeight: 50,
    fontSize: 16,
  },
  error: { color: "#ffb0ba", fontSize: 13, lineHeight: 21 },
});
