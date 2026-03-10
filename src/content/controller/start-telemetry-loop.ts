import { METER_SAMPLE_MS } from "../../shared/constants";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function startTelemetryLoop(controller: AutoBoosterControllerInternals): void {
  if (controller.telemetryTimer !== null) {
    return;
  }

  controller.telemetryTimer = window.setInterval(() => {
    controller.publishTelemetry();
  }, METER_SAMPLE_MS);
}
