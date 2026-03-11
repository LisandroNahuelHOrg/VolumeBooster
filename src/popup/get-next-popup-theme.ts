/**
 * @fileoverview Resolves the next popup theme.
 * @module popup/get-next-popup-theme
 */

import type { PopupTheme } from "../shared/types";

/**
 * Resolves the opposite popup theme.
 *
 * @param popupTheme - Current popup theme.
 * @returns The next theme to apply.
 */
export function getNextPopupTheme(popupTheme: PopupTheme): PopupTheme {
  return popupTheme === "light" ? "dark" : "light";
}
