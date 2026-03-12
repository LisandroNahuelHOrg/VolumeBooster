import type { ExtensionSettings } from "../../../shared/types";

export function hasStoredSiteBoostSettings(settings: ExtensionSettings, domain?: string): boolean {
  if (!domain) {
    return false;
  }

  return settings.domainGains[domain] !== undefined || settings.domainAudioSettings[domain] !== undefined;
}
