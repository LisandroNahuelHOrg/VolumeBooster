import type { AutoFrameTarget } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { recomputeAutoTabAggregation } from "../auto/recompute-auto-tab-aggregation";

export async function hideFallbackToastForTab(
  runtime: WorkerRuntimeState,
  tabId: number,
  target: AutoFrameTarget
): Promise<void> {
  try {
    if (typeof runtime.autoBoosterClient.sendMessageToFrame === "function") {
      await runtime.autoBoosterClient.sendMessageToFrame(tabId, target, {
        type: "AUTO_BOOSTER_HIDE_FALLBACK_TOAST",
        payload: {
          tabId,
          documentId: target.documentId
        }
      });
    }
  } catch {
    // Missing receiver is acceptable during navigation or teardown.
  }

  runtime.autoFrameRegistry.markToastVisible(tabId, target, false);
  recomputeAutoTabAggregation(runtime, tabId);
}
