/**
 * @fileoverview Loads and sanitizes the full persisted settings snapshot.
 * @module shared/storage/get-settings
 */

import { sanitizeAdvancedAudioSettings } from "../audio-settings";
import { SETTINGS_STORAGE_KEY } from "../constants";
import type { ExtensionSettings } from "../types";
import type { SettingsRepositoryApi, SettingsRepositoryContext } from "./contracts";
import { SETTINGS_REPOSITORY_STORAGE_AREA } from "./contracts";
import { getDefaultSettings } from "./get-default-settings";
import { sanitizeAutoBoosterMode } from "./sanitize-auto-booster-mode";
import { sanitizeDomainAudioSettings } from "./sanitize-domain-audio-settings";
import { sanitizeDomainGains } from "./sanitize-domain-gains";
import { sanitizeGlobalAutoGainPercent } from "./sanitize-global-auto-gain-percent";
import { sanitizePopupTheme } from "./sanitize-popup-theme";

export async function getSettings(
  this: SettingsRepositoryApi & SettingsRepositoryContext
): Promise<ExtensionSettings> {
  const result = await this[SETTINGS_REPOSITORY_STORAGE_AREA].get(SETTINGS_STORAGE_KEY);
  const raw = result[SETTINGS_STORAGE_KEY];

  if (!raw || typeof raw !== "object") {
    return getDefaultSettings();
  }

  const settings = raw as Partial<ExtensionSettings>;

  return {
    domainGains: sanitizeDomainGains(settings.domainGains),
    domainAudioSettings: sanitizeDomainAudioSettings(settings.domainAudioSettings),
    audioSettings: {
      global: sanitizeAdvancedAudioSettings(settings.audioSettings?.global)
    },
    autoBoosterMode: sanitizeAutoBoosterMode(settings.autoBoosterMode),
    globalAutoGainPercent: sanitizeGlobalAutoGainPercent(settings.globalAutoGainPercent),
    popupTheme: sanitizePopupTheme(settings.popupTheme)
  };
}
