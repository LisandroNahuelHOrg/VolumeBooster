/**
 * @fileoverview Verifies writes for global settings are sanitized before persistence.
 * @module shared/storage/tests/cases/assert-global-settings-sanitization
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../../audio-settings";
import { DEFAULT_GAIN_PERCENT } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertGlobalSettingsSanitization(): Promise<void> {
  const repository = new SettingsRepository(createStorageArea());

  await expect(repository.setAutoBoosterMode("site" as never)).resolves.toBe("off");
  await expect(repository.setGlobalAutoGainPercent(Number.POSITIVE_INFINITY)).resolves.toBe(DEFAULT_GAIN_PERCENT);
  await expect(repository.setPopupTheme("sepia" as never)).resolves.toBe("dark");
  await expect(
    repository.setAdvancedAudioSettings({
      ceilingDb: 5,
      multibandDepth: -10
    })
  ).resolves.toEqual({
    ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
    ceilingDb: -0.3,
    multibandDepth: 0
  });
}
