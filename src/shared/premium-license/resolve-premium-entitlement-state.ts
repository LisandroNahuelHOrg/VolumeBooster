import type {
  PersistedPremiumLicenseActivation,
  PremiumEntitlementState
} from "./premium-license-types";
import type { PersistedPremiumTrialRecord } from "../premium-trial";
import { calculatePremiumTrialDaysRemaining } from "./calculate-premium-trial-days-remaining";
import { validatePremiumLicenseActivation } from "./validate-premium-license-activation";

export async function resolvePremiumEntitlementState(
  activation: PersistedPremiumLicenseActivation | null,
  trialRecord: PersistedPremiumTrialRecord,
  nowMs: number
): Promise<PremiumEntitlementState> {
  const hasActiveTrial = nowMs < Date.parse(trialRecord.trialEndsAt);
  const trialDaysRemaining = calculatePremiumTrialDaysRemaining(trialRecord.trialEndsAt, nowMs);

  if (!activation) {
    return hasActiveTrial
      ? {
          status: "active",
          source: "trial",
          storedLicenseStatus: "none",
          plan: "trial",
          isPremiumUnlocked: true,
          email: null,
          hasStoredLicense: false,
          seatIndex: null,
          trialStartedAt: trialRecord.firstInstalledAt,
          trialEndsAt: trialRecord.trialEndsAt,
          trialDaysRemaining
        }
      : {
          status: "inactive",
          source: "free",
          storedLicenseStatus: "none",
          plan: "free",
          isPremiumUnlocked: false,
          email: null,
          hasStoredLicense: false,
          seatIndex: null,
          trialStartedAt: trialRecord.firstInstalledAt,
          trialEndsAt: trialRecord.trialEndsAt,
          trialDaysRemaining
        };
  }

  const result = await validatePremiumLicenseActivation(activation);

  if (!result.ok) {
    return hasActiveTrial
      ? {
          status: "active",
          source: "trial",
          storedLicenseStatus: "invalid",
          plan: "trial",
          isPremiumUnlocked: true,
          email: activation.email.trim() || null,
          hasStoredLicense: true,
          seatIndex: null,
          trialStartedAt: trialRecord.firstInstalledAt,
          trialEndsAt: trialRecord.trialEndsAt,
          trialDaysRemaining
        }
      : {
          status: "inactive",
          source: "free",
          storedLicenseStatus: "invalid",
          plan: "free",
          isPremiumUnlocked: false,
          email: activation.email.trim() || null,
          hasStoredLicense: true,
          seatIndex: null,
          trialStartedAt: trialRecord.firstInstalledAt,
          trialEndsAt: trialRecord.trialEndsAt,
          trialDaysRemaining
        };
  }

  return {
    status: "active",
    source: "license",
    storedLicenseStatus: "valid",
    plan: "lifetime",
    isPremiumUnlocked: true,
    email: result.normalizedEmail,
    hasStoredLicense: true,
    seatIndex: result.seatIndex,
    trialStartedAt: trialRecord.firstInstalledAt,
    trialEndsAt: trialRecord.trialEndsAt,
    trialDaysRemaining
  };
}
