import type { CaptureSessionState } from "../../../shared/types";
import type { PopupRuntimeState } from "./popup-runtime-types";

export function findPopupSession(
  state: Pick<PopupRuntimeState, "currentState">,
  tabId: number
): CaptureSessionState | undefined {
  if (!state.currentState) {
    return undefined;
  }

  for (const session of state.currentState.sessions) {
    if (session.tabId === tabId) {
      return session;
    }
  }

  return undefined;
}
