import { sanitizeBoostSettingsBundle } from "../boost-settings";
import type { BoostSettingsBundle } from "../boost-settings-bundle";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { persistSettings } from "./persist-settings";

export async function setDomainBoostSettingsBundle(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain: string | undefined,
  bundle: BoostSettingsBundle
): Promise<void> {
  if (!domain) {
    return;
  }

  const settings = await this.getSettings();
  const nextBundle = sanitizeBoostSettingsBundle(bundle);
  settings.domainGains[domain] = nextBundle.gainPercent;
  settings.domainAudioSettings[domain] = nextBundle.advancedAudioSettings;
  await persistSettings(this[SETTINGS_REPOSITORY_STORAGE_AREA], settings);
}
