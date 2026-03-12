import { message, sendMessageSafe } from "../../../shared/messages";
import type { WorkerState } from "../../../shared/types";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { areAdvancedSettingsEqual } from "../state/are-advanced-settings-equal";
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

  if (!targetSettings || areAdvancedSettingsEqual(targetSettings, context.state.currentState?.advancedAudioSettings)) {
    context.state.pendingAdvancedAudioSettings = null;
    return;
  }

  context.state.advancedCommitInFlight = true;
  const response = await sendMessageSafe<WorkerState>({
    type: "SET_ADVANCED_AUDIO_SETTINGS",
    payload: targetSettings
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
