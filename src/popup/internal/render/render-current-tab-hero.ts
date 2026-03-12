import { translate } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import { renderSiteFavicon } from "./render-site-favicon";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderCurrentTabHero(
  model: Pick<PopupMainViewRenderModel, "catalog" | "currentTab">
): string {
  const currentTabTitle = model.currentTab?.title || translate(model.catalog, "tabUnavailable");

  return `
    <div class="panel__header panel__header--current">
      <div class="tab-hero">
        <span class="tab-hero__context">${escapeHtml(translate(model.catalog, "currentTabLabel"))}</span>
        ${renderSiteFavicon(currentTabTitle, model.currentTab?.domain, "large")}
        <div class="tab-hero__copy">
          <h2 class="tab-title">${escapeHtml(currentTabTitle)}</h2>
        </div>
      </div>
    </div>
  `;
}
