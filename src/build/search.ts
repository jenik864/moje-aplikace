import type { Exercise, Muscle } from "./catalog.ts";
export const normalized = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs")
    .trim();
export function findExercises(
  exercises: Exercise[],
  query: string,
  muscle: Muscle | null,
  equipment: string,
) {
  const words = normalized(query).split(/\s+/).filter(Boolean);
  return exercises.filter(
    (e) =>
      (!muscle || e.main.includes(muscle) || e.secondary.includes(muscle)) &&
      (equipment === "Vše" || e.equipment === equipment) &&
      words.every((word) =>
        normalized(e.name + " " + e.equipment).includes(word),
      ),
  );
}
