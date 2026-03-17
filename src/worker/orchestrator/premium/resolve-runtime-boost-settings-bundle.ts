import { sanitizeBoostSettingsBundleForEntitlement } from "../../../shared/premium-license";
import { getDomainFromUrl } from "../../../shared/domain";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveEffectiveBoostSettingsBundle } from "../session-boost/resolve-effective-boost-settings-bundle";
import { resolveWorkerPremiumEntitlement } from "./resolve-worker-premium-entitlement";

export async function resolveRuntimeBoostSettingsBundle(
  runtime: WorkerRuntimeState,
  url?: string
) {
  const entitlement = await resolveWorkerPremiumEntitlement(runtime);
  const settings = await runtime.settingsRepository.getSettings();
  const sessionBoostState = await runtime.sessionBoostRepository.getState();

  return sanitizeBoostSettingsBundleForEntitlement(
    resolveEffectiveBoostSettingsBundle(
      settings,
      sessionBoostState,
      getDomainFromUrl(url)
    ),
    entitlement
  );
}
