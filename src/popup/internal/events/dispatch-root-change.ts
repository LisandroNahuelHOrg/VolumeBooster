import { flushPopupAdvancedSettingsCommit } from "../commits/flush-popup-advanced-settings-commit";
import { flushPopupGainCommit } from "../commits/flush-popup-gain-commit";
import { clearPendingGainTrackJump } from "../dom/clear-pending-gain-track-jump";
import { popupRootChangeContextRegistry } from "./popup-root-change-context-registry";

export function dispatchRootChange(event: Event): void {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof HTMLInputElement) || !currentTarget) {
    return;
  }

  const context = popupRootChangeContextRegistry.get(currentTarget);

  if (!context) {
    return;
  }

  if (target.dataset.role === "gain-slider") {
    context.commitContext.state.isAdjustingGain = false;
    clearPendingGainTrackJump(context.commitContext.state.popupGainPointerRuntime);
    void flushPopupGainCommit(context.commitContext);
    return;
  }

  if (target.dataset.role === "advanced-slider") {
    context.commitContext.state.isAdjustingAdvancedSettings = false;
    void flushPopupAdvancedSettingsCommit(context.commitContext);
  }
}
