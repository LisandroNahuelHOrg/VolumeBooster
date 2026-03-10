import type { AutoBoosterControllerInternals } from "./runtime-state";

export function pruneDetachedSessions(controller: AutoBoosterControllerInternals): void {
  for (const [mediaElement, trackedSession] of controller.trackedSessions) {
    if (document.contains(mediaElement)) {
      continue;
    }

    void trackedSession.session.stop().catch(() => undefined);
    controller.trackedSessions.delete(mediaElement);
  }

  for (const [mediaElement, abortController] of controller.pendingMediaRetryControllers) {
    if (document.contains(mediaElement)) {
      continue;
    }

    abortController.abort();
    controller.pendingMediaRetryControllers.delete(mediaElement);
  }
}
