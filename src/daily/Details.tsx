import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { type Program, definitions, ranks, milestones, rankOf } from "../model";
import { Screen, rankColors } from "../ui";
import { RankMark } from "../porn/visuals";
import { tint } from "../porn/theme";
import { ConsistencyMatrix } from "../ConsistencyMatrix";
import { dailySummary, type DailyId } from "./analytics";
import { dailyStyles } from "./styles";
import { palette } from "../design";
import { DailyChart } from "./Charts";
export type DailyDetail = "ranks" | "matrix" | "analytics" | "manifest" | "sos";
const titles = {
  ranks: "Tvoje ranky",
  matrix: "Konzistence",
  analytics: "Tvoje data",
  manifest: "Osobní manifest",
  sos: "Návraty k plánu",
};
export function DailyDetails({
  id,
  kind,
  p,
  now,
  update,
  close,
}: {
  id: DailyId;
  kind: DailyDetail | null;
  p: Program;
  now: number;
  update: (p: Program) => void;
  close: () => void;
}) {
  const rank = rankOf(id, p, now),
    prime = id === "food" ? rank : Math.max(rank, p.prime),
    accent = palette.Quit;
  const s = dailyStyles(accent),
    stats = dailySummary(p, now);
  const [editing, setEditing] = React.useState(false),
    [reasons, setReasons] = React.useState(p.reasons);
  const [previewRank, setPreviewRank] = React.useState(rank);
  React.useEffect(() => {
    if (kind === "ranks") setPreviewRank(rank);
  }, [kind]);
  const scroll = React.useRef<ScrollView>(null);
  React.useEffect(() => setEditing(false), [kind]);
  const { width } = useWindowDimensions();
  return (
    <Modal
      visible={kind !== null}
      animationType="slide"
      onRequestClose={() => (editing ? setEditing(false) : close())}
    >
      {kind && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal accent={accent}>
            <View style={s.header}>
              <Pressable
                accessibilityRole="button"
                onPress={() => (editing ? setEditing(false) : close())}
                style={s.back}
              >
                <Text
                  style={{ color: "#e4d9d1", fontSize: 12, fontWeight: "600" }}
                >
                  ← ZPĚT
                </Text>
              </Pressable>
              <Text numberOfLines={1} style={s.muted}>
                {definitions[id].title.toUpperCase()}
              </Text>
            </View>
            <ScrollView
              ref={scroll}
              contentContainerStyle={s.content}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.label}>
                {editing ? "OSOBNÍ MANIFEST" : "TVŮJ PŘEHLED"}
              </Text>
              <Text style={s.heading}>
                {editing ? "Tvoje proč." : titles[kind]}
              </Text>
              {editing ? (
                <>
                  <Text style={s.body}>
                    Tvoje důvody se mohou vyvíjet. Zápisy, rank a původní podpis
                    zůstávají.
                  </Text>
                  <TextInput
                    accessibilityLabel="Moje důvody"
                    multiline
                    value={reasons}
                    onChangeText={setReasons}
                    style={s.editor}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!reasons.trim()}
                    accessibilityState={{ disabled: !reasons.trim() }}
                    onPress={() => {
                      update({ ...p, reasons: reasons.trim() });
                      setEditing(false);
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                    style={[s.button, !reasons.trim() && { opacity: 0.4 }]}
                  >
                    <Text style={s.buttonText}>ULOŽIT DŮVODY</Text>
                  </Pressable>
                </>
              ) : kind === "ranks" ? (
                <>
                  <View style={s.card}>
                    <View style={s.row}>
                      <RankMark rank={id === "food" ? rank : prime} size={64} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text
                          style={[
                            s.label,
                            { color: rankColors[id === "food" ? rank : prime] },
                          ]}
                        >
                          {id === "food"
                            ? "JUNK FOOD / CELKOVÝ RANK"
                            : "PRIME / OSOBNÍ REKORD"}
                        </Text>
                        <Text
                          style={[
                            s.value,
                            { color: rankColors[id === "food" ? rank : prime] },
                          ]}
                        >
                          {ranks[id === "food" ? rank : prime]}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.body}>
                      {id === "food"
                        ? "Jeden společný rank za celý Junk Food. Body jsou průměrem dodržování všech vybraných pilířů, nejvýše 100 za uzavřený den."
                        : "Current sleduje potvrzené dny v aktuální sérii. PRIME uchovává nejvyšší dosažený rank."}
                    </Text>
                    <Text style={s.muted}>
                      {id === "food"
                        ? "Dnešní koncept se nepočítá. Horší den přinese méně bodů, předchozí postup nemaže. Záznamy zadáváš sám."
                        : "Dnešní koncept se nepočítá. Chybějící potvrzení přeruší navazující sérii."}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.card,
                      {
                        borderColor: tint(rankColors[previewRank], 0.35),
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text style={[s.label, { color: rankColors[previewRank] }]}>
                      EMBLÉM / {ranks[previewRank].toUpperCase()}
                    </Text>
                    <RankMark rank={previewRank} size={150} />
                    <Text style={[s.value, { color: rankColors[previewRank] }]}>
                      {ranks[previewRank]}
                    </Text>
                    <Text style={s.muted}>
                      {previewRank === 0
                        ? "Od začátku"
                        : id === "food"
                          ? `Odemkneš za ${milestones[previewRank] * 100} bodů.`
                          : `Odemkneš za ${milestones[previewRank]} dokončených dní v řadě.`}
                    </Text>
                    <Text style={[s.muted, { textAlign: "center" }]}>
                      Klepni na rank v seznamu a prohlédni si jeho emblém.
                    </Text>
                  </View>
                  {ranks.map((name, i) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Náhled emblému ${name}`}
                      accessibilityState={{ selected: previewRank === i }}
                      onPress={() => {
                        setPreviewRank(i);
                        scroll.current?.scrollTo({ y: 0, animated: true });
                      }}
                      key={name}
                      style={[
                        s.card,
                        s.row,
                        {
                          paddingVertical: 18,
                          paddingHorizontal: 0,
                          borderColor:
                            i === rank ? tint(rankColors[i], 0.6) : "#2b2728",
                          backgroundColor: "transparent",
                        },
                      ]}
                    >
                      <RankMark rank={i} size={54} />
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text
                          style={[
                            s.title,
                            {
                              color: i <= prime ? rankColors[i] : "#ada39f",
                              fontSize: 20,
                            },
                          ]}
                        >
                          {name}
                        </Text>
                        <Text style={s.muted}>
                          {i === 0
                            ? "Od začátku"
                            : id === "food"
                              ? `${milestones[i] * 100} bodů celkem`
                              : milestones[i] < 5
                                ? `${milestones[i]} dokončené dny v řadě`
                                : `${milestones[i]} dokončených dní v řadě`}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 9,
                          color: i === rank ? rankColors[i] : "#aca39f",
                        }}
                      >
                        {i === rank
                          ? "CURRENT"
                          : i <= prime
                            ? "DOSAŽENO"
                            : "UZAMČENO"}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : kind === "matrix" ? (
                <>
                  <Text style={s.body}>
                    Posledních 28 dní. Klepni na den a prohlédni si jeho zápis.
                    Dnešek je průběžný, předchozí dny jsou potvrzené.
                  </Text>
                  <ConsistencyMatrix id={id} p={p} now={now} />
                </>
              ) : kind === "analytics" ? (
                <>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={s.metric}>
                      <Text style={s.label}>NEJLEPŠÍ SÉRIE</Text>
                      <Text style={s.value}>
                        {stats.best}{" "}
                        <Text style={{ fontSize: 13 }}>
                          {stats.best === 1
                            ? "den"
                            : stats.best > 1 && stats.best < 5
                              ? "dny"
                              : "dní"}
                        </Text>
                      </Text>
                    </View>
                    <View style={s.metric}>
                      <Text style={s.label}>KONZISTENCE</Text>
                      <Text style={s.value}>
                        {stats.rate === null ? "—" : `${stats.rate} %`}
                      </Text>
                    </View>
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>
                      {id === "scroll"
                        ? "ČAS / POSLEDNÍCH 14 DNÍ"
                        : "DODRŽENÍ / POSLEDNÍCH 14 DNÍ"}
                    </Text>
                    <DailyChart id={id} p={p} now={now} accent={accent} />
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>
                      POTVRZENÉ DNY / POSLEDNÍCH 28 DNÍ
                    </Text>
                    <Text style={s.value}>
                      {stats.success} / {stats.completed}
                    </Text>
                    <Text style={s.body}>
                      {stats.completed
                        ? "Dny s dodrženým plánem ze všech potvrzených dní."
                        : "Zatím nemáš žádný potvrzený dokončený den."}
                    </Text>
                    <Text style={s.muted}>
                      Dnešek, chybějící zápisy a dny před zahájením do procenta
                      nezahrnujeme.
                    </Text>
                  </View>
                  {id === "scroll" && (
                    <View style={s.card}>
                      <Text style={s.label}>PRŮMĚRNÝ DENNÍ ČAS / 28 DNÍ</Text>
                      <Text style={s.value}>
                        {stats.averageMinutes === null
                          ? "—"
                          : `${stats.averageMinutes} min`}
                      </Text>
                      <Text style={s.muted}>
                        Potvrzené dny se zapsaným časem:{" "}
                        {stats.recordedMinutesDays}. Dnešní koncept průměr
                        neovlivňuje.
                      </Text>
                    </View>
                  )}
                  <Text style={s.muted}>
                    {id === "scroll"
                      ? "Graf vychází z tvých ručních zápisů. Aplikace zatím čas automaticky neměří ani neblokuje jiné aplikace."
                      : "Graf sleduje tvoje konkrétní pravidlo a potvrzené zápisy."}
                  </Text>
                </>
              ) : kind === "manifest" ? (
                <>
                  <View
                    style={[
                      s.card,
                      {
                        backgroundColor: "transparent",
                        borderColor: tint(accent, 0.4),
                      },
                    ]}
                  >
                    <Text style={s.label}>PROČ JSEM SE ROZHODL</Text>
                    <Text
                      style={{ color: accent, fontSize: 44, lineHeight: 46 }}
                    >
                      “
                    </Text>
                    <Text
                      style={{ color: "#ede5df", fontSize: 20, lineHeight: 31 }}
                    >
                      {p.reasons}
                    </Text>
                    <View
                      style={{ height: 1, backgroundColor: tint(accent, 0.2) }}
                    />
                    <Text style={s.body}>{p.target}</Text>
                    {id === "scroll" && (
                      <Text style={s.muted}>Denní limit: {p.limit} minut</Text>
                    )}
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>TVŮJ PŮVODNÍ PODPIS</Text>
                    <Svg
                      width={Math.min(320, Math.max(160, width - 88))}
                      height={130}
                      viewBox="0 0 300 130"
                      accessibilityLabel="Tvůj uložený podpis"
                    >
                      <Path
                        d={p.signature}
                        stroke={accent}
                        strokeWidth={2}
                        fill="none"
                      />
                    </Svg>
                    <Text style={s.muted}>
                      Podepsáno{" "}
                      {new Date(p.signedAt ?? p.startedAt).toLocaleDateString(
                        "cs-CZ",
                      )}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setReasons(p.reasons);
                      setEditing(true);
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                    style={s.button}
                  >
                    <Text style={s.buttonText}>UPRAVIT MOJE DŮVODY</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={s.body}>
                    Uložené návraty k plánu: {stats.sos}. Návrat ze SOS nemění
                    rank.
                  </Text>
                  {(p.triggers ?? []).length === 0 ? (
                    <View style={s.card}>
                      <Text style={s.title}>Tvůj plán je po ruce.</Text>
                      <Text style={s.body}>
                        Po návratu ze SOS tu uvidíš svůj záznam.
                      </Text>
                    </View>
                  ) : (
                    (p.triggers ?? [])
                      .slice()
                      .reverse()
                      .map((e, index) => (
                        <View key={`${e.at}-${index}`} style={s.card}>
                          <View style={[s.row, { alignItems: "flex-start" }]}>
                            <Text style={[s.title, { flex: 1 }]}>
                              {e.trigger}
                            </Text>
                            <Text style={s.muted}>
                              {new Date(e.at).toLocaleDateString("cs-CZ")}
                            </Text>
                          </View>
                          {e.pillarId && (
                            <Text style={s.body}>
                              {p.foodPillars?.find((v) => v.id === e.pillarId)
                                ?.label ?? "Pilíř"}
                            </Text>
                          )}
                          {e.outcome && <Text style={s.body}>{e.outcome}</Text>}
                          <Text style={s.muted}>
                            {new Date(e.at).toLocaleTimeString("cs-CZ", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ·{" "}
                            {e.pauseStarted === false
                              ? "Pauza nespuštěna"
                              : (e.durationSeconds ?? 0) === 0
                                ? "Bez zaznamenané pauzy"
                                : `${Math.floor(e.durationSeconds! / 60)} min ${e.durationSeconds! % 60} s pauzy`}
                          </Text>
                        </View>
                      ))
                  )}
                </>
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}
