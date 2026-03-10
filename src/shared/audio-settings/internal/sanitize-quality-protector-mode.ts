import type { AudioQualityProtectorMode } from "../../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../default-advanced-audio-settings";
import { QUALITY_PROTECTOR_MODE_ORDER } from "../quality-protector-mode-order";

export function sanitizeQualityProtectorMode(
  mode: AudioQualityProtectorMode | undefined
): AudioQualityProtectorMode {
  return QUALITY_PROTECTOR_MODE_ORDER.includes(mode as AudioQualityProtectorMode)
    ? (mode as AudioQualityProtectorMode)
    : DEFAULT_ADVANCED_AUDIO_SETTINGS.qualityProtectorMode;
}
