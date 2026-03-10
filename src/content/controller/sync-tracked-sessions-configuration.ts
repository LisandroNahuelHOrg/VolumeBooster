import type { AutoBoosterControllerInternals } from "./runtime-state";

export function syncTrackedSessionsConfiguration(
  controller: AutoBoosterControllerInternals
): void {
  if (!controller.state.advancedAudioSettings) {
    return;
  }

  for (const trackedSession of controller.trackedSessions.values()) {
    trackedSession.session.setGainPercent(controller.state.gainPercent);
    trackedSession.session.setAdvancedAudioSettings(
      controller.state.advancedAudioSettings
    );
  }
}
