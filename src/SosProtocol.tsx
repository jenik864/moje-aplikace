import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { PauseDial } from "./porn/visuals";
import { Screen, rankColors } from "./ui";
import { definitions, ProgramId, protocolRemaining } from "./model";
import { programContent } from "./programContent";
export function SosProtocol({
  id,
  reasons,
  rank = 0,
  close,
  complete,
}: {
  id: ProgramId;
  reasons: string;
  rank?: number;
  close: () => void;
  complete: (trigger: string, elapsed: number, pauseStarted?: boolean) => void;
}) {
  const accent = rankColors[rank];
  const s = { ...baseStyles, ...(id === "porn" ? pornStyles : {}) };
  const [trigger, setTrigger] = useState("");
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const duration = programContent[id].duration;
  useEffect(() => {
    if (started === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [started]);
  const remaining =
    started === null
      ? duration
      : protocolRemaining(started + duration * 1000, now);
  const finish = () =>
    complete(
      trigger,
      started === null
        ? 0
        : Math.min(
            duration,
            Math.floor(Math.max(0, Date.now() - started) / 1000),
          ),
      started !== null,
    );
  return (
    <Screen modal>
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={close}
          hitSlop={10}
          style={
            id === "porn"
              ? { minHeight: 40, minWidth: 96, justifyContent: "center" }
              : undefined
          }
        >
          <Text style={s.muted}>✕ ZAVŘÍT</Text>
        </Pressable>
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={s.content}
      >
        <Text style={s.label}>SOS · {definitions[id].title.toUpperCase()}</Text>
        <Text style={s.heading}>Teď máš volbu.</Text>
        {id === "porn" && (
          <View style={[s.panel, { borderLeftColor: accent }]}>
            <Text style={[s.title, { color: accent }]}>TVOJE PROČ</Text>
            <Text numberOfLines={3} style={s.body}>
              {reasons}
            </Text>
          </View>
        )}
        <View style={s.task}>
          <Text style={s.label}>
            {started === null
              ? "TVŮJ DALŠÍ KROK"
              : remaining
                ? "DEJ SI PROSTOR"
                : "PAUZA DOKONČENA"}
          </Text>
          <Text style={s.body}>{definitions[id].action}</Text>
          {id === "porn" ? (
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              <PauseDial remaining={remaining} duration={duration} />
            </View>
          ) : (
            <Text style={s.timer}>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </Text>
          )}
          {started === null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const at = Date.now();
                setNow(at);
                setStarted(at);
              }}
              style={({ pressed }) => [
                s.button,
                id === "porn" && pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={s.buttonText}>SPUSTIT PAUZU</Text>
            </Pressable>
          ) : (
            <Text style={s.muted}>
              {remaining
                ? "Můžeš odložit telefon. Čas běží i mimo aplikaci."
                : "Zkus si všimnout, jak se tvoje chuť změnila."}
            </Text>
          )}
        </View>
        {id !== "porn" && (
          <View style={s.panel}>
            <Text style={s.title}>TVŮJ DŮVOD</Text>
            <Text style={s.body}>{reasons}</Text>
          </View>
        )}
        <Text style={s.title}>
          {id === "porn"
            ? "CO ZA TÍM BYLO? · VOLITELNÉ"
            : "CO SPUSTILO IMPULZ?"}
        </Text>
        <View style={s.row}>
          {(id === "food"
            ? ["Hlad", "Stres", "Nuda", "Zvyk"]
            : ["Nuda", "Stres", "Samota", "Zvyk"]
          ).map((t) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: trigger === t }}
              aria-checked={trigger === t}
              key={t}
              onPress={() => setTrigger(t)}
              style={[
                s.chip,
                trigger === t && {
                  borderColor: "#ff5964",
                  backgroundColor: "#321216",
                },
              ]}
            >
              <Text style={{ color: trigger === t ? "#ff8b93" : "#ccc" }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.muted}>
          {id === "porn"
            ? "Spouštěč je dobrovolný. Návrat uloží záznam SOS; pauza nemění rank."
            : "Při návratu se uloží záznam SOS. Spouštěč je volitelný. Pauza nemění rank. Kamera a blokování zatím nejsou aktivní."}
        </Text>
      </ScrollView>
      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={[
            s.button,
            {
              backgroundColor: id === "porn" ? "#21171d" : "#202020",
              ...(id === "porn"
                ? { borderWidth: 1, borderColor: "#4c303c" }
                : {}),
            },
          ]}
        >
          <Text style={[s.buttonText, { color: "#fff" }]}>
            {started !== null && remaining > 0
              ? "UKONČIT A VRÁTIT SE K PLÁNU"
              : "VRÁTIT SE K MÉMU PLÁNU"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
const baseStyles = StyleSheet.create({
  topBar: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6 },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: "#050505",
    borderTopWidth: 1,
    borderTopColor: "#292929",
  },
  content: { padding: 22, gap: 22, paddingBottom: 40 },
  muted: { color: "#888", fontSize: 12, lineHeight: 19 },
  label: {
    color: "#ff7882",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
  },
  heading: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
  },
  title: { color: "#ddd", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  body: { color: "#ccc", fontSize: 15, lineHeight: 24 },
  panel: { backgroundColor: "#1a1a1a", padding: 20, gap: 12, borderRadius: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#383838",
    borderRadius: 12,
  },
  task: {
    padding: 22,
    gap: 18,
    borderWidth: 1,
    borderColor: "#793039",
    borderRadius: 20,
    backgroundColor: "#1e1012",
  },
  timer: {
    color: "#ff7882",
    fontSize: 54,
    fontWeight: "800",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  button: {
    backgroundColor: "#ff7882",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    letterSpacing: 0.5,
    color: "#050505",
    fontWeight: "800",
  },
});

// Porn Reboot has its own visual treatment; daily programs retain theirs.
const pornStyles = StyleSheet.create({
  topBar: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 0 },
  content: { padding: 22, gap: 18, paddingBottom: 32 },
  heading: {
    color: "#f3f3ed",
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1,
  },
  task: {
    padding: 20,
    gap: 18,
    borderRadius: 24,
    backgroundColor: "#100d11",
  },
  label: {
    color: "#ffc1c7",
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: "600",
  },
  title: {
    color: "#b6b9b0",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  body: { color: "#d9cbd0", fontSize: 14, lineHeight: 23 },
  panel: {
    paddingLeft: 16,
    paddingVertical: 3,
    gap: 10,
    borderLeftWidth: 2,
  },
  timer: {
    color: "#ff999e",
    fontSize: 50,
    fontWeight: "500",
    letterSpacing: -3,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    paddingVertical: 4,
  },
  button: {
    backgroundColor: "#ffb0b7",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#271316",
    fontWeight: "700",
  },
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#3a3433",
    borderRadius: 14,
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: "#050505",
    borderTopWidth: 1,
    borderTopColor: "#252824",
  },
});
