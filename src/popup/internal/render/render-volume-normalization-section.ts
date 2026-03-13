import { translate } from "../../../shared/runtime-i18n";
import { getVolumeNormalizationButtonCopy } from "../../volume-normalization-copy";
import { VOLUME_NORMALIZATION_VALUES } from "../config/popup-preset-values";
import { escapeHtml } from "../util/escape-html";
import { renderTelemetryPillLabel } from "./render-telemetry-pill-label";
import { renderNormalizationTargetControl } from "./render-normalization-target-control";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderVolumeNormalizationSection(
  model: Pick<
    PopupMainViewRenderModel,
    | "advancedAudioSettings"
    | "catalog"
    | "controlsLocked"
    | "normalizationAction"
    | "normalizationCorrection"
    | "normalizationLoad"
    | "normalizationOffsetPositionPercent"
    | "normalizationOffsetScore"
    | "volumeNormalizationModeLabel"
    | "volumeNormalizationSubtitle"
  >
): string {
  const telemetry = [
    [
      "normalization-correction-pill",
      "normalizationCorrectionLabel",
      "normalizationCorrectionHelpLabel",
      "normalizationCorrectionHelpText",
      "normalization-correction-tooltip",
      model.normalizationCorrection
    ],
    [
      "normalization-action-pill",
      "normalizationActionLabel",
      "normalizationActionHelpLabel",
      "normalizationActionHelpText",
      "normalization-action-tooltip",
      model.normalizationAction
    ],
    [
      "normalization-load-pill",
      "normalizationLoadLabel",
      "normalizationLoadHelpLabel",
      "normalizationLoadHelpText",
      "normalization-load-tooltip",
      model.normalizationLoad
    ]
  ] as const;

  return `
    <section class="advanced-settings advanced-settings--expanded volume-normalization" data-role="volume-normalization">
      <div class="advanced-settings__summary advanced-settings__summary--static">
        <div class="advanced-settings__headline">
          <span class="advanced-settings__eyebrow">${escapeHtml(translate(model.catalog, "volumeNormalizationTitle"))}</span>
          <strong data-role="volume-normalization-mode-value">${escapeHtml(model.volumeNormalizationModeLabel)}</strong>
          <p data-role="volume-normalization-subtitle">${escapeHtml(model.volumeNormalizationSubtitle)}</p>
        </div>
      </div>
      <div class="advanced-settings__body">
        <div class="volume-normalization__modes">
          ${VOLUME_NORMALIZATION_VALUES.map((mode) => `<button class="ghost-button ghost-button--soft ${model.advancedAudioSettings.volumeNormalizationMode === mode ? "is-active" : ""}" data-volume-normalization="${mode}" type="button" ${model.controlsLocked ? "disabled" : ""}><span class="ghost-button__label ghost-button__label--compact">${escapeHtml(getVolumeNormalizationButtonCopy(mode, model.catalog))}</span></button>`).join("")}
        </div>
        ${renderNormalizationTargetControl(
          model.advancedAudioSettings.volumeNormalizationTargetPercent,
          model.catalog,
          model.controlsLocked
        )}
        <div class="volume-normalization__meter">
          <div class="volume-normalization__meter-meta">
            <span class="slider-label">${escapeHtml(translate(model.catalog, "normalizationOffsetLabel"))}</span>
            <strong data-role="normalization-offset-value">${escapeHtml(model.normalizationOffsetScore)}</strong>
          </div>
          <div class="volume-normalization__meter-track">
            <span class="volume-normalization__meter-center" aria-hidden="true"></span>
            <span class="volume-normalization__meter-thumb" data-role="normalization-offset-thumb" style="left:${model.normalizationOffsetPositionPercent}%"></span>
          </div>
          <div class="volume-normalization__meter-scale"><span>-100</span><span>0</span><span>+100</span></div>
        </div>
        <div class="telemetry-strip volume-normalization__stats">
          ${telemetry.map(([role, labelKey, helpLabelKey, helpTextKey, tooltipId, value]) => `<div class="telemetry-pill" data-role="${role}">${renderTelemetryPillLabel(labelKey, helpLabelKey, helpTextKey, tooltipId, model.catalog)}<strong data-role="${role.replace("-pill", "-value")}">${escapeHtml(value)}</strong></div>`).join("")}
        </div>
      </div>
    </section>
  `;
}
