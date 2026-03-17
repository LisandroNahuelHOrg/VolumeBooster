import { resolvePremiumFeatureAccess } from "../../../shared/premium-license";
import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupViewModel } from "../../../shared/types";
import { getLaneButtonCopy } from "../../lane-button-copy";
import { globalBoosterButtonAction } from "../status/global-booster-button-action";
import { isGlobalAutoEnabled } from "../status/is-global-auto-enabled";

export function createPremiumAccessRenderFields(
  viewModel: PopupViewModel,
  catalog: UiCatalog
) {
  const access = resolvePremiumFeatureAccess(viewModel.premiumEntitlement);

  return {
    ...access,
    globalLaneButtonCopy: access.globalAutoLocked
      ? {
          action: translate(catalog, "popupToolbarPremiumLabel"),
          mode: translate(catalog, "premiumFeatureLockedShort")
        }
      : getLaneButtonCopy("all-sites", isGlobalAutoEnabled(viewModel), catalog),
    globalAutoAction: access.globalAutoLocked
      ? "open-popup-premium"
      : globalBoosterButtonAction(viewModel)
  };
}
