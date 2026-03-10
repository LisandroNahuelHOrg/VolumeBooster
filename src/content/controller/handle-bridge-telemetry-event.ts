import {
  isBridgeEventDetail,
  type BridgeTelemetryPayload
} from "../bridge-protocol";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function handleBridgeTelemetryEvent(
  controller: AutoBoosterControllerInternals,
  event: Event
): void {
  const customEvent = event as CustomEvent<unknown>;

  if (!isBridgeEventDetail<BridgeTelemetryPayload>(customEvent.detail)) {
    return;
  }

  controller.bridgeTelemetry = customEvent.detail.payload;
  controller.lastTelemetryAt = Math.max(
    controller.lastTelemetryAt ?? 0,
    controller.bridgeTelemetry.lastTelemetryAt
  );
  controller.lastLevel = Math.max(
    controller.lastLevel,
    controller.bridgeTelemetry.level
  );
}
