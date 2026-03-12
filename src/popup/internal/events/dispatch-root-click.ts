import { applyQualityPreset } from "../../../shared/audio-settings";
import type { AudioQualityProtectorMode, QualityPreset } from "../../../shared/types";
import { buildPopupViewModel } from "../../model";
import { shiftSessionCarouselOffset } from "../../session-carousel";
import { schedulePopupAdvancedSettingsCommit } from "../commits/schedule-popup-advanced-settings-commit";
import { schedulePopupGainCommit } from "../commits/schedule-popup-gain-commit";
import { setPopupDraftAdvancedAudioSettings } from "../commits/set-popup-draft-advanced-audio-settings";
import { setPopupDraftGain } from "../commits/set-popup-draft-gain";
import { stopPopupCapture } from "../commands/stop-popup-capture";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { clearPopupTransientError } from "../runtime/clear-popup-transient-error";
import { getVisibleAdvancedAudioSettings } from "../state/get-visible-advanced-audio-settings";
import { popupRootClickContextRegistry } from "./popup-root-click-context-registry";
import { runPopupRootAction } from "./run-popup-root-action";

export function dispatchRootClick(event: Event): void {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof Element) || !currentTarget) {
    return;
  }

  const context = popupRootClickContextRegistry.get(currentTarget);

  if (!context) {
    return;
  }

  const sessionCarouselNav = target.closest<HTMLButtonElement>("[data-session-carousel-nav]");
  const presetButton = target.closest<HTMLButtonElement>("[data-preset]");
  const advancedPresetButton = target.closest<HTMLButtonElement>("[data-advanced-preset]");
  const qualityProtectorButton = target.closest<HTMLButtonElement>("[data-quality-protector]");
  const stopSessionButton = target.closest<HTMLButtonElement>("[data-stop-tab]");
  const actionButton = target.closest<HTMLButtonElement>("[data-action]");

  if (sessionCarouselNav?.dataset.sessionCarouselNav) {
    context.commitContext.state.sessionCarouselOffset = shiftSessionCarouselOffset(
      context.commitContext.state.currentState?.sessions.length ?? 0,
      context.commitContext.state.sessionCarouselOffset,
      sessionCarouselNav.dataset.sessionCarouselNav === "next" ? "next" : "previous"
    );
    context.commitContext.state.renderedSignature = "";
    applyPopupRender(context.commitContext.refs, context.commitContext.state);
    return;
  }
  if (presetButton?.dataset.preset) {
    clearPopupTransientError(context.commitContext.state);
    setPopupDraftGain(
      context.commitContext.refs,
      context.commitContext.state,
      Number(presetButton.dataset.preset),
      { animateVisuals: true }
    );
    schedulePopupGainCommit(context.commitContext, true);
    return;
  }
  if (advancedPresetButton?.dataset.advancedPreset) {
    clearPopupTransientError(context.commitContext.state);
    const visibleSettings = context.commitContext.state.currentState
      ? getVisibleAdvancedAudioSettings(
          buildPopupViewModel(context.commitContext.state.currentState),
          context.commitContext.state.draftAdvancedAudioSettings,
          context.commitContext.state.pendingAdvancedAudioSettings
        )
      : null;
    setPopupDraftAdvancedAudioSettings(
      context.commitContext.refs,
      context.commitContext.state,
      applyQualityPreset(
        advancedPresetButton.dataset.advancedPreset as Exclude<QualityPreset, "custom">,
        visibleSettings?.qualityProtectorMode
      )
    );
    schedulePopupAdvancedSettingsCommit(context.commitContext, true);
    return;
  }
  if (qualityProtectorButton?.dataset.qualityProtector) {
    if (!context.commitContext.state.currentState) {
      return;
    }

    clearPopupTransientError(context.commitContext.state);
    setPopupDraftAdvancedAudioSettings(
      context.commitContext.refs,
      context.commitContext.state,
      {
        ...getVisibleAdvancedAudioSettings(
          buildPopupViewModel(context.commitContext.state.currentState),
          context.commitContext.state.draftAdvancedAudioSettings,
          context.commitContext.state.pendingAdvancedAudioSettings
        ),
        qualityPreset: "custom",
        qualityProtectorMode:
          qualityProtectorButton.dataset.qualityProtector as AudioQualityProtectorMode
      }
    );
    schedulePopupAdvancedSettingsCommit(context.commitContext, true);
    return;
  }
  if (stopSessionButton?.dataset.stopTab) {
    void stopPopupCapture(context.commandContext, Number(stopSessionButton.dataset.stopTab));
    return;
  }
  if (actionButton?.dataset.action) {
    runPopupRootAction(actionButton.dataset.action, context.commandContext);
  }
}
