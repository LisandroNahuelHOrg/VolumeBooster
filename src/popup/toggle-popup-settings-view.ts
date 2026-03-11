/**
 * @fileoverview Resolves the next popup-local settings view for toolbar clicks.
 * @module popup/toggle-popup-settings-view
 */

import {
  closePopupSettings,
  openPopupSettings,
  type PopupUiState
} from "./popup-ui-state";

/**
 * Toggles the popup-local settings view while preserving the rest of the UI state.
 *
 * @param state - Current popup-local UI state.
 * @returns Updated state with the next popup view selected.
 */
export function togglePopupSettingsView(state: PopupUiState): PopupUiState {
  return state.currentView === "settings"
    ? closePopupSettings(state)
    : openPopupSettings(state);
}
