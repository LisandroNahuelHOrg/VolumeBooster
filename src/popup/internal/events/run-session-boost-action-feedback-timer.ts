import { syncPopupCurrentViewModel } from "../runtime/sync-popup-current-view-model";
import type { PopupCommandContext } from "../commands/popup-command-context";

export function runSessionBoostActionFeedbackTimer(context: PopupCommandContext): void {
  context.state.popupDomRuntime.sessionBoostAcknowledgeTimer = null;
  context.state.sessionBoostAcknowledgedAction = null;
  syncPopupCurrentViewModel(context.refs, context.state);
}
