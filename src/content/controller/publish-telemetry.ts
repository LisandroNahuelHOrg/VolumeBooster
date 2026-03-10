import type { AutoSessionLevelPayload } from "../../shared/types";
import { pickHighestWarning } from "./pick-highest-warning";
import { roundTo } from "./round-to";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function publishTelemetry(controller: AutoBoosterControllerInternals): void {
  if (
    !controller.state.enabled ||
    controller.state.suspended ||
    controller.state.tabId === null ||
    controller.state.attachState !== "attached"
  ) {
    return;
  }

  const telemetryValues = [...controller.trackedSessions.values()].map(
    (trackedSession) => {
      trackedSession.lastTelemetry = trackedSession.session.sampleTelemetry();
      return trackedSession.lastTelemetry;
    }
  );

  if (controller.bridgeTelemetry.activeStrategy !== "none") {
    telemetryValues.push({
      level: controller.bridgeTelemetry.level,
      warning: controller.bridgeTelemetry.warning,
      metrics: {
        protectorActionDb: controller.bridgeTelemetry.metrics.protectorActionDb,
        clipEvents: controller.bridgeTelemetry.metrics.clipEvents,
        clipPeak: controller.bridgeTelemetry.metrics.clipPeak,
        protectionBypassed: controller.bridgeTelemetry.metrics.protectionBypassed,
        inputPeak: controller.bridgeTelemetry.level,
        outputPeak: controller.bridgeTelemetry.metrics.outputPeak
      }
    });
  }

  if (telemetryValues.length === 0) {
    controller.syncAttachState();
    controller.reportStatus();
    return;
  }

  const payload: AutoSessionLevelPayload = {
    tabId: controller.state.tabId,
    isTopFrame: controller.frameContext.isTopFrame,
    frameUrl: controller.frameContext.frameUrl,
    level: roundTo(
      Math.max(...telemetryValues.map((telemetry) => telemetry.level)),
      4
    ),
    warning: pickHighestWarning(
      telemetryValues.map((telemetry) => telemetry.warning)
    ),
    protectorActionDb: roundTo(
      Math.max(
        ...telemetryValues.map((telemetry) => telemetry.metrics.protectorActionDb)
      ),
      2
    ),
    clipEvents: telemetryValues.reduce(
      (sum, telemetry) => sum + telemetry.metrics.clipEvents,
      0
    ),
    clipPeak: roundTo(
      Math.max(...telemetryValues.map((telemetry) => telemetry.metrics.clipPeak)),
      4
    ),
    protectionBypassed: telemetryValues.some(
      (telemetry) => telemetry.metrics.protectionBypassed
    ),
    outputPeak: roundTo(
      Math.max(...telemetryValues.map((telemetry) => telemetry.metrics.outputPeak)),
      4
    )
  };

  controller.lastTelemetryAt = Math.max(
    Date.now(),
    controller.bridgeTelemetry.lastTelemetryAt || 0
  );
  controller.lastLevel = payload.level;

  void controller.postRuntimeMessage({
    type: "AUTO_SESSION_LEVEL_UPDATE",
    payload
  });
}
