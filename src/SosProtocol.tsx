import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen, rankColors } from "./ui";
import {
  dayKey,
  definitions,
  protocolRemaining,
  type Program,
  type ProgramId,
} from "./model";
import { activePillars } from "./food/model";
import { dailyStyles } from "./daily/styles";
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
  const [selected, setSelected] = React.useState(pillarId);
  const [trigger, setTrigger] = React.useState("");
  const [started, setStarted] = React.useState<number | null>(null);
  const [accumulated, setAccumulated] = React.useState(0);
  const [deadline, setDeadline] = React.useState<number | null>(null);
  const [clock, setClock] = React.useState(Date.now());
  const [outcome, setOutcome] = React.useState("");
  const scroll = React.useRef<ScrollView>(null);
  const food = id === "food";
  const accent = food ? "#e5b1a6" : id === "scroll" ? "#b6c9dd" : "#ffb0b7";
  const s = dailyStyles(accent);
  const pillars =
    food && program ? activePillars(program, dayKey(new Date(clock))) : [];
  const pillar = pillars.find((v) => v.id === selected);
  const content = supportFor(id, pillar?.label);
  const duration = food ? 120 : 300;
  const remaining =
    deadline === null ? duration : protocolRemaining(deadline, clock);
  const hunger =
    food && (trigger === "Hlad" || content.kind === "PRAVIDELNÁ JÍDLA");
  React.useEffect(() => {
    if (deadline === null) return;
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
        borderRadius: 13,
        borderWidth: 1,
        borderColor: checked ? accent : "#393438",
        backgroundColor: checked ? "#33282c" : "#151416",
        justifyContent: "center",
      }}
    >
      <Text style={[s.body, checked && { color: accent }]}>{value}</Text>
    </Pressable>
  );
  const elapsedFraction =
    deadline === null ? 0 : Math.min(1, 1 - remaining / duration);
  return (
    <Screen modal>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zavřít SOS bez uložení"
          onPress={close}
          style={s.back}
        >
          <Text style={s.body}>✕ ZAVŘÍT</Text>
        </Pressable>
        <Text style={[s.label, { flexShrink: 1, textAlign: "right" }]}>
          SOS · {definitions[id].title.toUpperCase()}
        </Text>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={[s.content, { gap: 18 }]}>
        {food && !pillar && pillars.length > 0 && (
          <View style={s.card}>
            <Text style={s.label}>S ČÍM TEĎ CHCEŠ POMOCT?</Text>
            {pillars.map((v) =>
              choice(
                v.label,
                false,
                () => {
                  setSelected(v.id);
                  setTrigger("");
                },
                `SOS pro ${v.label}`,
              ),
            )}
          </View>
        )}
        {pillar && (
          <View style={s.row}>
            <Text style={[s.label, { flex: 1 }]}>{pillar.label}</Text>
            {!started && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(undefined)}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 8,
                }}
              >
                <Text style={s.link}>ZMĚNIT</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={{ gap: 12 }}>
          <Text style={s.label}>{content.kind}</Text>
          <Text style={s.heading}>{content.title}</Text>
        </View>
        <View
          style={[
            s.card,
            {
              backgroundColor: food
                ? "#231c18"
                : id === "scroll"
                  ? "#17212a"
                  : "#251820",
              borderColor: accent,
              gap: 12,
            },
          ]}
        >
          <Text style={s.label}>QUITTER JE TU S TEBOU</Text>
          <Text style={[s.title, { fontSize: 22, lineHeight: 31 }]}>
            {started !== null && remaining > 0
              ? content.reminders[Math.min(2, Math.floor(elapsedFraction * 3))]
              : content.message}
          </Text>
          <Text style={s.muted}>
            {started !== null && remaining > 0
              ? "Nutkání může zeslábnout. Teď stačí projít touhle chvílí."
              : "Nemusíš být dokonalý. Rozhodnout se můžeš znovu právě teď."}
          </Text>
        </View>
        {program && (
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: rankColors[rank],
              paddingLeft: 14,
              gap: 6,
            }}
          >
            <Text style={[s.label, { color: rankColors[rank] }]}>
              TVŮJ DOSAVADNÍ POKROK
            </Text>
            <Text style={s.body}>
              {supportProgress(id, program, clock, selected)}
            </Text>
          </View>
        )}
        {!!reasons.trim() && (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>PŘIPOMEŇ SI SVOJE PROČ</Text>
            <Text style={s.body}>{reasons}</Text>
          </View>
        )}
        <View style={s.card}>
          <Text style={s.label}>JEDEN KROK TEĎ</Text>
          <Text style={s.body}>
            {hunger
              ? "Dej si dostupné syté jídlo nebo svačinu. Hlad nemusíš překonávat čekáním; tvůj plán je tu pro péči o sebe."
              : trigger === "Stres" && food
                ? "Zkus klidně vydechnout a na chvíli změnit místo. Pokud máš zároveň hlad, dej si jídlo. Pak se rozhodni podle svého plánu."
                : content.action}
          </Text>
          {hunger && (
            <Pressable
              accessibilityRole="button"
              onPress={() => finish("Pokračovat s jídlem")}
              style={s.button}
            >
              <Text style={s.buttonText}>POKRAČOVAT S JÍDLEM</Text>
            </Pressable>
          )}
        </View>
        {food && (
          <View style={s.card}>
            <Text style={s.label}>CO TEĎ CÍTÍŠ? · VOLITELNÉ</Text>
            <View style={{ gap: 8 }}>
              {["Hlad", "Chuť", "Stres", "Nevím"].map((v) =>
                choice(v, trigger === v, () => setTrigger(v)),
              )}
            </View>
          </View>
        )}
        {(!hunger || started !== null) && (
          <View style={[s.card, { borderColor: "#44343e" }]}>
            <View style={s.row}>
              <Text style={[s.label, { flex: 1 }]}>
                {deadline === null
                  ? "CHVÍLE PRO VLASTNÍ VOLBU"
                  : remaining
                    ? "DEJ SI PROSTOR"
                    : "JAK JE TI TEĎ?"}
              </Text>
              <Text
                style={{
                  color: accent,
                  fontSize: 38,
                  fontWeight: "500",
                  fontVariant: ["tabular-nums"],
                }}
              >{`${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}</Text>
            </View>
            <View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: "#352a31",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 5,
                  width: `${elapsedFraction * 100}%`,
                  backgroundColor: accent,
                }}
              />
            </View>
            {deadline === null ? (
              <>
                <Text style={s.body}>
                  Dej si {food ? "dvě" : "pět"} minuty prostoru. Pak znovu
                  zhodnoť, co potřebuješ.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={begin}
                  style={s.button}
                >
                  <Text style={s.buttonText}>SPUSTIT PAUZU</Text>
                </Pressable>
              </>
            ) : remaining ? (
              <Text style={s.muted}>
                Odlož telefon. Čas běží i mimo aplikaci; vrátit se můžeš
                kdykoli.
              </Text>
            ) : (
              <>
                <Text style={s.body}>
                  Pokud nutkání zůstává, není to prohra. Vyber, co ti pomůže
                  dál.
                </Text>
                {choice("Je to slabší", outcome === "Je to slabší", () =>
                  setOutcome("Je to slabší"),
                )}
                {choice("Potřebuju ještě chvíli", false, begin)}
                <Text style={s.muted}>
                  Další pauza navazuje na tu předchozí. Můžeš také změnit místo
                  nebo oslovit někoho, komu důvěřuješ.
                </Text>
              </>
            )}
          </View>
        )}
        {!food && (
          <View style={{ gap: 10 }}>
            <Text style={s.label}>CO ZA TÍM BYLO? · VOLITELNÉ</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Nuda", "Stres", "Samota", "Zvyk"].map((v) =>
                choice(v, trigger === v, () => setTrigger(v)),
              )}
            </View>
          </View>
        )}
        <Text style={s.muted}>
          Návrat uloží tuto chvíli podpory. SOS samo nemění rank ani denní
          zápisy.
        </Text>
      </ScrollView>
      <View style={[s.header, { borderBottomWidth: 0, borderTopWidth: 1 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => finish()}
          style={[s.button, { flex: 1, backgroundColor: "#2a2428" }]}
        >
          <Text style={[s.buttonText, { color: "#f3e2ed" }]}>
            VRÁTIT SE K MÉMU PLÁNU
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
