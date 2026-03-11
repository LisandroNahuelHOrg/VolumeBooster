import type { AutoSessionAttachFailedPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncBadgePulseTimer } from "../badge/sync-badge-pulse-timer";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";
import { createEmptyFrameRuntimeState } from "./create-empty-frame-runtime-state";
import { recomputeAutoTabAggregation } from "./recompute-auto-tab-aggregation";
import { resolveFrameTarget } from "./resolve-frame-target";

export function applyAutoAttachFailure(
  runtime: WorkerRuntimeState,
  update: AutoSessionAttachFailedPayload,
  sender?: chrome.runtime.MessageSender
): void {
  const target = resolveFrameTarget(sender, update);
  const existingState = runtime.autoFrameRegistry.getFrameState(update.tabId, target);
  const isGlobalMode = (update.autoBoosterScope ?? getAutoScopeForTab(runtime, update.tabId)) === "global";
  const shouldObserveInsteadOfFail =
    isGlobalMode && (update.autoAttachReason === "attach_failed" || update.autoAttachReason === "no_media");

  runtime.autoFrameRegistry.updateFrameState({
    ...(existingState ?? createEmptyFrameRuntimeState(update.tabId, target, update)),
    ...update,
    frameId: target.frameId,
    documentId: target.documentId,
    isTopFrame: update.isTopFrame ?? target.frameId === 0,
    frameUrl: update.frameUrl ?? sender?.url ?? update.url,
    autoAttachState: shouldObserveInsteadOfFail ? "observing" : "failed",
    autoAttachReason: shouldObserveInsteadOfFail && isGlobalMode ? "no_media" : update.autoAttachReason,
    ready: true
  });
  runtime.audibleTabs.delete(update.tabId);
  syncBadgePulseTimer(runtime);
  recomputeAutoTabAggregation(runtime, update.tabId);
}
