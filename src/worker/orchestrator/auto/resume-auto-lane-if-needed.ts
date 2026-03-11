import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";
import { activateAutoBoosterForTab } from "./activate-auto-booster-for-tab";

export async function resumeAutoLaneIfNeeded(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const scope = getAutoScopeForTab(runtime, tabId);

  if (!scope || runtime.autoSuppressedTabs.has(tabId)) {
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);

  if (!tab?.id || !isSupportedTabUrl(tab.url)) {
    return;
  }

  await activateAutoBoosterForTab(runtime, tab, scope);
}
