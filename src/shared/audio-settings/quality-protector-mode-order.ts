import type { AudioQualityProtectorMode } from "../types";

/** Stable user-visible ordering for protector modes. */
export const QUALITY_PROTECTOR_MODE_ORDER: AudioQualityProtectorMode[] = [
  "off",
  "balanced",
  "warmth",
  "bass_aware",
  "vocal_focus",
  "clarity",
  "treble_safe",
  "punch_preserve",
  "maximum_protection"
];
