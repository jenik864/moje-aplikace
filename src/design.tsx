import React, { useEffect, useId, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Easing,
  type ViewStyle,
} from "react-native";
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

export const ink = "#070A12";
export const surface = "#101724";
export const border = "#ffffff14";
export const palette = {
  Quit: "#E8F18B",
  Build: "#62EDBC",
  Mind: "#B7A0FF",
  Business: "#79BDFF",
  Me: "#F5BBA0",
};

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (live) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
// One quiet entrance, never an endless animation behind reading or training.
export function Reveal({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}) {
  const reduced = useReducedMotion(),
    appear = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) {
      appear.setValue(1);
      return;
    }
    appear.setValue(0.94);
    const animation = Animated.timing(appear, {
      toValue: 1,
      duration: 440,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, delay, appear]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0.94, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const uid = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "");

export function AmbientBackdrop({ color = palette.Mind }: { color?: string }) {
  const id = `ambient${uid(useId())}`;
  const glow = useRef(new Animated.Value(1)).current,
    reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      glow.setValue(1);
      return;
    }
    glow.setValue(0.35);
    const motion = Animated.timing(glow, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [color, reduced, glow]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: glow }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 900"
        preserveAspectRatio="xMidYMin slice"
        accessible={false}
      >
        <Defs>
          <RadialGradient id={`${id}a`} cx="100%" cy="0%" rx="95%" ry="53%">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset=".46" stopColor={color} stopOpacity={0.065} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}b`} cx="-15%" cy="65%" rx="88%" ry="45%">
            <Stop offset="0" stopColor="#6577F2" stopOpacity={0.13} />
            <Stop offset="1" stopColor={ink} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}line`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset=".55" stopColor={color} stopOpacity={0.2} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={400} height={900} fill={`url(#${id}a)`} />
        <Rect width={400} height={900} fill={`url(#${id}b)`} />
        <Path
          d="M110 -75C420 40 485 155 348 312C250 426 286 546 477 623M138 -88C460 45 516 175 382 331"
          stroke={`url(#${id}line)`}
          strokeWidth={0.65}
          fill="none"
        />
        {Array.from({ length: 24 }, (_, i) => (
          <Circle
            key={i}
            cx={24 + (i % 6) * 64}
            cy={44 + Math.floor(i / 6) * 94}
            r={0.6}
            fill="#fff"
            opacity={0.08}
          />
        ))}
      </Svg>
    </Animated.View>
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
  showPrime = true,
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
  showPrime?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        text: `${ranks[rank]}, ${value} ${unit}. ${nextLabel}`,
      }}
      onPress={onPress}
      style={({ pressed }) => [d.stage, pressed && { opacity: 0.72 }]}
    >
      <View style={d.between}>
        <Text style={[d.overline, { color }]}>{label}</Text>
        <AppIcon name="Build" color={color} size={18} />
      </View>
      <View
        style={{ flexDirection: "row", alignItems: "center", minHeight: 138 }}
      >
        <View style={{ flex: 1, gap: 8, zIndex: 1 }}>
          <Text style={d.micro}>CURRENT RANK</Text>
          <Text style={d.rank}>{ranks[rank]}</Text>
          {showPrime && (
            <Text style={[d.primeText, { color }]}>
              PRIME · {prime === null ? "—" : ranks[prime]}
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <Text style={[d.score, { color }]}>{value}</Text>
            <Text style={d.micro}>{unit}</Text>
          </View>
        </View>
        <View
          pointerEvents="none"
          style={{ width: "49%", maxWidth: 180, marginRight: -10 }}
        >
          <RankStageArt rank={rank} color={color} />
        </View>
      </View>
      <View style={[d.track, { backgroundColor: `${color}18` }]}>
        <View
          style={{
            width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
            height: 2,
            backgroundColor: color,
          }}
        />
      </View>
      <View style={d.between}>
        <Text style={[d.caption, { flex: 1 }]}>{nextLabel}</Text>
        <Text style={[d.micro, { color }]}>
          {Math.round(Math.max(0, Math.min(1, progress)) * 100)} %
        </Text>
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
    <Svg width="100%" height={180} viewBox="0 0 340 200" accessible={false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C1E7FF" />
          <Stop offset=".5" stopColor={palette.Business} />
          <Stop offset="1" stopColor="#5A58C6" />
        </LinearGradient>
        <RadialGradient id={`${id}glow`}>
          <Stop offset="0" stopColor={palette.Business} stopOpacity={0.22} />
          <Stop offset="1" stopColor={palette.Business} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={180} cy={108} rx={155} ry={90} fill={`url(#${id}glow)`} />
      <Path
        d="M25 164H317M54 183L285 42M33 151L242 22"
        stroke="#ffffff10"
        strokeWidth={0.6}
      />
      {[
        [70, 134, 42],
        [128, 103, 54],
        [186, 65, 68],
      ].map(([x, y, h], i) => (
        <G key={i}>
          <Path d={`M${x} ${y}l38 -20l36 19l-38 21Z`} fill={`url(#${id})`} />
          <Path
            d={`M${x} ${y}v${h}l36 19v-${h}Z`}
            fill="#4564A5"
            opacity={0.8}
          />
          <Path d={`M${x + 36} ${y + 20}l38 -21v${h}l-38 21Z`} fill="#203962" />
          <Path
            d={`M${x} ${y}l36 20l38 -21`}
            fill="none"
            stroke="#BDE9FF"
            strokeWidth={0.8}
          />
        </G>
      ))}
      <Path
        d="M43 128C82 132 94 89 132 91S184 32 224 42L280 23"
        fill="none"
        stroke={palette.Build}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={280} cy={23} r={4} fill={palette.Build} />
      <Circle
        cx={280}
        cy={23}
        r={10}
        fill="none"
        stroke={palette.Build}
        opacity={0.2}
      />
      <Path d="M279 158V169M274 163H285" stroke="#CAE8FF" opacity={0.55} />
    </Svg>
  );
}

function TabGlyph({
  name,
  color,
  selected,
}: {
  name: string;
  color: string;
  selected: boolean;
}) {
  const reduced = useReducedMotion(),
    scale = useRef(new Animated.Value(selected ? 1.1 : 1)).current;
  useEffect(() => {
    const target = selected ? 1.1 : 1;
    if (reduced) {
      scale.setValue(target);
      return;
    }
    const motion = Animated.spring(scale, {
      toValue: target,
      damping: 20,
      stiffness: 250,
      mass: 0.7,
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [selected, reduced, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <AppIcon name={name} color={color} size={23} />
    </Animated.View>
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
                selected && { backgroundColor: "transparent" },
                pressed && { opacity: 0.6 },
              ]}
            >
              <TabGlyph name={route.name} color={color} selected={selected} />
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
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: border,
    paddingVertical: 16,
    gap: 12,
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
    fontSize: 36,
    fontWeight: "500",
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
  dockSpace: {
    backgroundColor: "#070A12F8",
    paddingTop: 0,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: border,
  },
  dock: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingTop: 5,
    gap: 2,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
  tabDot: {
    position: "absolute",
    top: -6,
    height: 2,
    width: 28,
    borderRadius: 2,
  },
});
