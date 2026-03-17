import type { PremiumEntitlementState } from "./premium-license-types";
import type { PremiumFeatureAccess } from "./premium-feature-access-types";

export function resolvePremiumFeatureAccess(
  entitlement: PremiumEntitlementState
): PremiumFeatureAccess {
  const locked = !entitlement.isPremiumUnlocked;

  return {
    advancedSettingsLocked: locked,
    qualityProtectorLocked: locked,
    volumeNormalizationLocked: locked,
    globalAutoLocked: locked,
    globalSessionBoostLocked: locked
  };
}
