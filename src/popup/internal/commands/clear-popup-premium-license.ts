import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function clearPopupPremiumLicense(
  context: PopupCommandContext
): Promise<void> {
  clearPopupTransientError(context.state);
  context.state.premiumLicenseDraft = "";
  const response = await sendMessageSafe<WorkerState>({ type: "CLEAR_PREMIUM_LICENSE" });
  await handlePopupWorkerResponse({ ...context, response });
}
