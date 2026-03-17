import type { BoostSettingsBundle } from "../../../shared/boost-settings";
import { getDomainFromUrl } from "../../../shared/domain";
import { sanitizeBoostSettingsBundleForEntitlement } from "../../../shared/premium-license";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveWorkerPremiumEntitlement } from "../premium/resolve-worker-premium-entitlement";
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

  sessionBoostState.globalDraftBundle = sanitizeBoostSettingsBundleForEntitlement(
    bundle,
    await resolveWorkerPremiumEntitlement(runtime)
  );
  sessionBoostState.promptDismissed = false;
  await runtime.sessionBoostRepository.setState(sessionBoostState);
  await syncSessionBoostAcrossRuntime(runtime);
}
