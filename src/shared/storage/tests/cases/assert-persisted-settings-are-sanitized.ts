/**
 * @fileoverview Verifies full persisted settings sanitization on reads.
 * @module shared/storage/tests/cases/assert-persisted-settings-are-sanitized
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertPersistedSettingsAreSanitized(): Promise<void> {
  const repository = new SettingsRepository(
    createStorageArea({
      [SETTINGS_STORAGE_KEY]: {
        domainGains: {
          "youtube.com": 150,
          "x.com": 15000,
          "broken.com": "bad"
        },
        audioSettings: {
          global: {
            ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
            releaseMs: 999,
            qualityPreset: "custom",
            qualityProtectorMode: "broken"
          }
        },
        autoBoosterMode: "global",
        globalAutoGainPercent: Number.NaN,
        popupTheme: "light"
      }
    })
  );

  await expect(repository.getSettings()).resolves.toEqual({
    domainGains: {
      "youtube.com": 150,
      "x.com": 10000
    },
    audioSettings: {
      global: {
        ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
        qualityPreset: "custom",
        releaseMs: 350
      }
    },
    autoBoosterMode: "global",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "light"
  });
}
