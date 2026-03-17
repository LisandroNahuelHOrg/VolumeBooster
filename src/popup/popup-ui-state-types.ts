/**
 * @fileoverview Shared types for popup-local view and theme state helpers.
 * @module popup/popup-ui-state-types
 */

import type { PopupTheme } from "../shared/types";

/** Internal popup views rendered inside the extension action surface. */
export type PopupView = "main" | "premium" | "settings";

/** Minimal persistence surface required by popup theme state helpers. */
export interface PopupThemePersistence {
  setPopupTheme(theme: PopupTheme): Promise<PopupTheme>;
}

/** Ephemeral popup-only UI state that is not owned by the worker. */
export interface PopupUiState {
  currentView: PopupView;
  popupTheme: PopupTheme;
}
