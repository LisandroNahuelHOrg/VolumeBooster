import type { UiCatalog } from "../../../shared/runtime-i18n";
import { translate } from "../../../shared/runtime-i18n";
import type { PremiumStatusHeaderCopy } from "./premium-status-header-copy";
import { escapeHtml } from "../util/escape-html";

export function renderPremiumStatusHeader(
  catalog: UiCatalog,
  copy: PremiumStatusHeaderCopy
): string {
  const statusMarkup = copy.isLifetimeActive
    ? `
        <span class="popup-premium-status-badge popup-premium-status-badge--lifetime">
          <span class="popup-premium-status-badge__label">${escapeHtml(translate(catalog, copy.statusKey))}</span>
        </span>
      `
    : `<strong class="popup-settings-card__title">${escapeHtml(translate(catalog, copy.statusKey))}</strong>`;

  return `
    <div class="popup-settings-card__copy popup-premium-status-header">
      <p class="panel__title">${escapeHtml(translate(catalog, "popupPremiumStatusTitle"))}</p>
      ${statusMarkup}
      <p class="muted-copy">${escapeHtml(translate(catalog, copy.detailKey))}</p>
    </div>
  `;
}
