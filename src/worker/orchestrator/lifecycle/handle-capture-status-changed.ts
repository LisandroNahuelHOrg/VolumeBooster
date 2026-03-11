import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";
import { applyManualStatusUpdate } from "../manual/apply-manual-status-update";

export async function handleCaptureStatusChanged(
  runtime: WorkerRuntimeState,
  info: chrome.tabCapture.CaptureInfo
): Promise<void> {
  if (typeof info.tabId !== "number" || !runtime.manualSessions.has(info.tabId)) {
    return;
  }

  applyManualStatusUpdate(runtime, {
    tabId: info.tabId,
    streamState: info.status === "active" ? "active" : info.status === "pending" ? "pending" : "inactive",
    engineStatus: info.status === "pending" ? "loading" : "ready",
    gainPercent: runtime.manualSessions.get(info.tabId)?.gainPercent ?? DEFAULT_GAIN_PERCENT,
    lastError: info.status === "stopped" ? message("errorCaptureStopped") : undefined
  });
  await broadcastState(runtime);
}
