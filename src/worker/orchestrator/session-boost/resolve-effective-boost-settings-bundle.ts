import type { BoostSettingsBundle, SessionBoostState } from "../../../shared/boost-settings";
import { createDefaultBoostSettingsBundle } from "../../../shared/boost-settings";
import type { ExtensionSettings } from "../../../shared/types";

export function resolveEffectiveBoostSettingsBundle(
  settings: ExtensionSettings,
  sessionBoostState: SessionBoostState,
  domain?: string
): BoostSettingsBundle {
  if (domain && sessionBoostState.siteSessionBundles[domain]) {
    return sessionBoostState.siteSessionBundles[domain];
  }

  if (sessionBoostState.globalDraftBundle) {
    return sessionBoostState.globalDraftBundle;
  }

  if (domain && (settings.domainGains[domain] !== undefined || settings.domainAudioSettings[domain] !== undefined)) {
    return {
      gainPercent: settings.domainGains[domain] ?? settings.globalAutoGainPercent,
      advancedAudioSettings: settings.domainAudioSettings[domain] ?? settings.audioSettings.global
    };
  }

  return settings.audioSettings?.global
    ? {
        gainPercent: settings.globalAutoGainPercent,
        advancedAudioSettings: settings.audioSettings.global
      }
    : createDefaultBoostSettingsBundle();
}
