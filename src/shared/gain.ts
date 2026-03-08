/**
 * @fileoverview Helpers for clamping boost values and deriving coarse warning
 * levels from current gain and live level readings.
 * @module shared/gain
 */

import {
  DEFAULT_GAIN_PERCENT,
  LEGACY_MAX_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  MIN_GAIN_PERCENT
} from "./constants";
import type { LevelWarning } from "./types";

/**
 * Normalizes an arbitrary boost percentage into the valid extension range.
 *
 * @param value - Candidate boost value.
 * @returns Integer percentage within the configured minimum and maximum.
 */
export function clampGainPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GAIN_PERCENT;
  }

  return Math.min(MAX_GAIN_PERCENT, Math.max(MIN_GAIN_PERCENT, Math.round(value)));
}

/**
 * Converts a user-facing percent value into the numeric gain multiplier used by
 * simple audio nodes.
 *
 * @param value - Boost value expressed in percent.
 * @returns Gain multiplier representation of the same value.
 */
export function gainPercentToValue(value: number): number {
  return clampGainPercent(value) / 100;
}

/**
 * Converts a numeric gain multiplier into the user-facing percentage scale.
 *
 * @param value - Gain multiplier value.
 * @returns Clamped boost percentage.
 */
export function gainValueToPercent(value: number): number {
  return clampGainPercent(value * 100);
}

/**
 * Derives the coarse UI warning used by the legacy live-activity presentation.
 *
 * @param gainPercent - Current boost percentage.
 * @param level - Current live-activity level between `0` and `1`.
 * @returns Warning severity for the current combination.
 */
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
