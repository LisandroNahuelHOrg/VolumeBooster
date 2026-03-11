/**
 * @fileoverview Returns the popup-local view from settings to main.
 * @module popup/close-popup-settings
 */

import type { PopupUiState } from "./popup-ui-state-types";

/**
 * Returns from the internal popup settings screen to the main dashboard view.
 *
 * @param state - Current popup-local UI state.
 * @returns Updated state with the main view selected.
 */
export function closePopupSettings(state: PopupUiState): PopupUiState {
  return {
    ...state,
    currentView: "main"
  };
}
