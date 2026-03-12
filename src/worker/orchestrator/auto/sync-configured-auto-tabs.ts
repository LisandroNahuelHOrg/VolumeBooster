import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "./activate-auto-booster-for-tab";

export async function syncConfiguredAutoTabs(runtime: WorkerRuntimeState): Promise<void> {
  const tabsToSync = new Map<number, "site" | "global">();

  for (const tabId of runtime.siteEnabledAutoTabs) {
    tabsToSync.set(tabId, "site");
  }

  if (runtime.autoBoosterMode === "global") {
    const injectableTabs = await runtime.autoBoosterClient.queryInjectableTabs();

    for (const tab of injectableTabs) {
      if (!tab.id || !isSupportedTabUrl(tab.url) || runtime.autoSuppressedTabs.has(tab.id)) {
        continue;
      }

      tabsToSync.set(tab.id, "global");
    }
  }

  for (const [tabId, scope] of tabsToSync) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);

    if (!tab?.id || !isSupportedTabUrl(tab.url)) {
      continue;
    }

    try {
      await activateAutoBoosterForTab(runtime, tab, scope);
    } catch {
      // Per-tab attach failures must not abort the remaining auto-booster sync work.
    }
  }
}
