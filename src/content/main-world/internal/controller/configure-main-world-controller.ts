import type { AutoBoosterConfigPayload } from "../../../../shared/types";
import type { MainWorldController } from "../main-world-runtime-state";

export function configureMainWorldController(
  controller: MainWorldController,
  payload: AutoBoosterConfigPayload
): void {
  controller.state = {
    enabled: payload.enabled,
    suspended: payload.suspended,
    scope: payload.scope,
    gainPercent: payload.gainPercent,
    advancedAudioSettings: payload.advancedAudioSettings
  };
  controller.lastTechnicalError = undefined;

  for (const bridgeState of controller.bridgeStateList) {
    controller.applyRuntimeParameters(bridgeState);
  }

  controller.syncTelemetryLoop();
  controller.reportStatus();
}
