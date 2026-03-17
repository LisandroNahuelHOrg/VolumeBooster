import type { PremiumEntitlementState } from "../../../shared/premium-license";
import type { PremiumStatusHeaderCopy } from "./premium-status-header-copy";

export function resolvePremiumStatusHeaderCopy(
  entitlement: PremiumEntitlementState
): PremiumStatusHeaderCopy {
  const isLifetimeActive = entitlement.status === "active" && entitlement.source === "license";

  return isLifetimeActive
    ? {
        statusKey: "popupPremiumStatusActive",
        detailKey: "popupPremiumStatusActiveDetail",
        isLifetimeActive: true
      }
    : entitlement.status === "active" && entitlement.source === "trial"
      ? {
          statusKey: "popupPremiumStatusTrial",
          detailKey: "popupPremiumStatusTrialDetail",
          isLifetimeActive: false
        }
      : entitlement.storedLicenseStatus === "invalid"
        ? {
            statusKey: "popupPremiumStatusInvalid",
            detailKey: "popupPremiumStatusInvalidDetail",
            isLifetimeActive: false
          }
        : {
            statusKey: "popupPremiumStatusExpired",
            detailKey: "popupPremiumStatusExpiredDetail",
            isLifetimeActive: false
          };
}
