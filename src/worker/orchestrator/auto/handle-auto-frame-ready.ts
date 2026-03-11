import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import type { AutoBoosterFrameReadyPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";
import { toErrorMessage } from "../state/to-error-message";
import { createEmptyFrameRuntimeState } from "./create-empty-frame-runtime-state";
import { recomputeAutoTabAggregation } from "./recompute-auto-tab-aggregation";
import { resolveFrameTarget } from "./resolve-frame-target";
import { shouldKeepAutoFrameInObservingMode } from "./should-keep-auto-frame-in-observing-mode";

export async function handleAutoFrameReady(
  runtime: WorkerRuntimeState,
  payload: AutoBoosterFrameReadyPayload,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  const tabId = sender?.tab?.id ?? payload.tabId;

  if (typeof tabId !== "number") {
    return;
  }

  const target = resolveFrameTarget(sender, payload);
  runtime.autoFrameRegistry.upsertKnownFrame({
    tabId,
    frameId: target.frameId,
    documentId: target.documentId,
    isTopFrame: payload.isTopFrame ?? target.frameId === 0,
    frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
    ready: true
  });

  if (!runtime.autoFrameRegistry.getFrameState(tabId, target)) {
    runtime.autoFrameRegistry.updateFrameState({
      tabId,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: payload.isTopFrame ?? target.frameId === 0,
      frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
      title: payload.title,
      url: payload.url,
      domain: payload.domain,
      favIconUrl: payload.favIconUrl,
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      autoBoosterScope: getAutoScopeForTab(runtime, tabId),
      autoActiveStrategy: "none",
      gainPercent:
        runtime.autoTabStates.get(tabId)?.gainPercent ??
        (runtime.autoBoosterMode === "global"
          ? await runtime.settingsRepository.getGlobalAutoGainPercent()
          : DEFAULT_GAIN_PERCENT),
      ready: true,
      streamState: "inactive",
      engineStatus: "ready",
      level: 0,
      warning: "none",
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0
    });
    recomputeAutoTabAggregation(runtime, tabId);
  }

  const scope = getAutoScopeForTab(runtime, tabId);

  if (!scope || runtime.autoSuppressedTabs.has(tabId)) {
    return;
  }

  const advancedAudioSettings = await runtime.settingsRepository.getAdvancedAudioSettings();
  const gainPercent =
    runtime.autoTabStates.get(tabId)?.gainPercent ??
    (scope === "global"
      ? await runtime.settingsRepository.getGlobalAutoGainPercent()
      : DEFAULT_GAIN_PERCENT);

  try {
    await runtime.autoBoosterClient.configure(
      tabId,
      {
        tabId,
        scope,
        enabled: true,
        suspended: runtime.manualSessions.has(tabId) || runtime.autoSuppressedTabs.has(tabId),
        gainPercent,
        advancedAudioSettings
      },
      target
    );
  } catch (error) {
    const localizedError = toErrorMessage(error);
    const shouldObserveInsteadOfFail = shouldKeepAutoFrameInObservingMode(scope, localizedError);

    runtime.autoFrameRegistry.updateFrameState({
      ...(runtime.autoFrameRegistry.getFrameState(tabId, target) ??
        createEmptyFrameRuntimeState(tabId, target, {
          title: payload.title,
          url: payload.url,
          domain: payload.domain,
          favIconUrl: payload.favIconUrl,
          gainPercent,
          autoBoosterScope: scope,
          lastError: localizedError
        })),
      tabId,
      frameId: target.frameId,
      documentId: target.documentId,
      isTopFrame: payload.isTopFrame ?? target.frameId === 0,
      frameUrl: payload.frameUrl ?? sender?.url ?? payload.url,
      autoAttachState: shouldObserveInsteadOfFail ? "observing" : "failed",
      autoAttachReason: shouldObserveInsteadOfFail
        ? "no_media"
        : localizedError.key === "errorAutoPermissionMissing"
          ? "permission_missing"
          : "attach_failed",
      autoBoosterScope: scope,
      gainPercent,
      lastError: localizedError,
      ready: true
    });
    recomputeAutoTabAggregation(runtime, tabId);
  }
}
