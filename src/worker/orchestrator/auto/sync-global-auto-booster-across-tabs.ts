import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "./activate-auto-booster-for-tab";
import { registerGlobalContentScripts } from "./register-global-content-scripts";

export async function syncGlobalAutoBoosterAcrossTabs(runtime: WorkerRuntimeState): Promise<void> {
  await registerGlobalContentScripts(runtime);
  const injectableTabs = await runtime.autoBoosterClient.queryInjectableTabs();

  for (const tab of injectableTabs) {
    if (!tab.id || !isSupportedTabUrl(tab.url) || runtime.autoSuppressedTabs.has(tab.id)) {
      continue;
    }

    try {
      await activateAutoBoosterForTab(runtime, tab, "global");
    } catch {
      // Keep the global lane alive even if one injectable tab fails to attach.
    }
  }
}
