import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { buildPopupViewModel } from "../../model";
import { resolveSessionBoostBarState } from "../../resolve-session-boost-bar-state";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function syncPopupSessionBoostBundle(
  context: PopupCommandContext,
  tabId: number
): Promise<boolean> {
  if (!context.state.currentState) {
    return false;
  }

  const sessionBoostBarState = resolveSessionBoostBarState(buildPopupViewModel(context.state.currentState), {
    currentView: context.state.popupUiState.currentView,
    draftGainPercent: context.state.draftGainPercent,
    draftAdvancedAudioSettings: context.state.draftAdvancedAudioSettings,
    pendingAdvancedAudioSettings: context.state.pendingAdvancedAudioSettings
  });

  if (!sessionBoostBarState.hasLocalPendingDraft) {
    return true;
  }

  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: { tabId, bundle: sessionBoostBarState.activeBundle }
  });
  await handlePopupWorkerResponse({ ...context, response });
  return context.state.transientError === null;
}
