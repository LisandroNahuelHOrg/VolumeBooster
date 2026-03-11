import type { WorkerRuntimeState } from "../runtime-state";
import { syncActionBadges } from "../badge/sync-action-badges";
import { syncFromOffscreen } from "../manual/sync-from-offscreen";
import { registerGlobalContentScripts } from "../auto/register-global-content-scripts";
import { syncGlobalAutoBoosterAcrossTabs } from "../auto/sync-global-auto-booster-across-tabs";
import { unregisterGlobalContentScripts } from "../auto/unregister-global-content-scripts";

export async function bootstrap(runtime: WorkerRuntimeState): Promise<void> {
  runtime.autoBoosterMode = await runtime.settingsRepository.getAutoBoosterMode();

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

  if (runtime.autoBoosterMode === "global") {
    await syncGlobalAutoBoosterAcrossTabs(runtime);
  }

  await syncActionBadges(runtime);
}
