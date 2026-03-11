import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "./activate-auto-booster-for-tab";

export async function syncGlobalAutoBoosterGain(runtime: WorkerRuntimeState, gainPercent: number): Promise<void> {
  if (runtime.autoBoosterMode !== "global") {
    return;
  }

  const injectableTabs = await runtime.autoBoosterClient.queryInjectableTabs();

  for (const tab of injectableTabs) {
    if (!tab.id || !isSupportedTabUrl(tab.url) || runtime.autoSuppressedTabs.has(tab.id)) {
      continue;
    }

    await activateAutoBoosterForTab(runtime, tab, "global", gainPercent);
  }
}
