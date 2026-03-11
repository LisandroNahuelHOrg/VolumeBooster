import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { getDomainFromUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";
import type { AutoBoosterScope } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export function markAutoUnsupported(
  runtime: WorkerRuntimeState,
  tab: chrome.tabs.Tab,
  scope: AutoBoosterScope
): void {
  if (!tab.id) {
    return;
  }

  runtime.autoFrameRegistry.clearTab(tab.id);
  runtime.autoSessions.delete(tab.id);
  runtime.autoTabStates.set(tab.id, {
    tabId: tab.id,
    title: tab.title || tab.url || "",
    url: tab.url,
    domain: getDomainFromUrl(tab.url),
    favIconUrl: tab.favIconUrl,
    autoAttachState: "unsupported",
    autoAttachReason: "site_not_hookable",
    autoBoosterScope: scope,
    autoActiveStrategy: "none",
    gainPercent: DEFAULT_GAIN_PERCENT,
    lastError: message("errorAutoUnsupportedSite")
  });
  runtime.autoDebugStates.set(tab.id, {
    frameCount: 0,
    readyFrameCount: 0,
    attachedFrameCount: 0,
    toastVisible: false
  });
  rebuildEffectiveSessions(runtime);
}
