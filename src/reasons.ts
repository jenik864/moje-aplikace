// Presentation only: keep the saved original text, order, repetitions and signature intact.
export function reasonLines(value: string): string[] {
  return value
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/u)
    .map((line) => line.trim())
    .filter(Boolean);
}
