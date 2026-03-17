import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { isSupportedTabUrl } from "../../../shared/domain";
import type { AutoBoosterConfigPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveRuntimeBoostSettingsBundle } from "../premium/resolve-runtime-boost-settings-bundle";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";

export async function pauseAutoLaneForManual(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const scope = getAutoScopeForTab(runtime, tabId);

  if (!scope) {
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => null);

  if (!tab?.id || !isSupportedTabUrl(tab.url)) {
    return;
  }

  const targetTabId = tab.id;
  const advancedAudioSettings = (
    await resolveRuntimeBoostSettingsBundle(runtime, tab.url)
  ).advancedAudioSettings;
  const gainPercent =
    runtime.autoSessions.get(tabId)?.gainPercent ??
    runtime.manualSessions.get(tabId)?.gainPercent ??
    DEFAULT_GAIN_PERCENT;
  const payload = {
    tabId: targetTabId,
    scope,
    enabled: true,
    suspended: true,
    gainPercent,
    advancedAudioSettings
  } satisfies AutoBoosterConfigPayload;
  const knownFrames = runtime.autoFrameRegistry.getKnownFrames(targetTabId);

  if (knownFrames.length === 0) {
    await runtime.autoBoosterClient.configure(targetTabId, payload);
    return;
  }

  await Promise.allSettled(
    knownFrames.map((frame) =>
      runtime.autoBoosterClient.configure(targetTabId, payload, {
        frameId: frame.frameId,
        documentId: frame.documentId
      })
    )
  );
}
