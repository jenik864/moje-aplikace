import React from "react";
import {
  AppState,
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
import { type Program, ranks, rankOf } from "../model";
import { Screen, rankColors } from "../ui";
import { RankMark } from "../porn/visuals";
import { tint } from "../porn/theme";
import { dailyStyles } from "../daily/styles";
import { DailyDetails } from "../daily/Details";
import { usageSummary, timeThresholds } from "./scoring";
import { usageNative } from "./native";
import { palette } from "../design";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
const minutesLabel = (minutes: number | null) =>
  minutes === null ? "—" : `${Math.round(minutes)} min`;
const monitored =
  "Instagram · TikTok · YouTube · Facebook · X · Reddit · Snapchat · Threads · Pinterest · Twitch · Discord";
export function ScrollDashboard({
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
  const stats = usageSummary(p, now),
    rank = rankOf("scroll", p, now),
    accent = palette.Quit;
  const s = dailyStyles(accent);
  const [panel, setPanel] = React.useState<
    "connect" | "ranks" | "data" | "manifest" | "sos" | null
  >(null);
  const [preview, setPreview] = React.useState(rank);
  const [status, setStatus] = React.useState<
    "unsupported" | "permission" | "connected" | "error" | "loading"
  >(usageNative ? "loading" : "unsupported");
  const [busy, setBusy] = React.useState(false);
  const latest = React.useRef({ p, update });
  latest.current = { p, update };
  const lock = React.useRef(false);
  const refresh = React.useCallback(async () => {
    if (!usageNative || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!(await usageNative.hasPermission())) {
        setStatus("permission");
        return;
      }
      const rows = await usageNative.readUsage();
      const usageDays = { ...latest.current.p.usageDays };
      for (const row of rows)
        if (
          row.source === "android-usage" &&
          Number.isFinite(row.minutes) &&
          row.minutes >= 0 &&
          row.minutes <= 1440
        )
          usageDays[row.key] = row;
      const next = {
        ...latest.current.p,
        usageDays,
        screenTimeVersion: 1 as const,
      };
      next.prime = Math.max(next.prime, usageSummary(next, Date.now()).rank);
      latest.current.update(next);
      setStatus("connected");
    } catch {
      setStatus("error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  React.useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 60000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  const open = (value: typeof panel) => {
    setPreview(rank);
    setPanel(value);
  };
  const button = (value: typeof panel, name: string) => ({
    accessibilityRole: "button" as const,
    accessibilityLabel: name,
    onPress: () => open(value),
  });
  const current = status === "connected" ? stats.today : null;
  const over = current !== null && current.minutes > p.limit;
  const max = Math.max(
    p.limit,
    ...stats.days.map((d) => d.minutes),
    current?.minutes ?? 0,
    1,
  );
  const description =
    status === "connected"
      ? "Čas načtený ze systému Android"
      : status === "permission"
        ? "Měření čeká na tvoje povolení"
        : status === "error"
          ? "Měření se nepodařilo načíst"
          : status === "loading"
            ? "Načítám měření…"
            : "Systémové měření není připojené";
  const chart = (expanded = false) => (
    <View style={{ gap: 16 }}>
      <View
        style={[
          s.row,
          { alignItems: "flex-end", gap: 6, height: expanded ? 180 : 112 },
        ]}
      >
        {stats.keys.map((key) => {
          const day = stats.days.find((d) => d.key === key);
          return (
            <View key={key} style={{ flex: 1, alignItems: "center", gap: 9 }}>
              <View
                style={{
                  width: "100%",
                  height: expanded ? 145 : 80,
                  justifyContent: "flex-end",
                  borderBottomWidth: 1,
                  borderColor: "#393338",
                }}
              >
                {day ? (
                  <View
                    style={{
                      height: Math.max(
                        3,
                        (day.minutes / max) * (expanded ? 145 : 80),
                      ),
                      borderRadius: 2,
                      backgroundColor:
                        day.minutes > p.limit ? "#ee8a9b" : accent,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      height: 4,
                      borderRadius: 3,
                      backgroundColor: "#393338",
                    }}
                  />
                )}
              </View>
              <Text style={{ color: "#a8a0a4", fontSize: 10 }}>
                {Number(key.slice(-2))}.
              </Text>
              {expanded && (
                <Text
                  style={{ color: day ? "#eee3dc" : "#a8a0a4", fontSize: 10 }}
                >
                  {day ? Math.round(day.minutes) : "—"}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <Text style={s.muted}>
        {stats.days.length
          ? "Minuty za dokončené dny. Pomlčka znamená chybějící měření."
          : "První sloupce se objeví po načtení skutečného času. Chybějící data nepočítáme jako nulu."}
      </Text>
    </View>
  );
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>MIMO FEED. ZPÁTKY V ŽIVOTĚ.</Text>
        <Text style={s.heading}>Doomscrolling</Text>
      </View>
      <View
        style={[
          s.card,
          {
            backgroundColor: "transparent",
            borderColor: "#ffffff16",
            paddingVertical: 24,
            paddingHorizontal: 0,
            gap: 22,
          },
        ]}
      >
        <View style={s.row}>
          <Text style={s.label}>DNES V APLIKACÍCH</Text>
          <Text
            style={[
              s.muted,
              { color: status === "connected" ? accent : "#b7adb7" },
            ]}
          >
            {status === "connected" ? "● MĚŘENO" : "○ NEPŘIPOJENO"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: over ? "#ffb0bd" : "#f3f5f2",
                fontSize:
                  current && String(Math.round(current.minutes)).length > 3
                    ? 58
                    : current && String(Math.round(current.minutes)).length > 2
                      ? 72
                      : 92,
                fontWeight: "400",
                letterSpacing: -5,
                fontVariant: ["tabular-nums"],
              }}
            >
              {current ? Math.round(current.minutes) : "—"}
            </Text>
            <Text style={[s.body, { fontSize: 18, color: "#79BDFF" }]}>
              minut pozornosti
            </Text>
          </View>
          <AttentionOrbit
            minutes={current?.minutes ?? null}
            limit={p.limit}
            accent={accent}
            over={over}
          />
        </View>
        <Text style={s.muted}>{description}</Text>
        <View
          accessible
          accessibilityLabel={
            current
              ? `Dnes ${Math.round(current.minutes)} minut z cíle ${p.limit} minut`
              : "Bez systémového měření; denní cíl nelze vyhodnotit"
          }
          style={{ gap: 12 }}
        >
          <View style={{ height: 2, backgroundColor: "#ffffff14" }}>
            {current ? (
              <View
                style={{
                  height: 2,
                  width: `${Math.min(1, current.minutes / Math.max(1, p.limit)) * 100}%`,
                  backgroundColor: over ? "#ee8a9b" : accent,
                }}
              />
            ) : null}
          </View>
          <View style={s.row}>
            <Text style={s.muted}>
              {current ? "Dnešní naměřený čas" : "Čeká na měření"}
            </Text>
            <Text style={[s.muted, { color: accent }]}>
              Denní cíl · {p.limit} min
            </Text>
          </View>
        </View>
        <Text style={s.body}>
          {!current
            ? "Kolik pozornosti dnes dostal feed?"
            : over
              ? `Dnes o ${Math.round(current.minutes - p.limit)} min nad cílem.`
              : `Do dnešního cíle zbývá ${Math.max(0, Math.round(p.limit - current.minutes))} min.`}
        </Text>
        <Pressable
          {...button("connect", "Připojit měření času")}
          style={s.button}
        >
          <Text style={s.buttonText}>
            {status === "connected"
              ? "SPRAVOVAT MĚŘENÍ"
              : "PŘIPOJIT MĚŘENÍ ČASU"}
          </Text>
        </Pressable>
      </View>
      <Pressable
        {...button("ranks", "Otevřít ranky Doomscrolling")}
        style={[s.card, s.row]}
      >
        <RankMark rank={rank} size={52} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.label}>
            {stats.average === null
              ? "VÝCHOZÍ RANK"
              : "RANK PODLE SKUTEČNÉHO ČASU"}
          </Text>
          <Text style={[s.value, { color: rankColors[rank] }]}>
            {ranks[rank]}
          </Text>
          <Text style={s.muted}>
            {stats.average === null
              ? `${stats.days.length} / 7 dnů systémového měření`
              : `Průměr ${Math.round(stats.average)} min / den · 7 dní`}
          </Text>
        </View>
        <Text style={s.link}>›</Text>
      </Pressable>
      <Pressable
        {...button("data", "Otevřít statistiky Doomscrolling")}
        style={s.card}
      >
        <View style={s.row}>
          <Text style={s.label}>STOPA TVOJÍ POZORNOSTI</Text>
          <Text style={s.muted}>7 DNÍ</Text>
        </View>
        {chart()}
        <Text style={s.link}>PROHLÉDNOUT ČAS ›</Text>
      </Pressable>
      <View
        style={[
          s.card,
          {
            backgroundColor: "transparent",
            borderColor: "#79BDFF55",
            borderLeftWidth: 2,
            paddingLeft: 18,
            gap: 18,
          },
        ]}
      >
        <Text style={[s.label, { color: accent }]}>PŘERUŠ NEKONEČNÝ FEED</Text>
        <Text style={s.title}>Další příspěvek může počkat.</Text>
        <Text style={s.body}>
          Pět minut mimo obrazovku. Vyber si, co uděláš místo scrollování.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="SOS: Doomscrolling"
          onPress={() => sos()}
          style={[s.button, { backgroundColor: "#79BDFF" }]}
        >
          <Text style={s.buttonText}>ODLOŽIT TELEFON · 5 MIN</Text>
        </Pressable>
      </View>
      <Pressable
        {...button("connect", "Zobrazit sledované aplikace")}
        style={s.card}
      >
        <Text style={s.label}>CO SE POČÍTÁ</Text>
        <Text style={s.body}>{monitored}</Text>
        <Text style={s.muted}>
          Čas v těchto nativních aplikacích. Weby v prohlížeči zatím měřit
          neumíme. Seznam pro rank je pevný.
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          {...button("manifest", "Otevřít osobní manifest Doomscrolling")}
          style={s.metric}
        >
          <Text style={s.label}>MOJE PROČ ›</Text>
          <Text numberOfLines={3} style={s.body}>
            {p.reasons}
          </Text>
        </Pressable>
        <Pressable {...button("sos", "Otevřít záznamy SOS")} style={s.metric}>
          <Text style={s.label}>PAUZY OD FEEDU ›</Text>
          <Text style={s.value}>{p.triggers?.length ?? 0}</Text>
          <Text style={s.muted}>Nemění naměřený čas ani rank.</Text>
        </Pressable>
      </View>
      <DailyDetails
        id="scroll"
        kind={panel === "manifest" || panel === "sos" ? panel : null}
        p={p}
        now={now}
        update={update}
        close={() => setPanel(null)}
      />
      <Modal
        visible={panel === "connect" || panel === "ranks" || panel === "data"}
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
              <Text style={s.label}>DOOMSCROLLING</Text>
            </View>
            <ScrollView contentContainerStyle={s.content}>
              <Text style={s.heading}>
                {panel === "connect"
                  ? "Skutečný čas."
                  : panel === "ranks"
                    ? "Rank za tvoji pozornost."
                    : "Tvoje pozornost v číslech."}
              </Text>
              {panel === "connect" ? (
                <>
                  <View style={s.card}>
                    <Text style={s.title}>
                      {status === "connected"
                        ? "Systémové měření připojeno"
                        : "Propoj čas z telefonu"}
                    </Text>
                    <Text style={s.body}>
                      {Platform.OS === "ios"
                        ? "Na iPhonu potřebujeme integraci Apple Screen Time ve vlastní aplikaci. V této verzi ještě není k dispozici. Ruční zápisy rank nezvyšují."
                        : !usageNative
                          ? "Automatické měření potřebuje vlastní Android sestavení. Expo Go tento modul neobsahuje. Ruční zápisy rank nezvyšují."
                          : "Povol Quitteru přístup k údajům o používání aplikací v nastavení Androidu. Po návratu načteme čas za posledních sedm dní a dnešek."}
                    </Text>
                    {usageNative && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={async () => {
                          try {
                            await usageNative?.openSettings();
                          } catch {
                            setStatus("error");
                          }
                        }}
                        style={s.button}
                      >
                        <Text style={s.buttonText}>
                          OTEVŘÍT NASTAVENÍ PŘÍSTUPU
                        </Text>
                      </Pressable>
                    )}
                    {usageNative && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => void refresh()}
                        style={s.button}
                      >
                        <Text style={s.buttonText}>
                          {busy ? "NAČÍTÁM…" : "ZNOVU NAČÍST MĚŘENÍ"}
                        </Text>
                      </Pressable>
                    )}
                    {status === "error" && (
                      <Text style={s.body}>
                        Načtení selhalo. Zkontroluj přístup a zkus to znovu;
                        předchozí měření zůstalo uložené.
                      </Text>
                    )}
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>ROZSAH MĚŘENÍ</Text>
                    <Text style={s.body}>{monitored}</Text>
                    <Text style={s.muted}>
                      Počítá se čas aplikace v popředí. Měření nepozná, zda
                      uvnitř aplikace sleduješ feed nebo třeba vzdělávací video.
                      Data zůstávají v telefonu. Nečteme zprávy ani obsah
                      příspěvků.
                    </Text>
                  </View>
                </>
              ) : panel === "data" ? (
                <>
                  <View style={s.card}>
                    <Text style={s.label}>PRŮMĚR ZA 7 DOKONČENÝCH DNÍ</Text>
                    <Text style={s.value}>{minutesLabel(stats.average)}</Text>
                    <Text style={s.muted}>
                      {stats.days.length} / 7 dní se systémovými údaji. Dnešek
                      do průměru nevstupuje.
                    </Text>
                    {chart(true)}
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>DNES PODLE APLIKACÍ</Text>
                    {current?.apps.length ? (
                      current.apps
                        .slice()
                        .sort((a, b) => b.minutes - a.minutes)
                        .map((app, i) => (
                          <View key={`${app.name}-${i}`} style={s.row}>
                            <Text style={s.body}>{app.name}</Text>
                            <Text style={s.body}>
                              {minutesLabel(app.minutes)}
                            </Text>
                          </View>
                        ))
                    ) : (
                      <Text style={s.body}>
                        {current
                          ? "Zatím žádný naměřený čas ve sledovaných aplikacích."
                          : "Zatím bez dnešního systémového měření."}
                      </Text>
                    )}
                  </View>
                  <View style={s.card}>
                    <Text style={s.label}>STARŠÍ RUČNÍ ZÁPISY</Text>
                    <Text style={s.muted}>
                      Zachované v historii, bez vlivu na nový rank.
                    </Text>
                    {Object.entries(p.dailyLogs ?? {}).length ? (
                      Object.entries(p.dailyLogs ?? {})
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([key, day]) => (
                          <View key={key} style={s.row}>
                            <Text style={s.body}>{key}</Text>
                            <Text style={s.muted}>
                              {minutesLabel(day.minutes ?? null)} · ručně
                            </Text>
                          </View>
                        ))
                    ) : (
                      <Text style={s.muted}>Žádné ruční zápisy.</Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={s.body}>
                    Rank určuje průměr skutečného času v sociálních aplikacích
                    za posledních 7 dokončených dní. Nižší čas znamená vyšší
                    rank. Potřebujeme všech 7 dní; chybějící data nenahrazujeme
                    nulou.
                  </Text>
                  <View style={s.card}>
                    <Text style={s.label}>TVŮJ PRŮMĚR</Text>
                    <Text style={s.value}>{minutesLabel(stats.average)}</Text>
                    <Text style={s.muted}>
                      Denní cíl je tvoje pomůcka. Jeho zvýšením rank nezískáš.
                      PRIME uchovává nejlepší rank z měření.
                    </Text>
                    <Text
                      style={[
                        s.title,
                        { color: rankColors[Math.max(rank, p.prime)] },
                      ]}
                    >
                      PRIME · {ranks[Math.max(rank, p.prime)]}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.card,
                      {
                        alignItems: "center",
                        borderColor: tint(rankColors[preview], 0.4),
                      },
                    ]}
                  >
                    <RankMark rank={preview} size={150} />
                    <Text style={[s.value, { color: rankColors[preview] }]}>
                      {ranks[preview]}
                    </Text>
                    <Text style={s.body}>
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
                        s.card,
                        s.row,
                        {
                          borderColor:
                            i === rank ? tint(accent, 0.5) : "#2b2728",
                        },
                      ]}
                    >
                      <RankMark rank={i} size={52} />
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={[s.title, { color: rankColors[i] }]}>
                          {name}
                        </Text>
                        <Text style={s.muted}>
                          {i === 0
                            ? "Výchozí rank"
                            : `≤ ${timeThresholds[i]} min / den · 7 dní`}
                        </Text>
                      </View>
                      <Text style={{ color: accent, fontSize: 9 }}>
                        {i === rank
                          ? "CURRENT"
                          : i <= p.prime
                            ? "DOSAŽENO"
                            : "UZAMČENO"}
                      </Text>
                    </Pressable>
                  ))}
                  {p.legacyScrollPrime !== undefined && (
                    <Text style={s.muted}>
                      Původní rekord z ručních potvrzení:{" "}
                      {ranks[p.legacyScrollPrime]}. Je uložený odděleně od
                      nového PRIME.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </Screen>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function AttentionOrbit({
  minutes,
  limit,
  accent,
  over,
}: {
  minutes: number | null;
  limit: number;
  accent: string;
  over: boolean;
}) {
  const id = `attention${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ratio =
    minutes === null
      ? null
      : Math.max(0, Math.min(1, minutes / Math.max(1, limit)));
  return (
    <Svg width={124} height={136} viewBox="0 0 140 150" accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={over ? "#ffb0bd" : accent} />
          <Stop offset="1" stopColor="#79BDFF" />
        </LinearGradient>
      </Defs>
      <Circle
        cx="70"
        cy="70"
        r="55"
        stroke="#ffffff12"
        strokeWidth="1"
        fill="none"
      />
      <Circle
        cx="70"
        cy="70"
        r="45"
        stroke="#79BDFF30"
        strokeWidth="1"
        fill="none"
        strokeDasharray={ratio === null ? "2 8" : undefined}
      />
      {ratio !== null ? (
        <Circle
          cx="70"
          cy="70"
          r="55"
          stroke={`url(#${id})`}
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${ratio * 345.6} 345.6`}
          strokeLinecap="round"
          rotation="-90"
          origin="70,70"
        />
      ) : null}
      <Path
        d="M46 70H94M70 46V94M55 55L85 85M85 55L55 85"
        stroke="#79BDFF"
        strokeWidth="1"
        strokeOpacity=".45"
      />
      <Circle
        cx="70"
        cy="70"
        r="13"
        stroke={`url(#${id})`}
        strokeWidth="2"
        fill="#070A12"
      />
      <Circle
        cx="70"
        cy="70"
        r="3"
        fill={ratio === null ? "#79BDFF" : accent}
      />
      <Path d="M58 137H82" stroke={accent} strokeWidth="2" />
    </Svg>
  );
}
