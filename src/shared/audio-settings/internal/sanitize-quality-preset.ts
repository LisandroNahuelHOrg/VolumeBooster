import type { QualityPreset } from "../../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../default-advanced-audio-settings";
import { QUALITY_PRESET_ORDER } from "../quality-preset-order";

export function sanitizeQualityPreset(preset: QualityPreset | undefined): QualityPreset {
  return QUALITY_PRESET_ORDER.includes(preset as QualityPreset)
    ? (preset as QualityPreset)
    : DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityPreset;
}
