/**
 * @fileoverview Restricts persisted automatic booster modes to supported values.
 * @module shared/storage/sanitize-auto-booster-mode
 */

import type { AutoBoosterMode } from "../types";

export function sanitizeAutoBoosterMode(value: unknown): AutoBoosterMode {
  return value === "global" ? "global" : "off";
}
