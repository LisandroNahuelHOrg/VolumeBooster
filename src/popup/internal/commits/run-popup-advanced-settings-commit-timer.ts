import type { PopupCommitContext } from "./popup-commit-context";
import { flushPopupAdvancedSettingsCommit } from "./flush-popup-advanced-settings-commit";

export function runPopupAdvancedSettingsCommitTimer(context: PopupCommitContext): void {
  context.state.advancedCommitTimer = null;
  void flushPopupAdvancedSettingsCommit(context);
}
