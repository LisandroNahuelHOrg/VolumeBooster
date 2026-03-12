import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function togglePopupCurrentSitePreference(
  context: PopupCommandContext,
  tabId: number
): Promise<void> {
  clearPopupTransientError(context.state);
  const currentTab = context.state.currentState?.currentTab;
  const shouldForget =
    currentTab?.tabId === tabId &&
    currentTab.hasStoredPreference &&
    currentTab.preferredGainPercent === context.state.draftGainPercent;
  const response = shouldForget
    ? await sendMessageSafe<WorkerState>({
        type: "REMOVE_DOMAIN_GAIN",
        payload: { tabId }
      })
    : await sendMessageSafe<WorkerState>({
        type: "SAVE_DOMAIN_GAIN",
        payload: { tabId, gainPercent: context.state.draftGainPercent }
      });
  await handlePopupWorkerResponse({ ...context, response });
}
