import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "../auto/activate-auto-booster-for-tab";
import { broadcastState } from "../state/broadcast-state";

export async function handleTabActivated(
  runtime: WorkerRuntimeState,
  activeInfo: { tabId: number }
): Promise<void> {
  if (runtime.autoBoosterMode === "global") {
    const activeTab = await chrome.tabs.get(activeInfo.tabId);

    if (activeTab.id && isSupportedTabUrl(activeTab.url)) {
      await activateAutoBoosterForTab(runtime, activeTab, "global");
    }
  }

  await broadcastState(runtime);
}
