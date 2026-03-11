import { clampGainPercent } from "../../../shared/gain";
import { isSupportedTabUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "../auto/activate-auto-booster-for-tab";
import { syncGlobalAutoBoosterGain } from "../auto/sync-global-auto-booster-gain";
import { broadcastState } from "../state/broadcast-state";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";
import { shouldAutoRemainEnabled } from "../state/should-auto-remain-enabled";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function setGain(runtime: WorkerRuntimeState, tabId: number, gainPercent: number): Promise<void> {
  const nextGain = clampGainPercent(gainPercent);
  const autoScope = getAutoScopeForTab(runtime, tabId);

  if (runtime.manualSessions.has(tabId)) {
    const snapshot = await runtime.offscreenClient.setGain(tabId, nextGain);
    replaceManualSessions(runtime, snapshot);
  }

  if (autoScope === "global" && !runtime.manualSessions.has(tabId)) {
    await runtime.settingsRepository.setGlobalAutoGainPercent(nextGain);
    await syncGlobalAutoBoosterGain(runtime, nextGain);
  } else if (shouldAutoRemainEnabled(runtime, tabId)) {
    const targetTab = await chrome.tabs.get(tabId).catch(() => null);

    if (targetTab?.id && isSupportedTabUrl(targetTab.url)) {
      await activateAutoBoosterForTab(
        runtime,
        targetTab,
        autoScope ?? (runtime.autoBoosterMode === "global" ? "global" : "site"),
        nextGain
      );
    }
  }

  await broadcastState(runtime);
}
