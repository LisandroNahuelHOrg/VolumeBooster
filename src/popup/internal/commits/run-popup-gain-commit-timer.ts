import type { PopupCommitContext } from "./popup-commit-context";
import { flushPopupGainCommit } from "./flush-popup-gain-commit";

export function runPopupGainCommitTimer(context: PopupCommitContext): void {
  context.state.gainCommitTimer = null;
  void flushPopupGainCommit(context);
}
