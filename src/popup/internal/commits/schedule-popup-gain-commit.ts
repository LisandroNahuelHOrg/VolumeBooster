import { GAIN_COMMIT_DEBOUNCE_MS } from "../config/popup-runtime-config";
import { getPopupCurrentSession } from "../runtime/get-popup-current-session";
import type { PopupCommitContext } from "./popup-commit-context";
import { flushPopupGainCommit } from "./flush-popup-gain-commit";
import { runPopupGainCommitTimer } from "./run-popup-gain-commit-timer";

export function schedulePopupGainCommit(
  context: PopupCommitContext,
  immediate: boolean
): void {
  const currentSession = getPopupCurrentSession(context.state);

  if (!currentSession) {
    context.state.pendingGainPercent = null;
    return;
  }

  context.state.pendingGainPercent = context.state.draftGainPercent;

  if (context.state.gainCommitTimer !== null) {
    context.refs.window.clearTimeout(context.state.gainCommitTimer);
    context.state.gainCommitTimer = null;
  }

  if (immediate) {
    void flushPopupGainCommit(context);
    return;
  }

  context.state.gainCommitTimer = context.refs.window.setTimeout(
    runPopupGainCommitTimer,
    GAIN_COMMIT_DEBOUNCE_MS,
    context
  );
}
