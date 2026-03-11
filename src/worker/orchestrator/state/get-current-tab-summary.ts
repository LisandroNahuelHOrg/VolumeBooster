import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { buildTabSummary, getDomainFromUrl } from "../../../shared/domain";
import type { TabSummary } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";

export async function getCurrentTabSummary(runtime: WorkerRuntimeState): Promise<TabSummary | null> {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!currentTab?.id) {
    return null;
  }

  const domain = getDomainFromUrl(currentTab.url);
  const preferredGain = (await runtime.settingsRepository.getDomainGain(domain)) ?? DEFAULT_GAIN_PERCENT;
  const summary = buildTabSummary(currentTab, preferredGain, preferredGain !== DEFAULT_GAIN_PERCENT);
  const tabId = currentTab.id;
  const activeSession = runtime.sessions.get(tabId);
  const autoTabState = runtime.autoTabStates.get(tabId);

  return {
    ...summary,
    activeLane: activeSession?.engineLane,
    autoBoosterScope: activeSession?.autoBoosterScope ?? autoTabState?.autoBoosterScope,
    autoActiveStrategy: activeSession?.autoActiveStrategy ?? autoTabState?.autoActiveStrategy,
    autoAttachState:
      activeSession?.engineLane === "auto_media_element"
        ? activeSession.autoAttachState
        : autoTabState?.autoAttachState ?? "idle",
    autoAttachReason:
      activeSession?.engineLane === "auto_media_element"
        ? activeSession.autoAttachReason
        : autoTabState?.autoAttachReason
  };
}
