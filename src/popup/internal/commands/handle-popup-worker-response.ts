import { message } from "../../../shared/messages";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import type { PopupWorkerResponseContext } from "./popup-command-context";

export async function handlePopupWorkerResponse(
  context: PopupWorkerResponseContext
): Promise<void> {
  if (!context.response.ok || !context.response.data) {
    context.state.transientError =
      context.response.errorMessage ?? message("errorExtensionActionFailed");
    applyPopupRender(context.refs, context.state);
    return;
  }

  context.state.transientError = null;
  await applyPopupWorkerState(context.refs, context.state, context.response.data);
}
