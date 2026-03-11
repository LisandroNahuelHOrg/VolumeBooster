/**
 * @fileoverview Persists merged global advanced audio settings.
 * @module shared/storage/set-advanced-audio-settings
 */

import { sanitizeAdvancedAudioSettings } from "../audio-settings";
import type { AdvancedAudioSettings } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function setAdvancedAudioSettings(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  audioSettings: Partial<AdvancedAudioSettings>
): Promise<AdvancedAudioSettings> {
  const settings = await this.getSettings();
  settings.audioSettings.global = sanitizeAdvancedAudioSettings({
    ...settings.audioSettings.global,
    ...audioSettings
  });
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return settings.audioSettings.global;
}
