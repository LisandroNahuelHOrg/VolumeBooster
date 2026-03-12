import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { confirmCurrentSiteAutoBooster } from "../actions/confirm-current-site-auto-booster";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function enablePopupCurrentTabBooster(
  context: PopupCommandContext,
  tabId: number
): Promise<void> {
  if (
    !confirmCurrentSiteAutoBooster(
      context.state.currentCatalog,
      context.state.currentState,
      context.refs.window.confirm.bind(context.refs.window)
    )
  ) {
    return;
  }

  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({
    type: "ENABLE_CURRENT_TAB_BOOSTER",
    payload: { tabId, gainPercent: context.state.draftGainPercent }
  });
  await handlePopupWorkerResponse({ ...context, response });
}
