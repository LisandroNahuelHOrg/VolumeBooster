import { escapeHtml } from "../util/escape-html";
import { renderLaneButtonIcon } from "./render-lane-button-icon";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderLaneActions(
  model: Pick<
    PopupMainViewRenderModel,
    | "currentTab"
    | "siteAutoEnabled"
    | "globalAutoEnabled"
    | "siteLaneButtonCopy"
    | "globalLaneButtonCopy"
    | "globalAutoAction"
  >
): string {
  return `
    <div class="booster-lane-actions">
      <button class="ghost-button ghost-button--lane ${model.siteAutoEnabled ? "is-active" : ""}" data-lane-kind="current-tab" data-role="toggle-site-auto" data-action="${model.siteAutoEnabled ? "disable-site-auto" : "enable-site-auto"}" ${model.currentTab?.supported ? "" : "disabled"} type="button">
        <span class="ghost-button--lane__play-indicator" aria-hidden="true"><span class="ghost-button--lane__play-icon"></span></span>
        <span class="ghost-button--lane__body">${renderLaneButtonIcon("current-tab")}<span class="ghost-button--lane__copy"><span class="ghost-button--lane__action" data-role="toggle-site-auto-action">${escapeHtml(model.siteLaneButtonCopy.action)}</span><span class="ghost-button--lane__mode" data-role="toggle-site-auto-mode">${escapeHtml(model.siteLaneButtonCopy.mode)}</span></span></span>
      </button>
      <button class="ghost-button ghost-button--lane ghost-button--lane-global ${model.globalAutoEnabled ? "is-active" : ""}" data-lane-kind="all-sites" data-role="toggle-global-auto" data-action="${model.globalAutoAction}" ${model.currentTab ? "" : "disabled"} type="button">
        <span class="ghost-button--lane__play-indicator" aria-hidden="true"><span class="ghost-button--lane__play-icon"></span></span>
        <span class="ghost-button--lane__body">${renderLaneButtonIcon("all-sites")}<span class="ghost-button--lane__copy"><span class="ghost-button--lane__action" data-role="toggle-global-auto-action">${escapeHtml(model.globalLaneButtonCopy.action)}</span><span class="ghost-button--lane__mode" data-role="toggle-global-auto-mode">${escapeHtml(model.globalLaneButtonCopy.mode)}</span></span></span>
      </button>
    </div>
  `;
}
