/**
 * @fileoverview Restricts persisted popup theme values to supported options.
 * @module shared/storage/sanitize-popup-theme
 */

import { DEFAULT_POPUP_THEME } from "../constants";
import type { PopupTheme } from "../types";

export function sanitizePopupTheme(value: unknown): PopupTheme {
  return value === "light" ? "light" : DEFAULT_POPUP_THEME;
}
