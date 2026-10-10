import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen, rankColors } from "../ui";
import { protocolRemaining } from "../model";
import { dailyStyles } from "../daily/styles";
const needs = ["Hlad", "Chuť", "Stres", "Nevím"];
const actions: Record<string, { title: string; body: string }> = {
  Hlad: {
    title: "Dej tělu běžné jídlo.",
    body: "Vyber si syté jídlo nebo svačinu. Cílem tvého plánu je péče o sebe; pauzu kvůli hladu nepotřebuješ.",
  },
  Chuť: {
    title: "Vyber si vědomě.",
    body: "Můžeš si chvíli dát a potom se rozhodnout podle svého pravidla. Pokud máš zároveň hlad, dej si jídlo.",
  },
  Stres: {
    title: "Najdi chvíli úlevy.",
    body: "Zkus několik klidných nádechů nebo krátkou procházku. Hlad a stres se mohou potkat; při hladu si dej běžné jídlo.",
  },
  Nevím: {
    title: "Nemusíš mít jasno hned.",
    body: "Všimni si, kdy jsi naposledy jedl a jak se cítíš. Zvol další malý krok; při hladu si dej jídlo.",
  },
};
export function FoodProtocol({
  reasons,
  rank = 0,
  close,
  complete,
}: {
  reasons: string;
  rank?: number;
  close: () => void;
  complete: (trigger: string, elapsed: number, pauseStarted?: boolean) => void;
}) {
  const s = dailyStyles(rankColors[rank]),
    [need, setNeed] = React.useState<string | null>(null),
    [started, setStarted] = React.useState<number | null>(null),
    [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (started === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [started]);
  const remaining =
    started === null ? 120 : protocolRemaining(started + 120000, now);
  const finish = () =>
    complete(
      need ?? "Neuvedeno",
      started === null
        ? 0
        : Math.min(120, Math.floor(Math.max(0, Date.now() - started) / 1000)),
      started !== null,
    );
  return (
    <Screen modal>
      <View style={s.header}>
        <Pressable accessibilityRole="button" onPress={close} style={s.back}>
          <Text style={s.body}>✕ ZAVŘÍT</Text>
        </Pressable>
        <Text style={s.label}>JUNK FOOD · CHVÍLE PRO SEBE</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.heading}>Co teď potřebuješ?</Text>
        <Text style={s.body}>
          Krátké zastavení, které ti pomůže vybrat další krok.
        </Text>
        <View style={s.card}>
          <Text style={s.label}>01 / POJMENUJ POTŘEBU</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {needs.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={value}
                accessibilityState={{ checked: need === value }}
                onPress={() => setNeed(value)}
                style={{
                  width: "47%",
                  minHeight: 50,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: need === value ? "#e5b1a6" : "#443833",
                  backgroundColor: need === value ? "#3a2924" : "#1b1715",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: need === value ? "#f2cabe" : "#c7b6ad",
                    fontSize: 15,
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.muted}>
            Volba je dobrovolná. Můžeš ji kdykoli změnit.
          </Text>
        </View>
        {need && (
          <View
            style={[
              s.card,
              { backgroundColor: "#1d1914", borderColor: "#483c2b" },
            ]}
          >
            <Text style={s.label}>02 / DALŠÍ MALÝ KROK</Text>
            <Text style={s.title}>{actions[need].title}</Text>
            <Text style={s.body}>{actions[need].body}</Text>
            {need === "Hlad" && started === null && (
              <Pressable
                accessibilityRole="button"
                onPress={finish}
                style={s.button}
              >
                <Text style={s.buttonText}>POKRAČOVAT S JÍDLEM</Text>
              </Pressable>
            )}
          </View>
        )}
        {(need !== "Hlad" || started !== null) && (
          <View style={s.card}>
            <Text style={s.label}>
              {remaining === 0
                ? "CHVÍLE DOKONČENA"
                : "VOLITELNÁ CHVÍLE NA ROZHODNUTÍ"}
            </Text>
            <Text
              style={{
                color: "#f2cabe",
                fontSize: 48,
                fontWeight: "500",
                fontVariant: ["tabular-nums"],
              }}
            >{`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</Text>
            <View
              style={{
                height: 4,
                backgroundColor: "#3a2c29",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 4,
                  width: `${((120 - remaining) / 120) * 100}%`,
                  backgroundColor: "#e5b1a6",
                }}
              />
            </View>
            {started === null ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const at = Date.now();
                  setStarted(at);
                  setNow(at);
                }}
                style={[s.button, { backgroundColor: "#e5b1a6" }]}
              >
                <Text style={s.buttonText}>SPUSTIT PAUZU</Text>
              </Pressable>
            ) : (
              <Text style={s.muted}>
                {remaining
                  ? "Čas běží i po odložení telefonu. Pauzu můžeš ukončit kdykoli."
                  : "Všimni si, co potřebuješ teď, a vyber další krok."}
              </Text>
            )}
          </View>
        )}
        <View style={s.card}>
          <Text style={s.label}>TVOJE PROČ</Text>
          <Text style={s.body}>{reasons}</Text>
        </View>
        <Text style={s.muted}>
          Návrat uloží zvolenou potřebu a délku pauzy. Zápis nemění pilíře ani
          rank.
        </Text>
      </ScrollView>
      <View style={[s.header, { borderTopWidth: 1, borderBottomWidth: 0 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={[s.button, { flex: 1, backgroundColor: "#30251f" }]}
        >
          <Text style={[s.buttonText, { color: "#f3e2d4" }]}>
            VRÁTIT SE K MÉMU PLÁNU
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
