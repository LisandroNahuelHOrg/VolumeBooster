/**
 * @fileoverview Verifies storage sanitization when nested audio settings are omitted.
 * @module shared/storage/tests/cases/assert-missing-nested-audio-settings-are-sanitized
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertMissingNestedAudioSettingsAreSanitized(): Promise<void> {
  const repository = new SettingsRepository(
    createStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        domainGains: "invalid",
        autoBoosterMode: "global",
        globalAutoGainPercent: "300"
      }
    })
  );

  await expect(repository.getSettings()).resolves.toEqual({
    domainGains: {},
    domainAudioSettings: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "global",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "dark"
  });
}
