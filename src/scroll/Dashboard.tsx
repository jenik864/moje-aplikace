import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { dayKey, ranks, type Program } from "../model";
import { Screen } from "../ui";
import { RankMark } from "../porn/visuals";
import { DailyDetails } from "../daily/Details";
import { PersonalReasons } from "../PersonalReasons";
import { EmergencyAction } from "../EmergencyAction";
import { statusColors } from "../statusColors";
import {
  attention,
  attentionSummary,
  beginBreak,
  endBreak,
  breakRemaining,
  saveAttentionPlan,
  saveReflection,
} from "./attention";
import { usageSummary } from "./scoring";
import { usageTimeline } from "./insights";
import { useUsageConnection } from "./useUsageConnection";
import { AttentionArtwork } from "./Artwork";
import { Action, SectionHeading, s } from "./components";
import { BreakSetup, PlanEditor, ReflectionEditor } from "./Editors";
import {
  ConnectionPanel,
  UsagePanel,
  UsageChart,
  AttentionHistory,
  ScrollRanks,
  minLabel,
} from "./Panels";

type Panel =
  | "start"
  | "active"
  | "plan"
  | "reflection"
  | "history"
  | "connect"
  | "data"
  | "ranks"
  | "manifest"
  | "sos";
type Change = (p: Program | ((current: Program) => Program)) => void;
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ScrollDashboard({
  p,
  now,
  update,
  sos,
  saveError = false,
  retrySave,
}: {
  p: Program;
  now: number;
  update: Change;
  sos: () => void;
  saveError?: boolean;
  retrySave?: () => void;
}) {
  const connection = useUsageConnection(p, update),
    data = attention(p),
    summary = attentionSummary(p, now),
    measurement = usageTimeline(p, now),
    rank = usageSummary(p, now);
  const [panel, setPanel] = React.useState<Panel | null>(null),
    [dirty, setDirty] = React.useState(false),
    [discard, setDiscard] = React.useState(false),
    [error, setError] = React.useState(""),
    [cancel, setCancel] = React.useState(false);
  const scroll = React.useRef<React.ComponentRef<typeof ScrollView>>(null),
    latest = React.useRef(p);
  latest.current = p;
  const dirtyChange = React.useCallback(
    (value: boolean) => setDirty(value),
    [],
  );
  const today = dayKey(new Date(now)),
    current = measurement.today,
    active = data.active;
  const [reflectionDay, setReflectionDay] = React.useState(today);
  const open = (value: Panel) => {
    setError("");
    setDiscard(false);
    setDirty(false);
    setCancel(false);
    if (value === "reflection") setReflectionDay(dayKey(new Date(Date.now())));
    setPanel(value);
  };
  const close = () => {
    if (dirty) {
      setDiscard(true);
      return;
    }
    setPanel(null);
    setError("");
    setCancel(false);
  };
  const change = (transform: (current: Program) => Program) => {
    try {
      const next = transform(latest.current);
      latest.current = next;
      update((current) => {
        try {
          return transform(current);
        } catch {
          return current;
        }
      });
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Změnu se nepodařilo provést.");
      return false;
    }
  };
  const remaining = active ? breakRemaining(active, now) : 0;
  const begin = (minutes: number, activity: string) => {
    const at = Date.now(),
      id = `attention-${at}-${Math.random().toString(36).slice(2, 9)}`;
    if (change((current) => beginBreak(current, minutes, activity, at, id))) {
      setDirty(false);
      setPanel("active");
    }
  };
  const finish = (completed: boolean) => {
    if (!active) return;
    const at = Date.now(),
      id = active.id;
    if (change((current) => endBreak(current, id, completed, at))) {
      setCancel(false);
      setPanel(null);
    }
  };
  const reflection = data.reflections[today];
  const mainStatus =
    connection.status === "connected"
      ? "Měření připojeno"
      : connection.status === "error"
        ? "Načtení měření selhalo"
        : connection.status === "permission"
          ? "Měření čeká na povolení"
          : connection.status === "loading"
            ? "Načítám měření"
            : "Měření není připojené";
  const storageNotice = saveError ? (
    <View
      style={{
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#7C3340",
        backgroundColor: "#2A1118",
      }}
    >
      <Text accessibilityRole="alert" style={s.error}>
        Změny se zatím neuložily. Nezavírej aplikaci a zkus zápis znovu.
      </Text>
      {retrySave && (
        <Action secondary title="Zkusit uložit změny" onPress={retrySave} />
      )}
    </View>
  ) : null;
  return (
    <>
      {storageNotice}
      <View style={{ gap: 18, paddingTop: 6 }}>
        <Text style={s.label}>MIMO FEED. ZPÁTKY V ŽIVOTĚ.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
          <View style={{ flex: 1, zIndex: 1, gap: 16 }}>
            <Text style={[s.heading, { fontSize: 35, lineHeight: 39 }]}>
              {active ? "Tahle chvíle\nje tvoje." : "Vrať si\npozornost."}
            </Text>
            <Text style={s.body}>
              {active
                ? active.activity
                : "Jedna věc mimo obrazovku. Začni malým odložením telefonu."}
            </Text>
          </View>
          <View style={{ marginRight: -16, marginLeft: -14 }}>
            <AttentionArtwork size={140} />
          </View>
        </View>
        {active ? (
          <View style={{ gap: 14 }}>
            <View style={s.between}>
              <Text style={s.label}>
                {remaining ? "PRÁVĚ BĚŽÍ" : "ČEKÁ NA POTVRZENÍ"}
              </Text>
              <Text style={[s.metric, { fontSize: 36 }]}>
                {time(remaining)}
              </Text>
            </View>
            <Action
              title={
                remaining ? "Pokračovat v mém bloku" : "Potvrdit dokončený blok"
              }
              onPress={() => open("active")}
            />
          </View>
        ) : (
          <Action
            title={`Odložit telefon · ${data.preferredMinutes} min`}
            onPress={() => open("start")}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Informace o měření Doomscrolling"
          onPress={() => open("connect")}
          style={[s.between, { minHeight: 44 }]}
        >
          <Text style={s.note}>
            {connection.status === "connected" ? "●" : "○"} {mainStatus}
          </Text>
          <Text style={s.link}>O měření →</Text>
        </Pressable>
      </View>

      {current && (
        <View style={s.section}>
          <SectionHeading
            title="Dnes v aplikacích"
            action="Detail"
            onPress={() => open("data")}
          />
          <View style={s.between}>
            <View>
              <Text
                style={[
                  s.metric,
                  {
                    fontSize: 52,
                    color:
                      current.minutes > p.limit
                        ? statusColors.failure
                        : "#F5F5F5",
                  },
                ]}
              >
                {Math.round(current.minutes)}
                <Text style={{ fontSize: 16, letterSpacing: 0 }}> min</Text>
              </Text>
              <Text style={s.muted}>z osobního cíle {p.limit} min</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 7 }}>
              <Text
                style={[
                  s.label,
                  {
                    color:
                      current.minutes > p.limit
                        ? statusColors.failure
                        : statusColors.success,
                  },
                ]}
              >
                {current.minutes > p.limit ? "NAD CÍLEM" : "ZATÍM V CÍLI"}
              </Text>
              <Text style={s.note}>
                {connection.status === "connected" ? "Načteno" : "Uložený údaj"}{" "}
                {new Date(current.measuredAt).toLocaleTimeString("cs-CZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: "#252525",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 4,
                width: `${Math.min(1, current.minutes / Math.max(1, p.limit)) * 100}%`,
                backgroundColor:
                  current.minutes > p.limit ? statusColors.failure : "#D8D8D8",
              }}
            />
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.label}>KDYŽ TĚ FEED TÁHNE ZPÁTKY</Text>
        <Text style={s.h2}>Zastav automatický pohyb.</Text>
        <Text style={s.body}>
          Pět minut pauzy před dalším příspěvkem. Tvoje důvody a podpora jsou po
          ruce.
        </Text>
        <EmergencyAction accessibilityLabel="SOS: Doomscrolling" onPress={sos}>
          <Text
            style={{
              color: "#FFF",
              fontSize: 15,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            Vystoupit z feedu · SOS
          </Text>
        </EmergencyAction>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Historie SOS Doomscrolling"
          onPress={() => open("sos")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={s.muted}>
            {p.triggers?.length ?? 0} návratů ze SOS · Otevřít historii →
          </Text>
        </Pressable>
      </View>

      <View style={s.section}>
        <SectionHeading
          title="Dnes pro sebe"
          action="Moje bloky"
          onPress={() => open("history")}
        />
        <View style={s.between}>
          <View style={{ gap: 8 }}>
            <Text style={s.metric}>
              {summary.todayMinutes}
              <Text style={{ fontSize: 15, letterSpacing: 0 }}> min</Text>
            </Text>
            <Text style={s.muted}>v potvrzených blocích</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Text style={s.metric}>{summary.today}</Text>
            <Text style={s.muted}>potvrzených odložení</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 7 }}>
          {summary.days.map((day) => (
            <View
              key={day.key}
              style={{ flex: 1, alignItems: "center", gap: 9 }}
            >
              <View
                style={{
                  width: "100%",
                  height: 38,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 19,
                  backgroundColor: day.count
                    ? statusColors.successSurface
                    : "#171717",
                  borderWidth: day.key === today ? 1 : 0,
                  borderColor: "#777",
                }}
              >
                <Text
                  style={{
                    color: day.count ? statusColors.successText : "#777",
                    fontSize: 12,
                  }}
                >
                  {day.count ? "✓" : new Date(`${day.key}T12:00:00`).getDate()}
                </Text>
              </View>
              <Text style={{ color: "#777", fontSize: 9 }}>
                {new Date(`${day.key}T12:00:00`).toLocaleDateString("cs-CZ", {
                  weekday: "short",
                })}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.note}>
          Tento týden {summary.weekMinutes} min v {summary.week} potvrzených
          blocích. Jde o vlastní potvrzení, ne systémové měření.
        </Text>
      </View>

      <View style={s.section}>
        <SectionHeading
          title="Můj další krok"
          action={data.plan.trigger ? "Upravit" : "Nastavit"}
          onPress={() => open("plan")}
        />
        {data.plan.trigger ? (
          <View
            style={{
              gap: 12,
              paddingLeft: 16,
              borderLeftWidth: 2,
              borderColor: "#555",
            }}
          >
            <Text style={s.label}>KDYŽ</Text>
            <Text style={s.h2}>{data.plan.trigger}</Text>
            <Text style={s.label}>MÍSTO FEEDU</Text>
            <Text style={s.body}>{data.plan.replacement}</Text>
          </View>
        ) : (
          <>
            <Text style={s.body}>
              Co uděláš, když přijde nuda, čekání nebo stres? Připrav si
              jednoduchou alternativu.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => open("plan")}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={s.link}>Sestavit můj plán →</Text>
            </Pressable>
          </>
        )}
        <View style={s.between}>
          <Text style={s.muted}>Osobní denní cíl</Text>
          <Text style={s.body}>{p.limit} min v aplikacích</Text>
        </View>
      </View>

      <View style={s.section}>
        <SectionHeading title="Na co máš teď prostor?" />
        <View style={{ gap: 0 }}>
          {[
            ["Procházka", "Všimni si něčeho kolem sebe."],
            ["Četba", "Pár stránek místo dalších příspěvků."],
            ["Jen klid", "Chvíle, kdy nemusíš nic sledovat."],
          ].map(([title, detail]) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              accessibilityLabel={`Odložit telefon: ${title}`}
              onPress={() => {
                if (active) open("active");
                else begin(data.preferredMinutes, title);
              }}
              style={[
                s.between,
                {
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderColor: "#ffffff0d",
                },
              ]}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{ color: "#DDD", fontSize: 18, fontWeight: "500" }}
                >
                  {title}
                </Text>
                <Text style={s.note}>{detail}</Text>
              </View>
              <Text style={s.link}>
                {active ? "Otevřít" : `${data.preferredMinutes} min`} ↗
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <SectionHeading
          title="Jaká byla tvoje pozornost?"
          action={reflection ? "Upravit" : "Zapsat"}
          onPress={() => open("reflection")}
        />
        {reflection ? (
          <>
            <Text style={s.metric}>
              {reflection.rating}
              <Text style={{ fontSize: 18, color: "#777", letterSpacing: 0 }}>
                {" "}
                / 5
              </Text>
            </Text>
            {!!reflection.note && <Text style={s.body}>{reflection.note}</Text>}
          </>
        ) : (
          <Text style={s.body}>
            Stačí krátké hodnocení a jedna věta. Postupně uvidíš, co ti pomáhá
            zůstat přítomný.
          </Text>
        )}
      </View>

      <View style={s.section}>
        <SectionHeading
          title="Tvoje data a rank"
          action="Statistiky"
          onPress={() => open("data")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Otevřít ranky Doomscrolling"
          onPress={() => open("ranks")}
          style={s.between}
        >
          <RankMark rank={rank.rank} size={45} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: "#E9E9E9", fontSize: 23, fontWeight: "500" }}>
              {ranks[rank.rank]}
            </Text>
            <Text style={s.note}>
              {rank.average === null
                ? `${rank.days.length}/7 dokončených dnů s měřením`
                : `Průměr ${minLabel(rank.average)} · 7 dní`}
            </Text>
          </View>
          <Text style={s.link}>↗</Text>
        </Pressable>
        {measurement.known.length > 0 ? (
          <UsageChart p={p} now={now} compact />
        ) : (
          <Text style={s.note}>
            Rank počká na úplná systémová data. Mezitím máš k dispozici vlastní
            plán, bloky a reflexi.
          </Text>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Otevřít osobní manifest Doomscrolling"
        onPress={() => open("manifest")}
        style={s.section}
      >
        <Text style={s.label}>MOJE PROČ</Text>
        <PersonalReasons value={p.reasons} compact />
      </Pressable>

      <DailyDetails
        id="scroll"
        kind={panel === "manifest" || panel === "sos" ? panel : null}
        p={p}
        now={now}
        close={() => setPanel(null)}
        update={(next) =>
          update((current) => ({ ...current, reasons: next.reasons }))
        }
      />
      <Modal
        visible={panel !== null && panel !== "manifest" && panel !== "sos"}
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={close}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Screen modal>
            <View
              style={[
                s.between,
                {
                  paddingHorizontal: 22,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: "#222",
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zavřít detail Doomscrolling"
                onPress={close}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingRight: 12,
                }}
              >
                <Text style={{ color: "#DDD", fontSize: 13 }}>← Zpět</Text>
              </Pressable>
              <Text style={s.label}>DOOMSCROLLING</Text>
            </View>
            <ScrollView
              ref={scroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: 22,
                paddingBottom: 40,
                gap: 22,
              }}
            >
              {storageNotice}
              {!!error && (
                <Text accessibilityRole="alert" style={s.error}>
                  {error}
                </Text>
              )}
              {discard && (
                <View style={{ gap: 22 }}>
                  <Text style={s.h2}>Zahodit rozepsané změny?</Text>
                  <Text style={s.body}>
                    Změny nejsou uložené. Můžeš v úpravách pokračovat.
                  </Text>
                  <Action
                    title="Pokračovat v úpravách"
                    onPress={() => setDiscard(false)}
                  />
                  <Action
                    secondary
                    title="Zahodit změny"
                    onPress={() => {
                      setDirty(false);
                      setDiscard(false);
                      setPanel(null);
                    }}
                  />
                </View>
              )}
              <View style={discard ? { display: "none" } : undefined}>
                {panel === "start" ? (
                  <BreakSetup p={p} onStart={begin} onDirty={dirtyChange} />
                ) : panel === "plan" ? (
                  <PlanEditor
                    p={p}
                    onDirty={dirtyChange}
                    onSave={(trigger, replacement, limit) => {
                      if (
                        change((current) =>
                          saveAttentionPlan(
                            current,
                            trigger,
                            replacement,
                            limit,
                          ),
                        )
                      ) {
                        setDirty(false);
                        setPanel(null);
                      }
                    }}
                  />
                ) : panel === "reflection" ? (
                  <ReflectionEditor
                    p={p}
                    day={reflectionDay}
                    onDirty={dirtyChange}
                    onSave={(rating, note) => {
                      const at = Date.now();
                      if (
                        change((current) =>
                          saveReflection(
                            current,
                            reflectionDay,
                            rating,
                            note,
                            at,
                          ),
                        )
                      ) {
                        setDirty(false);
                        setPanel(null);
                      }
                    }}
                  />
                ) : panel === "history" ? (
                  <AttentionHistory p={p} now={now} />
                ) : panel === "connect" ? (
                  <ConnectionPanel
                    connection={connection}
                    onBreak={() => open(active ? "active" : "start")}
                  />
                ) : panel === "data" ? (
                  <UsagePanel
                    p={p}
                    now={now}
                    onHistory={() => open("history")}
                    onConnect={() => open("connect")}
                  />
                ) : panel === "ranks" ? (
                  <ScrollRanks p={p} now={now} />
                ) : panel === "active" && active ? (
                  <View style={{ gap: 24 }}>
                    <Text style={s.label}>
                      {remaining ? "JEDNA VĚC. TVŮJ ČAS." : "ODPOČET JE HOTOVÝ"}
                    </Text>
                    <Text style={s.heading}>{active.activity}</Text>
                    <View style={{ alignItems: "center", paddingVertical: 12 }}>
                      <AttentionArtwork size={190} quiet />
                      <Text
                        style={{
                          color: "#F5F5F5",
                          fontSize: 66,
                          fontWeight: "500",
                          letterSpacing: -3,
                          fontVariant: ["tabular-nums"],
                          marginTop: -25,
                        }}
                      >
                        {time(remaining)}
                      </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: "#252525" }}>
                      <View
                        style={{
                          height: 4,
                          width: `${(1 - remaining / (active.durationMinutes * 60)) * 100}%`,
                          backgroundColor: "#DDD",
                        }}
                      />
                    </View>
                    <Text style={s.body}>
                      {remaining
                        ? "Telefon můžeš odložit. Odpočet pokračuje i mimo tuto obrazovku."
                        : "Byl jsi po dobu bloku mimo feed? Potvrď to podle toho, co se skutečně stalo."}
                    </Text>
                    {cancel ? (
                      <View style={{ gap: 16 }}>
                        <Text style={s.h2}>Ukončit bez potvrzení?</Text>
                        <Text style={s.body}>
                          Tento blok se nepřičte do potvrzených minut.
                        </Text>
                        <Action
                          title="Vrátit se k odpočtu"
                          onPress={() => setCancel(false)}
                        />
                        <Action
                          secondary
                          title="Ukončit blok bez potvrzení"
                          onPress={() => finish(false)}
                        />
                      </View>
                    ) : (
                      <>
                        <Action
                          title="Potvrdit pauzu mimo feed"
                          disabled={remaining > 0}
                          onPress={() => finish(true)}
                        />
                        <Action
                          secondary
                          title="Ukončit blok"
                          onPress={() => setCancel(true)}
                        />
                      </>
                    )}
                    <Text style={s.note}>
                      Potvrzený blok nemění naměřený čas ani rank. Aplikace
                      neověřuje používání ostatních aplikací.
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
