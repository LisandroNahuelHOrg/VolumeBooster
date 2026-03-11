import type { WorkerRuntimeState } from "../runtime-state";
import { hideFallbackToastForTab } from "./hide-fallback-toast-for-tab";
import { showFallbackToastForTab } from "./show-fallback-toast-for-tab";

export async function syncFallbackToastForTab(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const scope = runtime.autoTabStates.get(tabId)?.autoBoosterScope;
  const topFrame = runtime.autoFrameRegistry.getTopFrame(tabId);
  const tabState = runtime.autoTabStates.get(tabId);

  if (
    !topFrame ||
    scope !== "global" ||
    runtime.autoBoosterMode !== "global" ||
    runtime.manualSessions.has(tabId) ||
    !tabState ||
    tabState.autoAttachState !== "failed" ||
    runtime.autoSessions.has(tabId) ||
    runtime.autoFrameRegistry.isToastDismissed(tabId, topFrame)
  ) {
    await hideFallbackToastForTab(runtime, tabId, topFrame ?? { frameId: 0 });
    return;
  }

  await showFallbackToastForTab(
    runtime,
    tabId,
    topFrame,
    tabState.autoAttachReason ?? "attach_failed",
    tabState.lastError
  );
}
