import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function activatePopupPremiumLicense(
  context: PopupCommandContext
): Promise<void> {
  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({
    type: "ACTIVATE_PREMIUM_LICENSE",
    payload: {
      email: context.state.premiumEmailDraft,
      licenseKey: context.state.premiumLicenseDraft
    }
  });
  await handlePopupWorkerResponse({ ...context, response });
}
