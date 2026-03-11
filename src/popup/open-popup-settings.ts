/**
 * @fileoverview Opens the popup-local settings screen.
 * @module popup/open-popup-settings
 */

import type { PopupUiState } from "./popup-ui-state-types";

/**
 * Opens the internal popup settings screen.
 *
 * @param state - Current popup-local UI state.
 * @returns Updated state with the settings view selected.
 */
export function openPopupSettings(state: PopupUiState): PopupUiState {
  return {
    ...state,
    currentView: "settings"
  };
}
