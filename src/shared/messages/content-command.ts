import type {
  AutoBoosterConfigPayload,
  AutoFallbackToastCommandPayload
} from "../types";

/** Commands exchanged with the automatic booster content script. */
export type ContentCommand =
  | { type: "AUTO_BOOSTER_PING" }
  | { type: "AUTO_BOOSTER_CONFIGURE"; payload: AutoBoosterConfigPayload }
  | { type: "AUTO_BOOSTER_DISABLE"; payload: { tabId: number } }
  | { type: "AUTO_BOOSTER_SHOW_FALLBACK_TOAST"; payload: AutoFallbackToastCommandPayload }
  | { type: "AUTO_BOOSTER_HIDE_FALLBACK_TOAST"; payload: { tabId: number; documentId?: string } }
  | { type: "AUTO_BOOSTER_GET_DEBUG_STATE" };
