import { message } from "../../../shared/messages";
import type { LocalizedMessage } from "../../../shared/types";
import { validatePremiumLicenseActivation } from "../../../shared/premium-license";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncPremiumEntitlementRuntime } from "./sync-premium-entitlement-runtime";

export async function activatePremiumLicense(
  runtime: WorkerRuntimeState,
  email: string,
  licenseKey: string
): Promise<LocalizedMessage | null> {
  const validation = await validatePremiumLicenseActivation({ email, licenseKey });

  if (!validation.ok) {
    return message(validation.errorKey);
  }

  await runtime.settingsRepository.setPremiumLicenseActivation({
    email: validation.normalizedEmail,
    licenseKey: validation.normalizedLicenseKey
  });
  await syncPremiumEntitlementRuntime(runtime);
  return null;
}
