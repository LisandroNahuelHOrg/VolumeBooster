import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function removeDomainBoostSettingsBundle(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain?: string
): Promise<void> {
  if (!domain) {
    return;
  }

  const settings = await this.getSettings();
  delete settings.domainGains[domain];
  delete settings.domainAudioSettings[domain];
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
}
