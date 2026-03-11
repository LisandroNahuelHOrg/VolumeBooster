import type { AutoManualFallbackRequestPayload } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveFrameTarget } from "../auto/resolve-frame-target";
import { deactivateGlobalAutoBooster } from "../auto/deactivate-global-auto-booster";
import { startCapture } from "../manual/start-capture";
import { toErrorMessage } from "../state/to-error-message";
import { hideFallbackToastForTab } from "./hide-fallback-toast-for-tab";
import { showFallbackToastForTab } from "./show-fallback-toast-for-tab";

export async function handleManualFallbackRequest(
  runtime: WorkerRuntimeState,
  payload: AutoManualFallbackRequestPayload,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  const tabId = sender?.tab?.id ?? payload.tabId;

  if (typeof tabId !== "number") {
    return;
  }

  const target = resolveFrameTarget(sender, payload);
  const gainPercent =
    runtime.autoSessions.get(tabId)?.gainPercent ??
    runtime.autoTabStates.get(tabId)?.gainPercent ??
    (await runtime.settingsRepository.getGlobalAutoGainPercent());

  await deactivateGlobalAutoBooster(runtime);

  try {
    await startCapture(runtime, tabId, gainPercent);
    await hideFallbackToastForTab(runtime, tabId, target);
  } catch (error) {
    await showFallbackToastForTab(runtime, tabId, target, payload.reason, toErrorMessage(error));
  }
}
