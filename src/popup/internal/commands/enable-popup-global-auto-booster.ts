import { sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { confirmGlobalAutoBooster } from "../actions/confirm-global-auto-booster";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import type { PopupCommandContext } from "./popup-command-context";
import { handlePopupWorkerResponse } from "./handle-popup-worker-response";

export async function enablePopupGlobalAutoBooster(
  context: PopupCommandContext,
  tabId: number,
  options: { skipConfirmation?: boolean } = {}
): Promise<void> {
  if (
    !options.skipConfirmation &&
    !confirmGlobalAutoBooster(
      context.state.currentCatalog,
      context.state.currentState,
      context.refs.window.confirm.bind(context.refs.window)
    )
  ) {
    return;
  }

  clearPopupTransientError(context.state);
  const response = await sendMessageSafe<WorkerState>({
    type: "ENABLE_GLOBAL_AUTO_BOOSTER",
    payload: { tabId, gainPercent: context.state.draftGainPercent }
  });
  await handlePopupWorkerResponse({ ...context, response });
}
