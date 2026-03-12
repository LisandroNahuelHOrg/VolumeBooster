import type { CaptureSessionState } from "../../../shared/types";
import type { PopupRuntimeState } from "./popup-runtime-types";
import { findPopupSession } from "./find-popup-session";

export function getPopupCurrentSession(
  state: Pick<PopupRuntimeState, "currentState">
): CaptureSessionState | null {
  const currentTabId = state.currentState?.currentTab?.tabId;

  if (!currentTabId) {
    return null;
  }

  return findPopupSession(state, currentTabId) ?? null;
}
