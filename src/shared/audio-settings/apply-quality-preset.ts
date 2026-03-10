import type { AdvancedAudioSettings, QualityPreset } from "../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "./default-advanced-audio-settings";
import { DSP_PROFILE_TABLE } from "./dsp-profile-table";

/**
 * Builds the advanced settings snapshot that corresponds to a named sound mode.
 */
export function applyQualityPreset(
  preset: Exclude<QualityPreset, "custom">,
  qualityProtectorMode = DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode
): AdvancedAudioSettings {
  const profile = DSP_PROFILE_TABLE[preset];

  return {
    qualityPreset: preset,
    qualityProtectorMode,
    ceilingDb: profile.ceilingDb,
    lookaheadMs: profile.lookaheadMs,
    releaseMs: profile.releaseMs,
    multibandDepth: profile.multibandDepth,
    softClipMix: profile.softClipMix
  };
}
