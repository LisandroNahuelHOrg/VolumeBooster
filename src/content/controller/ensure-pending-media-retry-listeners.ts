import { isMediaElementReadyForAttach } from "./is-media-element-ready-for-attach";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function ensurePendingMediaRetryListeners(
  controller: AutoBoosterControllerInternals,
  mediaElement: HTMLMediaElement
): void {
  if (controller.pendingMediaRetryControllers.has(mediaElement)) {
    return;
  }

  if (typeof mediaElement.addEventListener !== "function") {
    return;
  }

  const abortController = new AbortController();
  const retry = () => {
    if (!controller.state.enabled || controller.state.suspended) {
      return;
    }

    if (isMediaElementReadyForAttach(mediaElement)) {
      controller.clearPendingMediaRetryListeners(mediaElement);
      void controller.runRefreshMediaTracking();
    }
  };

  for (const eventName of [
    "play",
    "playing",
    "canplay",
    "loadedmetadata",
    "timeupdate",
    "volumechange"
  ]) {
    mediaElement.addEventListener(eventName, retry, {
      signal: abortController.signal
    });
  }

  controller.pendingMediaRetryControllers.set(mediaElement, abortController);
}
