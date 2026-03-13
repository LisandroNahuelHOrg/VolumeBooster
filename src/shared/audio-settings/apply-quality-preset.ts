import type {
  AdvancedAudioSettings,
  QualityPreset,
  VolumeNormalizationMode
} from "../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "./default-advanced-audio-settings";
import { DSP_PROFILE_TABLE } from "./dsp-profile-table";

/**
 * Builds the advanced settings snapshot that corresponds to a named sound mode.
 */
export function applyQualityPreset(
  preset: Exclude<QualityPreset, "custom">,
  qualityProtectorMode = DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode,
  volumeNormalizationMode: VolumeNormalizationMode =
    DEFAULT_ADVANCED_AUDIO_SETTINGS.volumeNormalizationMode,
  volumeNormalizationTargetPercent = DEFAULT_ADVANCED_AUDIO_SETTINGS.volumeNormalizationTargetPercent
): AdvancedAudioSettings {
  const profile = DSP_PROFILE_TABLE[preset];

  return {
    qualityPreset: preset,
    qualityProtectorMode,
    volumeNormalizationMode,
    volumeNormalizationTargetPercent,
    ceilingDb: profile.ceilingDb,
    lookaheadMs: profile.lookaheadMs,
    releaseMs: profile.releaseMs,
    multibandDepth: profile.multibandDepth,
    softClipMix: profile.softClipMix
  };
}
