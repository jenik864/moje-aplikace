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
import { SeriesChart } from "./Charts";
export function PornDashboard({
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
  const [detail, setDetail] = useState<DetailKind | null>(null);
  const rank = rankOf("porn", p, now);
  const prime = Math.max(rank, p.prime);
  const stats = summary(p, now);
  const seconds = Math.floor(stats.current / 1000);
  const progress =
    rank === 9
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
    rank === 9
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
          <SectionLabel>DETOX / 01</SectionLabel>
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
        style={s.rankPanel}
      >
        <View style={s.rankCurrent}>
          <RankMark rank={rank} size={48} />
          <View style={{ gap: 4 }}>
            <SectionLabel>CURRENT RANK</SectionLabel>
            <Text style={s.rankName}>{ranks[rank]}</Text>
          </View>
        </View>
        <View style={s.prime}>
          <Text style={s.primeLabel}>PRIME ›</Text>
          <Text style={s.primeName}>{ranks[prime]}</Text>
        </View>
      </Pressable>
      <TimerDial seconds={seconds} progress={progress} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zobrazit cestu k dalšímu ranku"
        onPress={() => setDetail("ranks")}
        style={s.next}
      >
        <View style={s.spread}>
          <Text style={s.nextTitle}>
            {rank === 9
              ? "Nejvyšší rank dosažen"
              : `Další milník · ${ranks[rank + 1]}`}
          </Text>
          <Text style={s.percent}>{Math.floor(progress * 100)} %</Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={s.caption}>
          {rank === 9
            ? "Obsidian. Teď udržuj svůj směr."
            : `Zbývá ${leftDays} dní · ${leftHours} h · ${leftMinutes} min`}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={sos} style={s.sos}>
        <View style={s.sosIcon}>
          <Text style={{ color: palette.red, fontSize: 20, fontWeight: "700" }}>
            !
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.sosTitle}>Potřebuju zastavit impulz</Text>
          <Text style={s.sosCaption}>
            SOS protokol · vrať se ke svému rozhodnutí
          </Text>
        </View>
        <ArrowIcon color={palette.red} />
      </Pressable>
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
            <Text style={s.metricUnit}> záznamů</Text>
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
                        ? "#1a1f17"
                        : day.resets.length
                          ? "#47262c"
                          : day.successful
                            ? "#a4ce65"
                            : "#222c1b",
                      borderColor: day.pending ? palette.green : "transparent",
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
              : `${stats.attempts} sérií ve tvé historii`}
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
  return (
    <View style={s.spread}>
      <SectionLabel>{label}</SectionLabel>
      <Text style={s.caption}>{detail}</Text>
    </View>
  );
}
function ResetHold({ onReset }: { onReset: () => void }) {
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
  return (
    <>
      <SectionLabel>DETOX / 01</SectionLabel>
      <Text style={s.title}>Porn Reboot</Text>
      <View style={s.welcome}>
        <RankMark rank={0} size={86} />
        <Text style={s.welcomeTitle}>
          {"Tvoje pozornost.\nTvoje rozhodnutí."}
        </Text>
        <Text style={s.welcomeBody}>
          Začni vlastním závazkem a sleduj každý krok. Čas bez porna, ranky a
          pomoc, když přijde impulz.
        </Text>
      </View>
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
      <Pressable
        accessibilityRole="button"
        onPress={activate}
        style={s.activate}
      >
        <Text style={s.activateText}>AKTIVOVAT PROGRAM</Text>
        <ArrowIcon color="#18200f" />
      </Pressable>
      <Text style={s.foot}>
        Série sleduje vědomé sledování porna. Masturbace bez porna ani náhodné
        zobrazení ji nepřeruší.
      </Text>
    </>
  );
}
const s = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 29,
    fontWeight: "600",
    letterSpacing: -1,
    color: palette.text,
    marginTop: 7,
  },
  live: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.green,
  },
  liveText: { fontSize: 8, color: "#879c70", letterSpacing: 1 },
  rankPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
  },
  rankCurrent: { flexDirection: "row", alignItems: "center", gap: 14 },
  rankName: {
    fontSize: 23,
    color: palette.text,
    letterSpacing: -0.5,
    fontWeight: "500",
  },
  prime: { alignItems: "flex-end", gap: 7 },
  primeLabel: {
    color: palette.violet,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  primeName: { fontSize: 16, color: "#d0bff2", fontWeight: "500" },
  next: { gap: 10, paddingHorizontal: 4 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nextTitle: { fontSize: 12, color: "#c8d1be", fontWeight: "500" },
  percent: {
    color: palette.green,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 3,
    backgroundColor: "#283121",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: 3, backgroundColor: palette.green },
  caption: { fontSize: 10, color: palette.muted, lineHeight: 17 },
  sos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "#211316",
    borderWidth: 1,
    borderColor: "#55232b",
    borderRadius: 14,
    marginTop: 6,
  },
  sosIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#71313b",
    alignItems: "center",
    justifyContent: "center",
  },
  sosTitle: { color: "#ffa3a6", fontSize: 14, fontWeight: "600" },
  sosCaption: { color: "#b37d80", fontSize: 10, lineHeight: 16 },
  metrics: { flexDirection: "row", gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  metricValue: {
    color: palette.text,
    fontSize: 21,
    fontWeight: "500",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  metricUnit: { fontSize: 10, color: palette.muted, fontWeight: "400" },
  card: {
    padding: 18,
    borderRadius: 16,
    borderColor: palette.border,
    borderWidth: 1,
    backgroundColor: palette.panel,
    gap: 16,
  },
  miniMatrix: { gap: 6 },
  matrixRow: { flexDirection: "row", gap: 6 },
  miniCell: {
    flex: 1,
    height: 20,
    borderRadius: 4,
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
  link: { fontSize: 9, color: palette.green, letterSpacing: 1 },
  manifest: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#17131d",
    borderWidth: 1,
    borderColor: "#33273f",
    gap: 16,
  },
  manifestText: {
    color: "#e1d8ed",
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "400",
  },
  manifestFoot: { color: "#877791", fontSize: 10, lineHeight: 16 },
  reset: {
    position: "relative",
    overflow: "hidden",
    padding: 16,
    borderWidth: 1,
    borderColor: "#272522",
    borderRadius: 12,
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
  foot: { fontSize: 10, color: "#6e7667", lineHeight: 17, textAlign: "center" },
  welcome: {
    alignItems: "center",
    padding: 24,
    gap: 24,
    borderRadius: 22,
    borderColor: "#2c3125",
    borderWidth: 1,
    backgroundColor: palette.panel,
  },
  welcomeTitle: {
    color: palette.text,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  welcomeBody: {
    color: "#a8b09f",
    fontSize: 14,
    lineHeight: 23,
    flexShrink: 1,
  },
  number: {
    color: palette.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  activate: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 14,
    backgroundColor: palette.green,
  },
  activateText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#18200f",
  },
});
