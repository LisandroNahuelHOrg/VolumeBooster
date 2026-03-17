import type { WorkerRuntimeState } from "../runtime-state";
import { syncActionBadges } from "../badge/sync-action-badges";
import { syncFromOffscreen } from "../manual/sync-from-offscreen";
import { armPremiumTrialExpiryAlarm } from "../premium/arm-premium-trial-expiry-alarm";
import { resolveWorkerPremiumEntitlement } from "../premium/resolve-worker-premium-entitlement";
import { registerGlobalContentScripts } from "../auto/register-global-content-scripts";
import { syncGlobalAutoBoosterAcrossTabs } from "../auto/sync-global-auto-booster-across-tabs";
import { getSessionBoostPromptState } from "../session-boost/get-session-boost-prompt-state";
import { syncSessionBoostAcrossRuntime } from "../session-boost/sync-session-boost-across-runtime";
import { unregisterGlobalContentScripts } from "../auto/unregister-global-content-scripts";

export async function bootstrap(runtime: WorkerRuntimeState): Promise<void> {
  await resolveWorkerPremiumEntitlement(runtime);
  await armPremiumTrialExpiryAlarm(runtime);
  runtime.autoBoosterMode = await runtime.settingsRepository.getAutoBoosterMode();

  if (runtime.autoBoosterMode === "global" && !runtime.premiumEntitlement.isPremiumUnlocked) {
    runtime.autoBoosterMode = await runtime.settingsRepository.setAutoBoosterMode("off");
  }

  if (
    runtime.autoBoosterMode === "global" &&
    typeof runtime.autoBoosterClient.hasGlobalPermission === "function" &&
    !(await runtime.autoBoosterClient.hasGlobalPermission())
  ) {
    runtime.autoBoosterMode = await runtime.settingsRepository.setAutoBoosterMode("off");
  }

  if (runtime.autoBoosterMode === "global") {
    await registerGlobalContentScripts(runtime);
  } else {
    await unregisterGlobalContentScripts(runtime);
  }

  await syncFromOffscreen(runtime);
  const sessionBoostState = await runtime.sessionBoostRepository.getState();

  if (getSessionBoostPromptState(sessionBoostState).hasUnsavedChanges) {
    await syncSessionBoostAcrossRuntime(runtime);
    return;
  }

  if (runtime.autoBoosterMode === "global") {
    await syncGlobalAutoBoosterAcrossTabs(runtime);
  }

  await syncActionBadges(runtime);
}
