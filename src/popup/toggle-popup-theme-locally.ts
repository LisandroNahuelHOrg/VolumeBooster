/**
 * @fileoverview Applies the next popup theme to local state immediately.
 * @module popup/toggle-popup-theme-locally
 */

import { applyPopupTheme } from "./apply-popup-theme";
import { getNextPopupTheme } from "./get-next-popup-theme";
import type { PopupUiState } from "./popup-ui-state-types";

/**
 * Applies the next popup theme to local state immediately, without waiting for
 * persistence to complete.
 *
 * @param state - Current popup-local UI state.
 * @param doc - Target document receiving the theme dataset.
 * @returns Updated state with the next theme already selected.
 */
export function togglePopupThemeLocally(
  state: PopupUiState,
  doc: Document = document
): PopupUiState {
  const nextTheme = getNextPopupTheme(state.popupTheme);
  applyPopupTheme(nextTheme, doc);

  return {
    ...state,
    popupTheme: nextTheme
  };
}
