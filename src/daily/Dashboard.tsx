import React from "react";
import { Text, View, Pressable } from "react-native";
import {
  type Program,
  definitions,
  ranks,
  milestones,
  rankOf,
  streak,
  dayKey,
} from "../model";
import { rankColors } from "../ui";
import { RankMark, ArrowIcon, SosSymbol } from "../porn/visuals";
import { tint } from "../porn/theme";
import { ProgramIntro } from "../ProgramIntro";
import { DailyCheckIn } from "../DailyCheckIn";
import { dailySummary, dailyTrend, type DailyId } from "./analytics";
import { BudgetDial } from "./visuals";
import { dailyStyles } from "./styles";
import { DailyDetails, type DailyDetail } from "./Details";
import { DailyChart } from "./Charts";

export function DailyDashboard({
  id,
  p,
  now,
  update,
  sos,
}: {
  id: DailyId;
  p: Program;
  now: number;
  update: (p: Program) => void;
  sos: () => void;
}) {
  const rank = rankOf(id, p, now),
    prime = Math.max(rank, p.prime),
    accent = rankColors[rank];
  const s = dailyStyles(accent);
  const [detail, setDetail] = React.useState<DailyDetail | null>(null);
  const count = streak(p, now),
    stats = dailySummary(p, now);
  const today = p.dailyLogs?.[dayKey(new Date(now))];
  const minutes = today?.minutes ?? null;
  const progress =
    rank === 9
      ? 1
      : (count - milestones[rank]) / (milestones[rank + 1] - milestones[rank]);
  const days = dailyTrend(p, now);
  const button = (kind: DailyDetail, label: string) => ({
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    onPress: () => setDetail(kind),
  });
  return (
    <>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>
          {id === "scroll"
            ? "TVŮJ ČAS. TVOJE VOLBA."
            : "VĚDOMÁ VOLBA. KAŽDÝ DEN."}
        </Text>
        <Text style={s.heading}>{definitions[id].title}</Text>
      </View>
      <Pressable
        {...button("ranks", `Otevřít ranky ${definitions[id].title}`)}
        style={({ pressed }) => [
          s.card,
          s.row,
          { paddingVertical: 16, borderColor: tint(accent, 0.2) },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            flex: 1,
          }}
        >
          <RankMark rank={rank} size={44} />
          <View style={{ gap: 5, flexShrink: 1 }}>
            <Text style={[s.label, { color: "#aca39f" }]}>CURRENT RANK</Text>
            <Text style={s.value}>{ranks[rank]}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 5 }}>
          <Text style={[s.label, { color: rankColors[prime] }]}>PRIME</Text>
          <Text style={{ color: rankColors[prime], fontSize: 16 }}>
            {ranks[prime]}
          </Text>
          <ArrowIcon color={rankColors[prime]} size={12} />
        </View>
      </Pressable>
      <View
        style={[
          s.card,
          { backgroundColor: "#0b0b0d", padding: 0, overflow: "hidden" },
        ]}
      >
        {id === "scroll" ? (
          <View style={{ padding: 20, gap: 14 }}>
            <BudgetDial minutes={minutes} limit={p.limit} accent={accent} />
            <View style={s.row}>
              <Text style={s.label}>DENNÍ ROZPOČET</Text>
              <Text
                style={[
                  s.muted,
                  {
                    color:
                      minutes !== null && minutes > p.limit
                        ? "#ff919e"
                        : accent,
                  },
                ]}
              >
                {minutes === null
                  ? "Zatím bez zápisu"
                  : minutes > p.limit
                    ? `O ${Math.round((minutes - p.limit) * 10) / 10} min nad limit`
                    : `Zbývá ${Math.round((p.limit - minutes) * 10) / 10} min`}
              </Text>
            </View>
            <Text style={s.body}>{p.target}</Text>
            <Text style={s.muted}>
              Ručně zaznamenaný čas ve vybraných aplikacích.
            </Text>
          </View>
        ) : (
          <View style={{ padding: 22, gap: 18 }}>
            <View style={s.row}>
              <Text style={s.label}>MOJE PRAVIDLO</Text>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: tint(accent, 0.14),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: accent, fontSize: 21 }}>✓</Text>
              </View>
            </View>
            <Text
              style={{
                color: "#f3f3ed",
                fontSize: 28,
                lineHeight: 36,
                fontWeight: "500",
                letterSpacing: -0.6,
              }}
            >
              {p.target}
            </Text>
            <Text style={s.body}>Pravidelnost, ne dokonalost.</Text>
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: today?.success === false ? "#ff919e" : accent,
                paddingLeft: 12,
              }}
            >
              <Text
                style={[
                  s.muted,
                  { color: today?.success === false ? "#ffb2bc" : "#d1bbaa" },
                ]}
              >
                {!today
                  ? "Dnes zatím bez zápisu"
                  : today.success
                    ? "Dnes průběžně dodrženo"
                    : "Dnes průběžně mimo plán"}
              </Text>
            </View>
          </View>
        )}
        <Pressable
          {...button("ranks", "Zobrazit cestu k dalšímu ranku")}
          style={{
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: "#2c2728",
            gap: 12,
            backgroundColor: "#141112",
          }}
        >
          <View style={s.row}>
            <View style={{ gap: 4, flex: 1 }}>
              <Text style={s.label}>AKTUÁLNÍ SÉRIE</Text>
              <Text style={s.value}>
                {count}{" "}
                <Text style={{ fontSize: 14, color: "#bdb3ad" }}>
                  {count === 1 ? "den" : count > 1 && count < 5 ? "dny" : "dní"}{" "}
                  v řadě
                </Text>
              </Text>
            </View>
            <ArrowIcon color={accent} />
          </View>
          <View style={s.track}>
            <View
              style={[
                s.fill,
                { width: `${Math.max(0, Math.min(1, progress)) * 100}%` },
              ]}
            />
          </View>
          <Text style={s.muted}>
            {rank === 9
              ? "Obsidian · nejvyšší rank dosažen"
              : `Další milník · ${ranks[rank + 1]} · ${count} / ${milestones[rank + 1]} dokončených dní`}
          </Text>
        </Pressable>
      </View>
      <DailyCheckIn id={id} p={p} now={now} update={update} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`SOS: ${definitions[id].title}`}
        onPress={sos}
        style={({ pressed }) => [
          s.card,
          { backgroundColor: "#1c1219", borderColor: "#422732", gap: 18 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={s.row}>
          <Text style={[s.label, { color: "#ffc1c7" }]}>
            SOS · CHVÍLE PRO TEBE
          </Text>
          <Text
            style={{
              color: "#e5b6c0",
              fontSize: 9,
              backgroundColor: "#34202b",
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            {id === "scroll" ? "5 MIN" : "2 MIN"}
          </Text>
        </View>
        <View style={s.row}>
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={s.title}>
              {id === "scroll"
                ? "Vystup z nekonečného feedu."
                : "Dej si prostor pro volbu."}
            </Text>
            <Text style={s.muted}>
              {id === "scroll"
                ? "Pět minut pro svět mimo obrazovku."
                : "Rozliš hlad od impulzivní chuti."}
            </Text>
          </View>
          <SosSymbol size={42} />
        </View>
        <View
          style={[
            s.row,
            {
              backgroundColor: "#ffb0b7",
              minHeight: 50,
              paddingHorizontal: 18,
              borderRadius: 14,
            },
          ]}
        >
          <Text style={{ color: "#2d111a", fontSize: 15, fontWeight: "600" }}>
            {id === "scroll" ? "Přerušit scrollování" : "Zastavit se na chvíli"}
          </Text>
          <ArrowIcon color="#2d111a" size={20} />
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          {...button("analytics", "Otevřít statistiky dokončených dní")}
          style={s.metric}
        >
          <Text style={s.label}>KONZISTENCE ›</Text>
          <Text style={s.value}>
            {stats.rate === null ? "—" : `${stats.rate} %`}
          </Text>
          <Text style={s.muted}>
            {stats.success} / {stats.completed} potvrzených dní · 28 dní
          </Text>
        </Pressable>
        <Pressable {...button("sos", "Otevřít záznamy SOS")} style={s.metric}>
          <Text style={s.label}>NÁVRATY ZE SOS ›</Text>
          <Text style={s.value}>{stats.sos}</Text>
          <Text style={s.muted}>Uložené návraty k plánu</Text>
        </Pressable>
      </View>
      <Pressable
        {...button("matrix", `Otevřít konzistenci ${definitions[id].title}`)}
        style={s.card}
      >
        <View style={s.row}>
          <Text style={s.label}>KONZISTENCE</Text>
          <Text style={s.muted}>28 DNÍ</Text>
        </View>
        <View style={{ gap: 6 }}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={{ flexDirection: "row", gap: 6 }}>
              {days.slice(row * 7, row * 7 + 7).map((day) => (
                <View
                  key={day.key}
                  style={{
                    flex: 1,
                    height: 22,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: day.pending ? accent : "transparent",
                    backgroundColor:
                      day.success === true
                        ? tint(accent, 0.7)
                        : day.success === false
                          ? "#502731"
                          : "#211d1e",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {day.success === false && (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "#ff919e",
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          <Text style={s.muted}>Potvrzené dny, dnešek a tvoje zápisy.</Text>
          <Text style={s.link}>PROZKOUMAT ›</Text>
        </View>
      </Pressable>
      <Pressable
        {...button("analytics", `Otevřít statistiky ${definitions[id].title}`)}
        style={s.card}
      >
        <View style={s.row}>
          <Text style={s.label}>
            {id === "scroll" ? "TVŮJ ČAS V ČÍSLECH" : "TVOJE KAŽDODENNÍ VOLBY"}
          </Text>
          <Text style={s.muted}>14 DNÍ</Text>
        </View>
        <DailyChart id={id} p={p} now={now} accent={accent} compact />
        <Text style={s.link}>ANALÝZA ›</Text>
      </Pressable>
      <Pressable
        {...button(
          "manifest",
          `Otevřít osobní manifest ${definitions[id].title}`,
        )}
        style={[
          s.card,
          {
            backgroundColor: tint(accent, 0.05),
            borderColor: tint(accent, 0.22),
          },
        ]}
      >
        <View style={s.row}>
          <Text style={s.label}>MOJE PROČ</Text>
          <ArrowIcon color={accent} size={16} />
        </View>
        <Text
          numberOfLines={3}
          style={{ color: "#ede5df", fontSize: 18, lineHeight: 28 }}
        >
          {p.reasons}
        </Text>
        <Text style={s.muted}>Tvůj podepsaný závazek. Vždy po ruce.</Text>
      </Pressable>
      <DailyDetails
        id={id}
        kind={detail}
        p={p}
        now={now}
        update={update}
        close={() => setDetail(null)}
      />
    </>
  );
}
export function DailyWelcome({
  id,
  activate,
}: {
  id: DailyId;
  activate: () => void;
}) {
  const s = dailyStyles(rankColors[0]);
  return (
    <>
      <Text style={s.label}>{definitions[id].label}</Text>
      <Text style={s.heading}>{definitions[id].title}</Text>
      <ProgramIntro id={id} accent={rankColors[0]} />
      <View style={s.row}>
        <RankMark rank={0} size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title}>Tvoje první série.</Text>
          <Text style={s.muted}>
            Začínáš na Copper. Každý potvrzený den se počítá.
          </Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={activate} style={s.button}>
        <Text style={s.buttonText}>AKTIVOVAT PROGRAM</Text>
      </Pressable>
    </>
  );
}
