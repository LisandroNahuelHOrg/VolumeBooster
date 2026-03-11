import type { MainWorldController } from "../main-world-runtime-state";

export function disableMainWorldController(controller: MainWorldController): void {
  controller.state = {
    enabled: false,
    suspended: false,
    scope: null,
    gainPercent: 100,
    advancedAudioSettings: null
  };
  controller.lastTechnicalError = undefined;

  for (const bridgeState of controller.bridgeStateList) {
    controller.applyBypassState(bridgeState);
  }

  controller.syncTelemetryLoop();
  controller.reportStatus();
}
