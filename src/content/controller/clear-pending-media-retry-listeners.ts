import type { AutoBoosterControllerInternals } from "./runtime-state";

export function clearPendingMediaRetryListeners(
  controller: AutoBoosterControllerInternals,
  mediaElement: HTMLMediaElement
): void {
  const abortController = controller.pendingMediaRetryControllers.get(mediaElement);

  if (!abortController) {
    return;
  }

  abortController.abort();
  controller.pendingMediaRetryControllers.delete(mediaElement);
}
