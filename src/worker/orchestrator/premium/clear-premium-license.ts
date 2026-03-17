import type { WorkerRuntimeState } from "../runtime-state";
import { syncPremiumEntitlementRuntime } from "./sync-premium-entitlement-runtime";

export async function clearPremiumLicense(runtime: WorkerRuntimeState): Promise<void> {
  await runtime.settingsRepository.clearPremiumLicenseActivation();
  await syncPremiumEntitlementRuntime(runtime);
}
