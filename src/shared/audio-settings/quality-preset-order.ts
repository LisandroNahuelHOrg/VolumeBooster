import type { QualityPreset } from "../types";

/** Stable user-visible ordering for sound-mode presets. */
export const QUALITY_PRESET_ORDER: QualityPreset[] = [
  "balanced",
  "vocal_presence",
  "maximum_clarity",
  "smooth_bright",
  "warm_cinematic",
  "maximum_loudness",
  "bass_boost",
  "punch_drive",
  "custom"
];
