import {
  DEFAULT_GAIN_PERCENT,
  LEGACY_MAX_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT
} from "./constants";
import type { LevelWarning } from "./types";

export function clampGainPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GAIN_PERCENT;
  }

  return Math.min(MAX_GAIN_PERCENT, Math.max(MIN_GAIN_PERCENT, Math.round(value)));
}

export function gainPercentToValue(value: number): number {
  return clampGainPercent(value) / 100;
}

export function gainValueToPercent(value: number): number {
  return clampGainPercent(value * 100);
}

export function deriveWarning(gainPercent: number, level: number): LevelWarning {
  const normalizedGain =
    (Math.min(clampGainPercent(gainPercent), LEGACY_MAX_GAIN_PERCENT) - MIN_GAIN_PERCENT) /
    (LEGACY_MAX_GAIN_PERCENT - MIN_GAIN_PERCENT);

  if (normalizedGain >= 0.75 || (normalizedGain >= 0.55 && level >= 0.82)) {
    return "danger";
  }

  if (normalizedGain >= 0.375 || level >= 0.68) {
    return "high";
  }

  return "none";
}
