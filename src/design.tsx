import React, { useId } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  G,
} from "react-native-svg";
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ranks } from "./model";
import { RankArtwork } from "./RankArtwork";

export const ink = "#080b12";
export const surface = "#111620";
export const border = "#ffffff10";
const uid = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "");

export function AmbientBackdrop({ color = "#8eabdf" }: { color?: string }) {
  const id = `ambient${uid(useId())}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height={620}
        viewBox="0 0 400 620"
        preserveAspectRatio="xMidYMin slice"
      >
        <Defs>
          <RadialGradient id={id} cx="55%" cy="22%" rx="65%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.12} />
            <Stop offset="0.5" stopColor={color} stopOpacity={0.04} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={400} height={620} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// A shared material language: forged insignia, a light field and a fine orbital setting.
// All twelve rank silhouettes remain the same throughout the app.
export function RankStageArt({ rank, color }: { rank: number; color: string }) {
  const id = `stage${uid(useId())}`;
  return (
    <Svg width="100%" height={148} viewBox="0 0 340 195" accessible={false}>
      <Defs>
        <RadialGradient id={`${id}a`} cx="50%" cy="47%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.24} />
          <Stop offset="0.5" stopColor={color} stopOpacity={0.08} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}s`}>
          <Stop offset="0" stopColor={color} stopOpacity={0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.02} />
          <Stop offset="0.35" stopColor={color} stopOpacity={0.55} />
          <Stop offset="0.6" stopColor="#fff" stopOpacity={0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0.06} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={170} cy={105} rx={163} ry={104} fill={`url(#${id}a)`} />
      <Circle
        cx={170}
        cy={100}
        r={86}
        fill="none"
        stroke={color}
        strokeOpacity={0.07}
      />
      <Circle
        cx={170}
        cy={100}
        r={72}
        fill="none"
        stroke={color}
        strokeOpacity={0.12}
        strokeDasharray="1 9"
      />
      <Ellipse cx={170} cy={186} rx={90} ry={12} fill={`url(#${id}s)`} />
      <Ellipse
        cx={170}
        cy={112}
        rx={134}
        ry={36}
        rotation={-18}
        origin="170,112"
        fill="none"
        stroke={`url(#${id}r)`}
        strokeWidth={0.7}
      />
      <G transform="translate(96 22)">
        <RankArtwork rank={rank} color={color} size={148} />
      </G>
      <Path
        d="M104 171 Q170 199 236 171"
        fill="none"
        stroke={color}
        strokeOpacity={0.15}
      />
      <Circle cx={278} cy={77} r={2.4} fill={color} />
      <Circle cx={68} cy={144} r={1.5} fill={color} opacity={0.7} />
      <Path
        d="M242 42V50M238 46H246"
        stroke={color}
        strokeOpacity={0.6}
        strokeWidth={0.8}
      />
    </Svg>
  );
}

export function RankStage({
  rank,
  prime,
  color,
  value,
  unit,
  progress,
  nextLabel,
  onPress,
  accessibilityLabel,
  label = "TVŮJ POSTUP",
}: {
  rank: number;
  prime: number | null;
  color: string;
  value: string;
  unit: string;
  progress: number;
  nextLabel: string;
  onPress: () => void;
  accessibilityLabel: string;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        text: `${ranks[rank]}, ${value} ${unit}. ${nextLabel}`,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        d.stage,
        { borderColor: `${color}25` },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={d.between}>
        <Text style={[d.overline, { color }]}>{label}</Text>
        <View style={[d.prime, { borderColor: `${color}25` }]}>
          <Text style={d.primeText}>
            PRIME · {prime === null ? "—" : ranks[prime]}
          </Text>
        </View>
      </View>
      <RankStageArt rank={rank} color={color} />
      <View style={d.between}>
        <View style={{ gap: 4 }}>
          <Text style={d.micro}>CURRENT RANK</Text>
          <Text style={d.rank}>{ranks[rank]}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[d.score, { color }]}>{value}</Text>
          <Text style={d.micro}>{unit}</Text>
        </View>
      </View>
      <View style={d.track}>
        <View
          style={{
            width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            height: 3,
            backgroundColor: color,
            borderRadius: 3,
          }}
        />
      </View>
      <View style={d.between}>
        <Text style={[d.caption, { flex: 1 }]}>{nextLabel}</Text>
        <AppIcon name="Build" color={color} size={16} />
      </View>
    </Pressable>
  );
}

export function AppIcon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    Build: "M5 19L19 5M7 5H19V17",
    Mind: "M6 15C2 13 3 7 7 6C8 2 14 2 15 6C20 5 23 11 19 14C20 18 16 21 12 19C8 22 4 19 6 15M12 5V19M7 10C10 10 12 12 12 14M16 9C14 9 12 11 12 12",
    Business: "M4 8H20V20H4ZM8 8V4H16V8M4 12H20M10 12V15H14V12",
    Me: "M12 3L21 9V16L12 22L3 16V9ZM12 7L16 12L12 17L8 12Z",
    learn: "M4 5H10L12 7L14 5H20V19H14L12 21L10 19H4ZM12 7V21",
    math: "M4 8H10M7 5V11M15 7L20 12M20 7L15 12M5 17H10M15 17H20",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {name === "Quit" ? (
        <>
          <Circle
            cx={12}
            cy={12}
            r={9}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
          <Circle
            cx={12}
            cy={12}
            r={5.5}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
          <Circle cx={12} cy={12} r={1.5} fill={color} />
        </>
      ) : (
        <Path
          d={paths[name] ?? paths.Me}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function ProjectArtwork() {
  const id = `project${uid(useId())}`;
  return (
    <Svg width="100%" height={190} viewBox="0 0 340 210" accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#91acd6" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#101a2d" stopOpacity={0.5} />
        </LinearGradient>
      </Defs>
      <Circle cx={170} cy={106} r={93} stroke="#91acd618" fill="none" />
      <Circle
        cx={170}
        cy={106}
        r={74}
        stroke="#91acd614"
        fill="none"
        strokeDasharray="2 8"
      />
      <G rotation={-12} origin="170,105">
        <Rect
          x={78}
          y={37}
          width={174}
          height={126}
          rx={20}
          fill="#0e1725"
          stroke="#91acd626"
        />
      </G>
      <G rotation={8} origin="170,105">
        <Rect
          x={87}
          y={48}
          width={174}
          height={126}
          rx={20}
          fill={`url(#${id})`}
          stroke="#91acd648"
        />
      </G>
      <Rect
        x={94}
        y={43}
        width={152}
        height={127}
        rx={19}
        fill="#141f31"
        stroke="#c5d3ec55"
      />
      <Path
        d="M114 71H158M114 82H144"
        stroke="#c5d3ec"
        strokeOpacity={0.45}
        strokeLinecap="round"
      />
      <Path
        d="M115 144L137 119L162 131L192 96L224 109"
        stroke="#c5d3ec"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={192} cy={96} r={4} fill="#c5d3ec" />
      <Path d="M280 60V70M275 65H285" stroke="#c5d3ec" strokeOpacity={0.6} />
      <Circle cx={55} cy={134} r={2} fill="#91acd6" />
    </Svg>
  );
}

export function PremiumTabs({
  state,
  descriptors,
  navigation,
  accents,
}: BottomTabBarProps & { accents: Record<string, string> }) {
  const insets = useSafeAreaInsets();
  const reportHeight = React.useContext(BottomTabBarHeightCallbackContext);
  return (
    <View
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      style={[d.dockSpace, { paddingBottom: Math.max(10, insets.bottom) }]}
    >
      <View style={d.dock}>
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const color = selected
            ? (accents[route.name] ?? "#d6dee9")
            : "#788496";
          const options = descriptors[route.key].options;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              aria-selected={selected}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? route.name
              }
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={({ pressed }) => [
                d.tab,
                selected && { backgroundColor: `${color}12` },
                pressed && { opacity: 0.6 },
              ]}
            >
              <AppIcon name={route.name} color={color} size={22} />
              <Text numberOfLines={1} style={[d.tabText, { color }]}>
                {route.name}
              </Text>
              {selected && (
                <View style={[d.tabDot, { backgroundColor: color }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const d = StyleSheet.create({
  stage: {
    backgroundColor: "#10151ee8",
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 10,
    overflow: "hidden",
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  overline: { fontSize: 9, fontWeight: "700", letterSpacing: 1.9 },
  micro: {
    color: "#91a0b4",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  prime: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: "#ffffff04",
  },
  primeText: { color: "#c4cddb", fontSize: 9, fontWeight: "600" },
  rank: {
    color: "#f4f6fa",
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -1,
  },
  score: {
    fontSize: 24,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.6,
  },
  caption: { color: "#a6b1c2", fontSize: 11, lineHeight: 17 },
  track: {
    backgroundColor: "#ffffff0c",
    height: 3,
    overflow: "hidden",
    borderRadius: 3,
  },
  dockSpace: { backgroundColor: ink, paddingTop: 8, paddingHorizontal: 12 },
  dock: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ffffff12",
    backgroundColor: "#141a25",
    borderRadius: 23,
    padding: 5,
    gap: 2,
  },
  tab: {
    flex: 1,
    minHeight: 55,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabText: { fontSize: 9, fontWeight: "600", letterSpacing: 0.2 },
  tabDot: {
    position: "absolute",
    bottom: 3,
    height: 2,
    width: 12,
    borderRadius: 2,
  },
});
