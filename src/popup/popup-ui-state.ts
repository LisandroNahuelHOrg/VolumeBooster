/**
 * @fileoverview Local popup-only state helpers for theme and internal views.
 * @module popup/popup-ui-state
 */

import type { PopupTheme } from "../shared/types";

/** Internal popup views rendered inside the extension action surface. */
export type PopupView = "main" | "settings";

/** Minimal persistence surface required by popup theme state helpers. */
export interface PopupThemePersistence {
  setPopupTheme(theme: PopupTheme): Promise<PopupTheme>;
}

/** Ephemeral popup-only UI state that is not owned by the worker. */
export interface PopupUiState {
  currentView: PopupView;
  popupTheme: PopupTheme;
}

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

/**
 * Resolves the opposite popup theme.
 *
 * @param popupTheme - Current popup theme.
 * @returns The next theme to apply.
 */
export function getNextPopupTheme(popupTheme: PopupTheme): PopupTheme {
  return popupTheme === "light" ? "dark" : "light";
}

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

/**
 * Applies the popup theme to the current document root.
 *
 * @param popupTheme - Theme to apply.
 * @param doc - Target document receiving the data attribute.
 */
export function applyPopupTheme(popupTheme: PopupTheme, doc: Document = document): void {
  doc.documentElement.dataset.popupTheme = popupTheme;
}

/**
 * Serializes popup theme writes so rapid clicks cannot persist out of order.
 *
 * @param persistQueue - Previous popup theme persistence queue.
 * @param persistence - Repository-like persistence target.
 * @param popupTheme - Theme to persist once previous writes complete.
 * @returns Updated queue promise including the new write.
 */
export function enqueuePopupThemePersistence(
  persistQueue: Promise<void>,
  persistence: PopupThemePersistence,
  popupTheme: PopupTheme
): Promise<void> {
  return persistQueue.catch(() => undefined).then(async () => {
    await persistence.setPopupTheme(popupTheme);
  });
}

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
