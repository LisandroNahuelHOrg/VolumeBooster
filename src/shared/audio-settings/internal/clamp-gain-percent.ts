import {
  DEFAULT_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT
} from "../../constants";

export function clampGainPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GAIN_PERCENT;
  }

  return Math.min(MAX_GAIN_PERCENT, Math.max(MIN_GAIN_PERCENT, Math.round(value)));
}
