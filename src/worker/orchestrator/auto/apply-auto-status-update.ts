import type { AutoFrameRuntimeState, AutoSessionStatusPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { createEmptyFrameRuntimeState } from "./create-empty-frame-runtime-state";
import { recomputeAutoTabAggregation } from "./recompute-auto-tab-aggregation";
import { resolveFrameTarget } from "./resolve-frame-target";

export function applyAutoStatusUpdate(
  runtime: WorkerRuntimeState,
  update: AutoSessionStatusPayload,
  sender?: chrome.runtime.MessageSender
): void {
  const target = resolveFrameTarget(sender, update);
  const existingState = runtime.autoFrameRegistry.getFrameState(update.tabId, target);
  const nextState: AutoFrameRuntimeState = {
    ...(existingState ?? createEmptyFrameRuntimeState(update.tabId, target, update)),
    ...update,
    frameId: target.frameId,
    documentId: target.documentId,
    isTopFrame: update.isTopFrame ?? target.frameId === 0,
    frameUrl: update.frameUrl ?? sender?.url ?? update.url,
    ready: true
  };

  runtime.autoFrameRegistry.updateFrameState(nextState);
  recomputeAutoTabAggregation(runtime, update.tabId);
}
