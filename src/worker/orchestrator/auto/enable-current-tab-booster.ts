import type { WorkerRuntimeState } from "../runtime-state";
import { startCapture } from "../manual/start-capture";
import { deactivateGlobalAutoBooster } from "./deactivate-global-auto-booster";
import { disableAllSiteAutoTabs } from "./disable-all-site-auto-tabs";

export async function enableCurrentTabBooster(
  runtime: WorkerRuntimeState,
  tabId: number,
  gainPercent: number
): Promise<void> {
  if (runtime.autoBoosterMode === "global") {
    await deactivateGlobalAutoBooster(runtime);
  }

  await disableAllSiteAutoTabs(runtime);
  await startCapture(runtime, tabId, gainPercent);
}
