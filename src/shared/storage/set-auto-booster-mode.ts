/**
 * @fileoverview Persists the selected automatic booster mode.
 * @module shared/storage/set-auto-booster-mode
 */

import type { AutoBoosterMode } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";
import { sanitizeAutoBoosterMode } from "./sanitize-auto-booster-mode";

export async function setAutoBoosterMode(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  autoBoosterMode: AutoBoosterMode
): Promise<AutoBoosterMode> {
  const settings = await this.getSettings();
  settings.autoBoosterMode = sanitizeAutoBoosterMode(autoBoosterMode);
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return settings.autoBoosterMode;
}
