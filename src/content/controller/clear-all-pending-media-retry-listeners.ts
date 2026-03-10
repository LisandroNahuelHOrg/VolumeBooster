import type { AutoBoosterControllerInternals } from "./runtime-state";

export function clearAllPendingMediaRetryListeners(
  controller: AutoBoosterControllerInternals
): void {
  for (const abortController of controller.pendingMediaRetryControllers.values()) {
    abortController.abort();
  }

  controller.pendingMediaRetryControllers.clear();
}
