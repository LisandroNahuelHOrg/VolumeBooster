/**
 * @fileoverview Persists the selected popup-only theme.
 * @module shared/storage/set-popup-theme
 */

import type { PopupTheme } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";
import { sanitizePopupTheme } from "./sanitize-popup-theme";

export async function setPopupTheme(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  popupTheme: PopupTheme
): Promise<PopupTheme> {
  const settings = await this.getSettings();
  settings.popupTheme = sanitizePopupTheme(popupTheme);
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return settings.popupTheme;
}
