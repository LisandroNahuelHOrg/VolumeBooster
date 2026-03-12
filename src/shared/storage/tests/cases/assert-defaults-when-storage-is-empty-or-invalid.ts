/**
 * @fileoverview Verifies default settings fallbacks for empty or invalid storage state.
 * @module shared/storage/tests/cases/assert-defaults-when-storage-is-empty-or-invalid
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertDefaultsWhenStorageIsEmptyOrInvalid(): Promise<void> {
  const emptyRepository = new SettingsRepository(createStorageArea());
  const invalidRepository = new SettingsRepository(
    createStorageArea({
      [SETTINGS_STORAGE_KEY]: "nope"
    })
  );

  await expect(emptyRepository.getSettings()).resolves.toEqual({
    domainGains: {},
    domainAudioSettings: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "dark"
  });

  await expect(invalidRepository.getSettings()).resolves.toEqual({
    domainGains: {},
    domainAudioSettings: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "dark"
  });
}
