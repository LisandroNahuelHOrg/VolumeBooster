import { message } from "../../shared/messages";
import {
  MediaElementSession,
  MediaElementSessionError
} from "../media-element-session";
import { discoverMediaElements } from "../media-discovery";
import { ensurePendingMediaRetryListeners } from "./ensure-pending-media-retry-listeners";
import { isMediaElementPotentiallyAttachable } from "./is-media-element-potentially-attachable";
import { isMediaElementReadyForAttach } from "./is-media-element-ready-for-attach";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function scanForMediaElements(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  if (!controller.state.enabled || !controller.state.advancedAudioSettings) {
    return;
  }

  const mediaElements = discoverMediaElements();

  for (const mediaElement of mediaElements) {
    if (controller.processedElements.has(mediaElement)) {
      continue;
    }

    if (!isMediaElementReadyForAttach(mediaElement)) {
      if (isMediaElementPotentiallyAttachable(mediaElement)) {
        controller.state.attachState = "awaiting_user_gesture";
        controller.state.attachReason = "autoplay_blocked";
        controller.state.lastError = message("errorAutoAwaitingGesture");
        controller.armGestureRetry();
      }

      ensurePendingMediaRetryListeners(controller, mediaElement);
      continue;
    }

    try {
      const session = await MediaElementSession.create(
        mediaElement,
        controller.state.gainPercent,
        controller.state.advancedAudioSettings
      );

      controller.processedElements.add(mediaElement);
      session.setProcessingEnabled(!controller.state.suspended);
      controller.trackedSessions.set(mediaElement, {
        session,
        lastTelemetry: session.sampleTelemetry()
      });
      controller.clearPendingMediaRetryListeners(mediaElement);
      const debugState = session.getDebugState();
      controller.lastAudioContextState = debugState.audioContextState;
      controller.lastAutoplayPolicy = debugState.autoplayPolicy;
      controller.lastTechnicalError = undefined;
      controller.state.attachState = "attached";
      controller.state.attachReason = undefined;
      controller.state.lastError = undefined;
      controller.disarmGestureRetry();
    } catch (error) {
      if (error instanceof MediaElementSessionError) {
        controller.lastAudioContextState =
          error.debugState?.audioContextState ?? controller.lastAudioContextState;
        controller.lastAutoplayPolicy =
          error.debugState?.autoplayPolicy ?? controller.lastAutoplayPolicy;
        controller.lastTechnicalError = error.technicalMessage;

        if (error.reason === "autoplay_blocked") {
          ensurePendingMediaRetryListeners(controller, mediaElement);
          controller.state.attachState = "awaiting_user_gesture";
          controller.state.attachReason = "autoplay_blocked";
          controller.state.lastError = message("errorAutoAwaitingGesture");
          controller.armGestureRetry();
          continue;
        }

        if (error.reason === "source_conflict") {
          controller.clearPendingMediaRetryListeners(mediaElement);
          ensurePendingMediaRetryListeners(controller, mediaElement);
          if (controller.state.attachState !== "attached") {
            controller.state.attachState = "observing";
            controller.state.attachReason = "no_media";
          }

          continue;
        }
      }

      controller.state.attachState = "failed";
      controller.state.attachReason = "attach_failed";
      controller.state.lastError = message("errorAutoAttachFailed");
      controller.lastTechnicalError =
        error instanceof Error ? error.message : String(error);
      controller.reportAttachFailure();
    }
  }
}
