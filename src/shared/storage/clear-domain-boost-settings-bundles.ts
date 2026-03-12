import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function clearDomainBoostSettingsBundles(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<void> {
  const settings = await this.getSettings();
  settings.domainGains = {};
  settings.domainAudioSettings = {};
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
}
