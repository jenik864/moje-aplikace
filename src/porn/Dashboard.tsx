import { EmergencyAction } from "../EmergencyAction";
import { palette as neutralPalette } from "../design";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, AppState } from "react-native";
import { Program, ranks, milestones, rankOf, resetProgram } from "../model";
import {
  palette,
  RankMark,
  TimerDial,
  SectionLabel,
  ArrowIcon,
} from "./visuals";
import { summary, trendDays, durationLabel } from "./analytics";
import { PornDetails, DetailKind } from "./Details";
import { rankColors } from "../ui";
import { RankThemeProvider, tint } from "./theme";
import { SeriesChart } from "./Charts";
import { RankStageArt, palette as sectionPalette } from "../design";
type DashboardProps = {
  p: Program;
  now: number;
  update: (p: Program) => void;
  sos: () => void;
};
export function PornDashboard(props: DashboardProps) {
  return (
    <RankThemeProvider rank={rankOf("porn", props.p, props.now)}>
      <DashboardBody {...props} />
    </RankThemeProvider>
  );
}
function DashboardBody({
  p,
  now,
  update,
  sos,
}: {
  p: Program;
  now: number;
  update: (p: Program) => void;
  sos: () => void;
}) {
  const accent = neutralPalette.Quit;
  const s = React.useMemo(() => makeStyles(accent), [accent]);
  const [detail, setDetail] = useState<DetailKind | null>(null);
  const rank = rankOf("porn", p, now);
  const prime = Math.max(rank, p.prime);
  const stats = summary(p, now);
  const lastRank = useRef(rank);
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    if (rank > lastRank.current) {
      setUnlocked(true);
      const timer = setTimeout(() => setUnlocked(false), 6000);
      lastRank.current = rank;
      return () => clearTimeout(timer);
    }
    lastRank.current = rank;
    setUnlocked(false);
  }, [rank]);
  const seconds = Math.floor(stats.current / 1000);
  const progress =
    rank === ranks.length - 1
      ? 1
      : Math.max(
          0,
          Math.min(
            1,
            (stats.current / 86400000 - milestones[rank]) /
              (milestones[rank + 1] - milestones[rank]),
          ),
        );
  const remaining =
    rank === ranks.length - 1
      ? 0
      : Math.max(0, milestones[rank + 1] * 86400000 - stats.current);
  const totalMinutes = Math.ceil(remaining / 60000);
  const leftDays = Math.floor(totalMinutes / 1440);
  const leftHours = Math.floor(totalMinutes / 60) % 24;
  const leftMinutes = totalMinutes % 60;
  const days = trendDays(p, now, 28);
  const finished = days.filter((d) => d.active && !d.pending);
  const completed = finished.filter((d) => d.successful);
  return (
    <>
      <View style={s.titleRow}>
        <View>
          <SectionLabel>TVŮJ OSOBNÍ PROGRES</SectionLabel>
          <Text style={s.title}>Porn Reboot</Text>
        </View>
        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>SÉRIE BĚŽÍ</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Otevřít ranky Porn Reboot"
        onPress={() => setDetail("ranks")}
        style={({ pressed }) => [s.rankPanel, pressed && { opacity: 0.65 }]}
      >
        <View style={s.rankCurrent}>
          <RankMark rank={rank} size={36} />
          <View style={{ gap: 4 }}>
            <SectionLabel>CURRENT RANK</SectionLabel>
            <Text style={s.rankName}>{ranks[rank]}</Text>
          </View>
        </View>
        <View style={s.prime}>
          <Text style={[s.primeLabel, { color: neutralPalette.Quit }]}>
            PRIME
          </Text>
          <Text style={[s.primeName, { color: neutralPalette.Quit }]}>
            {ranks[prime]}
          </Text>
          <ArrowIcon color={neutralPalette.Quit} size={12} />
        </View>
      </Pressable>
      <View style={s.hero}>
        {unlocked && (
          <Text
            accessibilityRole="alert"
            style={{ color: accent, textAlign: "center", fontSize: 12 }}
          >
            Nový rank · {ranks[rank]}. Tvůj ciferník je odemčený.
          </Text>
        )}
        <View style={s.clockStage}>
          <TimerDial seconds={seconds} progress={progress} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zobrazit cestu k dalšímu ranku"
          onPress={() => setDetail("ranks")}
          style={s.next}
        >
          <View style={s.spread}>
            <Text style={s.nextTitle}>
              {rank === ranks.length - 1
                ? "Nejvyšší rank dosažen"
                : `Další milník · ${ranks[rank + 1]}`}
            </Text>
            <Text style={s.percent}>{Math.floor(progress * 100)} %</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={s.caption}>
            {rank === ranks.length - 1
              ? "Obsidian. Teď udržuj svůj směr."
              : `Zbývá ${leftDays} ${leftDays === 1 ? "den" : leftDays > 1 && leftDays < 5 ? "dny" : "dní"} · ${leftHours} h · ${leftMinutes} min`}
          </Text>
        </Pressable>
      </View>
      <EmergencyAction accessibilityLabel="SOS: Zastavit impulz" onPress={sos}>
        <View style={s.sosTop}>
          <Text style={s.sosEyebrow}>SOS / ZPÁTKY K SOBĚ</Text>
          <Text style={s.sosDuration}>5 MIN</Text>
        </View>
        <View style={s.sosBody}>
          <Text style={s.sosTitle}>Zastavit impulz.</Text>
          <ArrowIcon color="#FFFFFF" size={24} />
        </View>
      </EmergencyAction>
      <View style={s.metrics}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setDetail("history")}
          style={s.metric}
        >
          <SectionLabel>NEJLEPŠÍ SÉRIE ›</SectionLabel>
          <Text style={s.metricValue}>{durationLabel(stats.best)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setDetail("sos")}
          style={s.metric}
        >
          <SectionLabel>NÁVRATY ZE SOS ›</SectionLabel>
          <Text style={s.metricValue}>
            {stats.sos}
            <Text style={s.metricUnit}>
              {" "}
              {stats.sos === 1
                ? "záznam"
                : stats.sos < 5 && stats.sos > 0
                  ? "záznamy"
                  : "záznamů"}
            </Text>
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Otevřít detail matice konzistence"
        onPress={() => setDetail("matrix")}
        style={s.card}
      >
        <CardHeading label="KONZISTENCE" detail="28 DNÍ" />
        <View style={s.miniMatrix}>
          {[0, 1, 2, 3].map((row) => (
            <View style={s.matrixRow} key={row}>
              {days.slice(row * 7, row * 7 + 7).map((day, i) => (
                <View
                  key={i}
                  style={[
                    s.miniCell,
                    {
                      backgroundColor: !day.active
                        ? "#ffffff08"
                        : day.resets.length
                          ? "#47262c"
                          : day.successful
                            ? accent
                            : tint(accent, 0.14),
                      borderColor: day.pending ? accent : "transparent",
                    },
                  ]}
                >
                  {day.resets.length > 0 && <View style={s.resetDot} />}
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={s.spread}>
          <Text style={s.caption}>
            {completed.length} splněných / {finished.length} dokončených dní
          </Text>
          <Text style={s.link}>PROZKOUMAT ›</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Otevřít statistiky Porn Reboot"
        onPress={() => setDetail("analytics")}
        style={s.card}
      >
        <CardHeading label="VÝVOJ SÉRIÍ" detail="TVOJE DATA" />
        <SeriesChart p={p} now={now} compact />
        <View style={s.spread}>
          <Text style={s.caption}>
            {stats.attempts === 1
              ? "První série právě vzniká."
              : `${p.history.length} ukončených · 1 právě běží`}
          </Text>
          <Text style={s.link}>ANALÝZA ›</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Otevřít osobní manifest"
        onPress={() => setDetail("manifest")}
        style={s.manifest}
      >
        <View style={s.spread}>
          <Text style={s.primeLabel}>MOJE PROČ</Text>
          <Text style={s.primeLabel}>›</Text>
        </View>
        <Text numberOfLines={3} style={s.manifestText}>
          {p.reasons}
        </Text>
        <Text style={s.manifestFoot}>
          Tvůj podepsaný závazek. Vždy po ruce.
        </Text>
      </Pressable>
      <ResetHold onReset={() => update(resetProgram(p))} />
      <Text style={s.foot}>
        Reset změní aktuální sérii. PRIME a historie zůstávají.
      </Text>
      <PornDetails
        kind={detail}
        p={p}
        now={now}
        close={() => setDetail(null)}
        update={update}
      />
    </>
  );
}
function CardHeading({ label, detail }: { label: string; detail: string }) {
  const accent = neutralPalette.Quit;
  const s = makeStyles(accent);
  return (
    <View style={s.spread}>
      <SectionLabel>{label}</SectionLabel>
      <Text style={s.caption}>{detail}</Text>
    </View>
  );
}
function ResetHold({ onReset }: { onReset: () => void }) {
  const accent = neutralPalette.Quit;
  const s = makeStyles(accent);
  const [fraction, setFraction] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const callback = useRef(onReset);
  callback.current = onReset;
  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setFraction(0);
  };
  useEffect(() => {
    const sub = AppState.addEventListener("change", cancel);
    return () => {
      sub.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Reset série: podržte tři sekundy"
      onPressIn={() => {
        cancel();
        const start = Date.now();
        timer.current = setInterval(() => {
          const f = Math.min(1, (Date.now() - start) / 3000);
          setFraction(f);
          if (f >= 1) {
            cancel();
            callback.current();
          }
        }, 50);
      }}
      onPressOut={cancel}
      style={s.reset}
    >
      <Text style={s.caption}>
        {fraction
          ? `Drž ještě ${Math.ceil((1 - fraction) * 3)} s`
          : "Zaznamenat reset · podrž 3 sekundy"}
      </Text>
      <View style={[s.resetFill, { width: `${fraction * 100}%` }]} />
    </Pressable>
  );
}
export function PornWelcome({ activate }: { activate: () => void }) {
  const accent = neutralPalette.Quit;
  const s = makeStyles(accent);
  return (
    <>
      <SectionLabel>DETOX / 01</SectionLabel>
      <Text style={s.title}>Porn Reboot</Text>
      <View style={s.welcome}>
        <RankStageArt rank={0} color={rankColors[0]} />
        <Text style={s.welcomeTitle}>
          {"Tvoje pozornost.\nTvoje rozhodnutí."}
        </Text>
        <Text style={s.welcomeBody}>
          Začni vlastním závazkem a sleduj každý krok. Čas bez porna, ranky a
          pomoc, když přijde impulz.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={activate}
        style={s.activate}
      >
        <Text style={s.activateText}>AKTIVOVAT PROGRAM</Text>
        <ArrowIcon color="#1a110d" />
      </Pressable>
      <View style={s.card}>
        {[
          "Napiš svůj osobní manifest",
          "Podepiš slib sám sobě",
          "Začni od Copper a drž svůj směr",
        ].map((text, i) => (
          <View style={s.rankCurrent} key={text}>
            <Text style={s.number}>0{i + 1}</Text>
            <Text style={s.welcomeBody}>{text}</Text>
          </View>
        ))}
      </View>
      <Text style={s.foot}>
        Série sleduje vědomé sledování porna. Masturbace bez porna ani náhodné
        zobrazení ji nepřeruší.
      </Text>
    </>
  );
}
const makeStyles = (accent: string) =>
  StyleSheet.create({
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 12,
    },
    title: {
      fontSize: 30,
      fontWeight: "600",
      letterSpacing: -1.2,
      color: palette.text,
      marginTop: 6,
    },
    live: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: sectionPalette.Quit,
    },
    liveText: { fontSize: 8, color: sectionPalette.Quit, letterSpacing: 1 },
    rankPanel: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: "#ffffff12",
    },
    rankCurrent: { flexDirection: "row", alignItems: "center", gap: 12 },
    rankName: {
      fontSize: 21,
      color: accent,
      letterSpacing: -0.5,
      fontWeight: "500",
    },
    prime: { flexDirection: "row", alignItems: "center", gap: 9 },
    primeLabel: {
      color: accent,
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 1.4,
    },
    primeName: { fontSize: 13, color: accent, fontWeight: "500" },
    hero: { gap: 0 },
    clockStage: { paddingTop: 2, paddingBottom: 5, alignItems: "center" },
    next: { gap: 10, paddingTop: 12, paddingBottom: 16 },
    spread: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    nextTitle: { fontSize: 12, color: "#dfdfdf", fontWeight: "500" },
    percent: { color: accent, fontSize: 12, fontVariant: ["tabular-nums"] },
    track: { height: 2, backgroundColor: "#ffffff12", overflow: "hidden" },
    fill: { height: 2, backgroundColor: accent },
    caption: {
      fontSize: 12,
      color: palette.muted,
      lineHeight: 19,
      flexShrink: 1,
    },
    sosTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sosEyebrow: {
      color: "#FFFFFF",
      fontSize: 8,
      letterSpacing: 1.7,
      fontWeight: "700",
    },
    sosDuration: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    sosBody: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sosTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      lineHeight: 31,
      fontWeight: "600",
      letterSpacing: -0.8,
      flex: 1,
    },
    metrics: {
      flexDirection: "row",
      gap: 24,
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: "#ffffff12",
    },
    metric: { flex: 1, gap: 12 },
    metricValue: {
      color: palette.text,
      fontSize: 26,
      fontWeight: "500",
      letterSpacing: -0.8,
      fontVariant: ["tabular-nums"],
    },
    metricUnit: { fontSize: 11, color: palette.muted, fontWeight: "400" },
    card: {
      paddingVertical: 22,
      borderBottomWidth: 1,
      borderBottomColor: "#ffffff12",
      gap: 18,
    },
    miniMatrix: { gap: 6 },
    matrixRow: { flexDirection: "row", gap: 6 },
    miniCell: {
      flex: 1,
      height: 13,
      borderRadius: 3,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    resetDot: {
      width: 3,
      height: 3,
      backgroundColor: palette.red,
      borderRadius: 2,
    },
    link: { fontSize: 9, color: sectionPalette.Quit, letterSpacing: 1.1 },
    manifest: {
      paddingLeft: 18,
      paddingVertical: 10,
      borderLeftWidth: 2,
      borderColor: sectionPalette.Quit,
      gap: 14,
      marginVertical: 14,
    },
    manifestText: {
      color: "#ececec",
      fontSize: 25,
      lineHeight: 35,
      fontWeight: "400",
      letterSpacing: -0.5,
    },
    manifestFoot: { color: palette.muted, fontSize: 11, lineHeight: 18 },
    reset: {
      position: "relative",
      overflow: "hidden",
      paddingVertical: 19,
      borderBottomWidth: 1,
      borderColor: "#ffffff15",
      alignItems: "center",
      marginTop: 6,
    },
    resetFill: {
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 2,
      backgroundColor: palette.red,
    },
    foot: {
      fontSize: 10,
      color: palette.muted,
      lineHeight: 17,
      textAlign: "center",
    },
    welcome: { paddingTop: 10, paddingBottom: 20, gap: 20 },
    welcomeTitle: {
      color: palette.text,
      fontSize: 40,
      lineHeight: 44,
      fontWeight: "600",
      letterSpacing: -1.8,
    },
    welcomeBody: {
      color: "#b1b1b1",
      fontSize: 14,
      lineHeight: 23,
      flexShrink: 1,
    },
    number: {
      color: sectionPalette.Quit,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 1,
    },
    activate: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderRadius: 28,
      backgroundColor: sectionPalette.Quit,
    },
    activateText: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      color: "#141414",
    },
  });
