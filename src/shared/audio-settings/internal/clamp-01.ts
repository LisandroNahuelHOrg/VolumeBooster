import { clamp } from "./clamp";

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
