import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import {
  dayKey,
  milestones,
  ranks,
  rankOf,
  streak,
  type Program,
} from "../model";
import { Screen, rankColors } from "../ui";
import { RankMark } from "../porn/visuals";
import { tint } from "../porn/theme";
import { dailyStyles } from "../daily/styles";
import { dailySummary, dailyTrend } from "../daily/analytics";
import { DailyDetails } from "../daily/Details";
import { HabitGarden } from "./Garden";
import {
  activePillars,
  addFoodPillar,
  confirmFoodDay,
  foodDay,
  foodPillars,
  pauseFoodPillar,
  resumeFoodPillar,
  saveFoodAnswer,
} from "./model";
const presets = [
  "Bez sladkých nápojů",
  "Bez impulzivních objednávek",
  "Omezit fast food",
  "Sladkosti jen při plánované příležitosti",
  "Pravidelné hlavní jídlo",
];
export function FoodDashboard({
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
  const rank = rankOf("food", p, now),
    accent = rankColors[rank],
    s = dailyStyles(accent);
  const today = dayKey(new Date(now)),
    past = new Date(now);
  past.setDate(past.getDate() - 1);
  const yesterday = dayKey(past);
  const pillars = activePillars(p, today),
    day = foodDay(p, today),
    previous = foodDay(p, yesterday),
    stats = dailySummary(p, now),
    count = streak(p, now);
  const [panel, setPanel] = React.useState<
      "pillars" | "days" | "ranks" | "manifest" | "sos" | null
    >(null),
    [label, setLabel] = React.useState(""),
    [error, setError] = React.useState("");
  const [selected, setSelected] = React.useState(today);
  React.useEffect(() => setSelected(today), [today]);
  const open = (kind: typeof panel) => {
    setError("");
    setPanel(kind);
  };
  const run = (action: () => Program) => {
    try {
      update(action());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zápis se nepodařilo uložit.");
    }
  };
  const button = (kind: typeof panel, name: string) => ({
    accessibilityRole: "button" as const,
    accessibilityLabel: name,
    onPress: () => open(kind),
  });
  const answerRows = (key: string) => {
    const record = foodDay(p, key);
    return record.pillars.map((pillar, index) => {
      const answer = record.answers[pillar.id];
      return (
        <View
          key={pillar.id}
          style={{
            gap: 12,
            paddingTop: index ? 16 : 0,
            borderTopWidth: index ? 1 : 0,
            borderTopColor: "#342d28",
          }}
        >
          <View style={s.row}>
            <Text style={[s.label, { color: "#a69b8f" }]}>
              PILÍŘ {index + 1}
            </Text>
            <Text
              style={[
                s.muted,
                {
                  color:
                    answer === false
                      ? "#e8a1ab"
                      : answer === true
                        ? accent
                        : "#a69b8f",
                },
              ]}
            >
              {answer === true
                ? "✓ V plánu"
                : answer === false
                  ? "Mimo plán"
                  : "Čeká na zápis"}
            </Text>
          </View>
          <Text style={s.title}>{pillar.label}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[true, false].map((value) => (
              <Pressable
                key={String(value)}
                accessibilityRole="button"
                accessibilityLabel={`${key === today ? "Dnes" : "Včera"} ${pillar.label}: ${value ? "dodrženo" : "mimo plán"}`}
                accessibilityState={{ selected: answer === value }}
                aria-pressed={answer === value}
                onPress={() =>
                  run(() => saveFoodAnswer(p, key, pillar.id, value, now))
                }
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor:
                    answer === value ? (value ? accent : "#df909e") : "#443c36",
                  backgroundColor:
                    answer === value
                      ? value
                        ? tint(accent, 0.2)
                        : "#382129"
                      : "#171514",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      answer === value
                        ? value
                          ? accent
                          : "#f6c2cb"
                        : "#c5b9ae",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {value ? "Dodrženo" : "Mimo plán"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    });
  };
  const days = dailyTrend(p, now),
    detail = foodDay(p, selected),
    selectedInfo = days.find((d) => d.key === selected);
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>MALÉ VOLBY. VLASTNÍ TEMPO.</Text>
        <Text style={s.heading}>Junk Food</Text>
      </View>
      <View
        style={[
          s.card,
          {
            backgroundColor: "#141410",
            borderColor: tint(accent, 0.3),
            gap: 18,
          },
        ]}
      >
        <View style={s.row}>
          <Text style={s.label}>ZAHRADA TVÝCH NÁVYKŮ</Text>
          <Text style={s.muted}>7 DNÍ</Text>
        </View>
        <HabitGarden p={p} pillars={pillars} now={now} accent={accent} />
        <Text style={s.muted}>
          Každý list představuje jeden dokončený den podle tvého zápisu.
          Nezapsané dny zůstávají prázdné.
        </Text>
        <View style={{ height: 1, backgroundColor: "#373127" }} />
        <View style={s.row}>
          <Text style={s.label}>
            DNES · {new Date(now).toLocaleDateString("cs-CZ")}
          </Text>
          <Text style={s.muted}>
            {day.recorded} / {pillars.length} zapsáno
          </Text>
        </View>
        {answerRows(today)}
        <Text style={s.muted}>
          Dnešek je průběžný. Zítra potvrdíš celý den; rank zvýší jen den s
          dodrženými aktivními pilíři.
        </Text>
        <Pressable
          {...button("pillars", "Spravovat pilíře Junk Food")}
          style={[
            s.button,
            {
              backgroundColor: "#28251f",
              borderWidth: 1,
              borderColor: tint(accent, 0.4),
            },
          ]}
        >
          <Text style={[s.buttonText, { color: accent }]}>
            + UPRAVIT PILÍŘE
          </Text>
        </Pressable>
      </View>
      {previous.pillars.length > 0 && (
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>
              VČERA · {past.toLocaleDateString("cs-CZ")}
            </Text>
            <Text style={s.muted}>
              {typeof p.days[yesterday] === "boolean"
                ? "Uzavřeno"
                : "Čeká na potvrzení"}
            </Text>
          </View>
          <Text style={s.title}>
            {typeof p.days[yesterday] === "boolean"
              ? "Včerejší záznam"
              : "Dokonči včerejší den."}
          </Text>
          {answerRows(yesterday)}
          {typeof p.days[yesterday] !== "boolean" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Potvrdit včerejší pilíře"
              disabled={!previous.complete}
              accessibilityState={{ disabled: !previous.complete }}
              onPress={() => run(() => confirmFoodDay(p, yesterday, now))}
              style={[s.button, !previous.complete && { opacity: 0.4 }]}
            >
              <Text style={s.buttonText}>POTVRDIT CELÝ DEN</Text>
            </Pressable>
          ) : (
            <Text style={s.muted}>
              Oprava volby upraví výsledek celého dne. PRIME zůstává.
            </Text>
          )}
          {!previous.complete && (
            <Text style={s.muted}>Nejdřív vyplň všechny včerejší pilíře.</Text>
          )}
        </View>
      )}
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#ffb8c3", fontSize: 13, lineHeight: 20 }}
        >
          {error}
        </Text>
      )}
      <Pressable
        {...button("days", "Otevřít přehled dní Junk Food")}
        style={s.card}
      >
        <View style={s.row}>
          <Text style={s.label}>TVŮJ POSLEDNÍ TÝDEN</Text>
          <Text style={s.link}>PROHLÉDNOUT ›</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {days.slice(-7).map((d) => (
            <View key={d.key} style={{ flex: 1, alignItems: "center", gap: 7 }}>
              <Text style={{ color: "#a89f94", fontSize: 10 }}>
                {d.date.toLocaleDateString("cs-CZ", { weekday: "short" })}
              </Text>
              <View
                style={{
                  width: "100%",
                  minHeight: 42,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: d.pending ? accent : "#332f2a",
                  backgroundColor:
                    d.success === true
                      ? tint(accent, 0.18)
                      : d.success === false
                        ? "#35232b"
                        : "#1c1b18",
                }}
              >
                <Text
                  style={{
                    color:
                      d.success === false
                        ? "#e8a1ab"
                        : d.success === true
                          ? accent
                          : "#a89f94",
                    fontSize: 16,
                  }}
                >
                  {d.pending
                    ? "○"
                    : d.success === true
                      ? "✓"
                      : d.success === false
                        ? "·"
                        : "—"}
                </Text>
              </View>
              <Text style={{ color: "#a89f94", fontSize: 10 }}>
                {d.date.getDate()}.
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.muted}>
          ✓ Dodrženo · růžová = mimo plán · — bez zápisu
        </Text>
      </Pressable>
      <Pressable
        {...button("ranks", "Otevřít ranky Junk Food")}
        style={[s.card, s.row]}
      >
        <RankMark rank={rank} size={58} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.label}>
            {ranks[rank]} · {count} dní v řadě
          </Text>
          <Text style={s.muted}>
            {rank === ranks.length - 1
              ? "Nejvyšší rank dosažen"
              : `Další milník: ${ranks[rank + 1]} · ${count} / ${milestones[rank + 1]} dní`}
          </Text>
          <Text style={s.muted}>
            Vlastní zápisy, bez automatického ověření.
          </Text>
        </View>
        <Text style={s.link}>›</Text>
      </Pressable>
      <View
        style={[
          s.card,
          { backgroundColor: "#201919", borderColor: "#4b3534", gap: 16 },
        ]}
      >
        <Text style={[s.label, { color: "#e5b1a6" }]}>
          CHVÍLE PŘED DALŠÍ VOLBOU
        </Text>
        <Text style={s.title}>Co teď potřebuješ?</Text>
        <Text style={s.body}>
          Hlad, stres nebo jen zvyk? Krátce se zastav a vyber další krok.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="SOS: Junk Food"
          onPress={sos}
          style={[s.button, { backgroundColor: "#e5b1a6" }]}
        >
          <Text style={s.buttonText}>ROZLIŠIT HLAD A CHUŤ</Text>
        </Pressable>
      </View>
      <Pressable
        {...button("manifest", "Otevřít osobní manifest Junk Food")}
        style={s.card}
      >
        <Text style={s.label}>MOJE PROČ ›</Text>
        <Text numberOfLines={3} style={s.body}>
          {p.reasons}
        </Text>
      </Pressable>
      <DailyDetails
        id="food"
        kind={
          panel === "ranks" || panel === "manifest" || panel === "sos"
            ? panel
            : null
        }
        p={p}
        now={now}
        update={update}
        close={() => setPanel(null)}
      />
      <Modal
        visible={panel === "pillars" || panel === "days"}
        animationType="slide"
        onRequestClose={() => setPanel(null)}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal>
            <View style={s.header}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPanel(null)}
                style={s.back}
              >
                <Text style={s.body}>← ZPĚT</Text>
              </Pressable>
              <Text style={s.label}>JUNK FOOD</Text>
            </View>
            <ScrollView
              contentContainerStyle={s.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.heading}>
                {panel === "pillars"
                  ? "Tvoje pilíře."
                  : "Dny, které tvoří návyk."}
              </Text>
              {panel === "pillars" ? (
                <>
                  <Text style={s.body}>
                    Vyber konkrétní pravidla, která chceš sledovat. Můžeš mít až
                    6 aktivních pilířů. Nový se počítá od dneška; pozastavení od
                    zítřka.
                  </Text>
                  {foodPillars(p).map((pillar) => (
                    <View key={pillar.id} style={s.card}>
                      <Text style={s.title}>{pillar.label}</Text>
                      <Text style={s.muted}>
                        {pillar.endDay
                          ? `Pozastaveno od ${pillar.endDay}`
                          : `Aktivní od ${pillar.startDay}`}
                      </Text>
                      {!pillar.endDay && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Pozastavit ${pillar.label}`}
                          onPress={() =>
                            run(() => pauseFoodPillar(p, pillar.id, now))
                          }
                          style={[s.button, { backgroundColor: "#29231f" }]}
                        >
                          <Text style={[s.buttonText, { color: accent }]}>
                            POZASTAVIT OD ZÍTŘKA
                          </Text>
                        </Pressable>
                      )}
                      {pillar.endDay && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Obnovit ${pillar.label}`}
                          onPress={() =>
                            run(() => resumeFoodPillar(p, pillar.id, now))
                          }
                          style={[s.button, { backgroundColor: "#29231f" }]}
                        >
                          <Text style={[s.buttonText, { color: accent }]}>
                            {pillar.endDay > today
                              ? "ZRUŠIT POZASTAVENÍ"
                              : "OBNOVIT OD DNEŠKA"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <View style={s.card}>
                    <Text style={s.label}>PŘIDAT PILÍŘ</Text>
                    <Text style={s.body}>
                      Inspirace — uprav formulaci podle svého plánu.
                    </Text>
                    <View style={{ gap: 8 }}>
                      {presets.map((preset) => (
                        <Pressable
                          key={preset}
                          accessibilityRole="button"
                          onPress={() => setLabel(preset)}
                          style={{
                            padding: 14,
                            minHeight: 44,
                            borderWidth: 1,
                            borderColor: label === preset ? accent : "#3a332c",
                            borderRadius: 12,
                          }}
                        >
                          <Text style={s.body}>{preset}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      accessibilityLabel="Nový pilíř Junk Food"
                      value={label}
                      onChangeText={setLabel}
                      maxLength={80}
                      multiline
                      placeholder="Moje konkrétní pravidlo…"
                      placeholderTextColor="#857b73"
                      style={[s.editor, { minHeight: 90, fontSize: 16 }]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Přidat nový pilíř"
                      onPress={() => {
                        try {
                          update(addFoodPillar(p, label, now));
                          setLabel("");
                          setError("");
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Pilíř se nepodařilo přidat.",
                          );
                        }
                      }}
                      disabled={!label.trim()}
                      accessibilityState={{ disabled: !label.trim() }}
                      style={[s.button, !label.trim() && { opacity: 0.4 }]}
                    >
                      <Text style={s.buttonText}>PŘIDAT PILÍŘ</Text>
                    </Pressable>
                  </View>
                  {!!error && (
                    <Text
                      accessibilityRole="alert"
                      style={{ color: "#ffb8c3" }}
                    >
                      {error}
                    </Text>
                  )}
                  <Text style={s.muted}>
                    Zvol pravidla, která podporují pravidelné jídlo a vědomé
                    volby.
                  </Text>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={s.metric}>
                      <Text style={s.label}>DODRŽENÉ DNY</Text>
                      <Text style={s.value}>
                        {stats.success} / {stats.completed}
                      </Text>
                      <Text style={s.muted}>Uzavřené dny · 28 dní</Text>
                    </View>
                    <View style={s.metric}>
                      <Text style={s.label}>PRAVIDELNOST</Text>
                      <Text style={s.value}>
                        {stats.rate === null ? "—" : `${stats.rate} %`}
                      </Text>
                      <Text style={s.muted}>Z tvých záznamů</Text>
                    </View>
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>POSLEDNÍCH 28 DNÍ</Text>
                    {[0, 1, 2, 3].map((row) => (
                      <View key={row} style={{ flexDirection: "row", gap: 6 }}>
                        {days.slice(row * 7, row * 7 + 7).map((d) => (
                          <Pressable
                            key={d.key}
                            accessibilityRole="button"
                            accessibilityLabel={`Den ${d.key}: ${!d.active ? "před zahájením" : d.pending ? "dnes" : d.success === true ? "dodrženo" : d.success === false ? "mimo plán" : "bez zápisu"}`}
                            accessibilityState={{
                              selected: selected === d.key,
                            }}
                            onPress={() => setSelected(d.key)}
                            style={{
                              flex: 1,
                              minHeight: 42,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor:
                                selected === d.key
                                  ? "#eadfd2"
                                  : d.pending
                                    ? accent
                                    : "transparent",
                              backgroundColor:
                                d.success === true
                                  ? tint(accent, 0.22)
                                  : d.success === false
                                    ? "#43252e"
                                    : "#24221d",
                              opacity: !d.active ? 0.4 : 1,
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  d.success === false ? "#e8a1ab" : "#d4c6b7",
                                fontSize: 11,
                              }}
                            >
                              {d.date.getDate()}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ))}
                    <Text style={s.muted}>
                      Barva ranku = dodrženo · růžová = mimo plán. Nezapsané dny
                      a dny před zahájením nemají hodnocení.
                    </Text>
                  </View>
                  <View style={s.card}>
                    <Text style={s.title}>
                      {new Date(`${selected}T12:00:00`).toLocaleDateString(
                        "cs-CZ",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </Text>
                    <Text style={s.muted}>
                      {!selectedInfo?.active
                        ? "Před zahájením — bez hodnocení."
                        : selected === today
                          ? "Průběžný den"
                          : typeof p.days[selected] === "boolean"
                            ? "Potvrzený den"
                            : "Den bez potvrzeného výsledku"}
                    </Text>
                    {detail.pillars.map((pillar) => (
                      <View key={pillar.id} style={s.row}>
                        <Text style={[s.body, { flex: 1 }]}>
                          {pillar.label}
                        </Text>
                        <Text
                          style={[
                            s.muted,
                            {
                              color:
                                detail.answers[pillar.id] === true
                                  ? accent
                                  : detail.answers[pillar.id] === false
                                    ? "#e8a1ab"
                                    : "#aca39f",
                            },
                          ]}
                        >
                          {detail.answers[pillar.id] === true
                            ? "Dodrženo"
                            : detail.answers[pillar.id] === false
                              ? "Mimo plán"
                              : "Bez zápisu"}
                        </Text>
                      </View>
                    ))}
                    <Text style={s.muted}>
                      Pauzy uložené v tento den: {selectedInfo?.sos.length ?? 0}
                    </Text>
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>JEDNOTLIVÉ PILÍŘE / 28 DNÍ</Text>
                    {foodPillars(p).map((pillar) => {
                      const records = days.filter(
                        (d) =>
                          !d.pending &&
                          d.active &&
                          foodDay(p, d.key).pillars.some(
                            (v) => v.id === pillar.id,
                          ) &&
                          typeof foodDay(p, d.key).answers[pillar.id] ===
                            "boolean" &&
                          typeof p.days[d.key] === "boolean",
                      );
                      const success = records.filter(
                        (d) => foodDay(p, d.key).answers[pillar.id] === true,
                      ).length;
                      return (
                        <View key={pillar.id} style={{ gap: 7 }}>
                          <Text style={s.body}>{pillar.label}</Text>
                          <Text style={s.muted}>
                            {success} / {records.length} potvrzených zápisů
                            dodrženo
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Pressable
                    {...button("sos", "Otevřít záznamy SOS")}
                    style={s.button}
                  >
                    <Text style={s.buttonText}>
                      PROHLÉDNOUT PAUZY A SPOUŠTĚČE
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
