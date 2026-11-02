import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Screen, rankColors } from "../ui";
import { Program, ranks, milestones, rankOf } from "../model";
import { RankThemeProvider, useRankTheme, tint } from "./theme";
import {
  palette,
  RankMark,
  SectionLabel,
  TimerDial,
  ArrowIcon,
} from "./visuals";
import {
  summary,
  dayActivity,
  trendDays,
  durationLabel,
  seriesData,
} from "./analytics";
import { SeriesChart, ActivityChart } from "./Charts";
export type DetailKind =
  | "ranks"
  | "matrix"
  | "analytics"
  | "manifest"
  | "history"
  | "sos";
const titles: Record<DetailKind, string> = {
  ranks: "Tvoje ranky",
  matrix: "Konzistence",
  analytics: "Tvoje data",
  manifest: "Osobní manifest",
  history: "Historie sérií",
  sos: "Záznamy SOS",
};
export function PornDetails({
  kind,
  p,
  now,
  close,
  update,
}: {
  kind: DetailKind | null;
  p: Program;
  now: number;
  close: () => void;
  update: (p: Program) => void;
}) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { accent } = useRankTheme();
  const s = makeStyles(accent);
  const [editing, setEditing] = useState(false);
  const [reasons, setReasons] = useState(p.reasons);
  useEffect(() => {
    setEditing(false);
  }, [kind]);
  const back = () => (editing ? setEditing(false) : close());
  return (
    <Modal visible={kind !== null} animationType={Platform.OS === "web" ? "fade" : "slide"} onRequestClose={back}>
      {kind && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal accent={accent}>
            <View style={s.header}>
              <Pressable accessibilityRole="button" onPress={back} hitSlop={12}>
                <Text style={s.back}>← ZPĚT</Text>
              </Pressable>
              <Text style={s.small}>PORN REBOOT</Text>
            </View>
            <ScrollView
              ref={scroll}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              contentContainerStyle={s.content}
              keyboardShouldPersistTaps="handled"
            >
              <SectionLabel>
                {editing ? "OSOBNÍ MANIFEST" : "TVŮJ PŘEHLED"}
              </SectionLabel>
              <Text style={s.heading}>
                {editing ? "Tvoje proč." : titles[kind]}
              </Text>
              {editing ? (
                <>
                  <Text style={s.body}>
                    Tvoje důvody se mohou vyvíjet. Časovač a původní podpis
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
                    onPress={() => {
                      update({ ...p, reasons: reasons.trim() });
                      setEditing(false);
                    }}
                    style={[s.action, !reasons.trim() && { opacity: 0.4 }]}
                  >
                    <Text style={s.actionText}>ULOŽIT DŮVODY</Text>
                  </Pressable>
                </>
              ) : (
                <DetailBody
                  key={kind}
                  kind={kind}
                  p={p}
                  now={now}
                  onPreview={() =>
                    scroll.current?.scrollTo({ y: 0, animated: true })
                  }
                  edit={() => {
                    setReasons(p.reasons);
                    setEditing(true);
                  }}
                />
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function DetailBody({
  onPreview,
  kind,
  p,
  now,
  edit,
}: {
  kind: DetailKind;
  onPreview: () => void;
  p: Program;
  now: number;
  edit: () => void;
}) {
  const { accent } = useRankTheme();
  const s = makeStyles(accent);
  const stats = summary(p, now);
  const rank = rankOf("porn", p, now);
  const prime = Math.max(rank, p.prime);
  const [previewRank, setPreviewRank] = useState(rank);
  const [selected, setSelected] = useState(now);
  const selectedDate = new Date(selected);
  const detail = dayActivity(p, selectedDate, now);
  if (kind === "ranks")
    return (
      <>
        <View style={s.card}>
          <View style={s.row}>
            <RankMark rank={prime} size={64} />
            <View style={{ flex: 1 }}>
              <SectionLabel>PRIME / OSOBNÍ REKORD</SectionLabel>
              <Text
                style={[s.title, { color: rankColors[prime], marginTop: 6 }]}
              >
                {ranks[prime]}
              </Text>
            </View>
          </View>
          <Text style={s.body}>
            Current sleduje aktuální nepřerušenou sérii. PRIME uchovává nejvyšší
            dosažený rank i po resetu.
          </Text>
        </View>
        <View style={s.card}>
          <SectionLabel>
            NÁHLED CIFERNÍKU / {ranks[previewRank].toUpperCase()}
          </SectionLabel>
          <View style={{ alignItems: "center", gap: 8 }}>
            <RankMark rank={previewRank} size={112} />
            <Text style={[s.title, { color: rankColors[previewRank] }]}>
              {ranks[previewRank]}
            </Text>
          </View>
          <RankThemeProvider rank={previewRank}>
            <TimerDial
              seconds={milestones[previewRank] * 86400}
              progress={0.35}
              preview
            />
          </RankThemeProvider>
          <Text style={s.small}>
            Vyber rank v seznamu a prohlédni si jeho ciferník. Náhled nemění
            tvoji sérii ani rank.
          </Text>
        </View>
        {ranks.map((name, i) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Náhled ranku ${name}`}
            accessibilityState={{ selected: previewRank === i }}
            onPress={() => {
              setPreviewRank(i);
              onPreview();
            }}
            key={name}
            style={[
              s.rankItem,
              i === rank && {
                borderColor: `${rankColors[i]}70`,
                backgroundColor: tint(accent, 0.08),
              },
            ]}
          >
            <RankMark rank={i} size={54} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[
                  s.title,
                  {
                    fontSize: 18,
                    color: i <= prime ? rankColors[i] : "#8b8f86",
                  },
                ]}
              >
                {name}
              </Text>
              <Text style={s.small}>
                {i === 0 ? "Od začátku" : `${milestones[i]} dní bez porna`}
              </Text>
            </View>
            <Text
              style={[s.small, { color: i === rank ? accent : palette.muted }]}
            >
              {i === rank ? "CURRENT" : i <= prime ? "DOSAŽENO" : "UZAMČENO"}
            </Text>
            <ArrowIcon color={rankColors[i]} size={14} />
          </Pressable>
        ))}
        <Text style={s.body}>
          Každý milník otevírá další rank. Nejbližší cíl sleduj na hlavním
          přehledu.
        </Text>
      </>
    );
  if (kind === "matrix")
    return (
      <>
        <Text style={s.body}>
          Posledních 28 dní. Klepni na den a prohlédni si skutečně uložené
          události.
        </Text>
        <View style={s.card}>
          <View style={s.calendarRow}>
            {trendDays(p, now, 28)
              .slice(0, 7)
              .map((day) => (
                <Text key={day.date.getTime()} style={s.weekday}>
                  {day.date.toLocaleDateString("cs-CZ", { weekday: "short" })}
                </Text>
              ))}
          </View>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={s.calendarRow}>
              {trendDays(p, now, 28)
                .slice(row * 7, row * 7 + 7)
                .map((day) => {
                  const chosen =
                    day.date.toDateString() === selectedDate.toDateString();
                  return (
                    <Pressable
                      key={day.date.getTime()}
                      accessibilityRole="button"
                      accessibilityLabel={`Detail dne ${day.date.toLocaleDateString("cs-CZ")}`}
                      onPress={() => setSelected(day.date.getTime())}
                      style={[
                        s.day,
                        {
                          backgroundColor: day.resets.length
                            ? "#2d171b"
                            : day.successful
                              ? tint(accent, 0.18)
                              : "#201e1d",
                          borderColor: chosen
                            ? palette.text
                            : day.pending
                              ? accent
                              : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: day.active ? palette.text : "#89827d",
                          fontSize: 13,
                        }}
                      >
                        {day.date.getDate()}
                      </Text>
                      {day.pending && (
                        <View
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: accent,
                          }}
                        />
                      )}
                      {day.resets.length > 0 && <View style={s.resetDot} />}
                    </Pressable>
                  );
                })}
            </View>
          ))}
          <View style={[s.row, { flexWrap: "wrap" }]}>
            <Text style={[s.small, { color: accent }]}>● Splněno</Text>
            <Text style={[s.small, { color: palette.red }]}>● Reset</Text>
            <Text style={[s.small, { color: accent }]}>● Dnes</Text>
            <Text style={s.small}>□ Vybraný den</Text>
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.title}>
            {selectedDate.toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={s.body}>
            {!detail.active
              ? "Před zahájením programu — bez hodnocení."
              : detail.pending
                ? detail.resets.length
                  ? "Dnes byla série přerušena. Nová série již běží; den ještě není dokončený."
                  : "Dnešní série běží. Výsledek dne ještě není uzavřený."
                : detail.resets.length
                  ? "V tento den byla série přerušena. Historie zůstává zachovaná."
                  : "Den bez zaznamenaného resetu."}
          </Text>
          <View style={s.row}>
            <Metric label="RESETY" value={String(detail.resets.length)} />
            <Metric label="SOS" value={String(detail.sos.length)} />
          </View>
          {detail.resets.map((event, i) => (
            <EventRow
              key={`r${i}`}
              label="Ukončená série"
              value={durationLabel(event.duration)}
              at={event.at}
            />
          ))}
          {detail.sos.map((event, i) => (
            <EventRow
              key={`s${i}`}
              label={
                event.trigger === "Neuvedeno"
                  ? "Spouštěč nevybrán"
                  : event.trigger
              }
              value={pauseLabel(event)}
              at={event.at}
            />
          ))}
        </View>
        <Text style={s.body}>
          Malá značka v rohu označuje dnešek. Světlý obrys označuje vybraný den;
          červená tečka zaznamenaný reset.
        </Text>
      </>
    );
  if (kind === "analytics") {
    const days = trendDays(p, now, 28);
    const completed = days.filter((d) => d.active && !d.pending);
    const successful = completed.filter((d) => d.successful);
    const triggers = Object.entries(
      (p.triggers ?? []).reduce<Record<string, number>>(
        (counts, e) => ({
          ...counts,
          [e.trigger]: (counts[e.trigger] ?? 0) + 1,
        }),
        {},
      ),
    ).sort((a, b) => b[1] - a[1]);
    return (
      <>
        <View style={s.row}>
          <View style={[s.card, { flex: 1 }]}>
            <Metric label="NEJLEPŠÍ SÉRIE" value={durationLabel(stats.best)} />
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Metric label="VŠECHNY SÉRIE" value={String(stats.attempts)} />
          </View>
        </View>
        <View style={s.card}>
          <SectionLabel>DÉLKA SÉRIÍ / POSLEDNÍCH 8</SectionLabel>
          <SeriesChart p={p} now={now} />
          {p.history.length === 0 && (
            <Text style={s.body}>
              První série stále běží. Pro srovnání zatím nemáme ukončené série.
            </Text>
          )}
        </View>
        <View style={s.card}>
          <SectionLabel>UDÁLOSTI / POSLEDNÍCH 14 DNÍ</SectionLabel>
          <ActivityChart p={p} now={now} />
        </View>
        <View style={s.card}>
          <SectionLabel>KONZISTENCE / POSLEDNÍCH 28 DNÍ</SectionLabel>
          <Text style={s.stat}>
            {completed.length
              ? `${Math.round((successful.length / completed.length) * 100)} %`
              : "—"}
          </Text>
          <Text style={s.body}>
            {completed.length
              ? `${successful.length} z ${completed.length} dokončených dnů od zahájení bylo bez resetu.`
              : "Zatím není dokončený žádný den. První výsledek uvidíš po půlnoci."}
          </Text>
          <Text style={s.small}>Dnešek ani dny před zahájením nepočítáme.</Text>
        </View>
        <View style={s.card}>
          <SectionLabel>PRŮMĚR UKONČENÝCH SÉRIÍ</SectionLabel>
          <Text style={s.stat}>
            {stats.average === null ? "—" : durationLabel(stats.average)}
          </Text>
          <Text style={s.small}>Právě běžící série průměr neovlivňuje.</Text>
        </View>
        <View style={s.card}>
          <SectionLabel>ZAZNAMENANÉ SPOUŠTĚČE</SectionLabel>
          {triggers.length ? (
            triggers.map(([trigger, count]) => (
              <View key={trigger} style={s.row}>
                <Text style={[s.body, { flex: 1 }]}>{trigger}</Text>
                <Text style={{ color: accent, fontSize: 18 }}>{count}</Text>
              </View>
            ))
          ) : (
            <Text style={s.body}>Zatím nemáš uložené záznamy SOS.</Text>
          )}
        </View>
        <Text style={s.body}>
          Grafy vycházejí z časovače, resetů a záznamů SOS.
        </Text>
      </>
    );
  }
  if (kind === "manifest") {
    const nums = p.signature.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const x = xs.length ? Math.min(...xs) - 12 : 0;
    const y = ys.length ? Math.min(...ys) - 12 : 0;
    const w = xs.length ? Math.max(40, Math.max(...xs) - x + 12) : 300;
    const h = ys.length ? Math.max(40, Math.max(...ys) - y + 12) : 130;
    return (
      <>
        <View style={s.manifest}>
          <SectionLabel>PROČ JSEM SE ROZHODL</SectionLabel>
          <Text style={s.quote}>„</Text>
          <Text style={s.manifestText}>{p.reasons}</Text>
          <View style={s.rule} />
          <Text style={s.small}>{p.target}</Text>
        </View>
        <View style={s.card}>
          <SectionLabel>TVŮJ PŮVODNÍ PODPIS</SectionLabel>
          <Svg width="100%" height={100} viewBox={`${x} ${y} ${w} ${h}`}>
            <Path
              d={p.signature}
              stroke={accent}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
          <Text style={s.small}>
            Podepsáno{" "}
            {new Date(
              p.signedAt ?? seriesData(p, now)[0].start,
            ).toLocaleDateString("cs-CZ")}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={edit} style={s.action}>
          <Text style={s.actionText}>UPRAVIT MOJE DŮVODY</Text>
        </Pressable>
        <Text style={s.body}>
          Úprava důvodů zachová časovač, rank i původní podpis.
        </Text>
      </>
    );
  }
  if (kind === "history")
    return (
      <>
        <View style={s.card}>
          <SectionLabel>AKTUÁLNÍ SÉRIE</SectionLabel>
          <Text style={s.stat}>{durationLabel(stats.current)}</Text>
          <Text style={s.small}>
            Od {new Date(p.startedAt).toLocaleString("cs-CZ")}
          </Text>
        </View>
        {p.history.length === 0 ? (
          <Text style={s.body}>
            Tvoje první série právě běží. Historie se objeví až po zaznamenaném
            resetu.
          </Text>
        ) : (
          p.history
            .slice()
            .reverse()
            .map((event, i) => (
              <View key={`${event.at}-${i}`} style={s.card}>
                <SectionLabel>SÉRIE #{p.history.length - i}</SectionLabel>
                <Text style={s.stat}>{durationLabel(event.duration)}</Text>
                <Text style={s.small}>
                  Reset {new Date(event.at).toLocaleString("cs-CZ")}
                </Text>
              </View>
            ))
        )}
        <Text style={s.body}>
          Každá série zůstává součástí tvé historie. Reset nesmaže PRIME rank.
        </Text>
      </>
    );
  return (
    <>
      <Text style={s.body}>
        Tvoje návraty ze SOS: spouštěč, čas a délka pauzy.
      </Text>
      {(p.triggers ?? []).length === 0 ? (
        <View style={s.card}>
          <Text style={s.title}>Zatím žádný záznam.</Text>
          <Text style={s.body}>
            Po návratu ze SOS tu najdeš čas, spouštěč a délku pauzy.
          </Text>
        </View>
      ) : (
        (p.triggers ?? [])
          .slice()
          .reverse()
          .map((event, i) => (
            <View key={`${event.at}-${i}`} style={s.card}>
              <EventRow
                label={
                  event.trigger === "Neuvedeno"
                    ? "Spouštěč nevybrán"
                    : event.trigger
                }
                value={pauseLabel(event)}
                at={event.at}
              />
              {event.outcome && <Text style={s.small}>{event.outcome}</Text>}
            </View>
          ))
      )}
    </>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  const { accent } = useRankTheme();
  const s = makeStyles(accent);
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      <Text style={s.stat}>{value}</Text>
    </View>
  );
}
function EventRow({
  label,
  value,
  at,
}: {
  label: string;
  value: string;
  at: number;
}) {
  const { accent } = useRankTheme();
  const s = makeStyles(accent);
  return (
    <View
      style={[
        s.row,
        {
          alignItems: "flex-start",
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#2a2725",
        },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.body}>{label}</Text>
        <Text style={s.small}>
          {new Date(at).toLocaleTimeString("cs-CZ", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <Text
        style={[
          s.body,
          {
            maxWidth: "48%",
            textAlign: "right",
            fontVariant: ["tabular-nums"],
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
const makeStyles = (accent: string) =>
  StyleSheet.create({
    editor: {
      minHeight: 220,
      padding: 18,
      borderRadius: 0,
      borderBottomWidth: 1,
      borderColor: tint(accent, 0.4),
      backgroundColor: "#ffffff04",
      color: palette.text,
      fontSize: 17,
      lineHeight: 27,
      textAlignVertical: "top",
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    back: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 1,
    },
    content: { padding: 22, gap: 24, paddingBottom: 40 },
    heading: {
      fontSize: 40,
      fontWeight: "600",
      letterSpacing: -1.7,
      color: palette.text,
    },
    card: {
      paddingVertical: 20,
      gap: 16,
      borderBottomWidth: 1,
      borderColor: palette.border,
    },
    row: { flexDirection: "row", gap: 16, alignItems: "center" },
    body: { color: "#c0c9d7", fontSize: 14, lineHeight: 23 },
    small: { color: palette.muted, fontSize: 12, lineHeight: 19 },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "500",
      letterSpacing: -0.5,
    },
    stat: {
      color: palette.text,
      fontSize: 25,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.6,
    },
    rankItem: {
      minHeight: 82,
      borderBottomWidth: 1,
      borderColor: palette.border,
      paddingVertical: 15,
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
    },
    calendarRow: { flexDirection: "row", gap: 5 },
    weekday: {
      flex: 1,
      textAlign: "center",
      color: palette.muted,
      fontSize: 10,
    },
    day: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    resetDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: palette.red,
      position: "absolute",
      bottom: 4,
    },
    manifest: {
      paddingLeft: 20,
      paddingVertical: 12,
      gap: 20,
      borderLeftWidth: 2,
      borderColor: tint(accent, 0.5),
    },
    quote: { color: accent, fontSize: 60, lineHeight: 45 },
    manifestText: {
      color: "#ede6e1",
      fontSize: 25,
      lineHeight: 36,
      fontWeight: "400",
    },
    rule: { height: 1, backgroundColor: tint(accent, 0.2), marginVertical: 6 },
    action: {
      padding: 18,
      borderRadius: 26,
      backgroundColor: accent,
      alignItems: "center",
    },
    actionText: {
      color: "#121016",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
    },
  });

function pauseLabel(event: {
  durationSeconds?: number;
  pauseStarted?: boolean;
}) {
  const seconds = event.durationSeconds ?? 0;
  return seconds > 0
    ? `${seconds} s pauzy`
    : event.pauseStarted
      ? "Pauza kratší než 1 s"
      : event.pauseStarted === false
        ? "Pauza nespuštěna"
        : "Bez zaznamenané pauzy";
}
