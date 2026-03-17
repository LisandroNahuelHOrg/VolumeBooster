import { getDomainFromUrl, isSupportedTabUrl } from "../../../shared/domain";
import { clampGainPercent } from "../../../shared/gain";
import { message } from "../../../shared/messages";
import type { AdvancedAudioSettings, AutoBoosterConfigPayload, AutoBoosterScope } from "../../../shared/types";
import type { AutoTabRuntimeState, WorkerRuntimeState } from "../runtime-state";
import { resolveRuntimeBoostSettingsBundle } from "../premium/resolve-runtime-boost-settings-bundle";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";
import { toErrorMessage } from "../state/to-error-message";
import { markAutoUnsupported } from "./mark-auto-unsupported";
import { shouldKeepAutoLaneInObservingMode } from "./should-keep-auto-lane-in-observing-mode";

export async function activateAutoBoosterForTab(
  runtime: WorkerRuntimeState,
  tab: chrome.tabs.Tab,
  scope: AutoBoosterScope,
  gainOverride?: number,
  settingsOverride?: AdvancedAudioSettings
): Promise<void> {
  if (!tab.id) {
    throw message("errorTabNoLongerExists");
  }

  if (!isSupportedTabUrl(tab.url)) {
    if (scope === "site") {
      throw message("errorTabNotCapturable");
    }

    markAutoUnsupported(runtime, tab, scope);
    return;
  }

  const domain = getDomainFromUrl(tab.url);
  const resolvedBundle = await resolveRuntimeBoostSettingsBundle(runtime, tab.url);
  const gainPercent =
    gainOverride !== undefined
      ? clampGainPercent(gainOverride)
      : clampGainPercent(resolvedBundle.gainPercent);
  const advancedAudioSettings = settingsOverride ?? resolvedBundle.advancedAudioSettings;
  const suspended = runtime.manualSessions.has(tab.id) || runtime.autoSuppressedTabs.has(tab.id);
  const state: AutoTabRuntimeState = {
    tabId: tab.id,
    title: tab.title || tab.url || "",
    url: tab.url,
    domain,
    favIconUrl: tab.favIconUrl,
    autoAttachState: "observing",
    autoAttachReason: "no_media",
    autoBoosterScope: scope,
    autoActiveStrategy: "none",
    gainPercent
  };

  if (scope === "site") {
    runtime.siteEnabledAutoTabs.add(tab.id);
  }

  runtime.autoFrameRegistry.resetToastStateForTab(tab.id);
  runtime.autoTabStates.set(tab.id, state);
  runtime.autoDebugStates.set(tab.id, {
    frameCount: runtime.autoFrameRegistry.getFrameStates(tab.id).length,
    readyFrameCount: runtime.autoFrameRegistry.getFrameStates(tab.id).filter((frame) => frame.ready).length,
    attachedFrameCount: runtime.autoFrameRegistry
      .getFrameStates(tab.id)
      .filter((frame) => frame.autoAttachState === "attached").length,
    toastVisible: false
  });
  rebuildEffectiveSessions(runtime);

  const payload: AutoBoosterConfigPayload = {
    tabId: tab.id,
    scope,
    enabled: true,
    suspended,
    gainPercent,
    advancedAudioSettings
  };

  try {
    const targetTabId = tab.id;
    const knownFrames = runtime.autoFrameRegistry.getKnownFrames(targetTabId);

    if (knownFrames.length === 0) {
      if (typeof runtime.autoBoosterClient.injectRegisteredScriptsIntoTab === "function") {
        await runtime.autoBoosterClient.injectRegisteredScriptsIntoTab(targetTabId);
      }
      await runtime.autoBoosterClient.configure(targetTabId, payload);
    } else {
      await Promise.allSettled(
        knownFrames.map((frame) =>
          runtime.autoBoosterClient.configure(targetTabId, payload, {
            frameId: frame.frameId,
            documentId: frame.documentId
          })
        )
      );
    }
  } catch (error) {
    const localizedError = toErrorMessage(error);
    runtime.autoSessions.delete(tab.id);
    const shouldObserveInsteadOfFail = shouldKeepAutoLaneInObservingMode(scope, localizedError);

    runtime.autoTabStates.set(tab.id, {
      ...state,
      autoAttachState: shouldObserveInsteadOfFail
        ? "observing"
        : localizedError.key === "errorAutoPermissionMissing"
          ? "unsupported"
          : "failed",
      autoAttachReason: shouldObserveInsteadOfFail
        ? "no_media"
        : localizedError.key === "errorAutoPermissionMissing"
          ? "permission_missing"
          : "attach_failed",
      lastError: localizedError
    });
    rebuildEffectiveSessions(runtime);

    if (scope === "site") {
      throw localizedError;
    }
  }
}
