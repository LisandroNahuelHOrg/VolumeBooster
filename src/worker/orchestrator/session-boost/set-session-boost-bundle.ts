import type { BoostSettingsBundle } from "../../../shared/boost-settings";
import { getDomainFromUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncSessionBoostAcrossRuntime } from "./sync-session-boost-across-runtime";

export async function setSessionBoostBundle(
  runtime: WorkerRuntimeState,
  tabId: number,
  bundle: BoostSettingsBundle
): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId).catch(() => null);
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const domain = getDomainFromUrl(targetTab?.url);

  if (domain && sessionBoostState.siteSessionBundles[domain]) {
    delete sessionBoostState.siteSessionBundles[domain];
  }

  sessionBoostState.globalDraftBundle = bundle;
  sessionBoostState.promptDismissed = false;
  await runtime.sessionBoostRepository.setState(sessionBoostState);
  await syncSessionBoostAcrossRuntime(runtime);
}
