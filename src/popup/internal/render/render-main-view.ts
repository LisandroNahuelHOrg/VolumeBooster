import { escapeHtml } from "../util/escape-html";
import { renderAdvancedSettingsSection } from "./render-advanced-settings-section";
import { renderCurrentTabHero } from "./render-current-tab-hero";
import { renderGainControl } from "./render-gain-control";
import { renderLaneActions } from "./render-lane-actions";
import { renderLaneStatusCard } from "./render-lane-status-card";
import { renderLiveMeter } from "./render-live-meter";
import { renderOtherSessionsPanel } from "./render-other-sessions-panel";
import { renderQualityProtectorSection } from "./render-quality-protector-section";
import { renderUnsupportedBanner } from "./render-unsupported-banner";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderMainView(model: PopupMainViewRenderModel): string {
  return `
    ${model.transientErrorMessage ? `<section class="error-banner" data-role="error-banner">${escapeHtml(model.transientErrorMessage)}</section>` : ""}
    <section class="panel panel--stack panel--current-tab">
      ${renderCurrentTabHero(model)}
      ${renderUnsupportedBanner(model)}
      <div class="booster-controls-stage" data-state="${model.controlsLocked ? "locked" : "live"}">
        <div class="slider-card">
          <div class="booster-lane-grid">${renderLaneStatusCard(model)}${renderLaneActions(model)}</div>
          ${renderGainControl(model)}
          ${renderLiveMeter(model)}
        </div>
        <div class="signal-controls-grid signal-controls-grid--standalone">
          ${renderQualityProtectorSection(model)}
          ${renderAdvancedSettingsSection(model)}
        </div>
        ${model.controlsLocked ? '<div class="booster-controls-stage__overlay" aria-hidden="true"></div>' : ""}
      </div>
    </section>
    ${renderOtherSessionsPanel(model)}
  `;
}
