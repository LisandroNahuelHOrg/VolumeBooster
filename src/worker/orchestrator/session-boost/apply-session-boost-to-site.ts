import { getDomainFromUrl } from "../../../shared/domain";
import { message } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveEffectiveBoostSettingsBundle } from "./resolve-effective-boost-settings-bundle";
import { syncSessionBoostAcrossRuntime } from "./sync-session-boost-across-runtime";

export async function applySessionBoostToSite(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId).catch(() => null);
  const domain = getDomainFromUrl(targetTab?.url);

  if (!domain) {
    throw message("errorRememberUnavailable");
  }

  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();
  const bundle = resolveEffectiveBoostSettingsBundle(settings, sessionBoostState, domain);

  await runtime.settingsRepository.setDomainBoostSettingsBundle(domain, bundle);
  sessionBoostState.globalDraftBundle = null;
  delete sessionBoostState.siteSessionBundles[domain];
  await runtime.sessionBoostRepository.setState(sessionBoostState);
  await syncSessionBoostAcrossRuntime(runtime);
}
