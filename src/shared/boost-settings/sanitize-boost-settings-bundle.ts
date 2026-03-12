import { sanitizeAdvancedAudioSettings } from "../audio-settings";
import type { BoostSettingsBundle } from "../boost-settings-bundle";
import { DEFAULT_GAIN_PERCENT } from "../constants";
import { clampGainPercent } from "../gain";

export function sanitizeBoostSettingsBundle(bundle: Partial<BoostSettingsBundle> | undefined): BoostSettingsBundle {
  return {
    gainPercent: clampGainPercent(bundle?.gainPercent ?? DEFAULT_GAIN_PERCENT),
    advancedAudioSettings: sanitizeAdvancedAudioSettings(bundle?.advancedAudioSettings)
  };
}
