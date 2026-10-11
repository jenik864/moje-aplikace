import type { Difficulty, Operation } from "./model";
export type Problem = { text: string; answer: number };
export function problem(
  difficulty: Difficulty,
  operations: Operation[],
  random = Math.random,
): Problem {
  if (!operations.length) throw new Error("Vyber alespoň jednu operaci.");
  const pick = (max: number) => Math.floor(random() * max) + 1;
  const op = operations[Math.floor(random() * operations.length)];
  const limit = difficulty === "easy" ? 10 : difficulty === "normal" ? 30 : 99;
  let a = pick(limit),
    b = pick(limit);
  if (op === "×" || op === "÷") {
    a = pick(difficulty === "easy" ? 5 : difficulty === "normal" ? 12 : 20);
    b = pick(difficulty === "hard" ? 20 : 12);
  }
  if (op === "−" && b > a) [a, b] = [b, a];
  if (op === "÷") return { text: `${a * b} ÷ ${b}`, answer: a };
  return {
    text: `${a} ${op} ${b}`,
    answer: op === "+" ? a + b : op === "−" ? a - b : a * b,
  };
}
export const difficultyNames: Record<Difficulty, string> = {
  easy: "Rozjezd",
  normal: "Výzva",
  hard: "Expert",
};
export function sameMode(
  a: { difficulty: Difficulty; duration: number; operations: Operation[] },
  b: { difficulty: Difficulty; duration: number; operations: Operation[] },
) {
  return (
    a.difficulty === b.difficulty &&
    a.duration === b.duration &&
    [...a.operations].sort().join("") === [...b.operations].sort().join("")
  );
}
export function acceptAnswer(
  answer: string,
  p: Problem,
  now: number,
  deadline: number,
) {
  return (
    now < deadline && /^\d+$/.test(answer.trim()) && Number(answer) === p.answer
  );
}
