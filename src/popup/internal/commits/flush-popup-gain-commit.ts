import { message, sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { createPopupCommitBoostSettingsBundle } from "./create-popup-commit-boost-settings-bundle";
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
  const currentState = context.state.currentState;
  const targetGain = context.state.pendingGainPercent;

  if (!currentSession || !currentState || targetGain === null) {
    context.state.pendingGainPercent = null;
    return;
  }

  if (currentSession.gainPercent === targetGain) {
    context.state.pendingGainPercent = null;
    return;
  }

  context.state.gainCommitInFlight = true;
  const response = await sendMessageSafe<WorkerState>({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: {
      tabId: currentSession.tabId,
      bundle: createPopupCommitBoostSettingsBundle(
        currentState,
        targetGain,
        context.state.draftAdvancedAudioSettings,
        context.state.pendingAdvancedAudioSettings
      )
    }
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
    const refreshedGain =
      context.state.currentState?.boostSettingsBundle?.gainPercent ??
      getPopupCurrentSession(context.state)?.gainPercent;

    if (refreshedGain !== undefined && refreshedGain !== context.state.pendingGainPercent) {
      await flushPopupGainCommit(context);
    }
  }
}
