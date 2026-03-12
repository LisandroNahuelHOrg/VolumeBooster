import type { AdvancedAudioSettings } from "../../../shared/types";

export function areAdvancedSettingsEqual(
  left: AdvancedAudioSettings | null | undefined,
  right: AdvancedAudioSettings | null | undefined
): boolean {
  if (!left || !right) {
    return false;
  }

  return (
    left.qualityPreset === right.qualityPreset &&
    left.qualityProtectorMode === right.qualityProtectorMode &&
    left.ceilingDb === right.ceilingDb &&
    left.lookaheadMs === right.lookaheadMs &&
    left.releaseMs === right.releaseMs &&
    left.multibandDepth === right.multibandDepth &&
    left.softClipMix === right.softClipMix
  );
}
