import type { AutoBoosterDebugState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { buildCachedAutoDebugState } from "./build-cached-auto-debug-state";

export async function getDebugState(
  runtime: WorkerRuntimeState,
  tabId: number
): Promise<AutoBoosterDebugState | null> {
  const liveDebugState = await runtime.autoBoosterClient.getDebugState(tabId).catch(() => null);
  const cachedDebugState = buildCachedAutoDebugState(runtime, tabId);

  if (!cachedDebugState) {
    return liveDebugState;
  }

  if (!liveDebugState) {
    return cachedDebugState;
  }

  return {
    ...liveDebugState,
    tabId: cachedDebugState.tabId,
    enabled: cachedDebugState.enabled,
    suspended: cachedDebugState.suspended,
    scope: cachedDebugState.scope,
    attachState: cachedDebugState.attachState,
    attachReason: cachedDebugState.attachReason,
    ...(cachedDebugState.activeStrategy ? { activeStrategy: cachedDebugState.activeStrategy } : {}),
    attachedElementCount: Math.max(liveDebugState.attachedElementCount, cachedDebugState.attachedElementCount),
    frameCount: cachedDebugState.frameCount,
    readyFrameCount: cachedDebugState.readyFrameCount,
    attachedFrameCount: cachedDebugState.attachedFrameCount,
    toastVisible: cachedDebugState.toastVisible,
    lastLevel: cachedDebugState.lastLevel,
    lastError: cachedDebugState.lastError ?? liveDebugState.lastError,
    currentUrl: cachedDebugState.currentUrl ?? liveDebugState.currentUrl
  };
}
