import type { AutoBoosterControllerInternals } from "./runtime-state";

export function disarmGestureRetry(controller: AutoBoosterControllerInternals): void {
  controller.gestureRetryAbortController?.abort();
  controller.gestureRetryAbortController = null;
}
