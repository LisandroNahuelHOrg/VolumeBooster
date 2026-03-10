export function peakToDb(value: number): number {
  return 20 * Math.log10(Math.max(value, 1e-4));
}
