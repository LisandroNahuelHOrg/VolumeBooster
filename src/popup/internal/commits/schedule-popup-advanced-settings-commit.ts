import { ADVANCED_COMMIT_DEBOUNCE_MS } from "../config/popup-runtime-config";
import type { PopupCommitContext } from "./popup-commit-context";
import { flushPopupAdvancedSettingsCommit } from "./flush-popup-advanced-settings-commit";
import { runPopupAdvancedSettingsCommitTimer } from "./run-popup-advanced-settings-commit-timer";

export function schedulePopupAdvancedSettingsCommit(
  context: PopupCommitContext,
  immediate: boolean
): void {
  const nextSettings = context.state.draftAdvancedAudioSettings;

  if (!nextSettings) {
    context.state.pendingAdvancedAudioSettings = null;
    return;
  }

  context.state.pendingAdvancedAudioSettings = { ...nextSettings };

  if (context.state.advancedCommitTimer !== null) {
    context.refs.window.clearTimeout(context.state.advancedCommitTimer);
    context.state.advancedCommitTimer = null;
  }

  if (immediate) {
    void flushPopupAdvancedSettingsCommit(context);
    return;
  }

  context.state.advancedCommitTimer = context.refs.window.setTimeout(
    runPopupAdvancedSettingsCommitTimer,
    ADVANCED_COMMIT_DEBOUNCE_MS,
    context
  );
}
