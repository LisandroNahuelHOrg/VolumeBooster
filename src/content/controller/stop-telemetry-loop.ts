import type { AutoBoosterControllerInternals } from "./runtime-state";

export function stopTelemetryLoop(controller: AutoBoosterControllerInternals): void {
  if (controller.telemetryTimer !== null) {
    window.clearInterval(controller.telemetryTimer);
    controller.telemetryTimer = null;
  }
}
