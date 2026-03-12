import { getQualityProtectorButtonCopy } from "../../quality-protector-copy";
import { QUALITY_PROTECTOR_VALUES } from "../config/popup-preset-values";
import { renderTelemetryPillLabel } from "./render-telemetry-pill-label";
import { escapeHtml } from "../util/escape-html";
import { translate } from "../../../shared/runtime-i18n";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderQualityProtectorSection(
  model: Pick<
    PopupMainViewRenderModel,
    | "catalog"
    | "controlsLocked"
    | "advancedAudioSettings"
    | "qualityProtectorModeLabel"
    | "qualityProtectorSubtitle"
    | "protectionAction"
    | "protectionBypassed"
    | "protectionLoad"
    | "clippingSafety"
    | "clippingSafetyAlert"
    | "clipEvents"
    | "clipEventsAlert"
    | "clipPeak"
    | "clipPeakAlert"
  >
): string {
  const telemetry = [
    ["protection-load-pill", "", "protectionLoadLabel", "protectionLoadHelpLabel", "protectionLoadHelpText", "protection-load-tooltip", model.protectionLoad],
    ["protection-action-pill", ` data-bypass="${model.protectionBypassed}"`, "protectionActionLabel", "protectionActionHelpLabel", "protectionActionHelpText", "protection-action-tooltip", model.protectionAction],
    ["clipping-safety-pill", ` data-alert="${model.clippingSafetyAlert}"`, "clippingSafetyLabel", "clippingSafetyHelpLabel", "clippingSafetyHelpText", "clipping-safety-tooltip", model.clippingSafety],
    ["clip-events-pill", ` data-alert="${model.clipEventsAlert}"`, "clipEventsLabel", "clipEventsHelpLabel", "clipEventsHelpText", "clip-events-tooltip", model.clipEvents],
    ["clip-peak-pill", ` data-alert="${model.clipPeakAlert}"`, "clipPeakLabel", "clipPeakHelpLabel", "clipPeakHelpText", "clip-peak-tooltip", model.clipPeak]
  ] as const;

  return `
    <section class="quality-protector">
      <div class="quality-protector__top"><div class="quality-protector__header"><div class="quality-protector__copy"><span class="slider-label">${escapeHtml(translate(model.catalog, "qualityProtectorTitle"))}</span><strong data-role="quality-protector-mode-value">${escapeHtml(model.qualityProtectorModeLabel)}</strong><p data-role="quality-protector-subtitle">${escapeHtml(model.qualityProtectorSubtitle)}</p></div></div></div>
      <div class="quality-protector__body">
        <div class="quality-protector__modes">
          ${QUALITY_PROTECTOR_VALUES.map((mode) => `<button class="ghost-button ghost-button--protector ${model.advancedAudioSettings.qualityProtectorMode === mode ? "is-active" : ""}" data-quality-protector="${mode}" type="button" ${model.controlsLocked ? "disabled" : ""}><span class="ghost-button__label ghost-button__label--compact">${escapeHtml(getQualityProtectorButtonCopy(mode, model.catalog))}</span></button>`).join("")}
        </div>
        <div class="telemetry-strip telemetry-strip--protector">
          ${telemetry.map(([role, extraAttrs, labelKey, helpLabelKey, helpTextKey, tooltipId, value]) => `<div class="telemetry-pill" data-role="${role}"${extraAttrs}>${renderTelemetryPillLabel(labelKey, helpLabelKey, helpTextKey, tooltipId, model.catalog)}<strong data-role="${role.replace("-pill", "-value")}">${escapeHtml(value)}</strong></div>`).join("")}
        </div>
      </div>
    </section>
  `;
}
