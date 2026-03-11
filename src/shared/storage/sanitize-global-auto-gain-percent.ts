/**
 * @fileoverview Normalizes persisted global auto gain values.
 * @module shared/storage/sanitize-global-auto-gain-percent
 */

import { DEFAULT_GAIN_PERCENT } from "../constants";
import { clampGainPercent } from "../gain";

export function sanitizeGlobalAutoGainPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_GAIN_PERCENT;
  }

  return clampGainPercent(value);
}
