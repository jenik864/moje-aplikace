import { EmergencyAction } from "./EmergencyAction";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen, rankColors } from "./ui";
import { palette, ink } from "./design";
import {
  dayKey,
  definitions,
  protocolRemaining,
  type Program,
  type ProgramId,
} from "./model";
import { activePillars } from "./food/model";
import { dailyStyles } from "./daily/styles";
import { tint } from "./porn/theme";
import { Encouragement } from "./sos/Encouragement";
import { programContent } from "./programContent";
import { SosVisual } from "./sos/Visual";
import { supportFor, supportProgress } from "./sos/content";
export type SosProps = {
  id: ProgramId;
  reasons: string;
  program?: Program;
  pillarId?: string;
  rank?: number;
  close: () => void;
  complete: (
    trigger: string,
    elapsed: number,
    pauseStarted?: boolean,
    outcome?: string,
    pillarId?: string,
  ) => void;
};
export function SosProtocol({
  id,
  reasons,
  program,
  pillarId,
  rank = 0,
  close,
  complete,
}: SosProps) {
  const [selected, setSelected] = React.useState(() => {
    const values = program ? activePillars(program, dayKey(new Date())) : [];
    return pillarId ?? (values.length === 1 ? values[0].id : undefined);
  });
  const [details, setDetails] = React.useState(false);
  const [trigger, setTrigger] = React.useState("");
  const [started, setStarted] = React.useState<number | null>(null);
  const [accumulated, setAccumulated] = React.useState(0);
  const [deadline, setDeadline] = React.useState<number | null>(null);
  const [clock, setClock] = React.useState(Date.now());
  const [outcome, setOutcome] = React.useState("");
  const scroll = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  const food = id === "food";
  const accent =
    id === "food"
      ? palette.Me
      : id === "scroll"
        ? palette.Business
        : palette.Quit;
  const s = dailyStyles(accent);
  const pillars =
    food && program ? activePillars(program, dayKey(new Date(clock))) : [];
  const pillar = pillars.find((v) => v.id === selected);
  const content = supportFor(id, pillar?.label);
  const duration = programContent[id].duration;
  const remaining =
    deadline === null ? duration : protocolRemaining(deadline, clock);
  const hunger =
    food && (trigger === "Hlad" || content.kind === "PRAVIDELNÁ JÍDLA");
  React.useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, [deadline]);
  const begin = () => {
    const at = Date.now();
    if (started !== null)
      setAccumulated(
        (total) => total + Math.max(0, Math.min(at, deadline ?? at) - started),
      );
    setStarted(at);
    setClock(at);
    setDeadline(at + duration * 1000);
    setOutcome("");
  };
  const finish = (result = outcome || "Návrat k plánu") =>
    complete(
      trigger || "Neuvedeno",
      started === null
        ? 0
        : Math.floor(
            (accumulated +
              Math.max(
                0,
                Math.min(Date.now(), deadline ?? Date.now()) - started,
              )) /
              1000,
          ),
      started !== null,
      result,
      food ? selected : undefined,
    );
  const choice = (
    value: string,
    checked: boolean,
    action: () => void,
    label = value,
  ) => (
    <Pressable
      key={value}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={action}
      style={{
        minHeight: 48,
        padding: 13,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: checked ? accent : "#343434",
        backgroundColor: checked ? tint(accent, 0.13) : "transparent",
        justifyContent: "center",
      }}
    >
      <Text style={[s.body, checked && { color: accent }]}>{value}</Text>
    </Pressable>
  );
  const elapsedFraction =
    deadline === null ? 0 : Math.min(1, 1 - remaining / duration);
  const choosing = food && !pillar && pillars.length > 0;
  const running = started !== null && remaining > 0;
  const done = started !== null && remaining === 0;
  const seconds = program
    ? Math.floor(Math.max(0, clock - program.startedAt) / 1000)
    : 0;
  const title =
    id === "porn"
      ? "Tahle série stojí za to."
      : id === "scroll"
        ? "Vystup z feedu."
        : hunger
          ? "Dej si jídlo."
          : "Změň další volbu.";
  const punch = running
    ? content.reminders[Math.min(2, Math.floor(elapsedFraction * 3))]
    : done
      ? "Zastavil ses. Jak je ti teď?"
      : id === "porn"
        ? "Už jsi došel až sem. Dej si pět minut před dalším rozhodnutím."
        : id === "scroll"
          ? "Telefon stranou. Pět minut patří tobě."
          : hunger
            ? "Pravidelné jídlo je součást tvého plánu."
            : "Zvyk nemusí rozhodnout za tebe.";
  return (
    <Screen modal accent={accent}>
      <View style={[s.header, { paddingVertical: 5 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zavřít SOS bez uložení"
          onPress={close}
          style={s.back}
        >
          <Text style={s.muted}>✕ ZAVŘÍT</Text>
        </Pressable>
        <Text style={[s.label, { flexShrink: 1, textAlign: "right" }]}>
          SOS · {definitions[id].title.toUpperCase()}
        </Text>
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 12,
          paddingBottom: 20,
          gap: 12,
        }}
      >
        {choosing ? (
          <>
            <Text style={s.heading}>Co právě řešíš?</Text>
            <Text style={s.muted}>
              Vyber pilíř. Pomoc otevřeme rovnou pro něj.
            </Text>
            {pillars.map((v) =>
              choice(
                v.label,
                false,
                () => {
                  setSelected(v.id);
                  setTrigger("");
                  scroll.current?.scrollTo({ y: 0, animated: false });
                },
                `SOS pro ${v.label}`,
              ),
            )}
          </>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text style={s.label}>
                {food
                  ? (pillar?.label ?? "VĚDOMÁ VOLBA")
                  : id === "porn"
                    ? "TVÁ SÉRIE PRÁVĚ BĚŽÍ"
                    : "POZORNOST ZPÁTKY K TOBĚ"}
              </Text>
              <Text style={[s.heading, { fontSize: 28 }]}>{title}</Text>
            </View>
            <SosVisual
              id={id}
              rank={rank}
              seconds={seconds}
              remaining={remaining}
              duration={duration}
              active={started !== null}
              label={pillar?.label ?? ""}
              accent={accent}
            />
            {id === "porn" && (
              <Text
                style={[
                  s.muted,
                  { textAlign: "center", color: rankColors[rank] },
                ]}
              >
                Živý čas bez porna · aktuální série
              </Text>
            )}
            {food && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["Hlad", "Chuť", "Stres", "Nevím"].map((v) =>
                  choice(v, trigger === v, () => setTrigger(v)),
                )}
              </View>
            )}
            <Encouragement messages={[punch, ...content.reminders]} />
            {running && id !== "scroll" && (
              <View
                style={[
                  s.row,
                  {
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: `${accent}35`,
                    paddingVertical: 16,
                  },
                ]}
              >
                <Text style={s.label}>TVOJE PAUZA</Text>
                <Text
                  style={{
                    color: accent,
                    fontSize: 28,
                    fontVariant: ["tabular-nums"],
                  }}
                >{`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</Text>
              </View>
            )}
            {running && (
              <Text style={[s.muted, { textAlign: "center" }]}>
                Odlož telefon. Čas běží i mimo aplikaci.
              </Text>
            )}
            {done && (
              <View style={{ gap: 8 }}>
                {choice("Je to slabší", outcome === "Je to slabší", () =>
                  setOutcome("Je to slabší"),
                )}
                {choice("Potřebuju ještě chvíli", false, begin)}
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: details }}
              onPress={() => setDetails((v) => !v)}
              style={{
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={s.link}>
                {details ? "MÉNĚ ↑" : "MOJE PROČ A DALŠÍ POMOC ↓"}
              </Text>
            </Pressable>
            {details && (
              <View style={[s.card, { gap: 12 }]}>
                {!!reasons.trim() && (
                  <>
                    <Text style={s.label}>TVOJE PROČ</Text>
                    <Text style={s.body}>{reasons}</Text>
                  </>
                )}
                <Text style={s.label}>DALŠÍ KROK</Text>
                <Text style={s.body}>
                  {hunger
                    ? "Při hladu si dej běžné syté jídlo. Pauza není povinnost."
                    : content.action}
                </Text>
                {program && (id !== "scroll" || !!program.usageDays) && (
                  <Text style={s.muted}>
                    {supportProgress(id, program, clock, selected)}
                  </Text>
                )}
                {!food && (
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {["Nuda", "Stres", "Samota", "Zvyk"].map((v) =>
                      choice(v, trigger === v, () => setTrigger(v)),
                    )}
                  </View>
                )}
                {food && !started && pillars.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSelected(undefined);
                      setDetails(false);
                      setTrigger("");
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                    style={s.button}
                  >
                    <Text style={s.buttonText}>ZMĚNIT PILÍŘ</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 10,
          paddingBottom: 4,
          gap: 2,
          borderTopWidth: 1,
          borderTopColor: "#292526",
          backgroundColor: ink,
        }}
      >
        {!choosing && (started === null || hunger) && (
          <EmergencyAction accessibilityLabel={hunger ? "POKRAČOVAT S JÍDLEM" : "SPUSTIT PAUZU"}
            onPress={hunger ? () => finish("Pokračovat s jídlem") : begin}>
            <Text style={[s.buttonText, { fontSize: 13, color: "#FFFFFF", textAlign: "center" }]}>
              {hunger ? "POKRAČOVAT S JÍDLEM" : "SPUSTIT PAUZU"}
            </Text>
            {!hunger && (
              <Text style={{ fontSize: 10, color: "#FFFFFF", textAlign: "center", marginTop: 3 }}>
                {food ? "2 MINUTY PRO TVOJI VOLBU" : "5 MINUT PRO TVOJI VOLBU"}
              </Text>
            )}
          </EmergencyAction>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => finish()}
          style={[
            s.button,
            {
              backgroundColor: running || done ? accent : "transparent",
              minHeight: 44,
              padding: 10,
            },
          ]}
        >
          <Text
            style={[
              s.buttonText,
              { color: running || done ? "#171015" : "#a5a5a5", fontSize: 10 },
            ]}
          >
            {"VRÁTIT SE K MÉMU PLÁNU"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
