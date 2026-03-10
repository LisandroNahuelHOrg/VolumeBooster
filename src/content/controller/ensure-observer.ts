import type { AutoBoosterControllerInternals } from "./runtime-state";

export function ensureObserver(controller: AutoBoosterControllerInternals): void {
  if (controller.observer) {
    return;
  }

  controller.observer = new MutationObserver(() => {
    void controller.handleDomMutation();
  });

  controller.observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
