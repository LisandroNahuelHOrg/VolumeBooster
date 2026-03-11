import { METER_SAMPLE_MS } from "../../../../shared/constants";
import type { MainWorldController } from "../main-world-runtime-state";

export function syncMainWorldTelemetryLoop(controller: MainWorldController): void {
  const shouldRun =
    controller.state.enabled &&
    !controller.state.suspended &&
    controller.state.advancedAudioSettings !== null &&
    controller.bridgeStateList.some((bridgeState) => bridgeState.attachedNodes.size > 0);

  if (shouldRun && controller.telemetryTimer === null) {
    controller.telemetryTimer = window.setInterval(() => {
      controller.publishTelemetry();
    }, METER_SAMPLE_MS);
    return;
  }

  if (!shouldRun && controller.telemetryTimer !== null) {
    window.clearInterval(controller.telemetryTimer);
    controller.telemetryTimer = null;
  }
}
