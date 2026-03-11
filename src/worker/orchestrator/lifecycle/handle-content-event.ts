import { isContentEvent } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { applyAutoAttachFailure } from "../auto/apply-auto-attach-failure";
import { applyAutoLevelUpdate } from "../auto/apply-auto-level-update";
import { applyAutoStatusUpdate } from "../auto/apply-auto-status-update";
import { handleAutoFrameReady } from "../auto/handle-auto-frame-ready";
import { broadcastState } from "../state/broadcast-state";
import { handleFallbackToastDismissed } from "../fallback/handle-fallback-toast-dismissed";
import { handleManualFallbackRequest } from "../fallback/handle-manual-fallback-request";
import { syncFallbackToastForTab } from "../fallback/sync-fallback-toast-for-tab";

export async function handleContentEvent(
  runtime: WorkerRuntimeState,
  incomingMessage: Extract<Parameters<typeof isContentEvent>[0], unknown>,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  if (!isContentEvent(incomingMessage)) {
    return;
  }

  switch (incomingMessage.type) {
    case "AUTO_BOOSTER_FRAME_READY":
      await handleAutoFrameReady(runtime, incomingMessage.payload, sender);
      await broadcastState(runtime);
      return;
    case "AUTO_SESSION_STATUS_UPDATE":
      applyAutoStatusUpdate(runtime, incomingMessage.payload, sender);
      await syncFallbackToastForTab(runtime, incomingMessage.payload.tabId);
      await broadcastState(runtime);
      return;
    case "AUTO_SESSION_LEVEL_UPDATE":
      applyAutoLevelUpdate(runtime, incomingMessage.payload, sender);
      await syncFallbackToastForTab(runtime, incomingMessage.payload.tabId);
      await broadcastState(runtime);
      return;
    case "AUTO_SESSION_ATTACH_FAILED":
      applyAutoAttachFailure(runtime, incomingMessage.payload, sender);
      await syncFallbackToastForTab(runtime, incomingMessage.payload.tabId);
      await broadcastState(runtime);
      return;
    case "AUTO_MANUAL_FALLBACK_REQUESTED":
      await handleManualFallbackRequest(runtime, incomingMessage.payload, sender);
      await broadcastState(runtime);
      return;
    case "AUTO_FALLBACK_TOAST_DISMISSED":
      handleFallbackToastDismissed(runtime, incomingMessage.payload, sender);
      await broadcastState(runtime);
      return;
  }
}
