/**
 * @fileoverview Reads the persisted global advanced audio settings.
 * @module shared/storage/get-advanced-audio-settings
 */

import type { AdvancedAudioSettings } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getAdvancedAudioSettings(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<AdvancedAudioSettings> {
  const settings = await this.getSettings();
  return settings.audioSettings.global;
}
