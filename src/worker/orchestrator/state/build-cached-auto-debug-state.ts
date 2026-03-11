import type { AutoBoosterDebugState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";

export function buildCachedAutoDebugState(
  runtime: WorkerRuntimeState,
  tabId: number
): AutoBoosterDebugState | null {
  const autoState = runtime.autoTabStates.get(tabId);

  if (!autoState) {
    return null;
  }

  const debugState = runtime.autoDebugStates.get(tabId);

  return {
    tabId,
    lane: "auto_media_element",
    enabled: true,
    suspended: runtime.autoSuppressedTabs.has(tabId) || runtime.manualSessions.has(tabId),
    scope: autoState.autoBoosterScope ?? null,
    attachState: autoState.autoAttachState,
    attachReason: autoState.autoAttachReason,
    ...(autoState.autoActiveStrategy && autoState.autoActiveStrategy !== "none"
      ? { activeStrategy: autoState.autoActiveStrategy }
      : {}),
    audioContextState: "none",
    autoplayPolicy: undefined,
    mediaElementCount: 0,
    attachedElementCount: runtime.autoSessions.has(tabId) ? 1 : 0,
    frameCount: debugState?.frameCount ?? 0,
    readyFrameCount: debugState?.readyFrameCount ?? 0,
    attachedFrameCount: debugState?.attachedFrameCount ?? 0,
    toastVisible: debugState?.toastVisible ?? false,
    lastTelemetryAt: null,
    lastLevel: runtime.autoSessions.get(tabId)?.level ?? 0,
    lastError: autoState.lastError,
    lastTechnicalError: undefined,
    currentUrl: autoState.url
  };
}
