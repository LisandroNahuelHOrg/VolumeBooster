/**
 * @fileoverview Verifies invalid persisted auto mode and gain values fall back safely.
 * @module shared/storage/tests/cases/assert-invalid-auto-mode-and-gain-fallbacks
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertInvalidAutoModeAndGainFallbacks(): Promise<void> {
  const repository = new SettingsRepository(
    createStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        domainGains: null,
        audioSettings: {
          global: null
        },
        autoBoosterMode: "site",
        globalAutoGainPercent: -20,
        popupTheme: "sepia"
      }
    })
  );

  await expect(repository.getSettings()).resolves.toEqual({
    domainGains: {},
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
