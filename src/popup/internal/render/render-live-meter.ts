import { translate } from "../../../shared/runtime-i18n";
import { warningCopy } from "../copy/warning-copy";
import { escapeHtml } from "../util/escape-html";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderLiveMeter(
  model: Pick<PopupMainViewRenderModel, "catalog" | "levelPercent" | "currentWarning">
): string {
  return `
    <div class="meter">
      <div class="meter__meta"><span>${escapeHtml(translate(model.catalog, "levelLabel"))}</span><span data-role="meter-value">${model.levelPercent}%</span></div>
      <div class="meter__bar"><div class="meter__fill" data-role="meter-fill" style="width:${model.levelPercent}%"></div></div>
      <div class="meter__meta"><span>${escapeHtml(translate(model.catalog, "warningLabel"))}</span><span class="warning-pill" data-role="warning-pill" data-warning="${model.currentWarning}">${escapeHtml(warningCopy(model.currentWarning, model.catalog))}</span></div>
    </div>
  `;
}
