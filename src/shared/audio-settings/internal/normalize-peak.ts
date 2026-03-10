import { clamp01 } from "./clamp-01";

export function normalizePeak(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }

  return clamp01((value - min) / (max - min));
}
