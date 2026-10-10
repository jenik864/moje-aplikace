import React, { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { Program, ProgramId, dayKey, saveDailyRecord, rankOf } from "./model";
import { rankColors } from "./ui";
import { tint } from "./porn/theme";
export function DailyCheckIn({
  id,
  p,
  now,
  update,
}: {
  id: Exclude<ProgramId, "porn">;
  p: Program;
  now: number;
  update: (p: Program) => void;
}) {
  const today = dayKey(new Date(now));
  const previous = new Date(now);
  previous.setDate(previous.getDate() - 1);
  const yesterday = dayKey(previous);
  const [todayMinutes, setTodayMinutes] = useState(
    String(p.dailyLogs?.[today]?.minutes ?? ""),
  );
  const [previousMinutes, setPreviousMinutes] = useState(
    String(p.dailyLogs?.[yesterday]?.minutes ?? ""),
  );
  useEffect(() => {
    setTodayMinutes(String(p.dailyLogs?.[today]?.minutes ?? ""));
    setPreviousMinutes(String(p.dailyLogs?.[yesterday]?.minutes ?? ""));
  }, [today, yesterday]);
  const color = rankColors[rankOf(id, p, now)];
  const save = (
    key: string,
    confirmed: boolean,
    success?: boolean,
    value?: string,
  ) => {
    if (
      id === "scroll" &&
      (!value?.trim() ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 1440)
    )
      return Alert.alert("Neplatný čas", "Zadej 0 až 1440 minut.");
    update(
      saveDailyRecord(
        id,
        p,
        key,
        id === "scroll"
          ? { minutes: Number(value), success: Number(value) <= p.limit }
          : { success: success! },
        confirmed,
        now,
      ),
    );
  };
  const controls = (
    key: string,
    confirmed: boolean,
    value: string,
    setValue: (value: string) => void,
  ) =>
    id === "scroll" ? (
      <>
        <TextInput
          accessibilityLabel={
            confirmed ? "Včerejší počet minut" : "Dnešní počet minut"
          }
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
          placeholder="Počet minut"
          placeholderTextColor="#777"
          style={s.input}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => save(key, confirmed, undefined, value)}
          style={[s.button, { backgroundColor: color }]}
        >
          <Text style={s.buttonText}>
            {confirmed ? "POTVRDIT DOKONČENÝ DEN" : "ULOŽIT DNEŠNÍ ČAS"}
          </Text>
        </Pressable>
      </>
    ) : (
      <View style={s.row}>
        {[true, false].map((success) => (
          <Pressable
            key={String(success)}
            accessibilityRole="button"
            onPress={() => save(key, confirmed, success)}
            accessibilityState={{
              selected:
                (confirmed ? p.days[key] : p.dailyLogs?.[key]?.success) ===
                success,
            }}
            style={[
              s.button,
              {
                flex: 1,
                backgroundColor: success ? color : "#21181e",
                borderWidth: 1,
                borderColor:
                  (confirmed ? p.days[key] : p.dailyLogs?.[key]?.success) ===
                  success
                    ? "#f3e4da"
                    : success
                      ? color
                      : "#473038",
              },
            ]}
          >
            <Text
              style={[s.buttonText, { color: success ? "#050505" : "#fff" }]}
            >
              {success ? "DODRŽENO" : "MIMO PLÁN"}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  const draft = p.dailyLogs?.[today];
  return (
    <>
      <View style={[s.panel, { borderColor: tint(color, 0.3) }]}>
        <Text style={[s.label, { color }]}>
          DNES · {new Date(now).toLocaleDateString("cs-CZ")}
        </Text>
        <Text style={s.title}>
          {id === "scroll"
            ? "Kolik času už máš za sebou?"
            : "Jak se držíš svého pravidla?"}
        </Text>
        {controls(today, false, todayMinutes, setTodayMinutes)}
        <Text style={s.muted}>
          {draft
            ? draft.success
              ? "✓ Dnešní průběžný stav je v plánu."
              : "Dnešní průběžný stav je mimo plán."
            : "Dnešní stav zatím není zaznamenaný."}
        </Text>
        <Text style={s.muted}>
          Rozpracovaný záznam zatím nezvyšuje rank. Zítra potvrď konečný
          výsledek dne.
        </Text>
      </View>
      {yesterday >= dayKey(new Date(p.signedAt ?? p.startedAt)) ? (
        <View style={s.panel}>
          <Text style={[s.label, { color }]}>
            VČERA · {previous.toLocaleDateString("cs-CZ")}
          </Text>
          <Text style={s.title}>Potvrď dokončený den.</Text>
          {controls(yesterday, true, previousMinutes, setPreviousMinutes)}
          <Text style={s.muted}>
            {p.days[yesterday] === undefined
              ? "Výsledek čeká na potvrzení."
              : p.days[yesterday]
                ? "✓ Dokončený den splněn."
                : "Den mimo plán · série přerušena."}
          </Text>
          <Text style={s.muted}>
            Ulož celkový výsledek za celý den. Chybný zápis můžeš opravit.
          </Text>
        </View>
      ) : (
        <Text style={s.muted}>
          První dokončený den potvrdíš zítra. Dnešní zápis je průběžný.
        </Text>
      )}
    </>
  );
}
const s = StyleSheet.create({
  panel: {
    backgroundColor: "#131214",
    borderWidth: 1,
    borderColor: "#2b2728",
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 1.2 },
  title: { color: "#f3f3ed", fontSize: 21, lineHeight: 28, fontWeight: "500" },
  muted: { color: "#aca39f", fontSize: 12, lineHeight: 19 },
  input: {
    color: "#fff",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#443632",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
  },
  button: {
    padding: 16,
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#050505",
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 10 },
});
