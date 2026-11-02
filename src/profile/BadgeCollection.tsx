import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { palette, AppIcon } from "../design";
import type { BuildData } from "../build/model";
import type { MindData } from "../mind/model";
import { badgeCollection } from "./activity";
type Props = {
  build: BuildData | null;
  mind: MindData | null;
  now?: number;
  onOpen?: (source: "Build" | "Mind") => void;
};
const number = (n: number) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
function BadgeMark({
  source,
  earned,
}: {
  source: "Build" | "Mind";
  earned: boolean;
}) {
  const color = earned ? palette[source] : "#6a6a6a";
  return (
    <Svg width={45} height={52} viewBox="0 0 48 56" accessible={false}>
      <Path
        d="M24 2L44 13V36L24 52L4 36V13Z"
        fill={earned ? `${color}12` : "transparent"}
        stroke={color}
        strokeWidth={1.2}
      />
      <Path
        d="M24 7L39 16V33L24 45L9 33V16Z"
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        opacity={0.5}
      />
      {earned ? (
        <Path
          d="M15 26L22 33L34 20"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <Circle cx="24" cy="24" r="5" stroke={color} fill="none" />
          <Path d="M24 29V34" stroke={color} />
        </>
      )}
    </Svg>
  );
}
export function BadgeCollection({ build, mind, onOpen }: Props) {
  const [source, setSource] = useState<"all" | "Build" | "Mind">("all"),
    [status, setStatus] = useState<"all" | "earned" | "locked">("all"),
    [expanded, setExpanded] = useState<string | null>(null);
  const all = useMemo(() => badgeCollection(build, mind), [build, mind]),
    earned = all.filter((b) => b.earnedAt !== null).length;
  const visible = all.filter(
    (b) =>
      (source === "all" || b.source === source) &&
      (status === "all" ||
        (status === "earned" ? b.earnedAt !== null : b.earnedAt === null)),
  );
  const filter = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        s.filter,
        selected && {
          borderColor: `${palette.Me}70`,
          backgroundColor: `${palette.Me}12`,
        },
      ]}
    >
      <Text style={[s.filterText, selected && { color: palette.Me }]}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={s.body}>
      <View style={{ gap: 9 }}>
        <Text style={s.label}>SBÍRKA / SKUTEČNÉ MILNÍKY</Text>
        <Text style={s.title}>Malé výhry. Trvalá stopa.</Text>
        <Text style={s.muted}>
          Odznaky Build a Mind vedle sebe. Každý má vlastní podmínku a uložené
          datum získání.
        </Text>
      </View>
      {(build === null || mind === null) && (
        <Text accessibilityRole="alert" style={s.notice}>
          Nenačtená oblast:{" "}
          {[build === null ? "Build" : "", mind === null ? "Mind" : ""]
            .filter(Boolean)
            .join(", ")}
          . Její odznaky zatím nejsou součástí přehledu.
        </Text>
      )}
      <View style={s.summary}>
        <View style={{ gap: 5 }}>
          <Text style={s.metric}>
            {earned}
            <Text style={{ fontSize: 18, color: "#828282" }}>
              {" "}
              / {all.length}
            </Text>
          </Text>
          <Text style={s.small}>odemčeno v načtených oblastech</Text>
        </View>
        <View style={s.collectionMark}>
          <BadgeMark
            source="Build"
            earned={!!build && Object.values(build.earned).length > 0}
          />
          <View style={{ marginLeft: -12, marginTop: 17 }}>
            <BadgeMark
              source="Mind"
              earned={!!mind && Object.values(mind.earned).length > 0}
            />
          </View>
        </View>
      </View>
      <View style={s.filters}>
        {filter("Všechny oblasti", source === "all", () => setSource("all"))}
        {filter("Build", source === "Build", () => setSource("Build"))}
        {filter("Mind", source === "Mind", () => setSource("Mind"))}
      </View>
      <View style={s.filters}>
        {filter("Všechny odznaky", status === "all", () => setStatus("all"))}
        {filter("Získané", status === "earned", () => setStatus("earned"))}
        {filter("Výzvy", status === "locked", () => setStatus("locked"))}
      </View>
      <Text style={s.small}>
        Klepnutím na odznak zobrazíš podmínku a aktuální podklady. Získaný
        odznak zůstává i po opravě záznamů.
      </Text>
      {visible.length === 0 ? (
        <View style={{ gap: 12, paddingVertical: 25 }}>
          <Text style={s.heading}>Tento výběr je zatím prázdný.</Text>
          <Text style={s.muted}>
            {status === "earned"
              ? "První odznak získáš potvrzením skutečné aktivity v Build nebo Mind."
              : "Zkus jinou oblast nebo zobraz celou sbírku."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSource("all");
              setStatus("all");
            }}
            style={{ paddingVertical: 10 }}
          >
            <Text style={s.link}>Zobrazit celou sbírku →</Text>
          </Pressable>
        </View>
      ) : (
        visible.map((b) => {
          const unlocked = b.earnedAt !== null,
            opened = expanded === b.id,
            color = palette[b.source],
            fraction = unlocked
              ? 1
              : Math.min(1, Math.max(0, b.value / b.target));
          return (
            <View key={b.id} style={s.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Detail odznaku ${b.title} v ${b.source}`}
                accessibilityState={{ expanded: opened }}
                aria-expanded={opened}
                onPress={() => setExpanded(opened ? null : b.id)}
                style={s.badgeHeader}
              >
                <BadgeMark source={b.source} earned={unlocked} />
                <View style={{ flex: 1, gap: 7 }}>
                  <View style={s.between}>
                    <Text style={[s.tag, { color }]}>
                      {b.source}
                      {b.pinned ? " · PŘIPNUTO V BUILD" : ""}
                    </Text>
                    <Text
                      style={[s.small, { color: unlocked ? color : "#8e8e8e" }]}
                    >
                      {unlocked ? "ZÍSKÁNO" : "VÝZVA"}
                    </Text>
                  </View>
                  <Text style={s.heading}>{b.title}</Text>
                  <Text style={s.small}>
                    {unlocked
                      ? new Date(b.earnedAt!).toLocaleDateString("cs-CZ", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : `${number(Math.min(b.value, b.target))} / ${number(b.target)} ${b.unit}`}
                  </Text>
                  <View style={{ height: 2, backgroundColor: "#ffffff12" }}>
                    <View
                      style={{
                        height: 2,
                        width: `${fraction * 100}%`,
                        backgroundColor: color,
                        opacity: unlocked ? 1 : 0.6,
                      }}
                    />
                  </View>
                </View>
                <Text style={s.link}>{opened ? "−" : "+"}</Text>
              </Pressable>
              {opened && (
                <View style={s.details}>
                  <Text style={s.muted}>{b.description}</Text>
                  <Text style={s.small}>
                    Aktuální podklady: {number(b.value)} / {number(b.target)}{" "}
                    {b.unit}.
                  </Text>
                  {unlocked && b.value < b.target && (
                    <Text style={s.muted}>
                      Původní podmínka byla splněná při získání. Současné
                      záznamy se od té doby změnily; uložený odznak ti zůstává.
                    </Text>
                  )}
                  {!unlocked && b.value >= b.target && (
                    <Text style={s.muted}>
                      Podklady podmínku splňují, ale získání zatím není uložené
                      v oblasti {b.source}. Sbírka sama nové odměny nevytváří.
                    </Text>
                  )}
                  {onOpen && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Otevřít ${b.source} z odznaku ${b.title}`}
                      onPress={() => onOpen(b.source)}
                      style={[s.between, { paddingVertical: 10 }]}
                    >
                      <Text style={[s.link, { color }]}>
                        Otevřít {b.source}
                      </Text>
                      <AppIcon name="Build" color={color} size={16} />
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
const s = StyleSheet.create({
  body: { gap: 20 },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -1.3,
    color: "#f4f6fa",
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: palette.Me,
  },
  heading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.3,
    color: "#f4f6fa",
  },
  muted: { fontSize: 13, lineHeight: 22, color: "#acacac" },
  small: { fontSize: 10, lineHeight: 18, color: "#989898" },
  link: { fontSize: 13, fontWeight: "600", color: palette.Me },
  tag: { fontSize: 9, letterSpacing: 1.1, fontWeight: "700" },
  summary: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff15",
    paddingVertical: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  metric: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: "500",
    letterSpacing: -2,
    color: palette.Me,
  },
  collectionMark: { flexDirection: "row", paddingRight: 5 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 9,
  },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: {
    minHeight: 40,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#ffffff1b",
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  filterText: { fontSize: 12, fontWeight: "600", color: "#b0b0b0" },
  row: { borderTopWidth: 1, borderColor: "#ffffff12", paddingTop: 16 },
  badgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 76,
  },
  details: { gap: 12, paddingLeft: 58, paddingTop: 16 },
  notice: {
    borderLeftWidth: 2,
    borderColor: palette.Me,
    paddingLeft: 12,
    fontSize: 12,
    lineHeight: 20,
    color: "#d2d2d2",
  },
});
