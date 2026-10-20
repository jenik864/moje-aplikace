// Transparent models used by the interactive lessons, not live measurements.
export const discountedPrice = (price: number, discounts: number[]) =>
  discounts.reduce((amount, percent) => amount * (1 - percent / 100), price);
export const transferSeconds = (megabytes: number, megabitsPerSecond: number) =>
  (megabytes * 8) / megabitsPerSecond;
export function filterExample(prevalence: number) {
  const total = 10000,
    real = (total * prevalence) / 100;
  const detected = real * 0.95,
    falseAlarms = (total - real) * 0.05;
  return {
    detected,
    falseAlarms,
    share: (detected / (detected + falseAlarms)) * 100,
  };
}
export const energyKWh = (watts: number, hours: number) =>
  (watts * hours) / 1000;
export function binaryTrace(values: readonly number[], target: number) {
  const steps: { low: number; high: number; mid: number; found: boolean }[] =
    [];
  let low = 0,
    high = values.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2),
      found = values[mid] === target;
    steps.push({ low, high, mid, found });
    if (found) break;
    if (values[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return steps;
}
