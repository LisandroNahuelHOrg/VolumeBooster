import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function disablePopupCurrentTabBooster(
  context: PopupCommandContext,
  tabId: number
): Promise<void> {
  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({
    type: "DISABLE_CURRENT_TAB_BOOSTER",
    payload: { tabId }
  });
  await handlePopupWorkerResponse({ ...context, response });
}
