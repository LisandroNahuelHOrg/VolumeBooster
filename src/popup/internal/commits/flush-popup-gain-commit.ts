import { message, sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { getPopupCurrentSession } from "../runtime/get-popup-current-session";
import type { PopupCommitContext } from "./popup-commit-context";

export async function flushPopupGainCommit(context: PopupCommitContext): Promise<void> {
  if (context.state.gainCommitTimer !== null) {
    context.refs.window.clearTimeout(context.state.gainCommitTimer);
    context.state.gainCommitTimer = null;
  }

  if (context.state.gainCommitInFlight) {
    return;
  }

  const currentSession = getPopupCurrentSession(context.state);
  const targetGain = context.state.pendingGainPercent;

  if (!currentSession || targetGain === null) {
    context.state.pendingGainPercent = null;
    return;
  }

  if (currentSession.gainPercent === targetGain) {
    context.state.pendingGainPercent = null;
    return;
  }

  context.state.gainCommitInFlight = true;
  const response = await sendMessageSafe<WorkerState>({
    type: "SET_GAIN",
    payload: { tabId: currentSession.tabId, gainPercent: targetGain }
  });
  context.state.gainCommitInFlight = false;

  if (!response.ok || !response.data) {
    context.state.pendingGainPercent = null;
    context.state.transientError = response.errorMessage ?? message("errorExtensionActionFailed");
    applyPopupRender(context.refs, context.state);
    return;
  }

  await applyPopupWorkerState(context.refs, context.state, response.data);

  if (context.state.pendingGainPercent !== null) {
    const refreshedSession = getPopupCurrentSession(context.state);

    if (refreshedSession && refreshedSession.gainPercent !== context.state.pendingGainPercent) {
      await flushPopupGainCommit(context);
    }
  }
}
