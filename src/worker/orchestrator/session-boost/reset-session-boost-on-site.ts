import { createDefaultBoostSettingsBundle } from "../../../shared/boost-settings";
import { getDomainFromUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncSessionBoostAcrossRuntime } from "./sync-session-boost-across-runtime";

export async function resetSessionBoostOnSite(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId).catch(() => null);
  const domain = getDomainFromUrl(targetTab?.url);

  if (!domain) {
    throw message("errorRememberUnavailable");
  }

  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  await runtime.settingsRepository.removeDomainBoostSettingsBundle(domain);
  sessionBoostState.siteSessionBundles[domain] = createDefaultBoostSettingsBundle();
  sessionBoostState.promptDismissed = false;
  await runtime.sessionBoostRepository.setState(sessionBoostState);
  await syncSessionBoostAcrossRuntime(runtime);
}
