import type { AdvancedControlKey } from "../config/advanced-control-config";
import { schedulePopupAdvancedSettingsCommit } from "../commits/schedule-popup-advanced-settings-commit";
import { schedulePopupGainCommit } from "../commits/schedule-popup-gain-commit";
import { setPopupDraftGain } from "../commits/set-popup-draft-gain";
import { updatePopupDraftAdvancedSetting } from "../commits/update-popup-draft-advanced-setting";
import { clearPendingGainTrackJump } from "../dom/clear-pending-gain-track-jump";
import { shouldAnimateGainTrackJump } from "../dom/should-animate-gain-track-jump";
import { buildPopupViewModel } from "../../model";
import { getVisibleAdvancedAudioSettings } from "../state/get-visible-advanced-audio-settings";
import { setPopupDraftAdvancedAudioSettings } from "../commits/set-popup-draft-advanced-audio-settings";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import { popupRootInputContextRegistry } from "./popup-root-input-context-registry";

export function dispatchRootInput(event: Event): void {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof HTMLInputElement) || !currentTarget) {
    return;
  }

  const context = popupRootInputContextRegistry.get(currentTarget);

  if (!context) {
    return;
  }

  if (target.dataset.role === "gain-slider") {
    clearPopupTransientError(context.commitContext.state);
    context.commitContext.state.isAdjustingGain = true;
    setPopupDraftGain(
      context.commitContext.refs,
      context.commitContext.state,
      Number(target.value),
      {
        animateVisuals: shouldAnimateGainTrackJump(
          context.commitContext.state.popupGainPointerRuntime
        )
      }
    );
    clearPendingGainTrackJump(context.commitContext.state.popupGainPointerRuntime);
    schedulePopupGainCommit(context.commitContext, false);
    return;
  }

  if (target.dataset.role === "normalization-slider") {
    if (!context.commitContext.state.currentState) {
      return;
    }

    clearPopupTransientError(context.commitContext.state);
    context.commitContext.state.isAdjustingAdvancedSettings = true;
    setPopupDraftAdvancedAudioSettings(
      context.commitContext.refs,
      context.commitContext.state,
      {
        ...getVisibleAdvancedAudioSettings(
          buildPopupViewModel(context.commitContext.state.currentState),
          context.commitContext.state.draftAdvancedAudioSettings,
          context.commitContext.state.pendingAdvancedAudioSettings
        ),
        volumeNormalizationTargetPercent: Number(target.value)
      }
    );
    schedulePopupAdvancedSettingsCommit(context.commitContext, false);
    return;
  }

  if (target.dataset.role === "advanced-slider" && target.dataset.advancedKey) {
    clearPopupTransientError(context.commitContext.state);
    context.commitContext.state.isAdjustingAdvancedSettings = true;
    updatePopupDraftAdvancedSetting(
      context.commitContext.state,
      context.commitContext.refs,
      target.dataset.advancedKey as AdvancedControlKey,
      Number(target.value)
    );
    schedulePopupAdvancedSettingsCommit(context.commitContext, false);
  }
}
