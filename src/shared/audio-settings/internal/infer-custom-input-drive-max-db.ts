import type { AdvancedAudioSettings } from "../../types";
import { clampRound } from "./clamp-round";
import { normalizePeak } from "./normalize-peak";

export function inferCustomInputDriveMaxDb(settings: AdvancedAudioSettings): number {
  const inferred =
    10.5 +
    settings.multibandDepth * 0.055 +
    settings.softClipMix * 0.05 +
    normalizePeak(-settings.ceilingDb, 0.3, 2) * 1.6;

  return clampRound(inferred, 10.5, 18, 14, 2);
}
