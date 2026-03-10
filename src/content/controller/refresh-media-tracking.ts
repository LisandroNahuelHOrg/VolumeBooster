import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function refreshMediaTracking(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  await controller.scanForMediaElements();
  controller.syncTrackedSessionsConfiguration();
  controller.setProcessingEnabled(!controller.state.suspended);
  controller.syncAttachState();
  controller.reportStatus();
}
