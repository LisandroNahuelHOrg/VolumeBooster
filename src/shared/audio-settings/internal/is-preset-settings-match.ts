import type { AdvancedAudioSettings, QualityPreset } from "../../types";
import { applyQualityPreset } from "../apply-quality-preset";
import { roundTo } from "./round-to";

export function isPresetSettingsMatch(
  preset: Exclude<QualityPreset, "custom">,
  settings: AdvancedAudioSettings
): boolean {
  const expected = applyQualityPreset(preset);

  return (
    roundTo(settings.ceilingDb, 2) === roundTo(expected.ceilingDb, 2) &&
    roundTo(settings.lookaheadMs, 1) === roundTo(expected.lookaheadMs, 1) &&
    roundTo(settings.releaseMs, 0) === roundTo(expected.releaseMs, 0) &&
    roundTo(settings.multibandDepth, 0) === roundTo(expected.multibandDepth, 0) &&
    roundTo(settings.softClipMix, 1) === roundTo(expected.softClipMix, 1)
  );
}
