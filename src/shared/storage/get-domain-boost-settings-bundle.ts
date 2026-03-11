import type { BoostSettingsBundle } from "../boost-settings-bundle";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";

export async function getDomainBoostSettingsBundle(
  this: SettingsRepositoryApi & SettingsRepositoryContext,
  domain?: string
): Promise<BoostSettingsBundle | null> {
  if (!domain) {
    return null;
  }

  const settings = await this.getSettings();
  const gainPercent = settings.domainGains[domain];
  const advancedAudioSettings = settings.domainAudioSettings[domain];

  if (gainPercent === undefined && !advancedAudioSettings) {
    return null;
  }

  return {
    gainPercent: gainPercent ?? settings.globalAutoGainPercent,
    advancedAudioSettings: advancedAudioSettings ?? settings.audioSettings.global
  };
}
