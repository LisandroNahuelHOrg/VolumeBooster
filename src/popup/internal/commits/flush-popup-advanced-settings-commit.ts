import { message, sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { areAdvancedSettingsEqual } from "../state/are-advanced-settings-equal";
import { createPopupCommitBoostSettingsBundle } from "./create-popup-commit-boost-settings-bundle";
import type { PopupCommitContext } from "./popup-commit-context";

export async function flushPopupAdvancedSettingsCommit(
  context: PopupCommitContext
): Promise<void> {
  if (context.state.advancedCommitTimer !== null) {
    context.refs.window.clearTimeout(context.state.advancedCommitTimer);
    context.state.advancedCommitTimer = null;
  }

  if (context.state.advancedCommitInFlight) {
    return;
  }

  const targetSettings = context.state.pendingAdvancedAudioSettings;
  const currentState = context.state.currentState;

  if (!targetSettings || areAdvancedSettingsEqual(targetSettings, context.state.currentState?.advancedAudioSettings)) {
    context.state.pendingAdvancedAudioSettings = null;
    return;
  }

  if (!currentState || typeof currentState.currentTab?.tabId !== "number") {
    context.state.pendingAdvancedAudioSettings = null;
    return;
  }

  context.state.advancedCommitInFlight = true;
  const response = await sendMessageSafe<WorkerState>({
    type: "SET_SESSION_BOOST_BUNDLE",
    payload: {
      tabId: currentState.currentTab.tabId,
      bundle: createPopupCommitBoostSettingsBundle(
        currentState,
        context.state.draftGainPercent,
        targetSettings,
        targetSettings
      )
    }
  });
  context.state.advancedCommitInFlight = false;

  if (!response.ok || !response.data) {
    context.state.pendingAdvancedAudioSettings = null;
    context.state.transientError = response.errorMessage ?? message("errorExtensionActionFailed");
    applyPopupRender(context.refs, context.state);
    return;
  }

  await applyPopupWorkerState(context.refs, context.state, response.data);

  if (
    context.state.pendingAdvancedAudioSettings &&
    !areAdvancedSettingsEqual(
      context.state.pendingAdvancedAudioSettings,
      response.data.advancedAudioSettings
    )
  ) {
    await flushPopupAdvancedSettingsCommit(context);
  }
}
