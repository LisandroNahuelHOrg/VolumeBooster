import { formatLocalizedMessage, translate } from "../../../shared/runtime-i18n";
import type { PopupViewModel } from "../../../shared/types";
import type { PopupRenderContext } from "./popup-render-types";
import { escapeHtml } from "../util/escape-html";
import { renderPremiumStatusHeader } from "./render-premium-status-header";
import { resolvePremiumStatusHeaderCopy } from "./resolve-premium-status-header-copy";

export function renderPremiumView(
  renderContext: PopupRenderContext,
  viewModel: PopupViewModel
): string {
  if (!renderContext.catalog) {
    return "";
  }

  const transientErrorMessage = renderContext.transientError
    ? formatLocalizedMessage(renderContext.transientError)
    : "";
  const entitlement = viewModel.premiumEntitlement;
  const emailValue = renderContext.premiumEmailDraft || entitlement.email || "";
  const premiumStatusHeaderCopy = resolvePremiumStatusHeaderCopy(entitlement);
  const isLifetimeActive = premiumStatusHeaderCopy.isLifetimeActive;
  const hasInvalidStoredLicense = entitlement.storedLicenseStatus === "invalid";
  const storedLicenseStatusKey =
    entitlement.storedLicenseStatus === "valid"
      ? "popupPremiumStoredLicenseValid"
      : entitlement.storedLicenseStatus === "invalid"
        ? "popupPremiumStoredLicenseInvalid"
        : "popupPremiumStoredLicenseNone";
  const trialEndsText = entitlement.trialEndsAt
    ? new Date(entitlement.trialEndsAt).toLocaleDateString(renderContext.loadedLocale ?? undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "-";
  const trialDaysText =
    typeof entitlement.trialDaysRemaining === "number" ? String(entitlement.trialDaysRemaining) : "-";
  const invalidStoredLicenseNotice = hasInvalidStoredLicense
    ? `
        <section class="error-banner" data-role="error-banner">
          ${escapeHtml(translate(renderContext.catalog, "popupPremiumStoredLicenseInvalidNotice"))}
        </section>
      `
    : "";
  const clearButton = entitlement.hasStoredLicense
    ? `
        <button class="ghost-button ghost-button--soft" data-action="clear-premium-license" type="button">
          ${escapeHtml(translate(renderContext.catalog, "popupPremiumClearLabel"))}
        </button>
      `
    : "";
  const statusCardClassName = [
    "popup-settings-card",
    "popup-settings-card--appearance",
    "popup-premium-status-card",
    ...(isLifetimeActive ? ["popup-premium-status-card--lifetime"] : [])
  ].join(" ");

  return `
    <section class="panel panel--stack popup-premium-view">
      <header class="popup-premium-view__header">
        <button class="ghost-button ghost-button--soft popup-premium-view__back" data-action="close-popup-premium" type="button">
          ${escapeHtml(translate(renderContext.catalog, "popupPremiumBackLabel"))}
        </button>
        <div class="popup-premium-view__copy">
          <p class="panel__title">${escapeHtml(translate(renderContext.catalog, "popupPremiumEyebrow"))}</p>
          <h2 class="popup-premium-view__title">${escapeHtml(translate(renderContext.catalog, "popupPremiumTitle"))}</h2>
          <p class="muted-copy">${escapeHtml(translate(renderContext.catalog, "popupPremiumSubtitle"))}</p>
        </div>
      </header>
      <div class="popup-premium-view__grid">
        <article class="${statusCardClassName}">
          ${renderPremiumStatusHeader(renderContext.catalog, premiumStatusHeaderCopy)}
          ${invalidStoredLicenseNotice}
          <dl class="popup-settings-card__facts">
            <div>
              <dt>${escapeHtml(translate(renderContext.catalog, "popupPremiumStoredEmailLabel"))}</dt>
              <dd>${escapeHtml(entitlement.email || translate(renderContext.catalog, "popupPremiumStoredEmailEmpty"))}</dd>
            </div>
            <div>
              <dt>${escapeHtml(translate(renderContext.catalog, "popupPremiumSeatLabel"))}</dt>
              <dd>${escapeHtml(entitlement.seatIndex ? String(entitlement.seatIndex) : "-")}</dd>
            </div>
            <div>
              <dt>${escapeHtml(translate(renderContext.catalog, "popupPremiumStoredLicenseStatusLabel"))}</dt>
              <dd>${escapeHtml(translate(renderContext.catalog, storedLicenseStatusKey))}</dd>
            </div>
            <div>
              <dt>${escapeHtml(translate(renderContext.catalog, "popupPremiumStoredTrialEndsLabel"))}</dt>
              <dd>${escapeHtml(trialEndsText)}</dd>
            </div>
            <div>
              <dt>${escapeHtml(translate(renderContext.catalog, "popupPremiumStoredTrialDaysLabel"))}</dt>
              <dd>${escapeHtml(trialDaysText)}</dd>
            </div>
          </dl>
        </article>
        <article class="popup-settings-card popup-premium-view__activation">
          <div class="popup-settings-card__copy">
            <p class="panel__title">${escapeHtml(translate(renderContext.catalog, "popupPremiumActivationTitle"))}</p>
            <strong class="popup-settings-card__title">${escapeHtml(translate(renderContext.catalog, "popupPremiumActivationHeading"))}</strong>
            <p class="muted-copy">${escapeHtml(translate(renderContext.catalog, "popupPremiumActivationDetail"))}</p>
          </div>
          ${transientErrorMessage ? `<section class="error-banner" data-role="error-banner">${escapeHtml(transientErrorMessage)}</section>` : ""}
          <label class="popup-premium-view__field">
            <span>${escapeHtml(translate(renderContext.catalog, "popupPremiumEmailLabel"))}</span>
            <input
              class="popup-premium-view__input"
              data-role="premium-email"
              inputmode="email"
              placeholder="${escapeHtml(translate(renderContext.catalog, "popupPremiumEmailPlaceholder"))}"
              spellcheck="false"
              type="email"
              value="${escapeHtml(emailValue)}"
            />
          </label>
          <label class="popup-premium-view__field">
            <span>${escapeHtml(translate(renderContext.catalog, "popupPremiumLicenseLabel"))}</span>
            <textarea
              class="popup-premium-view__textarea"
              data-role="premium-license"
              placeholder="${escapeHtml(translate(renderContext.catalog, "popupPremiumLicensePlaceholder"))}"
              spellcheck="false"
            >${escapeHtml(renderContext.premiumLicenseDraft)}</textarea>
          </label>
          <div class="popup-premium-view__actions">
            <button class="ghost-button popup-premium-view__activate" data-action="activate-premium-license" type="button">
              ${escapeHtml(translate(renderContext.catalog, "popupPremiumActivateLabel"))}
            </button>
            ${clearButton}
          </div>
        </article>
      </div>
    </section>
  `;
}
