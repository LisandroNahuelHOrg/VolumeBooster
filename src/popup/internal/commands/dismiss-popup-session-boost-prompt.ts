import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";
import { syncPopupSessionBoostBundle } from "./sync-popup-session-boost-bundle";

export async function dismissPopupSessionBoostPrompt(
  context: PopupCommandContext,
  tabId: number
): Promise<void> {
  if (!(await syncPopupSessionBoostBundle(context, tabId))) {
    return;
  }

  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({ type: "DISMISS_SESSION_BOOST_PROMPT" });
  await handlePopupWorkerResponse({ ...context, response });
}
