import type { AutoFallbackToastDismissedPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { recomputeAutoTabAggregation } from "../auto/recompute-auto-tab-aggregation";
import { resolveFrameTarget } from "../auto/resolve-frame-target";

export function handleFallbackToastDismissed(
  runtime: WorkerRuntimeState,
  payload: AutoFallbackToastDismissedPayload,
  sender?: chrome.runtime.MessageSender
): void {
  const tabId = sender?.tab?.id ?? payload.tabId;

  if (typeof tabId !== "number") {
    return;
  }

  const target = resolveFrameTarget(sender, payload);
  runtime.autoFrameRegistry.markToastDismissed(tabId, target, true);
  runtime.autoFrameRegistry.markToastVisible(tabId, target, false);
  recomputeAutoTabAggregation(runtime, tabId);
}
