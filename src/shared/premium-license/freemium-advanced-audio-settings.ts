import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../audio-settings";
import type { AdvancedAudioSettings } from "../types";

export const FREEMIUM_ADVANCED_AUDIO_SETTINGS: AdvancedAudioSettings = {
  ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
  qualityPreset: "balanced",
  qualityProtectorMode: "off",
  volumeNormalizationMode: "off",
  volumeNormalizationTargetPercent: 100
};
