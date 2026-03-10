import type { AutoBoosterControllerInternals } from "./runtime-state";

export function setProcessingEnabled(
  controller: AutoBoosterControllerInternals,
  enabled: boolean
): void {
  for (const trackedSession of controller.trackedSessions.values()) {
    trackedSession.session.setProcessingEnabled(enabled);
  }
}
