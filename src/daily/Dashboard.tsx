import React from "react";
import { Text, View, Pressable } from "react-native";
import { type Program, definitions } from "../model";
import { palette } from "../design";
import { RankMark } from "../porn/visuals";
import { ProgramIntro } from "../ProgramIntro";
import type { DailyId } from "./analytics";
import { dailyStyles } from "./styles";
import { ScrollDashboard } from "../scroll/Dashboard";
import { FoodDashboard } from "../food/Dashboard";

export function DailyWelcome({
  id,
  activate,
}: {
  id: DailyId;
  activate: () => void;
}) {
  const s = dailyStyles(palette.Quit);
  return (
    <>
      <Text style={s.label}>{definitions[id].label}</Text>
      <Text style={s.heading}>{definitions[id].title}</Text>
      <ProgramIntro id={id} accent={palette.Quit} />
      <View style={s.row}>
        <RankMark rank={0} size={40} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title}>Tvoje první kroky.</Text>
          <Text style={s.muted}>
            {id === "scroll"
              ? "Bloky, plán a reflexi můžeš používat hned. Rank začne vycházet ze skutečného času, až bude připojené systémové měření."
              : "Začínáš na Copper. Každý potvrzený den se počítá."}
          </Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={activate} style={s.button}>
        <Text style={s.buttonText}>AKTIVOVAT PROGRAM</Text>
      </Pressable>
    </>
  );
}

export function DailyDashboard(props: {
  id: DailyId;
  p: Program;
  now: number;
  update: (p: Program | ((current: Program) => Program)) => void;
  saveError?: boolean;
  retrySave?: () => void;
  sos: (pillarId?: string) => void;
}) {
  return props.id === "scroll" ? (
    <ScrollDashboard {...props} />
  ) : (
    <FoodDashboard {...props} />
  );
}
