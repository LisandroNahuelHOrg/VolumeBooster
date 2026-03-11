import type { AutoAttachReason, AutoFrameTarget, LocalizedMessage } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { recomputeAutoTabAggregation } from "../auto/recompute-auto-tab-aggregation";

export async function showFallbackToastForTab(
  runtime: WorkerRuntimeState,
  tabId: number,
  target: AutoFrameTarget,
  reason: AutoAttachReason,
  errorMessage?: LocalizedMessage
): Promise<void> {
  if (typeof runtime.autoBoosterClient.sendMessageToFrame === "function") {
    await runtime.autoBoosterClient.sendMessageToFrame(tabId, target, {
      type: "AUTO_BOOSTER_SHOW_FALLBACK_TOAST",
      payload: {
        tabId,
        documentId: target.documentId,
        reason,
        errorMessage
      }
    });
  }
  runtime.autoFrameRegistry.markToastVisible(tabId, target, true);
  recomputeAutoTabAggregation(runtime, tabId);
}
