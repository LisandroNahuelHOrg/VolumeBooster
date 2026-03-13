import type { VolumeNormalizationMode } from "../../types";
import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../default-advanced-audio-settings";
import { VOLUME_NORMALIZATION_MODE_ORDER } from "../volume-normalization-mode-order";

export function sanitizeVolumeNormalizationMode(
  mode: VolumeNormalizationMode | undefined
): VolumeNormalizationMode {
  return VOLUME_NORMALIZATION_MODE_ORDER.includes(mode as VolumeNormalizationMode)
    ? (mode as VolumeNormalizationMode)
    : DEFAULT_ADVANCED_AUDIO_SETTINGS.volumeNormalizationMode;
}
