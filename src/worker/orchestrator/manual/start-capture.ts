import { isProtectionBypassedSettings } from "../../../shared/audio-settings";
import { getDomainFromUrl, isSupportedTabUrl } from "../../../shared/domain";
import { clampGainPercent } from "../../../shared/gain";
import { message } from "../../../shared/messages";
import type { CaptureSessionState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { pauseAutoLaneForManual } from "../auto/pause-auto-lane-for-manual";
import { resumeAutoLaneIfNeeded } from "../auto/resume-auto-lane-if-needed";
import { resolveEffectiveBoostSettingsBundle } from "../session-boost/resolve-effective-boost-settings-bundle";
import { broadcastState } from "../state/broadcast-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function startCapture(runtime: WorkerRuntimeState, tabId: number, gainPercent: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId);

  if (!targetTab.id) {
    throw message("errorTabNoLongerExists");
  }

  if (!isSupportedTabUrl(targetTab.url)) {
    throw message("errorTabNotCapturable");
  }

  const domain = getDomainFromUrl(targetTab.url);
  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const resolvedBundle = resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, domain);
  const nextGain = clampGainPercent(gainPercent ?? resolvedBundle.gainPercent);
  const advancedAudioSettings = resolvedBundle.advancedAudioSettings;
  const provisionalSession: CaptureSessionState = {
    tabId,
    title: targetTab.title || targetTab.url || "",
    url: targetTab.url,
    domain,
    favIconUrl: targetTab.favIconUrl,
    gainPercent: nextGain,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "pending",
    engineStatus: "loading",
    level: 0,
    warning: "none",
    protectorActionDb: 0,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: isProtectionBypassedSettings(advancedAudioSettings),
    outputPeak: 0,
    normalizationInputLoudnessDb: null,
    normalizationAppliedGainDb: 0,
    normalizationOffsetScore: 0,
    normalizationAction: "holding",
    normalizationLoadPercent: 0,
    updatedAt: runtime.now()
  };

  runtime.manualSessions.set(tabId, provisionalSession);
  rebuildEffectiveSessions(runtime);
  await pauseAutoLaneForManual(runtime, tabId);
  await broadcastState(runtime);

  try {
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    const snapshot = await runtime.offscreenClient.startSession({
      tabId,
      streamId,
      gainPercent: nextGain,
      advancedAudioSettings,
      title: provisionalSession.title,
      url: provisionalSession.url,
      domain,
      favIconUrl: provisionalSession.favIconUrl
    });

    replaceManualSessions(runtime, snapshot);
    await broadcastState(runtime);
  } catch (error) {
    runtime.manualSessions.delete(tabId);
    rebuildEffectiveSessions(runtime);
    await resumeAutoLaneIfNeeded(runtime, tabId);
    await broadcastState(runtime);
    throw error;
  }
}
