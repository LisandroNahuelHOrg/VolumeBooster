export function renderSessionBoostActionBar(options: {
  visible: boolean;
  siteApplyLabel: string;
  allSitesApplyLabel: string;
  siteResetLabel: string;
  allSitesResetLabel: string;
  dismissLabel: string;
  siteIconMarkup: string;
  allSitesIconMarkup: string;
}): string {
  return `
    <section class="session-boost-bar ${options.visible ? "is-visible" : ""}" data-role="session-boost-bar" aria-hidden="${options.visible ? "false" : "true"}">
      <div class="session-boost-bar__grid">
        <button class="session-boost-bar__button" data-action="apply-session-boost-to-site" type="button">
          <span class="session-boost-bar__icon" aria-hidden="true">${options.siteIconMarkup}</span>
          <span class="session-boost-bar__label">${options.siteApplyLabel}</span>
        </button>
        <button class="session-boost-bar__button" data-action="apply-session-boost-to-all-sites" type="button">
          <span class="session-boost-bar__icon" aria-hidden="true">${options.allSitesIconMarkup}</span>
          <span class="session-boost-bar__label">${options.allSitesApplyLabel}</span>
        </button>
        <button class="session-boost-bar__button" data-action="reset-session-boost-on-site" type="button">
          <span class="session-boost-bar__icon" aria-hidden="true">${options.siteIconMarkup}</span>
          <span class="session-boost-bar__label">${options.siteResetLabel}</span>
        </button>
        <button class="session-boost-bar__button" data-action="reset-session-boost-on-all-sites" type="button">
          <span class="session-boost-bar__icon" aria-hidden="true">${options.allSitesIconMarkup}</span>
          <span class="session-boost-bar__label">${options.allSitesResetLabel}</span>
        </button>
      </div>
      <button class="session-boost-bar__button session-boost-bar__button--dismiss" data-action="dismiss-session-boost-prompt" type="button">
        <span class="session-boost-bar__label">${options.dismissLabel}</span>
      </button>
    </section>
  `;
}
