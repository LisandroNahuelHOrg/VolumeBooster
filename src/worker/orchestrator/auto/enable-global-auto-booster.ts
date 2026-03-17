import { isSupportedTabUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { stopManualCapture } from "../manual/stop-manual-capture";
import { activateAutoBoosterForTab } from "./activate-auto-booster-for-tab";
import { disableAllSiteAutoTabs } from "./disable-all-site-auto-tabs";
import { registerGlobalContentScripts } from "./register-global-content-scripts";

export async function enableGlobalAutoBooster(
  runtime: WorkerRuntimeState,
  currentTabId: number,
  gainPercent: number
): Promise<void> {
  const granted =
    typeof runtime.autoBoosterClient.hasGlobalPermission === "function"
      ? await runtime.autoBoosterClient.hasGlobalPermission()
      : false;

  if (!granted) {
    throw message("errorAutoGlobalPermissionDenied");
  }

  await disableAllSiteAutoTabs(runtime);

  try {
    await registerGlobalContentScripts(runtime);
  } catch {
    // Registration can fail in restrictive environments; fallback to dynamic injection.
  }

  if (runtime.manualSessions.has(currentTabId)) {
    try {
      await stopManualCapture(runtime, currentTabId);
    } catch {
      // Keep global enable path alive even if manual capture teardown races.
    }
  }

  runtime.autoBoosterMode = await runtime.settingsRepository.setAutoBoosterMode("global");
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const hasUnsavedSessionBoostChanges =
    sessionBoostState.globalDraftBundle !== null || Object.keys(sessionBoostState.siteSessionBundles).length > 0;
  const globalGainPercent = hasUnsavedSessionBoostChanges
    ? undefined
    : await runtime.settingsRepository.setGlobalAutoGainPercent(gainPercent);
  runtime.autoSuppressedTabs.clear();

  let injectableTabs: chrome.tabs.Tab[] = [];
  try {
    injectableTabs = await runtime.autoBoosterClient.queryInjectableTabs();
  } catch {
    injectableTabs = [];
  }

  if (injectableTabs.length === 0) {
    const currentTab = await chrome.tabs.get(currentTabId).catch(() => null);
    if (currentTab?.id && isSupportedTabUrl(currentTab.url)) {
      injectableTabs = [currentTab];
    }
  }

  for (const tab of injectableTabs) {
    if (!tab.id || !isSupportedTabUrl(tab.url)) {
      continue;
    }

    try {
      await activateAutoBoosterForTab(runtime, tab, "global", globalGainPercent);
    } catch {
      // Keep global mode enabled even if one tab fails while configuring.
    }
  }
}
