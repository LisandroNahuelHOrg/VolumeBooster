import { resolvePremiumEntitlementState } from "../../../shared/premium-license";
import type { WorkerRuntimeState } from "../runtime-state";

export async function resolveWorkerPremiumEntitlement(
  runtime: WorkerRuntimeState
) {
  const trialRecord = await runtime.premiumTrialRepository.ensureTrialRecord(runtime.now());
  const premiumEntitlement = await resolvePremiumEntitlementState(
    await runtime.settingsRepository.getPremiumLicenseActivation(),
    trialRecord,
    runtime.now()
  );

  runtime.premiumTrialRecord = trialRecord;
  runtime.premiumEntitlement = premiumEntitlement;
  return premiumEntitlement;
}
