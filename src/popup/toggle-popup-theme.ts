/**
 * @fileoverview Toggles the popup theme and persists it.
 * @module popup/toggle-popup-theme
 */

import { togglePopupThemeLocally } from "./toggle-popup-theme-locally";
import type {
  PopupThemePersistence,
  PopupUiState
} from "./popup-ui-state-types";

/**
 * Toggles the popup theme, applies it to the document, and persists it.
 *
 * @param state - Current popup-local UI state.
 * @param persistence - Repository-like persistence target.
 * @param doc - Target document receiving the theme dataset.
 * @returns Updated state with the new persisted theme.
 */
export async function togglePopupTheme(
  state: PopupUiState,
  persistence: PopupThemePersistence,
  doc: Document = document
): Promise<PopupUiState> {
  const nextState = togglePopupThemeLocally(state, doc);
  const persistedTheme = await persistence.setPopupTheme(nextState.popupTheme);

  return {
    ...nextState,
    popupTheme: persistedTheme
  };
}
