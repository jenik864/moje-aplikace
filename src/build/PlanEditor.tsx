import React, { useState } from "react";
import { View, Text } from "react-native";
import { Button, Chip, s, useBuildStyles } from "./components";
import { exerciseById } from "./catalog";
import {
  generatePlan,
  kinds,
  dateKey,
  type Profile,
  type Activity,
} from "./model";
export const dayNames = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export function PlanEditor({
  profile,
  week,
  onApply,
}: {
  profile: Profile;
  week: string;
  onApply: (p: Profile, a: Activity[]) => void;
}) {
  const s = useBuildStyles();
  const [p, setP] = useState<Profile>({ ...profile, days: [...profile.days] });
  const [preview, setPreview] = useState<Activity[] | null>(null);
  function patch(change: Partial<Profile>) {
    setP({ ...p, ...change });
    setPreview(null);
  }
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.title}>Týden podle tebe.</Text>
      <Text style={s.muted}>
        Quitter navrhne jednoduchý plán podle těchto voleb. Před použitím si ho
        prohlédni; každý trénink pak můžeš upravit.
      </Text>
      <Text style={s.label}>CO CHCEŠ ROZVÍJET?</Text>
      <View style={s.row}>
        {(
          [
            ["balanced", "Celková kondice"],
            ["strength", "Síla"],
            ["endurance", "Vytrvalost"],
          ] as const
        ).map(([value, title]) => (
          <Chip
            key={value}
            title={title}
            active={p.goal === value}
            onPress={() => patch({ goal: value })}
          />
        ))}
      </View>
      <Text style={s.label}>ZKUŠENOSTI</Text>
      <View style={s.row}>
        <Chip
          title="Začínám"
          active={p.level === "beginner"}
          onPress={() => patch({ level: "beginner" })}
        />
        <Chip
          title="Pravidelně sportuji"
          active={p.level === "regular"}
          onPress={() => patch({ level: "regular" })}
        />
      </View>
      <Text style={s.label}>DNY PRO POHYB</Text>
      <View style={s.row}>
        {dayNames.map((name, i) => (
          <Chip
            key={i}
            title={name}
            active={p.days.includes(i)}
            onPress={() =>
              patch({
                days: p.days.includes(i)
                  ? p.days.filter((v) => v !== i)
                  : [...p.days, i],
              })
            }
          />
        ))}
      </View>
      <Text style={s.label}>ČAS NA JEDEN TRÉNINK</Text>
      <View style={s.row}>
        {[30, 45, 60].map((minutes) => (
          <Chip
            key={minutes}
            title={`${minutes} min`}
            active={p.minutes === minutes}
            onPress={() => patch({ minutes })}
          />
        ))}
      </View>
      <Text style={s.label}>SILOVÝ TRÉNINK</Text>
      <View style={s.row}>
        <Chip
          title="Doma bez vybavení"
          active={p.equipment === "home"}
          onPress={() => patch({ equipment: "home" })}
        />
        <Chip
          title="Posilovna"
          active={p.equipment === "gym"}
          onPress={() => patch({ equipment: "gym" })}
        />
      </View>
      <Text style={s.label}>VYTRVALOSTNÍ AKTIVITA</Text>
      <View style={s.row}>
        {(["run", "cycle", "swim"] as const).map((sport) => (
          <Chip
            key={sport}
            title={kinds[sport].name}
            active={p.sport === sport}
            onPress={() => patch({ sport })}
          />
        ))}
      </View>
      <Text style={s.small}>
        Jde o návrh z připravených tréninkových šablon. Mezi náročnými dny nech
        prostor na regeneraci; změň plán podle své kondice.
      </Text>
      <Button
        title="Vytvořit návrh týdne"
        disabled={!p.days.length}
        onPress={() => setPreview(generatePlan(p, week))}
      />
      {preview && (
        <View style={s.card}>
          <Text style={s.label}>NÁVRH / TÝDEN OD {week}</Text>
          {preview.map((a) => (
            <View key={a.id} style={{ gap: 6 }}>
              <Text style={s.text}>
                {dayNames[(new Date(`${a.day}T12:00:00`).getDay() + 6) % 7]} ·{" "}
                {a.title} · {a.targetMinutes} min
              </Text>
              <Text style={s.small}>{a.details}</Text>
              {a.exercises.map((e) => (
                <Text key={e.exerciseId} style={s.small}>
                  {e.sets} × {e.reps} · {exerciseById(e.exerciseId)?.name}
                </Text>
              ))}
            </View>
          ))}
          <Text style={s.muted}>
            Nahradí nezahájené aktivity tohoto týdne od dneška. Dokončené a
            rozepsané tréninky zachová. Na jejich dny nepřidá další návrh.
          </Text>
          <Text style={s.small}>
            {preview.filter((a) => a.day >= dateKey()).length} navržených
            aktivit od dneška. Minulé dny se nepřidají.
          </Text>
          <Button
            title="Použít plán"
            disabled={!preview.some((a) => a.day >= dateKey())}
            onPress={() => onApply(p, preview)}
          />
        </View>
      )}
    </View>
  );
}
