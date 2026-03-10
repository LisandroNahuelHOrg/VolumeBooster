import type { AutoBoosterControllerInternals } from "./runtime-state";

export function armGestureRetry(controller: AutoBoosterControllerInternals): void {
  if (controller.gestureRetryAbortController) {
    return;
  }

  const abortController = new AbortController();
  const retry = () => {
    void controller.handleGestureRetry();
  };

  controller.gestureRetryAbortController = abortController;

  for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(eventName, retry, {
      capture: true,
      once: true,
      signal: abortController.signal
    });
  }

  document.addEventListener("play", retry, {
    capture: true,
    once: true,
    signal: abortController.signal
  });
}
