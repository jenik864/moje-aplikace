import React from "react";
import { Text, View } from "react-native";
import { ranks } from "../model";
import { RankEmblem, rankColors } from "../ui";
import { useMindStyles, Progress } from "./components";
import { mindRank, mindXP, mindMilestones, dailyMindXP } from "./ranking";
import { dayKey, type MindData } from "./model";
export function MindRanks({ data }: { data: MindData }) {
  const s = useMindStyles(),
    rank = mindRank(data),
    xp = mindXP(data),
    prime = Math.max(rank, data.prime ?? 0);
  return (
    <View style={{ gap: 24 }}>
      <Text style={s.label}>TVŮJ MENTÁLNÍ POSTUP</Text>
      <View style={[s.hero, { alignItems: "center" }]}>
        <RankEmblem value={rank} size={100} />
        <Text style={s.title}>{ranks[rank]}</Text>
        <Text style={s.muted}>
          {xp} XP · PRIME {ranks[prime]}
        </Text>
        <Progress
          value={
            rank === 11
              ? 1
              : (xp - mindMilestones[rank]) /
                (mindMilestones[rank + 1] - mindMilestones[rank])
          }
        />
        <Text style={s.text}>
          {rank === 11
            ? "Nejvyšší rank. Pokračuj svým tempem."
            : `${mindMilestones[rank + 1] - xp} XP do ${ranks[rank + 1]}`}
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.h3}>Za co získáváš XP</Text>
        <Text style={s.text}>
          Aktivity a bloky: 1 XP za minutu cíle splněné aktivity nebo
          dokončeného bloku, nejvýše 30 XP denně. Použije se vyšší z obou
          součtů.
        </Text>
        <Text style={s.text}>
          Aréna: 1 XP za správný příklad v dokončeném kole, nejvýše 15 XP denně.
        </Text>
        <Text style={s.text}>
          Lekce: 15 XP za první dokončení každé lekce. Celkem můžeš získat
          nejvýše 60 XP za den.
        </Text>
        <Text style={s.muted}>
          Ruční splnění vychází z tvého zápisu. Plánování, zrušené bloky a
          opakování stejné lekce XP nepřidávají. Odpočinek rank nesnižuje.
          Oprava splnění přepočítá Current; PRIME zachová nejvyšší dosaženou
          úroveň.
        </Text>
        <Text style={s.link}>
          Dnes: {dailyMindXP(data)[dayKey()] ?? 0}/60 XP
        </Text>
      </View>
      {ranks.map((name, i) => (
        <View
          key={name}
          style={[
            s.card,
            s.between,
            i === rank && { borderColor: rankColors[i] },
          ]}
        >
          <RankEmblem value={i} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={[s.h3, { color: rankColors[i] }]}>{name}</Text>
            <Text style={s.muted}>{mindMilestones[i]} XP</Text>
          </View>
          <Text style={s.label}>
            {i === rank ? "CURRENT" : i <= prime ? "✓" : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}
