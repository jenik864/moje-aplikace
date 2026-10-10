import React, { createContext, useContext } from "react";
import { rankColors } from "../ui";
const RankTheme = createContext(0);
export function RankThemeProvider({
  rank,
  children,
}: {
  rank: number;
  children: React.ReactNode;
}) {
  return <RankTheme.Provider value={rank}>{children}</RankTheme.Provider>;
}
export function useRankTheme() {
  const rank = useContext(RankTheme);
  return { rank, accent: rankColors[rank] };
}
export function tint(color: string, opacity: number) {
  return `${color}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
