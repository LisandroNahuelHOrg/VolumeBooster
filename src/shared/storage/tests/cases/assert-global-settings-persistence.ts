/**
 * @fileoverview Verifies global mode, gain, theme, and advanced settings persist.
 * @module shared/storage/tests/cases/assert-global-settings-persistence
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertGlobalSettingsPersistence(): Promise<void> {
  const repository = new SettingsRepository(createStorageArea());

  await expect(repository.setAutoBoosterMode("global")).resolves.toBe("global");
  await expect(repository.getAutoBoosterMode()).resolves.toBe("global");

  await expect(repository.setGlobalAutoGainPercent(3000)).resolves.toBe(3000);
  await expect(repository.getGlobalAutoGainPercent()).resolves.toBe(3000);

  await expect(repository.setPopupTheme("light")).resolves.toBe("light");
  await expect(repository.getPopupTheme()).resolves.toBe("light");

  await expect(
    repository.setAdvancedAudioSettings({
      lookaheadMs: 9,
      qualityPreset: "maximum_clarity"
    })
  ).resolves.toEqual({
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    lookaheadMs: 8,
    qualityPreset: "maximum_clarity"
  });

  await expect(repository.getAdvancedAudioSettings()).resolves.toEqual({
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    lookaheadMs: 8,
    qualityPreset: "maximum_clarity"
  });
}
