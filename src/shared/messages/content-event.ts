import type {
  AutoBoosterFrameReadyPayload,
  AutoFallbackToastDismissedPayload,
  AutoManualFallbackRequestPayload,
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload
} from "../types";

/** Events emitted by the content script toward the worker. */
export type ContentEvent =
  | { type: "AUTO_BOOSTER_FRAME_READY"; payload: AutoBoosterFrameReadyPayload }
  | { type: "AUTO_SESSION_STATUS_UPDATE"; payload: AutoSessionStatusPayload }
  | { type: "AUTO_SESSION_LEVEL_UPDATE"; payload: AutoSessionLevelPayload }
  | { type: "AUTO_SESSION_ATTACH_FAILED"; payload: AutoSessionAttachFailedPayload }
  | { type: "AUTO_MANUAL_FALLBACK_REQUESTED"; payload: AutoManualFallbackRequestPayload }
  | { type: "AUTO_FALLBACK_TOAST_DISMISSED"; payload: AutoFallbackToastDismissedPayload };
