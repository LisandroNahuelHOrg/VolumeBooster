import { SESSION_BOOST_ACTION_FEEDBACK_MS } from "../config/popup-runtime-config";
import { syncPopupCurrentViewModel } from "../runtime/sync-popup-current-view-model";
import type { PopupCommandContext } from "../commands/popup-command-context";
import { runSessionBoostActionFeedbackTimer } from "./run-session-boost-action-feedback-timer";

export function startSessionBoostActionFeedback(
  context: PopupCommandContext,
  action: string
): void {
  if (context.state.popupDomRuntime.sessionBoostAcknowledgeTimer !== null) {
    context.refs.window.clearTimeout(context.state.popupDomRuntime.sessionBoostAcknowledgeTimer);
    context.state.popupDomRuntime.sessionBoostAcknowledgeTimer = null;
  }

  context.state.sessionBoostAcknowledgedAction = action;
  syncPopupCurrentViewModel(context.refs, context.state);
  context.state.popupDomRuntime.sessionBoostAcknowledgeTimer = context.refs.window.setTimeout(
    runSessionBoostActionFeedbackTimer,
    SESSION_BOOST_ACTION_FEEDBACK_MS,
    context
  );
}
