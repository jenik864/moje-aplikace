import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable, StyleSheet } from "react-native";
import { Screen } from "./ui";
import { definitions, ProgramId, protocolRemaining } from "./model";
import { programContent } from "./programContent";
export function SosProtocol({
  id,
  reasons,
  close,
  complete,
}: {
  id: ProgramId;
  reasons: string;
  close: () => void;
  complete: (trigger: string, elapsed: number) => void;
}) {
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
    );
  return (
    <Screen modal>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={s.content}
      >
        <Pressable accessibilityRole="button" onPress={close} hitSlop={10}>
          <Text style={s.muted}>✕ ZAVŘÍT</Text>
        </Pressable>
        <Text style={s.label}>SOS · {definitions[id].title.toUpperCase()}</Text>
        <Text style={s.heading}>Teď máš volbu.</Text>
        <View style={s.panel}>
          <Text style={s.title}>TVŮJ DŮVOD</Text>
          <Text style={s.body}>{reasons}</Text>
        </View>
        <Text style={s.title}>CO SPUSTILO IMPULZ?</Text>
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
        <View style={s.task}>
          <Text style={s.label}>
            {started === null
              ? "TVŮJ DALŠÍ KROK"
              : remaining
                ? "DEJ SI PROSTOR"
                : "PAUZA DOKONČENA"}
          </Text>
          <Text style={s.body}>{definitions[id].action}</Text>
          <Text style={s.timer}>
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </Text>
          {started === null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const at = Date.now();
                setNow(at);
                setStarted(at);
              }}
              style={s.button}
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
        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={[s.button, { backgroundColor: "#202020" }]}
        >
          <Text style={[s.buttonText, { color: "#fff" }]}>
            {started !== null && remaining > 0
              ? "UKONČIT A VRÁTIT SE K PLÁNU"
              : "VRÁTIT SE K MÉMU PLÁNU"}
          </Text>
        </Pressable>
        <Text style={s.muted}>
          Vybraný spouštěč se uloží při návratu k plánu. Pauza není podmínkou
          pro získání ranku. Kamera a blokování zatím nejsou aktivní.
        </Text>
      </ScrollView>
    </Screen>
  );
}
const s = StyleSheet.create({
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
