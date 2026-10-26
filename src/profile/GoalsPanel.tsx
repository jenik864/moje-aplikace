import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { palette } from "../design";
import {
  goalDefinitions,
  parseGoals,
  type GoalId,
  type GoalProgress,
  type GoalTargets,
} from "./goals";

export type GoalsPanelProps = {
  targets: GoalTargets;
  progress: GoalProgress;
  onChange: (targets: GoalTargets) => void;
  disabled?: boolean;
  saving?: boolean;
  onDirty?: (dirty: boolean) => void;
  initialEditing?: boolean;
};
const colors: Record<GoalId, string> = {
  workouts: palette.Build,
  mindDays: palette.Mind,
  lessons: "#D7EB96",
  businessSteps: palette.Business,
};
const draftFor = (targets: GoalTargets) =>
  Object.fromEntries(
    goalDefinitions.map(({ id }) => [id, String(targets[id])]),
  ) as Record<GoalId, string>;
const signature = (targets: GoalTargets) =>
  goalDefinitions.map(({ id }) => targets[id]).join(",");
const pretty = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });

export function GoalsPanel({
  targets,
  progress,
  onChange,
  disabled = false,
  saving = false,
  onDirty,
  initialEditing = false,
}: GoalsPanelProps) {
  const [editing, setEditing] = useState(initialEditing),
    [draft, setDraft] = useState(() => draftFor(targets)),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState(false);
  const storedSignature = signature(targets),
    dirty =
      editing &&
      goalDefinitions.some(({ id }) => draft[id] !== String(targets[id])),
    locked = disabled || saving;
  useEffect(() => {
    setDraft(draftFor(targets));
    setError("");
  }, [storedSignature]);
  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);

  function changeDraft(id: GoalId, value: string) {
    setDraft((current) => ({ ...current, [id]: value }));
    setError("");
    setUpdated(false);
  }
  function save() {
    if (locked) return;
    try {
      const values = Object.fromEntries(
        goalDefinitions.map(({ id }) => [
          id,
          /^\d{1,3}$/.test(draft[id]) ? Number(draft[id]) : NaN,
        ]),
      );
      const next = parseGoals(values);
      onChange(next);
      setDraft(draftFor(next));
      setError("");
      setEditing(false);
      setUpdated(true);
      onDirty?.(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cíle se nepodařilo změnit.");
    }
  }
  return (
    <View style={s.section}>
      <View style={s.heading}>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={s.label}>MOJE TEMPO / TENTO TÝDEN</Text>
          <Text style={s.title}>Směr si volíš ty.</Text>
        </View>
        <Text style={s.week}>
          {pretty(progress.start)} – {pretty(progress.end)}
        </Text>
      </View>
      <Text style={s.description}>
        {progress.enabledCount === 0
          ? "Vyber si, co chceš tento týden držet. Žádný cíl se nezapíná automaticky."
          : `${progress.completedCount}/${progress.enabledCount} aktivních cílů splněno. Počítají se potvrzené záznamy od pondělí do neděle.`}
      </Text>
      <View>
        {progress.rows.map((row, index) => (
          <View key={row.id} style={s.row}>
            <View style={s.rowTop}>
              <Text style={[s.index, { color: colors[row.id] }]}>
                {String(index + 1).padStart(2, "0")}
              </Text>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.rowTitle}>{row.title}</Text>
                <Text style={s.detail}>{row.detail}</Text>
              </View>
              <View style={s.value}>
                <Text
                  style={[
                    s.count,
                    { color: row.complete ? colors[row.id] : "#F3F4F8" },
                  ]}
                >
                  {row.actual === null ? "—" : row.actual}
                  {row.enabled && <Text style={s.target}> / {row.target}</Text>}
                </Text>
                <Text
                  style={[s.state, row.complete && { color: colors[row.id] }]}
                >
                  {!row.enabled
                    ? "Bez cíle"
                    : row.actual === null
                      ? "Čeká na data"
                      : row.complete
                        ? "Splněno"
                        : "Průběžně"}
                </Text>
              </View>
            </View>
            {row.enabled && row.actual !== null && (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Týdenní cíl ${row.title}`}
                accessibilityValue={{
                  min: 0,
                  max: row.target,
                  now: Math.min(row.actual, row.target),
                  text: `${row.actual} z ${row.target}`,
                }}
                aria-valuemin={0}
                aria-valuemax={row.target}
                aria-valuenow={Math.min(row.actual, row.target)}
                style={s.track}
              >
                <View
                  style={{
                    height: 2,
                    width: `${row.ratio * 100}%`,
                    backgroundColor: colors[row.id],
                  }}
                />
              </View>
            )}
          </View>
        ))}
      </View>
      {progress.unavailableCount > 0 && (
        <Text accessibilityLiveRegion="polite" style={s.description}>
          Některá data se ještě nenačetla. Chybějící záznamy nepovažujeme za
          nulový výsledek.
        </Text>
      )}
      <Text style={s.detail}>
        Business sleduje dokončené kroky a celkový rank nemění.
      </Text>
      {updated && !editing && (
        <Text accessibilityLiveRegion="polite" style={s.link}>
          {saving
            ? "Ukládám cíle…"
            : "Cíle aktualizované. Tvůj postup vidíš v přehledu výše."}
        </Text>
      )}
      {!editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: false, disabled: locked }}
          disabled={locked}
          onPress={() => {
            setEditing(true);
            setUpdated(false);
          }}
          style={({ pressed }) => [
            s.linkButton,
            pressed && { opacity: 0.6 },
            locked && { opacity: 0.45 },
          ]}
        >
          <Text style={s.link}>
            {progress.enabledCount
              ? "Upravit týdenní cíle →"
              : "Vybrat moje cíle →"}
          </Text>
        </Pressable>
      ) : (
        <View style={s.editor}>
          <Text style={s.editorTitle}>Nastav si vlastní tempo.</Text>
          <Text style={s.description}>
            Čísla jsou tvoje týdenní cíle. Nula daný cíl vypíná. Změny se uloží
            až po potvrzení.
          </Text>
          {goalDefinitions.map(({ id, field, maximum }) => {
            const parsed = Number(draft[id]),
              current = Number.isInteger(parsed) ? parsed : 0;
            return (
              <View key={id} style={s.fieldRow}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.fieldLabel}>{field}</Text>
                  <Text style={s.detail}>0–{maximum}</Text>
                </View>
                <View style={s.stepper}>
                  <StepButton
                    symbol="−"
                    label={`Snížit cíl: ${field}`}
                    disabled={locked || current <= 0}
                    onPress={() =>
                      changeDraft(id, String(Math.max(0, current - 1)))
                    }
                  />
                  <TextInput
                    accessibilityLabel={`Cíl: ${field}`}
                    accessibilityHint={`Celé číslo od 0 do ${maximum}; nula cíl vypíná.`}
                    value={draft[id]}
                    onChangeText={(value) => changeDraft(id, value.slice(0, 4))}
                    editable={!locked}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={4}
                    style={s.input}
                  />
                  <StepButton
                    symbol="+"
                    label={`Zvýšit cíl: ${field}`}
                    disabled={locked || current >= maximum}
                    onPress={() =>
                      changeDraft(
                        id,
                        String(Math.min(maximum, Math.max(0, current) + 1)),
                      )
                    }
                  />
                </View>
              </View>
            );
          })}
          {!!error && (
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: locked || !dirty }}
            disabled={locked || !dirty}
            onPress={save}
            style={({ pressed }) => [
              s.save,
              (locked || !dirty) && { opacity: 0.4 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={s.saveText}>
              {saving ? "Ukládám cíle…" : "Uložit moje cíle"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={locked}
            accessibilityState={{ disabled: locked }}
            onPress={() => {
              setDraft(draftFor(targets));
              setError("");
              setEditing(false);
            }}
            style={s.linkButton}
          >
            <Text style={s.cancel}>Zrušit úpravy</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
function StepButton({
  symbol,
  label,
  disabled,
  onPress,
}: {
  symbol: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.step,
        disabled && { opacity: 0.3 },
        pressed && { backgroundColor: "#FFFFFF12" },
      ]}
    >
      <Text style={s.stepText}>{symbol}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  section: { gap: 20 },
  heading: { gap: 12 },
  label: {
    color: palette.Me,
    fontSize: 9,
    letterSpacing: 1.9,
    fontWeight: "700",
  },
  title: {
    color: "#F2F3F8",
    fontSize: 29,
    fontWeight: "500",
    letterSpacing: -1,
  },
  week: { color: "#94A0B4", fontSize: 12, lineHeight: 19 },
  description: { color: "#9EABC0", fontSize: 13, lineHeight: 21 },
  row: {
    paddingVertical: 21,
    gap: 17,
    borderTopWidth: 1,
    borderColor: "#FFFFFF13",
  },
  rowTop: { flexDirection: "row", gap: 13, alignItems: "flex-start" },
  index: { fontSize: 10, paddingTop: 3, fontVariant: ["tabular-nums"] },
  rowTitle: {
    color: "#EDEEF6",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  detail: { color: "#8290A7", fontSize: 11, lineHeight: 18 },
  value: { alignItems: "flex-end", gap: 5, paddingLeft: 6 },
  count: { fontSize: 25, fontWeight: "400", fontVariant: ["tabular-nums"] },
  target: { color: "#728099", fontSize: 14 },
  state: { color: "#8290A7", fontSize: 10 },
  track: { height: 2, backgroundColor: "#FFFFFF0C", overflow: "hidden" },
  linkButton: { minHeight: 44, justifyContent: "center" },
  link: { color: palette.Me, fontSize: 14, fontWeight: "600" },
  editor: { gap: 18, paddingTop: 8 },
  editorTitle: {
    color: "#F2F3F8",
    fontSize: 24,
    letterSpacing: -0.7,
    fontWeight: "500",
  },
  fieldRow: {
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#FFFFFF10",
    paddingTop: 20,
  },
  fieldLabel: { color: "#DCE1EC", fontSize: 14, lineHeight: 21 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF05",
  },
  stepText: { color: "#D5DBE7", fontSize: 24, fontWeight: "400" },
  input: {
    minWidth: 64,
    minHeight: 48,
    color: "#F5F4F9",
    fontSize: 29,
    fontWeight: "400",
    textAlign: "center",
    borderBottomWidth: 1,
    borderColor: "#FFFFFF25",
    paddingVertical: 6,
    fontVariant: ["tabular-nums"],
  },
  save: {
    minHeight: 52,
    borderRadius: 28,
    backgroundColor: palette.Me,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  saveText: { color: "#17121A", fontSize: 14, fontWeight: "700" },
  cancel: { color: "#9EABC0", fontSize: 13 },
  error: { color: "#FFADB8", fontSize: 13, lineHeight: 21 },
});
