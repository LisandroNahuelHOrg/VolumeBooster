/**
 * @fileoverview Creates the initial popup-local UI state.
 * @module popup/create-popup-ui-state
 */

import type { PopupTheme } from "../shared/types";
import type { PopupUiState } from "./popup-ui-state-types";

/**
 * Creates the initial popup-local UI state.
 *
 * @param popupTheme - Initial persisted popup theme.
 * @returns Default popup-local state.
 */
export function createPopupUiState(popupTheme: PopupTheme): PopupUiState {
  return {
    currentView: "main",
    popupTheme
  };
}
