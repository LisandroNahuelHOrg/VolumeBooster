/**
 * @fileoverview Verifies invalid persisted domain gain entries are discarded.
 * @module shared/storage/tests/cases/assert-drops-invalid-persisted-domain-gains
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertDropsInvalidPersistedDomainGains(): Promise<void> {
  const repository = new SettingsRepository(
    createStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        domainGains: {
          "youtube.com": Number.POSITIVE_INFINITY,
          "kick.com": "220",
          "twitch.tv": 175
        },
        audioSettings: {
          global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
        },
        autoBoosterMode: "off",
        globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
        popupTheme: "dark"
      }
    })
  );

  await expect(repository.getSettings()).resolves.toEqual({
    domainGains: {
      "twitch.tv": 175
    },
    domainAudioSettings: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "dark",
    premiumLicenseActivation: null
  });
}
