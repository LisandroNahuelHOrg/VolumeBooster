import { getDomainFromUrl, isSupportedTabUrl } from "../../../shared/domain";
import type { OffscreenMetadataPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { activateAutoBoosterForTab } from "../auto/activate-auto-booster-for-tab";
import { markAutoUnsupported } from "../auto/mark-auto-unsupported";
import { resetNavigationScopedAutoState } from "../auto/reset-navigation-scoped-auto-state";
import { resolveRuntimeBoostSettingsBundle } from "../premium/resolve-runtime-boost-settings-bundle";
import { broadcastState } from "../state/broadcast-state";
import { replaceManualSessions } from "../manual/replace-manual-sessions";

export async function handleTabUpdated(
  runtime: WorkerRuntimeState,
  tabId: number,
  changeInfo: { status?: string; url?: string },
  tab: chrome.tabs.Tab
): Promise<void> {
  const didNavigate = Boolean(changeInfo.url) || changeInfo.status === "loading";

  if (didNavigate) {
    resetNavigationScopedAutoState(runtime, tabId);
  }

  if (runtime.manualSessions.has(tabId)) {
    const domain = getDomainFromUrl(tab.url);
    const runtimeBundle = await resolveRuntimeBoostSettingsBundle(runtime, tab.url);
    const payload: OffscreenMetadataPayload = {
      tabId,
      title: tab.title || tab.url || "",
      url: tab.url,
      domain,
      favIconUrl: tab.favIconUrl,
      advancedAudioSettings: runtimeBundle.advancedAudioSettings
    };

    const snapshot = await runtime.offscreenClient.updateMetadata(payload);
    replaceManualSessions(runtime, snapshot);
  }

  if (runtime.autoBoosterMode === "global") {
    if (!tab.id || !isSupportedTabUrl(tab.url)) {
      markAutoUnsupported(runtime, tab, "global");
    } else if (changeInfo.status === "complete" || changeInfo.url) {
      await activateAutoBoosterForTab(runtime, tab, "global");
    }
  }

  await broadcastState(runtime);
}
