import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function runRefreshMediaTracking(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  if (controller.refreshInFlight) {
    controller.refreshQueued = true;
    return;
  }

  controller.refreshInFlight = true;

  try {
    do {
      controller.refreshQueued = false;
      await controller.refreshMediaTracking();
    } while (controller.refreshQueued);
  } finally {
    controller.refreshInFlight = false;
  }
}
