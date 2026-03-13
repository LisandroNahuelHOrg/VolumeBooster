import { formatNormalizationAction } from "../format/format-normalization-action";
import { formatNormalizationCorrection } from "../format/format-normalization-correction";
import { formatNormalizationLoad } from "../format/format-normalization-load";
import { getVolumeNormalizationModeCopy, getVolumeNormalizationSubtitleCopy } from "../../volume-normalization-copy";
import type { CaptureSessionState } from "../../../shared/types";
import type { PopupMainViewRenderModel } from "./popup-render-types";
import type { PopupRenderContext } from "./popup-render-types";

export function createVolumeNormalizationRenderFields(
  currentSession: CaptureSessionState | null,
  mode: PopupMainViewRenderModel["advancedAudioSettings"]["volumeNormalizationMode"],
  renderContext: PopupRenderContext
): Pick<
  PopupMainViewRenderModel,
  | "normalizationAction"
  | "normalizationCorrection"
  | "normalizationLoad"
  | "normalizationOffsetPositionPercent"
  | "normalizationOffsetScore"
  | "volumeNormalizationModeLabel"
  | "volumeNormalizationSubtitle"
> {
  const offsetScore = Math.round(currentSession?.normalizationOffsetScore ?? 0);

  return {
    volumeNormalizationModeLabel: getVolumeNormalizationModeCopy(mode, renderContext.catalog),
    volumeNormalizationSubtitle: getVolumeNormalizationSubtitleCopy(mode, renderContext.catalog),
    normalizationCorrection: formatNormalizationCorrection(
      currentSession?.normalizationAppliedGainDb ?? 0
    ),
    normalizationAction: formatNormalizationAction(
      currentSession?.normalizationAction ?? "holding",
      renderContext.catalog
    ),
    normalizationLoad: formatNormalizationLoad(currentSession?.normalizationLoadPercent ?? 0),
    normalizationOffsetScore: `${offsetScore > 0 ? "+" : ""}${offsetScore}`,
    normalizationOffsetPositionPercent: Math.max(0, Math.min(100, ((offsetScore + 100) / 200) * 100))
  };
}
