import { sanitizeBoostSettingsBundle } from "../boost-settings";
import type { BoostSettingsBundle } from "../boost-settings-bundle";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function setGlobalBoostSettingsBundle(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  bundle: BoostSettingsBundle
): Promise<BoostSettingsBundle> {
  const settings = await this.getSettings();
  const nextBundle = sanitizeBoostSettingsBundle(bundle);
  settings.globalAutoGainPercent = nextBundle.gainPercent;
  settings.audioSettings.global = nextBundle.advancedAudioSettings;
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
  return nextBundle;
}
