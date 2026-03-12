import type { SessionStatusPayload } from "../../../shared/types";
import type { PopupRuntimeState } from "./popup-runtime-types";
import { findPopupSession } from "./find-popup-session";

export function applyPopupSessionStatusUpdate(
  state: Pick<
    PopupRuntimeState,
    "currentState" | "draftGainPercent" | "isAdjustingGain" | "pendingGainPercent"
  >,
  payload: SessionStatusPayload
): boolean {
  const session = findPopupSession(state, payload.tabId);

  if (!session) {
    return false;
  }

  session.streamState = payload.streamState;
  session.engineStatus = payload.engineStatus;
  session.gainPercent = payload.gainPercent;
  session.lastError = payload.lastError;

  if (state.pendingGainPercent !== null && state.pendingGainPercent === payload.gainPercent) {
    state.pendingGainPercent = null;
  }

  if (!state.isAdjustingGain && state.pendingGainPercent === null) {
    state.draftGainPercent = payload.gainPercent;
  }

  return true;
}
