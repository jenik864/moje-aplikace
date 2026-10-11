import React, { useState } from "react";
import { View, Text } from "react-native";
import { Button, Chip, Field, s } from "./components";
import { habitKinds, uid, type Habit, type HabitKind } from "./model";
export const weekdays = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export function PlanEditor({
  initial,
  onSave,
}: {
  initial: Habit[];
  onSave: (habits: Habit[]) => void;
}) {
  const [habits, setHabits] = useState<Habit[]>(initial),
    [kind, setKind] = useState<HabitKind>("reading"),
    [title, setTitle] = useState("Četba"),
    [minutes, setMinutes] = useState("20"),
    [days, setDays] = useState([0, 1, 2, 3, 4]),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  function add() {
    const n = Number(minutes);
    if (
      !title.trim() ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 180 ||
      !days.length
    ) {
      setError("Vyplň název, 1–180 minut a alespoň jeden den.");
      return;
    }
    const h: Habit = {
      id: editing ?? uid(),
      kind,
      title: title.trim().slice(0, 80),
      minutes: n,
      days: [...days],
    };
    setHabits(
      editing ? habits.map((v) => (v.id === editing ? h : v)) : [...habits, h],
    );
    setEditing(null);
    setPending(false);
    setTitle(habitKinds[kind]);
    setError("");
  }
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>TVŮJ PLÁN / TVOJE TEMPO</Text>
      <Text style={s.title}>Čemu dáš prostor?</Text>
      <Text style={s.text}>
        Vyber aktivity, čas a dny. Četba je jeden z návyků — stejně jako učení
        nebo vlastní projekt.
      </Text>
      {habits.length > 0 && (
        <View style={{ gap: 12 }}>
          {habits.map((h) => (
            <View key={h.id} style={s.card}>
              <Text style={s.h3}>{h.title}</Text>
              <Text style={s.muted}>
                {h.minutes} min · {h.days.map((d) => weekdays[d]).join(" / ")}
              </Text>
              <View style={s.wrap}>
                <Chip
                  label="Upravit"
                  onPress={() => {
                    setPending(true);
                    setEditing(h.id);
                    setKind(h.kind);
                    setTitle(h.title);
                    setMinutes(String(h.minutes));
                    setDays(h.days);
                  }}
                />
                <Chip
                  label="Odebrat"
                  onPress={() => {
                    setHabits(habits.filter((v) => v.id !== h.id));
                    if (editing === h.id) {
                      setPending(false);
                      setEditing(null);
                      setTitle(habitKinds[kind]);
                    }
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={s.card}>
        <Text style={s.label}>
          {editing ? "UPRAVIT AKTIVITU" : "PŘIDAT DO PLÁNU"}
        </Text>
        <View style={s.wrap}>
          {(Object.keys(habitKinds) as HabitKind[]).map((k) => (
            <Chip
              key={k}
              label={habitKinds[k]}
              selected={kind === k}
              onPress={() => {
                setPending(true);
                setKind(k);
                setTitle(habitKinds[k]);
              }}
            />
          ))}
        </View>
        <Field
          label="Název aktivity"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setPending(true);
          }}
          placeholder="Např. Číst Dunu nebo učit se Python"
        />
        <Field
          label="Cíl v minutách"
          value={minutes}
          onChangeText={(v) => {
            setMinutes(v);
            setPending(true);
          }}
          number
        />
        <Text style={s.label}>DNY V TÝDNU</Text>
        <View style={s.wrap}>
          {weekdays.map((d, i) => (
            <Chip
              key={d}
              label={d}
              selected={days.includes(i)}
              onPress={() => {
                setPending(true);
                setDays(
                  days.includes(i)
                    ? days.filter((n) => n !== i)
                    : [...days, i].sort(),
                );
              }}
            />
          ))}
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <Button quiet onPress={add}>
          {editing ? "Potvrdit úpravu aktivity" : "+ Přidat aktivitu"}
        </Button>
        {(editing || pending) && (
          <Button
            quiet
            onPress={() => {
              setPending(false);
              setEditing(null);
              setTitle(habitKinds[kind]);
            }}
          >
            {editing ? "Zrušit úpravu" : "Zrušit rozepsanou aktivitu"}
          </Button>
        )}
      </View>
      <Text style={s.muted}>
        Nejprve přidej nebo potvrď aktivitu, potom ulož celý plán. Změna platí
        od dneška; starší plán a splnění zůstanou zachované.
      </Text>
      <Button
        disabled={
          !!editing || pending || (initial.length === 0 && habits.length === 0)
        }
        onPress={() => onSave(habits)}
      >
        Uložit plán ({habits.length})
      </Button>
    </View>
  );
}
