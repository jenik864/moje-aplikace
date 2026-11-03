import React from "react";
import { View, Text, TextInput } from "react-native";
import type { Program } from "../model";
import { attention, breakLengths } from "./attention";
import { Action, Option, s } from "./components";

export function BreakSetup({
  p,
  onStart,
  onDirty,
}: {
  p: Program;
  onStart: (minutes: number, activity: string) => void;
  onDirty: (v: boolean) => void;
}) {
  const initial = attention(p).preferredMinutes;
  const [minutes, setMinutes] = React.useState(initial),
    [activity, setActivity] = React.useState("Jen klid");
  React.useEffect(
    () => onDirty(minutes !== initial || activity !== "Jen klid"),
    [minutes, activity, initial, onDirty],
  );
  return (
    <View style={{ gap: 26 }}>
      <Text style={s.heading}>Čas mimo feed.</Text>
      <Text style={s.body}>
        Vyber jednu věc a telefon na chvíli odlož. Časovač běží i po zavření
        obrazovky.
      </Text>
      <Text style={s.label}>DÉLKA ODLOŽENÍ</Text>
      <View style={s.row}>
        {breakLengths.map((n) => (
          <Option
            key={n}
            title={`${n} min`}
            selected={minutes === n}
            onPress={() => setMinutes(n)}
          />
        ))}
      </View>
      <Text style={s.label}>ČEMU DÁŠ POZORNOST?</Text>
      <View style={s.row}>
        {["Jen klid", "Procházka", "Četba", "Protažení"].map((v) => (
          <Option
            key={v}
            title={v}
            selected={activity === v}
            onPress={() => setActivity(v)}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Činnost mimo feed"
        maxLength={80}
        style={s.input}
        value={activity}
        onChangeText={setActivity}
        placeholder="Nebo tvoje vlastní činnost"
        placeholderTextColor="#666"
      />
      <Action
        title={`Začít ${minutes} minut`}
        disabled={!activity.trim()}
        onPress={() => onStart(minutes, activity)}
      />
      <Text style={s.note}>
        Po konci sám potvrdíš, jestli jsi byl mimo feed. Časovač neblokuje
        ostatní aplikace a neovlivňuje rank.
      </Text>
    </View>
  );
}
export function PlanEditor({
  p,
  onSave,
  onDirty,
}: {
  p: Program;
  onSave: (trigger: string, replacement: string, limit: number) => void;
  onDirty: (v: boolean) => void;
}) {
  const original = attention(p).plan;
  const [trigger, setTrigger] = React.useState(original.trigger),
    [replacement, setReplacement] = React.useState(original.replacement),
    [limit, setLimit] = React.useState(String(p.limit));
  const valid =
    /^\d+$/.test(limit) && Number(limit) >= 1 && Number(limit) <= 1440;
  React.useEffect(
    () =>
      onDirty(
        trigger !== original.trigger ||
          replacement !== original.replacement ||
          limit !== String(p.limit),
      ),
    [
      trigger,
      replacement,
      limit,
      original.trigger,
      original.replacement,
      p.limit,
      onDirty,
    ],
  );
  return (
    <View style={{ gap: 22 }}>
      <Text style={s.heading}>Připrav si jiný krok.</Text>
      <Text style={s.body}>
        Jedna konkrétní situace a jedna jednoduchá alternativa. Rozhodnutí si
        připravíš dřív, než otevřeš feed.
      </Text>
      <Text style={s.label}>KDYŽ…</Text>
      <View style={s.row}>
        {["Se nudím", "Čekám", "Jsem ve stresu"].map((v) => (
          <Option
            key={v}
            title={v}
            selected={trigger === v}
            onPress={() => setTrigger(v)}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Spouštěč scrollování"
        maxLength={200}
        style={s.input}
        value={trigger}
        onChangeText={setTrigger}
        placeholder="Například: čekám na autobus"
        placeholderTextColor="#666"
      />
      <Text style={s.label}>MÍSTO FEEDU…</Text>
      <TextInput
        accessibilityLabel="Moje alternativa k feedu"
        maxLength={200}
        multiline
        style={[s.input, { minHeight: 86 }]}
        value={replacement}
        onChangeText={setReplacement}
        placeholder="Například: rozhlédnu se a telefon nechám v kapse"
        placeholderTextColor="#666"
      />
      <Text style={s.label}>OSOBNÍ DENNÍ CÍL · MINUTY V APLIKACÍCH</Text>
      <View style={s.row}>
        {[15, 30, 45, 60].map((n) => (
          <Option
            key={n}
            title={`${n} min`}
            selected={limit === String(n)}
            onPress={() => setLimit(String(n))}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Denní cíl v minutách"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        style={s.input}
        value={limit}
        onChangeText={setLimit}
      />
      {!valid && (
        <Text accessibilityRole="alert" style={s.error}>
          Zadej celé číslo od 1 do 1 440.
        </Text>
      )}
      <Text style={s.note}>
        Cíl slouží pro tvoje porovnání se skutečným měřením. Rank dál určuje
        pevný průměr sedmi dní; zvýšení cíle jej nezvedne.
      </Text>
      <Action
        title="Uložit můj plán"
        disabled={!trigger.trim() || !replacement.trim() || !valid}
        onPress={() => onSave(trigger, replacement, Number(limit))}
      />
    </View>
  );
}
export function ReflectionEditor({
  p,
  day,
  onSave,
  onDirty,
}: {
  p: Program;
  day: string;
  onSave: (rating: number, note: string) => void;
  onDirty: (v: boolean) => void;
}) {
  const original = attention(p).reflections[day];
  const [rating, setRating] = React.useState(original?.rating ?? 0),
    [note, setNote] = React.useState(original?.note ?? "");
  React.useEffect(
    () =>
      onDirty(
        rating !== (original?.rating ?? 0) || note !== (original?.note ?? ""),
      ),
    [rating, note, original?.rating, original?.note, onDirty],
  );
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>
        {new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "long",
        })}{" "}
        · MOJE REFLEXE
      </Text>
      <Text style={s.heading}>Jak se dnes cítíš?</Text>
      <Text style={s.body}>
        Krátký vlastní pohled na tvoji pozornost. Nejde o měření telefonu ani o
        body do ranku.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={{ flex: 1 }}>
            <Option
              title={String(n)}
              selected={rating === n}
              onPress={() => setRating(n)}
            />
          </View>
        ))}
      </View>
      <View style={s.between}>
        <Text style={s.muted}>1 · roztěkaně</Text>
        <Text style={s.muted}>5 · soustředěně</Text>
      </View>
      <Text style={s.label}>CO TI POMOHLO NEBO CO TĚ STÁHLO K FEEDU?</Text>
      <TextInput
        accessibilityLabel="Poznámka k dnešní pozornosti"
        style={[s.input, { minHeight: 150, textAlignVertical: "top" }]}
        maxLength={1000}
        multiline
        value={note}
        onChangeText={setNote}
        placeholder="Jedna věta stačí. Poznámka je volitelná."
        placeholderTextColor="#666"
      />
      <Action
        title="Uložit reflexi"
        disabled={!rating}
        onPress={() => onSave(rating, note)}
      />
    </View>
  );
}
