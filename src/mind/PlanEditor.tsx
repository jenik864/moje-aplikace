import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Chip, Field, useMindStyles } from "./components";
import { habitKinds, uid, type Habit, type HabitKind } from "./model";
export const weekdays = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export function PlanEditor({
  initial,
  onSave,
  onNavigate,
  onDirty,
}: {
  initial: Habit[];
  onSave: (habits: Habit[]) => void;
  onNavigate: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const s = useMindStyles();
  const [habits, setHabits] = useState(initial),
    [open, setOpen] = useState(initial.length === 0),
    [kind, setKind] = useState<HabitKind>("reading"),
    [title, setTitle] = useState("Četba"),
    [minutes, setMinutes] = useState("20"),
    [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState("");
  const baseline = useRef(JSON.stringify(initial)).current;
  const dirty =
    JSON.stringify(habits) !== baseline ||
    (open &&
      (title !== "Četba" ||
        minutes !== "20" ||
        kind !== "reading" ||
        days.join(",") !== "0,1,2,3,4,5,6" ||
        editing !== null));
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  function add() {
    const n = Number(minutes);
    if (
      !title.trim() ||
      title.trim().length > 80 ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > 180 ||
      !days.length
    ) {
      setError("Vyplň název do 80 znaků, 1–180 minut a alespoň jeden den.");
      return;
    }
    const h: Habit = {
      id: editing ?? uid(),
      kind,
      title: title.trim(),
      minutes: n,
      days: [...days].sort(),
    };
    setHabits(
      editing ? habits.map((v) => (v.id === editing ? h : v)) : [...habits, h],
    );
    setEditing(null);
    setOpen(false);
    onNavigate();
    setError("");
  }
  function create() {
    setEditing(null);
    setKind("reading");
    setTitle("Četba");
    setMinutes("20");
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setError("");
    setOpen(true);
    onNavigate();
  }
  if (open)
    return (
      <View style={{ gap: 20 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setOpen(false);
            setEditing(null);
            setError("");
          }}
        >
          <Text style={s.link}>← Přehled plánu</Text>
        </Pressable>
        <Text style={s.h2}>
          {editing ? "Upravit aktivitu" : "Nová aktivita"}
        </Text>
        <View style={s.wrap}>
          {(Object.keys(habitKinds) as HabitKind[]).map((k) => (
            <Chip
              key={k}
              label={habitKinds[k]}
              selected={kind === k}
              onPress={() => {
                setKind(k);
                if (Object.values(habitKinds).includes(title) || !title.trim())
                  setTitle(habitKinds[k]);
              }}
            />
          ))}
        </View>
        <Field
          label="Název aktivity"
          value={title}
          onChangeText={setTitle}
          placeholder="Např. Číst Dunu nebo učit se Python"
        />
        <Field
          label="Cíl v minutách"
          value={minutes}
          onChangeText={setMinutes}
          number
        />
        <View style={s.between}>
          <Text style={s.label}>OPAKOVÁNÍ</Text>
          <View style={s.wrap}>
            <Chip
              label="Denně"
              onPress={() => setDays([0, 1, 2, 3, 4, 5, 6])}
            />
            <Chip label="Po–Pá" onPress={() => setDays([0, 1, 2, 3, 4])} />
          </View>
        </View>
        <View style={s.wrap}>
          {weekdays.map((d, i) => (
            <Chip
              key={d}
              label={d}
              selected={days.includes(i)}
              onPress={() =>
                setDays(
                  days.includes(i) ? days.filter((v) => v !== i) : [...days, i],
                )
              }
            />
          ))}
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        <Button onPress={add}>
          {editing ? "Potvrdit úpravu" : "Přidat do plánu"}
        </Button>
        <Text style={s.muted}>
          Potom v přehledu ulož celý plán. Každý den můžeš splnění potvrdit i
          přidat poznámku.
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.label}>OSOBNÍ NÁVYKY</Text>
      <Text style={s.h2}>Můj plán.</Text>
      <Text style={s.muted}>
        Aktivity se opakují ve zvolené dny. Změny platí od dneška, historie
        zůstává.
      </Text>
      {habits.length ? (
        habits.map((h) => (
          <View key={h.id} style={[s.card, { gap: 12 }]}>
            <Text style={s.h3}>{h.title}</Text>
            <Text style={s.muted}>
              {habitKinds[h.kind]} · {h.minutes} min
            </Text>
            <Text style={s.link}>
              {h.days.length === 7
                ? "Každý den"
                : h.days.map((d) => weekdays[d]).join(" · ")}
            </Text>
            <View style={s.wrap}>
              <Chip
                label="Upravit"
                onPress={() => {
                  setEditing(h.id);
                  setKind(h.kind);
                  setTitle(h.title);
                  setMinutes(String(h.minutes));
                  setDays(h.days);
                  setOpen(true);
                }}
              />
              <Chip
                label="Odebrat"
                onPress={() => setHabits(habits.filter((v) => v.id !== h.id))}
              />
            </View>
          </View>
        ))
      ) : (
        <Text style={s.text}>Přidej první aktivitu. Stačí začít jednou.</Text>
      )}
      <Button quiet onPress={create}>
        + Další aktivita
      </Button>
      <Button onPress={() => onSave(habits)}>
        Uložit celý plán ({habits.length})
      </Button>
      <Text style={s.muted}>
        Odebrání a úpravy se uloží až tímto tlačítkem.
      </Text>
    </View>
  );
}
