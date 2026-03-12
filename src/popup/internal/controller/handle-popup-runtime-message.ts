import type {
  LevelUpdatePayload,
  LocalizedMessage,
  SessionStatusPayload,
  WorkerState
} from "../../../shared/types";
import { applyPopupLevelUpdate } from "../runtime/apply-popup-level-update";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupSessionStatusUpdate } from "../runtime/apply-popup-session-status-update";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { syncPopupCurrentViewModel } from "../runtime/sync-popup-current-view-model";
import { popupMessageListenerContextRef } from "./popup-message-listener-context-ref";

export function handlePopupRuntimeMessage(message: unknown): void {
  const context = popupMessageListenerContextRef.current;

  if (!context || !message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  const typedMessage = message as { payload?: unknown; type: string };

  if (typedMessage.type === "WORKER_STATE_UPDATE" && typedMessage.payload) {
    void applyPopupWorkerState(context.refs, context.state, typedMessage.payload as WorkerState);
    return;
  }

  if (typedMessage.type === "SESSION_LEVEL_UPDATE" && typedMessage.payload) {
    if (applyPopupLevelUpdate(context.state, typedMessage.payload as LevelUpdatePayload)) {
      syncPopupCurrentViewModel(context.refs, context.state);
    }
    return;
  }

  if (typedMessage.type === "SESSION_STATUS_UPDATE" && typedMessage.payload) {
    if (applyPopupSessionStatusUpdate(context.state, typedMessage.payload as SessionStatusPayload)) {
      syncPopupCurrentViewModel(context.refs, context.state);
    }
    return;
  }

  if (typedMessage.type === "WORKER_ERROR" && typedMessage.payload) {
    context.state.transientError = (typedMessage.payload as { message: LocalizedMessage }).message;
    applyPopupRender(context.refs, context.state);
  }
}
