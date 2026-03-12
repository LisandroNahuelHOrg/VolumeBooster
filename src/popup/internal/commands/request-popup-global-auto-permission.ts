import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { getRecoverableGlobalAutoTabId } from "../../global-auto-permission";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { enablePopupGlobalAutoBooster } from "./enable-popup-global-auto-booster";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function requestPopupGlobalAutoPermission(
  context: PopupCommandContext
): Promise<void> {
  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({ type: "REQUEST_GLOBAL_PERMISSION" });
  await handlePopupWorkerResponse({ ...context, response });

  if (!response.ok || !response.data) {
    return;
  }

  const recoverableTabId = getRecoverableGlobalAutoTabId(response.data);

  if (recoverableTabId === null) {
    return;
  }

  await enablePopupGlobalAutoBooster(context, recoverableTabId, { skipConfirmation: true });
}
