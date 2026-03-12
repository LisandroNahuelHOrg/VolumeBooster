import { translate } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderLaneStatusCard(
  model: Pick<PopupMainViewRenderModel, "catalog" | "laneStatus">
): string {
  return `
    <section class="booster-lane-status" data-role="lane-status" data-tone="${model.laneStatus.tone}">
      <div class="booster-lane-status__meta">
        <span class="slider-label">${escapeHtml(translate(model.catalog, "laneStatusTitle"))}</span>
        <span class="booster-lane-status__badge" data-role="lane-status-badge">${escapeHtml(model.laneStatus.badge)}</span>
      </div>
      <strong data-role="lane-status-heading">${escapeHtml(model.laneStatus.title)}</strong>
      <p data-role="lane-status-detail">${escapeHtml(model.laneStatus.detail)}</p>
    </section>
  `;
}
