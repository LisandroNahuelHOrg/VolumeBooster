import type { PremiumEntitlementState } from "./premium-license-types";

export const DEFAULT_PREMIUM_ENTITLEMENT_STATE: PremiumEntitlementState = {
  status: "inactive",
  source: "free",
  storedLicenseStatus: "none",
  plan: "free",
  isPremiumUnlocked: false,
  email: null,
  hasStoredLicense: false,
  seatIndex: null,
  trialStartedAt: null,
  trialEndsAt: null,
  trialDaysRemaining: null
};
