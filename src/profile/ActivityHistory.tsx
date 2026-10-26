import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { palette, AppIcon } from "../design";
import { dayKey, type ProgramId } from "../model";
import {
  activityEvents,
  activitySources,
  activityDigest,
  filterActivity,
  groupActivity,
  type ActivitySource,
  type ProfileSources,
} from "./activity";

type Props = ProfileSources & {
  now?: number;
  onOpen?: (source: ActivitySource, program?: ProgramId) => void;
};
const shortDate = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
function Filter({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={[
        s.filter,
        selected && {
          backgroundColor: `${palette.Me}15`,
          borderColor: `${palette.Me}65`,
        },
      ]}
    >
      <Text style={[s.filterText, selected && { color: palette.Me }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function ActivityHistory({
  quit,
  build,
  mind,
  business,
  now,
  onOpen,
}: Props) {
  const clock = now ?? Date.now(),
    minute = Math.floor(clock / 60000),
    today = dayKey(new Date(clock));
  const [source, setSource] = useState<ActivitySource | "all">("all"),
    [range, setRange] = useState<7 | 30 | "all">(30),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(40),
    [expanded, setExpanded] = useState<string | null>(null),
    [help, setHelp] = useState(false);
  const sources = { quit, build, mind, business };
  const events = useMemo(
    () => activityEvents({ quit, build, mind, business }, clock),
    [quit, build, mind, business, minute],
  );
  const filtered = useMemo(
    () => filterActivity(events, { source, range, query }, clock),
    [events, source, range, query, minute],
  );
  const digest = useMemo(
    () =>
      activityDigest(filterActivity(events, { source, query }, clock), clock),
    [events, source, query, minute],
  );
  const groups = groupActivity(filtered.slice(0, limit)),
    recordDays = new Set(filtered.map((e) => e.day)).size;
  const missing = activitySources.filter(
    (name) => sources[name.toLowerCase() as keyof ProfileSources] === null,
  );
  const max = Math.max(1, ...digest.days.map((d) => d.count));
  useEffect(() => {
    setLimit(40);
    setExpanded(null);
  }, [source, range, query]);
  return (
    <View style={s.body}>
      <View style={{ gap: 9 }}>
        <Text style={s.label}>SOUVISLOSTI / TVOJE ZÁZNAMY</Text>
        <Text style={s.title}>Co už máš za sebou.</Text>
        <Text style={s.muted}>
          Tréninky, učení, péče, pracovní kroky i záznamy Quit na jednom místě.
        </Text>
      </View>
      {missing.length > 0 && (
        <Text accessibilityRole="alert" style={s.notice}>
          Některá data nejsou dostupná: {missing.join(", ")}. Zobrazujeme jen
          načtené oblasti.
        </Text>
      )}
      <View
        style={s.chart}
        accessibilityRole="image"
        accessibilityLabel={`Posledních 28 dní: ${digest.records} záznamů v ${digest.recordDays} dnech. Dny bez záznamu nemusí znamenat nečinnost.`}
      >
        <View style={s.between}>
          <Text style={s.label}>POSLEDNÍCH 28 DNÍ</Text>
          <Text style={s.small}>{digest.recordDays}/28 dnů se záznamem</Text>
        </View>
        <View style={s.bars}>
          {digest.days.map((d) => (
            <View
              key={d.day}
              style={{
                flex: 1,
                height: 76,
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              {d.count === 0 ? (
                <View style={{ height: 2, backgroundColor: "#ffffff14" }} />
              ) : (
                activitySources
                  .filter((name) => d.sources[name] > 0)
                  .map((name) => (
                    <View
                      key={name}
                      style={{
                        height: Math.max(2, (d.sources[name] / max) * 70),
                        backgroundColor: palette[name],
                        opacity: d.day === today ? 1 : 0.7,
                      }}
                    />
                  ))
              )}
            </View>
          ))}
        </View>
        <View style={s.between}>
          <Text style={s.small}>{shortDate(digest.days[0].day)}</Text>
          <Text style={s.small}>Dnes</Text>
        </View>
        <View style={s.legend}>
          {activitySources.map((name) => (
            <View
              key={name}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  backgroundColor: palette[name],
                }}
              />
              <Text style={s.small}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        <Filter
          label="Všechny oblasti"
          selected={source === "all"}
          onPress={() => setSource("all")}
        />
        {activitySources.map((name) => (
          <Filter
            key={name}
            label={name}
            selected={source === name}
            onPress={() => setSource(name)}
          />
        ))}
      </ScrollView>
      <View style={s.filters}>
        {(
          [
            [7, "7 dní"],
            [30, "30 dní"],
            ["all", "Celá historie"],
          ] as const
        ).map(([value, label]) => (
          <Filter
            key={value}
            label={label}
            selected={range === value}
            onPress={() => setRange(value)}
          />
        ))}
      </View>
      <View style={{ gap: 7 }}>
        <Text style={s.small}>Hledat v historii a poznámkách</Text>
        <TextInput
          accessibilityLabel="Hledat v historii a poznámkách"
          value={query}
          onChangeText={setQuery}
          placeholder="Četba, běh, název projektu…"
          placeholderTextColor="#6d7c93"
          style={s.input}
          autoCorrect={false}
        />
      </View>
      <View style={s.summary}>
        <View style={{ gap: 4 }}>
          <Text style={s.metric}>{filtered.length}</Text>
          <Text style={s.small}>záznamů podle filtru</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.metric}>{recordDays}</Text>
          <Text style={s.small}>dnů se záznamem</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: help }}
        onPress={() => setHelp(!help)}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={s.link}>
          {help ? "Skrýt vysvětlení ↑" : "Co se v historii počítá? ↓"}
        </Text>
      </Pressable>
      {help && (
        <View style={s.explanation}>
          <Text style={s.muted}>
            Jsou tu jen zachované zapsané nebo dokončené události. Plány,
            rozpracované bloky a hry se nezobrazují. Běžící série Quit se
            nepřevádí na vymyšlená denní splnění.
          </Text>
          <Text style={s.muted}>
            Aktivita Mind a její časový blok mohou popisovat stejnou činnost.
            Počty jsou záznamy, nikoli součet času nebo nové skóre. Oprava či
            odstranění původního záznamu upraví i historii.
          </Text>
          <Text style={s.muted}>
            Trénink a návyk patří k zaznamenanému dni. Blok přes půlnoc zůstává
            v původním dni; pracovní krok patří ke skutečnému datu dokončení. U
            lekce vidíš první dokončení a nejnovější uložené opakování.
          </Text>
        </View>
      )}
      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.heading}>V tomhle výběru zatím nic není.</Text>
          <Text style={s.muted}>
            {source !== "all" && missing.includes(source)
              ? "Nejdřív načti data této oblasti. Chybějící záznamy nepovažujeme za nulový výkon."
              : query
                ? "Zkus kratší výraz nebo jinou oblast."
                : "Dokončené aktivity se tu objeví automaticky. Plánování samo záznam nepřidá."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSource("all");
              setRange("all");
              setQuery("");
            }}
            style={{ paddingVertical: 12 }}
          >
            <Text style={s.link}>Zobrazit celou historii →</Text>
          </Pressable>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.day} style={{ gap: 0 }}>
            <View style={s.dateRow}>
              <Text style={s.label}>
                {group.day === today
                  ? "DNES"
                  : new Date(`${group.day}T12:00:00`)
                      .toLocaleDateString("cs-CZ", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                      .toLocaleUpperCase("cs-CZ")}
              </Text>
              <Text style={s.small}>
                {group.events.length}
                {filtered.filter((e) => e.day === group.day).length >
                group.events.length
                  ? ` / ${filtered.filter((e) => e.day === group.day).length}`
                  : ""}
              </Text>
            </View>
            {group.events.map((event) => {
              const opened = expanded === event.id,
                recorded =
                  event.at !== undefined &&
                  dayKey(new Date(event.at)) !== event.day;
              return (
                <View key={event.id} style={s.event}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Detail záznamu ${event.title}`}
                    accessibilityState={{ expanded: opened }}
                    aria-expanded={opened}
                    onPress={() => setExpanded(opened ? null : event.id)}
                    style={s.eventHeader}
                  >
                    <View
                      style={{
                        width: 3,
                        alignSelf: "stretch",
                        backgroundColor: palette[event.source],
                        opacity: 0.8,
                      }}
                    />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={s.between}>
                        <Text style={[s.tag, { color: palette[event.source] }]}>
                          {event.source}
                        </Text>
                        {event.at !== undefined && !recorded && (
                          <Text style={s.small}>
                            {new Date(event.at).toLocaleTimeString("cs-CZ", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </View>
                      <Text style={s.heading}>{event.title}</Text>
                      <Text style={s.muted}>{event.detail}</Text>
                    </View>
                    <Text style={[s.link, { fontSize: 20 }]}>
                      {opened ? "−" : "+"}
                    </Text>
                  </Pressable>
                  {opened && (
                    <View style={s.eventDetails}>
                      {event.note ? (
                        <Text style={s.note}>{event.note}</Text>
                      ) : (
                        <Text style={s.small}>
                          K tomuto záznamu není uložená poznámka.
                        </Text>
                      )}
                      {recorded && (
                        <Text style={s.small}>
                          Zapsáno{" "}
                          {new Date(event.at!).toLocaleString("cs-CZ", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          ; přehled používá den {shortDate(event.day)}.
                        </Text>
                      )}
                      {event.at === undefined && (
                        <Text style={s.small}>
                          Zdroj uchovává den záznamu, nikoli přesný čas.
                        </Text>
                      )}
                      {onOpen && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Otevřít ${event.source} ze záznamu ${event.title}`}
                          onPress={() => onOpen(event.source, event.program)}
                          style={[s.between, { paddingVertical: 10 }]}
                        >
                          <Text
                            style={[s.link, { color: palette[event.source] }]}
                          >
                            Otevřít oblast {event.source}
                          </Text>
                          <AppIcon
                            name="Build"
                            color={palette[event.source]}
                            size={15}
                          />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))
      )}
      {limit < filtered.length && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLimit((n) => n + 40)}
          style={s.loadMore}
        >
          <Text style={s.link}>
            Načíst dalších {Math.min(40, filtered.length - limit)} záznamů ↓
          </Text>
        </Pressable>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  body: { gap: 21 },
  title: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.3,
    fontWeight: "600",
    color: "#f5f6fa",
  },
  heading: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.25,
    fontWeight: "600",
    color: "#f5f6fa",
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: "700",
    color: palette.Me,
  },
  tag: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  muted: { fontSize: 13, lineHeight: 22, color: "#a0aec0" },
  small: { fontSize: 10, lineHeight: 17, color: "#899ab1" },
  link: { fontSize: 13, fontWeight: "600", color: palette.Me },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  chart: {
    gap: 12,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff16",
  },
  bars: { height: 78, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filter: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#ffffff1b",
    justifyContent: "center",
  },
  filterText: { fontSize: 12, fontWeight: "600", color: "#a4b2c5" },
  input: {
    minHeight: 48,
    paddingHorizontal: 3,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ffffff30",
    fontSize: 15,
    color: "#f5f6fa",
  },
  summary: {
    flexDirection: "row",
    gap: 40,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderColor: "#ffffff12",
  },
  metric: {
    fontSize: 33,
    fontWeight: "500",
    letterSpacing: -1,
    color: palette.Me,
    fontVariant: ["tabular-nums"],
  },
  notice: {
    color: "#ffc8ad",
    fontSize: 12,
    lineHeight: 20,
    borderLeftWidth: 2,
    borderLeftColor: palette.Me,
    paddingLeft: 13,
  },
  explanation: {
    gap: 12,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderColor: "#ffffff24",
  },
  empty: { gap: 12, paddingVertical: 22 },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#ffffff18",
  },
  event: {
    borderBottomWidth: 1,
    borderColor: "#ffffff0c",
    paddingVertical: 15,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 64,
  },
  eventDetails: { paddingLeft: 16, paddingTop: 14, gap: 12 },
  note: { fontSize: 14, lineHeight: 24, color: "#d6dfeb" },
  loadMore: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff14",
  },
});
