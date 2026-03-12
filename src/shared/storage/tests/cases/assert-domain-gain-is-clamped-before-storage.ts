/**
 * @fileoverview Verifies persisted domain gains are clamped before storage writes.
 * @module shared/storage/tests/cases/assert-domain-gain-is-clamped-before-storage
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertDomainGainIsClampedBeforeStorage(): Promise<void> {
  const storageArea = createStorageArea();
  const repository = new SettingsRepository(storageArea);

  await repository.setDomainGain("youtube.com", 15000);
  await repository.setDomainGain("kick.com", -50);

  expect(storageArea.store[SETTINGS_STORAGE_KEY]).toEqual({
    domainGains: {
      "youtube.com": 10000
    },
    domainAudioSettings: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: "dark"
  });

  await expect(repository.getDomainGain("kick.com")).resolves.toBeUndefined();
}
