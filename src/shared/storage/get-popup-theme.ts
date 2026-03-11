/**
 * @fileoverview Reads the persisted popup-only theme.
 * @module shared/storage/get-popup-theme
 */

import type { PopupTheme } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getPopupTheme(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<PopupTheme> {
  const settings = await this.getSettings();
  return settings.popupTheme;
}
