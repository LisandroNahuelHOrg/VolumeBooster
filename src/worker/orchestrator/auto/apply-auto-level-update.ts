import type { AutoSessionLevelPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { updateAudibleState } from "../badge/update-audible-state";
import { recomputeAutoTabAggregation } from "./recompute-auto-tab-aggregation";
import { resolveFrameTarget } from "./resolve-frame-target";

export function applyAutoLevelUpdate(
  runtime: WorkerRuntimeState,
  update: AutoSessionLevelPayload,
  sender?: chrome.runtime.MessageSender
): void {
  const target = resolveFrameTarget(sender, update);
  const existingState = runtime.autoFrameRegistry.getFrameState(update.tabId, target);

  if (!existingState) {
    return;
  }

  runtime.autoFrameRegistry.updateFrameState({
    ...existingState,
    level: update.level,
    warning: update.warning,
    protectorActionDb: update.protectorActionDb,
    clipEvents: update.clipEvents,
    clipPeak: update.clipPeak,
    protectionBypassed: update.protectionBypassed,
    outputPeak: update.outputPeak,
    normalizationInputLoudnessDb: update.normalizationInputLoudnessDb,
    normalizationAppliedGainDb: update.normalizationAppliedGainDb,
    normalizationOffsetScore: update.normalizationOffsetScore,
    normalizationAction: update.normalizationAction,
    normalizationLoadPercent: update.normalizationLoadPercent,
    ready: true
  });
  recomputeAutoTabAggregation(runtime, update.tabId);
  updateAudibleState(runtime, update.tabId, update.level);
}
