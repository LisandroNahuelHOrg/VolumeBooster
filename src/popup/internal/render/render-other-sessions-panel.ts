import { translate } from "../../../shared/runtime-i18n";
import { sessionSummaryCopy } from "../copy/session-summary-copy";
import { escapeHtml } from "../util/escape-html";
import { renderSessionCard } from "./render-session-card";
import { renderSessionPlaceholderCard } from "./render-session-placeholder-card";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderOtherSessionsPanel(
  model: Pick<
    PopupMainViewRenderModel,
    "catalog" | "activeSessionsCount" | "currentTabId" | "sessionCarousel"
  >
): string {
  return `
    <section class="panel panel--stack">
      <div class="panel__header panel__header--sessions">
        <div class="section-intro"><p class="panel__title">${escapeHtml(translate(model.catalog, "otherSessionsTitle"))}</p><div class="session-section-summary"><span class="session-count-badge" data-role="other-session-count">${model.activeSessionsCount}</span><p class="section-summary" data-role="session-summary">${escapeHtml(sessionSummaryCopy(model.activeSessionsCount, model.catalog))}</p></div></div>
        <button class="ghost-button ghost-button--soft" data-action="stop-all" type="button" ${model.activeSessionsCount ? "" : "disabled"}>${escapeHtml(translate(model.catalog, "stopAll"))}</button>
      </div>
      <div class="session-carousel" data-role="other-sessions" data-offset="${model.sessionCarousel.offset}">
        <button class="session-carousel__nav session-carousel__nav--previous ${model.sessionCarousel.canScrollPrevious ? "" : "is-hidden"}" data-session-carousel-nav="previous" type="button" aria-label="${escapeHtml(translate(model.catalog, "sessionCarouselPrevious"))}" ${model.sessionCarousel.canScrollPrevious ? "" : "disabled"}><span aria-hidden="true">‹</span></button>
        <div class="session-carousel__viewport"><div class="session-carousel__track" data-role="session-carousel-track" style="--session-carousel-offset:${model.sessionCarousel.offset};">${model.sessionCarousel.items.map((item) => item.kind === "session" ? renderSessionCard(item.session, model.currentTabId, model.catalog) : renderSessionPlaceholderCard(item.placeholderIndex, model.catalog)).join("")}</div></div>
        <button class="session-carousel__nav session-carousel__nav--next ${model.sessionCarousel.canScrollNext ? "" : "is-hidden"}" data-session-carousel-nav="next" type="button" aria-label="${escapeHtml(translate(model.catalog, "sessionCarouselNext"))}" ${model.sessionCarousel.canScrollNext ? "" : "disabled"}><span aria-hidden="true">›</span></button>
      </div>
    </section>
  `;
}
