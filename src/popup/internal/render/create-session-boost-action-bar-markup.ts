import { resolvePremiumFeatureAccess } from "../../../shared/premium-license";
import { translate } from "../../../shared/runtime-i18n";
import type { PopupViewModel } from "../../../shared/types";
import { renderSessionBoostActionBar } from "../../render-session-boost-action-bar";
import type { PopupRenderContext } from "./popup-render-types";
import { renderLaneButtonIcon } from "./render-lane-button-icon";
import { renderSiteFavicon } from "./render-site-favicon";

export function createSessionBoostActionBarMarkup(
  viewModel: PopupViewModel,
  renderContext: PopupRenderContext
): string {
  if (!renderContext.catalog || !viewModel.currentTab) {
    return "";
  }

  const access = resolvePremiumFeatureAccess(viewModel.premiumEntitlement);

  return renderSessionBoostActionBar({
    visible: false,
    siteApplyLabel: translate(renderContext.catalog, "sessionBoostApplySite"),
    allSitesApplyLabel: translate(
      renderContext.catalog,
      access.globalSessionBoostLocked
        ? "sessionBoostApplyAllSitesLocked"
        : "sessionBoostApplyAllSites"
    ),
    siteResetLabel: translate(renderContext.catalog, "sessionBoostResetSite"),
    allSitesResetLabel: translate(
      renderContext.catalog,
      access.globalSessionBoostLocked
        ? "sessionBoostResetAllSitesLocked"
        : "sessionBoostResetAllSites"
    ),
    dismissLabel: translate(renderContext.catalog, "sessionBoostDismiss"),
    siteIconMarkup: renderSiteFavicon(viewModel.currentTab.title, viewModel.currentTab.domain, "small"),
    allSitesIconMarkup: renderLaneButtonIcon("all-sites")
  });
}
