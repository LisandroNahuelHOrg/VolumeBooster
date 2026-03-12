/**
 * @fileoverview Verifies stored domain gains can be removed cleanly.
 * @module shared/storage/tests/cases/assert-stored-domain-gain-can-be-removed
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertStoredDomainGainCanBeRemoved(): Promise<void> {
  const storageArea = createStorageArea({
    [SETTINGS_STORAGE_KEY]: {
      domainGains: {
        "youtube.com": 180
      },
      audioSettings: {
        global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      },
      autoBoosterMode: "off",
      globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
      popupTheme: "dark"
    }
  });
  const repository = new SettingsRepository(storageArea);

  await repository.removeDomainGain(undefined);
  await repository.removeDomainGain("youtube.com");

  expect((storageArea.store[SETTINGS_STORAGE_KEY] as { domainGains: Record<string, number> }).domainGains).toEqual({});
}
