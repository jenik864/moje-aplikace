import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import type { Program } from "../model";
import { ranks, dayKey } from "../model";
import { RankMark } from "../porn/visuals";
import { rankColors } from "../ui";
import { statusColors } from "../statusColors";
import { usageSummary, timeThresholds } from "./scoring";
import { monitoredApps, usageTimeline } from "./insights";
import { attention, attentionSummary } from "./attention";
import { Action, Option, s } from "./components";
import type { useUsageConnection } from "./useUsageConnection";
export const minLabel = (n: number | null) =>
  n === null ? "—" : `${Math.round(n)} min`;
export function UsageChart({
  p,
  now,
  days = 7,
  compact = false,
  onSelect,
}: {
  p: Program;
  now: number;
  days?: number;
  compact?: boolean;
  onSelect?: (key: string) => void;
}) {
  const data = usageTimeline(p, now, days),
    height = compact ? 86 : 132;
  const max = Math.max(p.limit, 1, ...data.known.map((row) => row.minutes));
  if (!data.known.length)
    return (
      <View style={{ gap: 8 }}>
        <Text style={s.body}>Systémové údaje zatím nejsou k dispozici.</Text>
        <Text style={s.note}>
          Pauzy, plán a reflexi můžeš používat už teď. Prázdné dny nevydáváme za
          nulový čas.
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          height: height + 42,
          flexDirection: "row",
          gap: days > 14 ? 3 : 7,
          alignItems: "flex-end",
        }}
      >
        {data.rows.map((row, i) => {
          const color = row.record
            ? row.record.minutes <= p.limit
              ? statusColors.success
              : statusColors.failure
            : "#666";
          return (
            <Pressable
              key={row.key}
              accessibilityRole={onSelect ? "button" : undefined}
              aria-hidden={!onSelect || undefined}
              accessibilityLabel={`Čas dne ${row.date.toLocaleDateString("cs-CZ")}`}
              accessibilityValue={{
                text: row.record
                  ? minLabel(row.record.minutes)
                  : "Chybí měření",
              }}
              onPress={() => onSelect?.(row.key)}
              disabled={!onSelect}
              accessible={!!onSelect}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  height,
                  width: "100%",
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                {row.record ? (
                  <View
                    style={{
                      width: "80%",
                      height: Math.max(
                        2,
                        (row.record.minutes / max) * (height - 4),
                      ),
                      backgroundColor: color,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                ) : (
                  <Text style={{ color: "#555", fontSize: 12 }}>—</Text>
                )}
              </View>
              <Text style={{ color: "#858585", fontSize: 9 }}>
                {days <= 7 || i === 0 || i === days - 1
                  ? `${row.date.getDate()}.`
                  : ""}
              </Text>
              {!compact && days <= 14 && (
                <Text
                  style={{ color: row.record ? "#AAA" : "#555", fontSize: 9 }}
                >
                  {row.record ? Math.round(row.record.minutes) : "—"}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={s.note}>
        {data.known.length}/{days} dokončených dnů s měřením. Zelená a červená
        porovnávají čas se současným osobním cílem {p.limit} min.
      </Text>
    </View>
  );
}
export function UsagePanel({
  p,
  now,
  onHistory,
  onConnect,
}: {
  p: Program;
  now: number;
  onHistory: () => void;
  onConnect: () => void;
}) {
  const [days, setDays] = React.useState(7),
    [selected, setSelected] = React.useState<string | null>(null),
    data = usageTimeline(p, now, days),
    rankData = usageSummary(p, now);
  const selectedRow = selected
    ? data.rows.find((row) => row.key === selected)?.record
    : null;
  const detail = selected
    ? selectedRow
    : (data.today ?? data.known[data.known.length - 1]);
  return (
    <View style={{ gap: 26 }}>
      <Text style={s.heading}>Čas, který znáš.</Text>
      <Text style={s.body}>
        Skutečné údaje z telefonu. Ručně potvrzené pauzy jsou v samostatném
        přehledu.
      </Text>
      <View style={s.row}>
        {[7, 14, 28].map((n) => (
          <Option
            key={n}
            title={`${n} dní`}
            selected={days === n}
            onPress={() => {
              setDays(n);
              setSelected(null);
            }}
          />
        ))}
      </View>
      {!data.known.length && !data.today ? (
        <View style={s.section}>
          <Text style={s.h2}>Zatím bez systémového měření.</Text>
          <Text style={s.body}>Systémové údaje zatím nejsou k dispozici.</Text>
          <Text style={s.muted}>
            Bez připojení nemůžeme vyhodnotit čas v aplikacích. Tvoje potvrzené
            bloky a reflexe ale už mají vlastní historii.
          </Text>
          <Action title="Moje potvrzené bloky" onPress={onHistory} />
          <Action secondary title="Možnosti měření" onPress={onConnect} />
        </View>
      ) : (
        <>
          <View style={s.section}>
            <Text style={s.label}>PRŮMĚR ZAZNAMENANÝCH DNÍ</Text>
            <Text style={s.metric}>{minLabel(data.average)}</Text>
            <Text style={s.muted}>
              {data.known.length}/{days} dnů s údaji · pro rank je vždy nutných
              všech 7 posledních dokončených dní.
            </Text>
            <UsageChart p={p} now={now} days={days} onSelect={setSelected} />
          </View>
          <View style={s.between}>
            <View style={{ gap: 8 }}>
              <Text style={s.label}>DNŮ V OSOBNÍM CÍLI</Text>
              <Text style={s.metric}>
                {data.known.length
                  ? `${data.withinGoal}/${data.known.length}`
                  : "—"}
              </Text>
            </View>
            <View style={{ gap: 8, alignItems: "flex-end" }}>
              <Text style={s.label}>PRŮMĚR PRO RANK</Text>
              <Text style={s.metric}>{minLabel(rankData.average)}</Text>
            </View>
          </View>
          <View style={s.section}>
            <Text style={s.h2}>Podle aplikací</Text>
            {detail ? (
              <>
                <Text style={s.muted}>
                  {new Date(`${detail.key}T12:00:00`).toLocaleDateString(
                    "cs-CZ",
                    {
                      day: "numeric",
                      month: "long",
                    },
                  )}{" "}
                  · {minLabel(detail.minutes)}
                </Text>
                {detail.apps.length ? (
                  detail.apps
                    .slice()
                    .sort((a, b) => b.minutes - a.minutes)
                    .map((app, i) => (
                      <View key={`${app.name}-${i}`} style={{ gap: 9 }}>
                        <View style={s.between}>
                          <Text style={s.body}>{app.name}</Text>
                          <Text style={s.body}>{minLabel(app.minutes)}</Text>
                        </View>
                        <View style={{ height: 3, backgroundColor: "#252525" }}>
                          <View
                            style={{
                              height: 3,
                              width: `${Math.min(1, app.minutes / Math.max(1, detail.minutes)) * 100}%`,
                              backgroundColor: "#AAA",
                            }}
                          />
                        </View>
                      </View>
                    ))
                ) : (
                  <Text style={s.body}>
                    Telefon pro tento den nevrátil rozpis aplikací.
                  </Text>
                )}
              </>
            ) : (
              <Text style={s.body}>
                {selected
                  ? "Pro vybraný den chybí měření."
                  : "Zatím není uložený žádný rozpis. Po připojení měření uvidíš konkrétní aplikace."}
              </Text>
            )}
          </View>
        </>
      )}
      {!!Object.keys(p.dailyLogs ?? {}).length && (
        <View style={s.section}>
          <Text style={s.h2}>Starší vlastní zápisy</Text>
          <Text style={s.note}>
            Archiv původních ručních údajů. Rank se z nich nepočítá.
          </Text>
          {Object.entries(p.dailyLogs ?? {})
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 30)
            .map(([key, d]) => (
              <View key={key} style={s.between}>
                <Text style={s.body}>{key}</Text>
                <Text style={s.muted}>
                  {minLabel(d.minutes ?? null)} · ručně
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
export function ConnectionPanel({
  connection,
  onBreak,
}: {
  connection: ReturnType<typeof useUsageConnection>;
  onBreak: () => void;
}) {
  return (
    <View style={{ gap: 26 }}>
      <Text style={s.heading}>Propoj skutečný čas.</Text>
      <View style={s.section}>
        <Text style={s.h2}>
          {connection.status === "connected"
            ? "Měření je připojené"
            : connection.supported
              ? "Přístup k používání aplikací"
              : "Co už můžeš používat"}
        </Text>
        <Text style={s.body}>
          {connection.supported
            ? "Povol přístup v nastavení telefonu a vrať se sem. Načteme dostupné systémové záznamy; chybějící dny nebudeme doplňovat nulou."
            : Platform.OS === "ios"
              ? "Na tomto iPhonu automatické měření zatím není dostupné. Odložení telefonu, osobní plán a reflexe ale fungují i bez něj."
              : "Tato verze automatické měření neobsahuje. Je dostupné ve vlastní Android aplikaci s povoleným přístupem k používání. Pauzy, plán a reflexe fungují už teď."}
        </Text>
        {connection.supported ? (
          <>
            <Action
              title="Otevřít nastavení přístupu"
              onPress={() => void connection.openSettings()}
            />
            <Action
              title={
                connection.busy ? "Načítám měření…" : "Znovu načíst měření"
              }
              secondary
              disabled={connection.busy}
              onPress={() => void connection.refresh()}
            />
          </>
        ) : (
          <Action title="Připravit pauzu od telefonu" onPress={onBreak} />
        )}
        {connection.status === "error" && (
          <Text accessibilityRole="alert" style={s.error}>
            Načtení se nepodařilo. Uložené údaje zůstaly zachované. Zkontroluj
            přístup a zkus to znovu.
          </Text>
        )}
      </View>
      <View style={s.section}>
        <Text style={s.label}>SLEDOVANÉ APLIKACE</Text>
        <View style={s.row}>
          {monitoredApps.map((name) => (
            <View
              key={name}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 11,
                borderWidth: 1,
                borderColor: "#2D2D2D",
                borderRadius: 18,
              }}
            >
              <Text style={{ color: "#BBB", fontSize: 12 }}>{name}</Text>
            </View>
          ))}
        </View>
        <Text style={s.note}>
          Počítá se čas v těchto aplikacích, včetně vzdělávacího obsahu. Měření
          nerozpozná samotný feed a nezahrnuje weby v prohlížeči. Zprávy ani
          příspěvky nečteme.
        </Text>
      </View>
      <Text style={s.muted}>
        Rank vychází ze systémového průměru. Pauza ani vlastní zápis nevytvoří
        naměřený čas.
      </Text>
    </View>
  );
}
export function AttentionHistory({ p, now }: { p: Program; now: number }) {
  const [count, setCount] = React.useState(20),
    data = attention(p),
    summary = attentionSummary(p, now);
  const sessions = data.sessions
    .filter((row) => row.endedAt <= now)
    .slice()
    .sort((a, b) => b.endedAt - a.endedAt);
  const reflections = Object.entries(data.reflections)
    .filter(([day, r]) => day <= dayKey(new Date(now)) && r.at <= now)
    .sort(([a], [b]) => b.localeCompare(a));
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.heading}>Chvíle, které sis vybral.</Text>
      <View style={s.between}>
        <View style={{ gap: 7 }}>
          <Text style={s.label}>POTVRZENÉ BLOKY</Text>
          <Text style={s.metric}>{summary.completed.length}</Text>
        </View>
        <View style={{ gap: 7, alignItems: "flex-end" }}>
          <Text style={s.label}>POSLEDNÍCH 7 DNÍ</Text>
          <Text style={s.metric}>{summary.weekMinutes} min</Text>
        </View>
      </View>
      <Text style={s.note}>
        Čas je délka bloků, které jsi sám potvrdil. Není to systémově měřený čas
        bez telefonu.
      </Text>
      <View style={s.section}>
        <Text style={s.h2}>Moje bloky</Text>
        {sessions.length ? (
          sessions.slice(0, count).map((row) => (
            <View
              key={row.id}
              style={{
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: "#ffffff10",
                gap: 8,
              }}
            >
              <View style={s.between}>
                <Text
                  style={[
                    s.body,
                    { flex: 1, color: "#EEE", fontWeight: "500" },
                  ]}
                >
                  {row.activity}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      row.outcome === "completed"
                        ? statusColors.success
                        : "#888",
                  }}
                >
                  {row.outcome === "completed"
                    ? `${row.durationMinutes} min ✓`
                    : "Bez potvrzení"}
                </Text>
              </View>
              <Text style={s.muted}>
                {new Date(row.startedAt).toLocaleString("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))
        ) : (
          <Text style={s.body}>
            První potvrzený blok se tu objeví po dokončení odpočtu. Předčasně
            ukončené bloky se do minut nepočítají.
          </Text>
        )}
        {sessions.length > count && (
          <Action
            secondary
            title="Zobrazit další bloky"
            onPress={() => setCount((v) => v + 20)}
          />
        )}
      </View>
      <View style={s.section}>
        <Text style={s.h2}>Moje reflexe</Text>
        {reflections.length ? (
          reflections.slice(0, 14).map(([day, r]) => (
            <View
              key={day}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: "#ffffff12",
                gap: 9,
              }}
            >
              <View style={s.between}>
                <Text style={s.muted}>
                  {new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ")}
                </Text>
                <Text style={{ color: "#DDD", fontSize: 13 }}>
                  Pozornost {r.rating}/5
                </Text>
              </View>
              {!!r.note && <Text style={s.body}>{r.note}</Text>}
            </View>
          ))
        ) : (
          <Text style={s.body}>
            Zatím bez reflexe. Jedna věta denně může ukázat, co ti pomáhá.
          </Text>
        )}
      </View>
    </View>
  );
}
export function ScrollRanks({ p, now }: { p: Program; now: number }) {
  const stats = usageSummary(p, now),
    rank = stats.rank,
    [preview, setPreview] = React.useState(rank);
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.heading}>Rank za pozornost.</Text>
      <Text style={s.body}>
        Rozhoduje průměr za všech 7 posledních dokončených dnů se systémovým
        měřením. Čím méně času ve sledovaných aplikacích, tím vyšší rank.
      </Text>
      <View style={s.between}>
        <View style={{ gap: 7 }}>
          <Text style={s.label}>PRŮMĚR PRO RANK</Text>
          <Text style={s.metric}>{minLabel(stats.average)}</Text>
          <Text style={s.note}>{stats.days.length}/7 dnů s měřením</Text>
        </View>
        <View style={{ gap: 7, alignItems: "flex-end" }}>
          <Text style={s.label}>PRIME</Text>
          <Text
            style={{ color: rankColors[Math.max(rank, p.prime)], fontSize: 19 }}
          >
            {ranks[Math.max(rank, p.prime)]}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 24, gap: 12 }}>
        <RankMark rank={preview} size={130} />
        <Text
          style={{
            color: rankColors[preview],
            fontSize: 28,
            fontWeight: "500",
          }}
        >
          {ranks[preview]}
        </Text>
        <Text style={s.muted}>
          {preview === 0
            ? "Výchozí rank"
            : `Průměr nejvýše ${timeThresholds[preview]} min / den`}
        </Text>
      </View>
      {ranks.map((name, i) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          accessibilityLabel={`Náhled emblému ${name}`}
          accessibilityState={{ selected: preview === i }}
          onPress={() => setPreview(i)}
          style={[
            s.between,
            {
              minHeight: 76,
              borderBottomWidth: 1,
              borderColor: "#222",
              paddingVertical: 14,
            },
          ]}
        >
          <RankMark rank={i} size={40} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: "#EEE", fontSize: 19 }}>{name}</Text>
            <Text style={s.note}>
              {i ? `≤ ${timeThresholds[i]} min / den` : "Výchozí rank"}
            </Text>
          </View>
          <Text style={s.label}>
            {i === rank
              ? "CURRENT"
              : i === Math.max(rank, p.prime)
                ? "PRIME"
                : i <= p.prime
                  ? "DOSAŽENO"
                  : "NÁHLED"}
          </Text>
        </Pressable>
      ))}
      <Text style={s.note}>
        Tvůj osobní cíl je pomůcka, ne hranice ranků. Změna cíle, reflexe ani
        potvrzená pauza rank nezvyšují.
      </Text>
      {p.legacyScrollPrime !== undefined && (
        <Text style={s.note}>
          Starší rekord z ručních zápisů: {ranks[p.legacyScrollPrime]}. Je
          uložený odděleně.
        </Text>
      )}
    </View>
  );
}
