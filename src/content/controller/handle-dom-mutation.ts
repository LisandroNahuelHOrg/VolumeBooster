import type { AutoBoosterControllerInternals } from "./runtime-state";

export async function handleDomMutation(
  controller: AutoBoosterControllerInternals
): Promise<void> {
  controller.pruneDetachedSessions();

  if (!controller.state.enabled || !controller.state.advancedAudioSettings) {
    return;
  }

  await controller.runRefreshMediaTracking();
}
