import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../audio-settings";
import { DEFAULT_GAIN_PERCENT } from "../constants";
import type { BoostSettingsBundle } from "../boost-settings-bundle";

export function createDefaultBoostSettingsBundle(): BoostSettingsBundle {
  return {
    gainPercent: DEFAULT_GAIN_PERCENT,
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
  };
}
