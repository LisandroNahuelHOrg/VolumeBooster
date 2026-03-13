import type { AdvancedAudioSettings } from "../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "./default-advanced-audio-settings";
import { applyQualityPreset } from "./apply-quality-preset";
import { MAX_OUTPUT_SOFT_CLIP_MIX } from "./limits";
import { clampRound } from "./internal/clamp-round";
import { sanitizeQualityPreset } from "./internal/sanitize-quality-preset";
import { sanitizeQualityProtectorMode } from "./internal/sanitize-quality-protector-mode";
import { sanitizeVolumeNormalizationMode } from "./internal/sanitize-volume-normalization-mode";

/** Sanitizes partial persisted advanced settings into a complete valid object. */
export function sanitizeAdvancedAudioSettings(
  settings: Partial<AdvancedAudioSettings> | undefined
): AdvancedAudioSettings {
  const preset = sanitizeQualityPreset(settings?.qualityPreset);
  const qualityProtectorMode = sanitizeQualityProtectorMode(settings?.qualityProtectorMode);
  const volumeNormalizationMode = sanitizeVolumeNormalizationMode(settings?.volumeNormalizationMode);
  const volumeNormalizationTargetPercent = clampRound(
    settings?.volumeNormalizationTargetPercent,
    80,
    120,
    DEFAULT_ADVANCED_AUDIO_SETTINGS.volumeNormalizationTargetPercent,
    0
  );
  const presetDefaults =
    preset === "custom"
      ? {
          ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
          qualityPreset: "custom",
          qualityProtectorMode,
          volumeNormalizationMode,
          volumeNormalizationTargetPercent
        }
      : applyQualityPreset(
          preset,
          qualityProtectorMode,
          volumeNormalizationMode,
          volumeNormalizationTargetPercent
        );

  return {
    qualityPreset: preset,
    qualityProtectorMode,
    volumeNormalizationMode,
    volumeNormalizationTargetPercent,
    ceilingDb: clampRound(settings?.ceilingDb, -2, -0.3, presetDefaults.ceilingDb, 2),
    lookaheadMs: clampRound(settings?.lookaheadMs, 1, 8, presetDefaults.lookaheadMs, 1),
    releaseMs: clampRound(settings?.releaseMs, 60, 350, presetDefaults.releaseMs, 0),
    multibandDepth: clampRound(settings?.multibandDepth, 0, 100, presetDefaults.multibandDepth, 0),
    softClipMix: clampRound(settings?.softClipMix, 0, MAX_OUTPUT_SOFT_CLIP_MIX, presetDefaults.softClipMix, 1)
  };
}
