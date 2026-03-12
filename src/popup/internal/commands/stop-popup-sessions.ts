import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function stopPopupSessions(context: PopupCommandContext): Promise<void> {
  clearPopupTransientError(context.state);
  context.state.pendingGainPercent = null;
  const response = await sendMessageSafe<WorkerState>({ type: "STOP_ALL" });
  await handlePopupWorkerResponse({ ...context, response });
}
