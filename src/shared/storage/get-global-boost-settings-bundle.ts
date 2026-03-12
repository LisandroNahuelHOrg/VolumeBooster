import type { BoostSettingsBundle } from "../boost-settings-bundle";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getGlobalBoostSettingsBundle(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<BoostSettingsBundle> {
  const settings = await this.getSettings();

  return {
    gainPercent: settings.globalAutoGainPercent,
    advancedAudioSettings: settings.audioSettings.global
  };
}
