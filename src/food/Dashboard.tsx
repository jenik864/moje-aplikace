import { RankStage, palette } from "../design";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { dayKey, milestones, ranks, rankOf, type Program } from "../model";
import { Screen, rankColors } from "../ui";
import { RankMark } from "../porn/visuals";
import { tint } from "../porn/theme";
import { dailyStyles } from "../daily/styles";
import { dailySummary, dailyTrend } from "../daily/analytics";
import { DailyDetails } from "../daily/Details";
import {
  activePillars,
  confirmFoodDay,
  foodDay,
  foodPillars,
  foodPoints,
  foodDayPoints,
  pillarSlots,
  slotAnswer,
  saveFoodSlot,
} from "./model";
export function FoodDashboard({
  p,
  now,
  update,
  sos,
}: {
  p: Program;
  now: number;
  update: (p: Program) => void;
  sos: (pillarId?: string) => void;
}) {
  const rank = rankOf("food", p, now),
    accent = palette.Quit,
    s = dailyStyles(accent);
  const today = dayKey(new Date(now)),
    past = new Date(now);
  past.setDate(past.getDate() - 1);
  const yesterday = dayKey(past);
  const pillars = activePillars(p, today),
    day = foodDay(p, today),
    previous = foodDay(p, yesterday),
    stats = dailySummary(p, now);
  const [panel, setPanel] = React.useState<
      "pillars" | "days" | "ranks" | "manifest" | "sos" | null
    >(null),
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
  const points = foodPoints(p, now);
  const nextThreshold = milestones[Math.min(rank + 1, ranks.length - 1)] * 100;
  const floor = milestones[rank] * 100;
  const progress =
    rank === ranks.length - 1 ? 1 : (points - floor) / (nextThreshold - floor);
  const answerRows = (key: string) =>
    foodDay(p, key).pillars.map((pillar, index) => (
      <View
        key={pillar.id}
        style={{
          gap: 14,
          paddingTop: 22,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderColor: "#ffffff16",
        }}
      >
        <Text style={s.label}>PILÍŘ {index + 1}</Text>
        <View style={s.row}>
          <Text style={[s.title, { flex: 1 }]}>{pillar.label}</Text>
          {key === today && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`SOS pro ${pillar.label}`}
              onPress={() => sos(pillar.id)}
              style={{
                minHeight: 44,
                minWidth: 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                borderBottomWidth: 1,
                borderColor: "#F5BBA050",
                backgroundColor: "transparent",
              }}
            >
              <Text style={{ color: accent, fontWeight: "600", fontSize: 12 }}>
                SOS
              </Text>
            </Pressable>
          )}
        </View>
        {pillarSlots(pillar).map((slot) => {
          const answer = slotAnswer(p, key, pillar, slot.id);
          const locked = key === today && new Date(now).getHours() < slot.end;
          return (
            <View key={slot.id} style={{ gap: 8 }}>
              <View style={s.row}>
                <Text style={s.body}>{slot.label}</Text>
                <Text style={s.muted}>
                  {locked
                    ? slot.end === 24
                      ? "Zítra"
                      : `Od ${slot.end}:00`
                    : answer === undefined
                      ? "Bez zápisu"
                      : answer
                        ? "✓"
                        : "Mimo plán"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[true, false].map((value) => (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${key === today ? "Dnes" : "Včera"} ${pillar.label}, ${slot.label}: ${value ? "dodrženo" : "mimo plán"}`}
                    accessibilityState={{
                      selected: answer === value,
                      disabled: locked,
                    }}
                    aria-pressed={answer === value}
                    disabled={locked}
                    onPress={() =>
                      run(() =>
                        saveFoodSlot(p, key, pillar.id, slot.id, value, now),
                      )
                    }
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 0,
                      padding: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottomWidth: 1,
                      opacity: locked ? 0.4 : 1,
                      borderColor:
                        answer === value
                          ? value
                            ? accent
                            : "#df909e"
                          : "#ffffff18",
                      backgroundColor:
                        answer === value
                          ? value
                            ? tint(accent, 0.18)
                            : "#382129"
                          : "transparent",
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
        })}
      </View>
    ));
  const days = dailyTrend(p, now),
    detail = foodDay(p, selected),
    selectedInfo = days.find((d) => d.key === selected);
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>MALÉ VOLBY. VLASTNÍ TEMPO.</Text>
        <Text style={s.heading}>Junk Food</Text>
      </View>
      <RankStage
        rank={rank}
        prime={null}
        showPrime={false}
        color={rankColors[rank]}
        label="JUNK FOOD / SPOLEČNÝ POSTUP"
        value={Math.round(points).toLocaleString("cs-CZ")}
        unit="POTVRZENÝCH BODŮ"
        progress={progress}
        nextLabel={
          rank === ranks.length - 1
            ? "Nejvyšší rank dosažen"
            : `${nextThreshold - Math.round(points)} bodů do ${ranks[rank + 1]}`
        }
        onPress={() => open("ranks")}
        accessibilityLabel="Otevřít společný rank Junk Food"
      />
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.label}>
            DNES · {new Date(now).toLocaleDateString("cs-CZ")}
          </Text>
          <Text style={s.muted}>
            {Math.round(foodDayPoints(p, today))} / 100 b · průběžně
          </Text>
        </View>
        {answerRows(today)}
        <Text style={s.muted}>
          Část dne zaznamenáš po jejím skončení. Večer a celodenní cíle uzavřeš
          zítra. Body získáš po potvrzení celého dne.
        </Text>
        <Pressable
          {...button("pillars", "Prohlédnout vybrané pilíře")}
          style={{
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: "#ffffff24",
          }}
        >
          <Text style={[s.body, { color: accent, fontWeight: "600" }]}>
            MOJE VYBRANÉ PILÍŘE
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
              Oprava volby přepočítá body tohoto dne. Ostatní dny zůstávají.
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
                  borderRadius: 24,
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
      <View
        style={[
          s.card,
          {
            backgroundColor: "transparent",
            borderColor: "#F5BBA055",
            borderLeftWidth: 2,
            paddingLeft: 18,
            gap: 16,
          },
        ]}
      >
        <Text style={[s.label, { color: accent }]}>
          CHVÍLE PŘED DALŠÍ VOLBOU
        </Text>
        <Text style={s.title}>Co teď potřebuješ?</Text>
        <Text style={s.body}>
          Hlad, stres nebo jen zvyk? Krátce se zastav a vyber další krok.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="SOS: Junk Food"
          onPress={() => sos()}
          style={[s.button, { backgroundColor: accent }]}
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
          <Screen modal accent={accent}>
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
                    Pilíře jsou vybrané na začátku programu. Společně přispívají
                    do jednoho ranku; počet pilířů nezrychluje postup.
                  </Text>
                  {foodPillars(p).map((pillar) => (
                    <View key={pillar.id} style={s.card}>
                      <Text style={s.title}>{pillar.label}</Text>
                      <Text style={s.muted}>
                        {pillarSlots(pillar)
                          .map((slot) => slot.label)
                          .join(" · ")}
                      </Text>
                      {pillar.endDay && (
                        <Text style={s.muted}>
                          Historický pilíř · do {pillar.endDay}
                        </Text>
                      )}
                    </View>
                  ))}
                  <Text style={s.muted}>
                    Plán během programu zatím neměníš. Tvoje předchozí záznamy
                    zůstávají uložené.
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
                      Barva ranku = všechny cíle dodrženy · růžová = částečně
                      nebo mimo plán. Nezapsané dny a dny před zahájením nemají
                      hodnocení.
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
                    <Text style={s.value}>
                      {Math.round(
                        selected === today ||
                          typeof p.days[selected] !== "boolean"
                          ? 0
                          : (p.foodScores?.[selected] ??
                              (p.days[selected] ? 100 : 0)),
                      )}{" "}
                      bodů
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
