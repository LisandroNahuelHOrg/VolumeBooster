import { clamp } from "./clamp";
import { roundTo } from "./round-to";

export function clampRound(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
  precision: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return roundTo(clamp(value as number, min, max), precision);
}
