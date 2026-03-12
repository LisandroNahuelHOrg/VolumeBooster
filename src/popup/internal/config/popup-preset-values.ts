import {
  QUALITY_PRESET_ORDER,
  QUALITY_PROTECTOR_MODE_ORDER
} from "../../../shared/audio-settings";
import type { AudioQualityProtectorMode, QualityPreset } from "../../../shared/types";

export const PRESET_VALUES = [
  100, 125, 150, 175, 200,
  250, 300, 350, 400, 450,
  500, 600, 700, 800, 1000,
  2000, 3000, 4000, 5000, 10000
];

export const QUALITY_PROTECTOR_VALUES: AudioQualityProtectorMode[] = [...QUALITY_PROTECTOR_MODE_ORDER];

export const ADVANCED_PRESET_VALUES: Array<Exclude<QualityPreset, "custom">> =
  QUALITY_PRESET_ORDER.filter(
    (preset): preset is Exclude<QualityPreset, "custom"> => preset !== "custom"
  );
