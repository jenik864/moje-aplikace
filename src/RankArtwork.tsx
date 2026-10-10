import React from "react";
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Polygon } from "react-native-svg";
import { ranks } from "./model";

// Metal ranks are insignia; gemstone ranks are individual cuts and settings.
const silhouettes = [
  "M50 15 L76 30 V66 L50 85 L24 66 V30 Z", // Copper: plain forged shield
  "M50 9 L80 27 V64 L66 78 L50 90 L34 78 L20 64 V27 Z", // Bronze: stepped shield
  "M32 10 H68 L82 28 V68 L68 88 H32 L18 68 V28 Z", // Iron: riveted octagonal plate
  "M50 7 L80 24 L85 55 L70 77 L50 93 L30 77 L15 55 L20 24 Z", // Silver: tapered crest
  "M22 33 L17 12 L36 24 L50 7 L64 24 L83 12 L78 33 V67 L50 91 L22 67 Z", // Gold: crown
  "M50 5 L87 31 V69 L50 95 L13 69 V31 Z", // Platinum: precise hexagon
  "M50 8 L80 25 L89 52 L69 81 L50 93 L31 81 L11 52 L20 25 Z", // Sapphire: octagonal gem
  "M50 4 L75 23 L71 66 L50 95 L29 66 L25 23 Z", // Amethyst: elongated crystal
  "M33 14 H67 L87 37 L78 65 L50 91 L22 65 L13 37 Z", // Ruby: cushion cut
  "M31 9 H69 L85 25 V74 L69 91 H31 L15 74 V25 Z", // Emerald: rectangular step cut
  "M27 15 H73 L93 37 L50 94 L7 37 Z", // Diamond: brilliant cut
  "M50 3 L63 18 L83 18 L82 39 L95 51 L80 64 L79 83 L61 82 L50 97 L37 82 L18 83 L19 63 L5 51 L20 38 L18 18 L38 18 Z", // Obsidian: dark star
];
export function RankArtwork({ rank, color, size = 42 }: { rank: number; color: string; size?: number }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const metal = `metal${uid}`, gem = `gem${uid}`;
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${ranks[rank]} emblém`}>
    <Defs>
      <LinearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
        <Stop offset={0} stopColor="#f8eee2" />
        <Stop offset={0.22} stopColor={color} />
        <Stop offset={0.5} stopColor={color} stopOpacity={0.5} />
        <Stop offset={0.76} stopColor="#22232b" />
        <Stop offset={1} stopColor={color} />
      </LinearGradient>
      <LinearGradient id={gem} x1="0" y1="0" x2="1" y2="1">
        <Stop offset={0} stopColor={color} />
        <Stop offset={1} stopColor="#10101b" />
      </LinearGradient>
    </Defs>
    <Path d={silhouettes[rank]} fill={`url(#${metal})`} stroke={color} strokeWidth={0.8} />
    <Path d={silhouettes[rank]} transform="translate(50 50) scale(0.79) translate(-50 -50)" fill="#0e1015" stroke={color} strokeWidth={1.2} />
    {rank === 0 && <Path d="M50 29 L63 48 L50 69 L37 48 Z M50 29 V69 M37 48 H63" fill={`${color}22`} stroke={color} strokeWidth={1.5} />}
    {rank === 1 && <>
      <Path d="M50 26 L67 44 L60 65 L50 74 L40 65 L33 44 Z M33 44 H67 M50 26 V74 M40 65 H60" fill={`url(#${gem})`} stroke={color} strokeWidth={1.3} />
      <Path d="M26 65 L50 84 L74 65" stroke={color} strokeWidth={2} fill="none" />
    </>}
    {rank === 2 && <>
      <Path d="M38 29 H62 V39 H55 V61 H62 V71 H38 V61 H45 V39 H38 Z" fill={`url(#${metal})`} stroke={color} />
      {[[28,28],[72,28],[28,72],[72,72]].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={2.5} fill={color} />)}
    </>}
    {rank === 3 && <>
      <Path d="M50 24 L69 46 L50 76 L31 46 Z M50 24 L43 46 L50 76 L57 46 Z M31 46 H69" fill={`url(#${gem})`} stroke={color} strokeWidth={1.2} />
      <Path d="M24 35 L28 62 L50 82 L72 62 L76 35" fill="none" stroke={color} />
    </>}
    {rank === 4 && <>
      <Path d="M50 34 L65 50 L50 73 L35 50 Z M35 50 H65 M50 34 V73" fill={`url(#${gem})`} stroke={color} strokeWidth={1.5} />
      <Circle cx={50} cy={22} r={2} fill="#fff0b9" />
      <Path d="M29 65 L50 83 L71 65" fill="none" stroke={color} strokeWidth={2} />
    </>}
    {rank === 5 && <>
      <Polygon points="50,21 73,36 73,64 50,79 27,64 27,36" fill="none" stroke={color} strokeWidth={1.5} />
      <Polygon points="50,30 65,40 65,60 50,70 35,60 35,40" fill={`url(#${gem})`} stroke={color} />
      <Path d="M50 30 V70 M35 40 L65 60 M65 40 L35 60" stroke={color} strokeWidth={0.8} />
    </>}
    {rank === 6 && <>
      <Polygon points="50,22 69,33 75,51 63,69 50,79 37,69 25,51 31,33" fill={`url(#${gem})`} stroke={color} />
      <Polygon points="50,35 63,49 50,65 37,49" fill={`${color}55`} stroke={color} />
      <Path d="M50 22 V35 M69 33 L63 49 L75 51 M63 69 L50 65 L37 69 M25 51 L37 49 L31 33 M50 65 V79" stroke={color} fill="none" />
    </>}
    {rank === 7 && <>
      <Path d="M50 17 L65 30 L62 61 L50 82 L38 61 L35 30 Z M50 17 V82 M35 30 L50 38 L65 30 M38 61 L50 52 L62 61" fill={`url(#${gem})`} stroke={color} strokeWidth={1.2} />
      <Path d="M39 31 L44 56 L50 69 L56 56 L61 31" stroke="#e4ceff" strokeOpacity={0.65} fill="none" />
    </>}
    {rank === 8 && <>
      <Path d="M37 26 H63 L75 40 L68 59 L50 77 L32 59 L25 40 Z M37 26 L39 43 L50 57 L61 43 L63 26 M25 40 L39 43 L32 59 M75 40 L61 43 L68 59 M50 57 V77" fill={`url(#${gem})`} stroke={color} strokeWidth={1.3} />
      <Polygon points="50,32 59,42 50,53 41,42" fill={`${color}80`} stroke="#ffd4db" strokeWidth={0.7} />
    </>}
    {rank === 9 && <>
      <Path d="M36 22 H64 L73 31 V68 L64 78 H36 L27 68 V31 Z M40 32 H60 L63 36 V63 L59 68 H41 L37 63 V36 Z M36 22 L40 32 M64 22 L60 32 M73 31 L63 36 M73 68 L63 63 M64 78 L59 68 M36 78 L41 68 M27 68 L37 63 M27 31 L37 36" fill={`url(#${gem})`} stroke={color} strokeWidth={1.2} />
      <Path d="M42 37 H58 V62 H42 Z" fill={`${color}55`} stroke="#cdffe8" strokeWidth={0.8} />
    </>}
    {rank === 10 && <>
      <Path d="M31 25 H69 L80 39 L50 79 L20 39 Z M31 25 L39 39 L50 79 L61 39 L69 25 M20 39 H80 M39 39 L50 25 L61 39" fill={`url(#${gem})`} stroke={color} strokeWidth={1.4} />
      <Path d="M20 17 V27 M15 22 H25 M81 56 V68 M75 62 H87" stroke="#e6faff" strokeWidth={1.3} />
    </>}
    {rank === 11 && <>
      <Polygon points="50,18 76,50 50,83 24,50" fill="#171124" stroke={color} strokeWidth={1.5} />
      <Polygon points="50,29 65,50 50,71 35,50" fill={`url(#${gem})`} stroke={color} />
      <Path d="M50 18 V29 M76 50 H65 M50 83 V71 M24 50 H35 M50 29 L44 50 L50 71 L56 50 Z" stroke={color} fill="none" />
      {[ [50,10], [89,50], [50,90], [11,50] ].map(([x,y],i)=><Circle key={i} cx={x} cy={y} r={2} fill="#e5d0ff" />)}
    </>}
  </Svg>;
}
