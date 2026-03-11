/**
 * @fileoverview Persists the gain used by global automatic boosting.
 * @module shared/storage/set-global-auto-gain-percent
 */

import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";
import { sanitizeGlobalAutoGainPercent } from "./sanitize-global-auto-gain-percent";

export async function setGlobalAutoGainPercent(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  gainPercent: number
): Promise<number> {
  const settings = await this.getSettings();
  settings.globalAutoGainPercent = sanitizeGlobalAutoGainPercent(gainPercent);
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return settings.globalAutoGainPercent;
}
