import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";

export function renderPremiumLockBanner(catalog: UiCatalog): string {
  return `
    <section class="premium-lock-banner" data-role="premium-lock-banner">
      <div class="premium-lock-banner__copy">
        <p class="premium-lock-banner__eyebrow">${escapeHtml(translate(catalog, "premiumFeatureLockedLabel"))}</p>
        <p class="premium-lock-banner__detail">${escapeHtml(translate(catalog, "premiumFeatureLockedDetail"))}</p>
      </div>
      <button class="ghost-button ghost-button--soft premium-lock-banner__button" data-action="open-popup-premium" type="button">
        ${escapeHtml(translate(catalog, "popupToolbarPremiumLabel"))}
      </button>
    </section>
  `;
}
