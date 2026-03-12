import { buildTabSummary, getDomainFromUrl } from "../../../shared/domain";
import type { WorkerState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncFromOffscreen } from "../manual/sync-from-offscreen";
import { getSessionBoostPromptState } from "../session-boost/get-session-boost-prompt-state";
import { hasStoredSiteBoostSettings } from "../session-boost/has-stored-site-boost-settings";
import { resolveEffectiveBoostSettingsBundle } from "../session-boost/resolve-effective-boost-settings-bundle";

export async function getState(runtime: WorkerRuntimeState): Promise<WorkerState> {
  await syncFromOffscreen(runtime);
  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeDomain = getDomainFromUrl(activeTab?.url);
  const boostSettingsBundle = resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, activeDomain);
  const activeSession = activeTab?.id ? runtime.sessions.get(activeTab.id) : undefined;
  const autoTabState = activeTab?.id ? runtime.autoTabStates.get(activeTab.id) : undefined;
  const currentTab =
    activeTab?.id
      ? {
          ...buildTabSummary(
            activeTab,
            boostSettingsBundle.gainPercent,
            hasStoredSiteBoostSettings(settings, activeDomain)
          ),
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
        }
      : null;
  const hasGlobalPermission =
    typeof runtime.autoBoosterClient.hasGlobalPermission === "function"
      ? await runtime.autoBoosterClient.hasGlobalPermission()
      : false;

  return {
    currentTab,
    advancedAudioSettings: boostSettingsBundle.advancedAudioSettings,
    autoBoosterMode: runtime.autoBoosterMode,
    boostSettingsBundle,
    globalAutoGainPercent: settings.globalAutoGainPercent,
    hasGlobalPermission,
    sessionBoostPromptState: getSessionBoostPromptState(sessionBoostState),
    sessions: [...runtime.sessions.values()],
    generatedAt: runtime.now()
  };
}
