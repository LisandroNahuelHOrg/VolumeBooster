import type { WorkerRuntimeState } from "../runtime-state";
import { deactivateGlobalAutoBooster } from "../auto/deactivate-global-auto-booster";
import { syncConfiguredAutoTabs } from "../auto/sync-configured-auto-tabs";
import { replaceManualSessions } from "../manual/replace-manual-sessions";
import { broadcastState } from "../state/broadcast-state";
import { getRuntimeAdvancedAudioSettings } from "./get-runtime-advanced-audio-settings";
import { resolveWorkerPremiumEntitlement } from "./resolve-worker-premium-entitlement";

export async function syncPremiumEntitlementRuntime(runtime: WorkerRuntimeState): Promise<void> {
  await resolveWorkerPremiumEntitlement(runtime);

  if (!runtime.premiumEntitlement.isPremiumUnlocked && runtime.autoBoosterMode === "global") {
    await deactivateGlobalAutoBooster(runtime);
  }

  if (runtime.manualSessions.size > 0) {
    replaceManualSessions(
      runtime,
      await runtime.offscreenClient.setAdvancedAudioSettings(
        await getRuntimeAdvancedAudioSettings(runtime)
      )
    );
  }

  await syncConfiguredAutoTabs(runtime);
  await broadcastState(runtime);
}
