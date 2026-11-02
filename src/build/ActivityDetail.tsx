import { ExerciseDetail } from "./ExerciseDetail";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Chip, Field, s, useBuildStyles } from "./components";
import { exercises, exerciseById } from "./catalog";
import {
  activityError,
  logError,
  kinds,
  uid,
  dateKey,
  numberInput,
  type Activity,
  type BuildData,
  type ActivityLog,
  type WorkoutDraft,
  type SetLog,
  type Kind,
} from "./model";
function blankActivity(day: string): Activity {
  return {
    id: uid(),
    day,
    kind: "run",
    title: "",
    targetMinutes: 30,
    details: "",
    exercises: [],
  };
}
export function ActivityDetail({
  activity,
  day,
  data,
  onSave,
  onComplete,
  onDraft,
  onDelete,
  onRest,
  onMetrics,
}: {
  activity?: Activity;
  day: string;
  data: BuildData;
  onSave: (a: Activity) => void;
  onComplete: (a: Activity, l: ActivityLog) => void;
  onDraft: (id: string, d: WorkoutDraft) => void;
  onMetrics: (id: string, metrics: { minutes: string; km: string }) => void;
  onDelete: (id: string) => void;
  onRest: (id: string, end: number) => void;
}) {
  const s = useBuildStyles();
  const [a, setA] = useState(() => activity ?? blankActivity(day));
  const [editing, setEditing] = useState(!activity);
  const [duration, setDuration] = useState(String(a.targetMinutes));
  const [distance, setDistance] = useState(
    a.targetKm === undefined ? "" : String(a.targetKm),
  );
  const log = data.logs[a.id];
  const [minutes, setMinutes] = useState(
    data.metricDrafts?.[a.id]?.minutes ?? (log ? String(log.minutes) : ""),
  );
  const [km, setKm] = useState(
    data.metricDrafts?.[a.id]?.km ??
      (log?.km === undefined ? "" : String(log.km)),
  );
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [correcting, setCorrecting] = useState(
    !!(activity && data.logs[activity.id] && data.drafts[activity.id]),
  );
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const hasDraft = !!data.drafts[a.id];
  const draft = data.drafts[a.id] ?? (correcting ? log?.sets : undefined) ?? {};
  function setsFor(id: string, count: number): SetLog[] {
    return (
      draft[id] ??
      Array.from({ length: count }, () => ({
        reps: "",
        weight: "",
        done: false,
      }))
    );
  }
  function setValue(
    id: string,
    count: number,
    index: number,
    change: Partial<SetLog>,
  ) {
    const sets = setsFor(id, count).map((v, i) =>
      i === index ? { ...v, ...change } : v,
    );
    onDraft(a.id, { ...draft, [id]: sets });
  }
  function save() {
    const next = {
      ...a,
      title: a.title.trim(),
      targetMinutes: numberInput(duration),
      targetKm: distance.trim() ? numberInput(distance) : undefined,
    };
    const err = activityError(next);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setA(next);
    onSave(next);
    setEditing(false);
  }
  function finish() {
    const entry: ActivityLog = {
      at: Date.now(),
      minutes: numberInput(minutes),
      ...(["run", "cycle", "swim"].includes(a.kind)
        ? { km: numberInput(km) }
        : {}),
      ...(a.kind === "strength" ? { sets: draft } : {}),
    };
    const err = logError(a, entry);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    onComplete(a, entry);
  }
  if (editing)
    return (
      <View style={{ gap: 20 }}>
        <Text style={s.title}>
          {activity ? "Upravit aktivitu" : "Nová aktivita"}
        </Text>
        <View style={s.row}>
          {(Object.keys(kinds) as Kind[]).map((kind) => (
            <Chip
              key={kind}
              title={kinds[kind].name}
              active={a.kind === kind}
              onPress={() => {
                if (!hasDraft)
                  setA({
                    ...a,
                    kind,
                    targetKm: undefined,
                    exercises: kind === "strength" ? a.exercises : [],
                  });
              }}
            />
          ))}
        </View>
        {hasDraft && (
          <Text style={s.muted}>
            Rozepsané série zachováváme. Druh aktivity a skladbu cviků už neměň.
          </Text>
        )}
        <Field
          label="Název aktivity"
          value={a.title}
          onChange={(title) => setA({ ...a, title })}
          placeholder="Např. Lehký běh u řeky"
        />
        <Field
          label="Datum (RRRR-MM-DD)"
          value={a.day}
          onChange={(day) => setA({ ...a, day })}
        />
        <Field
          label="Plánovaná délka (min)"
          value={duration}
          onChange={setDuration}
          numeric
        />
        {["run", "cycle", "swim"].includes(a.kind) && (
          <Field
            label="Plánovaná vzdálenost (km, volitelně)"
            value={distance}
            onChange={setDistance}
            numeric
          />
        )}
        <Field
          label="Pokyny / poznámky"
          value={a.details}
          onChange={(details) => setA({ ...a, details })}
          multiline
        />
        {a.kind === "strength" && (
          <>
            <Text style={s.label}>CVIKY V TRÉNINKU</Text>
            {a.exercises.map((e, i) => (
              <View key={e.exerciseId} style={s.card}>
                <Text style={s.h2}>{exerciseById(e.exerciseId)?.name}</Text>
                {!hasDraft ? (
                  <>
                    <View style={s.row}>
                      <View style={s.flex}>
                        <Field
                          label="Série"
                          value={String(e.sets)}
                          numeric
                          onChange={(v) =>
                            setA({
                              ...a,
                              exercises: a.exercises.map((e, j) =>
                                j === i ? { ...e, sets: numberInput(v) } : e,
                              ),
                            })
                          }
                        />
                      </View>
                      <View style={s.flex}>
                        <Field
                          label="Opakování"
                          value={String(e.reps)}
                          numeric
                          onChange={(v) =>
                            setA({
                              ...a,
                              exercises: a.exercises.map((e, j) =>
                                j === i ? { ...e, reps: numberInput(v) } : e,
                              ),
                            })
                          }
                        />
                      </View>
                    </View>
                    <Field
                      label="Pauza (sekundy)"
                      value={String(e.restSeconds)}
                      numeric
                      onChange={(v) =>
                        setA({
                          ...a,
                          exercises: a.exercises.map((e, j) =>
                            j === i ? { ...e, restSeconds: numberInput(v) } : e,
                          ),
                        })
                      }
                    />
                    <Button
                      secondary
                      title="Odebrat cvik"
                      onPress={() =>
                        setA({
                          ...a,
                          exercises: a.exercises.filter((_, j) => j !== i),
                        })
                      }
                    />
                  </>
                ) : (
                  <Text style={s.muted}>
                    {e.sets} × {e.reps} · pauza {e.restSeconds} s
                  </Text>
                )}
              </View>
            ))}
            {!hasDraft && (
              <Button
                secondary
                title={picker ? "Zavřít výběr cviků" : "+ Přidat cvik"}
                onPress={() => setPicker(!picker)}
              />
            )}
            {picker && !hasDraft && (
              <View style={s.card}>
                <Field label="Najít cvik" value={search} onChange={setSearch} />
                {exercises
                  .filter(
                    (e) =>
                      e.name
                        .toLocaleLowerCase("cs")
                        .includes(search.toLocaleLowerCase("cs")) &&
                      !a.exercises.some((p) => p.exerciseId === e.id),
                  )
                  .map((e) => (
                    <Pressable
                      key={e.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setA({
                          ...a,
                          exercises: [
                            ...a.exercises,
                            {
                              exerciseId: e.id,
                              sets: 2,
                              reps: 10,
                              restSeconds: e.rest,
                            },
                          ],
                        });
                        setPicker(false);
                        setSearch("");
                      }}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#2f2f2f",
                      }}
                    >
                      <Text style={s.text}>+ {e.name}</Text>
                      <Text style={s.small}>{e.equipment}</Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </>
        )}
        {error && <Text style={s.error}>{error}</Text>}
        <Button title="Uložit aktivitu" onPress={save} />
        {activity && (
          <Button
            secondary
            title="Zrušit úpravy"
            onPress={() => {
              setA(activity);
              setDuration(String(activity.targetMinutes));
              setDistance(
                activity.targetKm === undefined
                  ? ""
                  : String(activity.targetKm),
              );
              setError("");
              setEditing(false);
            }}
          />
        )}
      </View>
    );
  return (
    <View style={{ gap: 20 }}>
      <Text style={s.label}>
        {kinds[a.kind].name.toUpperCase()} / {a.day}
      </Text>
      <Text style={s.title}>{a.title}</Text>
      <View style={s.row}>
        <Text style={s.muted}>
          Plán: {a.targetMinutes} min{a.targetKm ? ` · ${a.targetKm} km` : ""}
        </Text>
        {log && (
          <View style={s.pill}>
            <Text style={s.link}>✓ Dokončeno</Text>
          </View>
        )}
      </View>
      {a.details !== "" && <Text style={s.text}>{a.details}</Text>}
      {log ? (
        <View style={s.card}>
          <Text style={s.label}>SKUTEČNÝ VÝKON</Text>
          <Text style={s.metric}>
            {log.minutes} min{log.km !== undefined ? ` · ${log.km} km` : ""}
          </Text>
          {a.exercises.map((e) => (
            <View key={e.exerciseId}>
              <Text style={s.text}>{exerciseById(e.exerciseId)?.name}</Text>
              {log.sets?.[e.exerciseId]?.map((v, i) => (
                <Text key={i} style={s.muted}>
                  {i + 1}. série · {v.reps} op. · {v.weight} kg
                </Text>
              ))}
            </View>
          ))}
          <Text style={s.small}>
            Záznam můžeš opravit níže. Součty se přepočítají, záznam se
            nezdvojí.
          </Text>
          {a.kind === "strength" && !correcting && (
            <Button
              secondary
              title="Opravit zapsané série"
              onPress={() => {
                setCorrecting(true);
                if (!data.drafts[a.id]) onDraft(a.id, log.sets ?? {});
              }}
            />
          )}
        </View>
      ) : (
        <Button
          secondary
          title="Upravit / přesunout trénink"
          onPress={() => setEditing(true)}
        />
      )}
      {a.kind === "strength" && (!log || correcting) && (
        <>
          <Text style={s.small}>
            Zapiš skutečné opakování a zátěž každé série. U cviků bez zátěže
            zadej 0 kg. Série na jednu stranu zahrnuje obě strany.
          </Text>
          {a.exercises.map((e) => (
            <View key={e.exerciseId} style={s.card}>
              <Text style={s.h2}>{exerciseById(e.exerciseId)?.name}</Text>
              <Text style={s.muted}>
                Plán {e.sets} × {e.reps} · pauza {e.restSeconds} s
              </Text>
              <Button
                secondary
                title={
                  detail === e.exerciseId
                    ? "Skrýt techniku"
                    : "Technika a svaly"
                }
                onPress={() =>
                  setDetail(detail === e.exerciseId ? null : e.exerciseId)
                }
              />
              {detail === e.exerciseId && (
                <ExerciseDetail exercise={exerciseById(e.exerciseId)!} />
              )}
              {setsFor(e.exerciseId, e.sets).map((set, i) => (
                <View key={i} style={{ gap: 10 }}>
                  <Text style={s.label}>SÉRIE {i + 1}</Text>
                  <View style={s.row}>
                    <View style={s.flex}>
                      <Field
                        label={`Opakování ${i + 1}`}
                        value={set.reps}
                        placeholder={String(e.reps)}
                        numeric
                        onChange={(reps) =>
                          setValue(e.exerciseId, e.sets, i, {
                            reps,
                            done: false,
                          })
                        }
                      />
                    </View>
                    <View style={s.flex}>
                      <Field
                        label={`Váha kg ${i + 1}`}
                        value={set.weight}
                        placeholder="0"
                        numeric
                        onChange={(weight) =>
                          setValue(e.exerciseId, e.sets, i, {
                            weight,
                            done: false,
                          })
                        }
                      />
                    </View>
                  </View>
                  <Button
                    title={
                      set.done ? "✓ Série hotová · změnit" : "Potvrdit sérii"
                    }
                    secondary={set.done}
                    onPress={() => {
                      const reps = numberInput(set.reps),
                        weight = numberInput(set.weight);
                      if (
                        !set.reps.trim() ||
                        !Number.isInteger(reps) ||
                        reps < 1 ||
                        reps > 100 ||
                        !set.weight.trim() ||
                        !Number.isFinite(weight) ||
                        weight < 0 ||
                        weight > 1000
                      ) {
                        setError("Doplň 1–100 opakování a váhu 0–1000 kg.");
                        return;
                      }
                      setError("");
                      setValue(e.exerciseId, e.sets, i, { done: !set.done });
                      if (!set.done)
                        onRest(a.id, Date.now() + e.restSeconds * 1000);
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </>
      )}
      <View style={s.card}>
        <Text style={s.label}>
          {log ? "OPRAVIT VÝKON" : "ZAPSAT SKUTEČNÝ VÝKON"}
        </Text>
        <Field
          label="Skutečná délka (min)"
          value={minutes}
          onChange={(v) => {
            setMinutes(v);
            onMetrics(a.id, { minutes: v, km });
          }}
          numeric
          placeholder="Kolik minut jsi cvičil?"
        />
        {["run", "cycle", "swim"].includes(a.kind) && (
          <Field
            label="Skutečná vzdálenost (km)"
            value={km}
            onChange={(v) => {
              setKm(v);
              onMetrics(a.id, { minutes, km: v });
            }}
            numeric
            placeholder="Např. 3,5"
          />
        )}
        {error && <Text style={s.error}>{error}</Text>}
        <Button
          title={log ? "Uložit opravu" : "Dokončit trénink"}
          disabled={a.day > dateKey()}
          onPress={() => {
            if (log && a.kind === "strength" && !correcting) {
              const entry = {
                ...log,
                at: Date.now(),
                minutes: numberInput(minutes),
              };
              const err = logError(a, entry);
              if (err) setError(err);
              else onComplete(a, entry);
            } else finish();
          }}
        />
        {a.day > dateKey() && (
          <Text style={s.small}>
            Budoucí aktivitu dokončíš nejdřív v její naplánovaný den.
          </Text>
        )}
        <Text style={s.small}>
          Záznam je vlastní zápis. Plánované hodnoty ani otevření tréninku
          nepřidávají kilometry a odznaky.
        </Text>
      </View>
      {!log && (
        <View style={{ gap: 10 }}>
          <Button
            secondary
            title={deleting ? "Potvrdit odebrání aktivity" : "Odebrat z plánu"}
            onPress={() => (deleting ? onDelete(a.id) : setDeleting(true))}
          />
          {deleting && (
            <>
              <Text style={s.small}>
                Odebere se i rozepsaný trénink této aktivity.
              </Text>
              <Button
                secondary
                title="Ponechat aktivitu"
                onPress={() => setDeleting(false)}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
