import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import { renderHelpTrigger } from "./render-help-trigger";

export function renderNormalizationTargetControl(
  value: number,
  catalog: UiCatalog | null,
  disabled = false
): string {
  if (!catalog) {
    return "";
  }

  const inputId = "volume-normalization-target";
  const tooltipId = "volume-normalization-target-tooltip";
  const progressPercent = ((value - 80) / 40) * 100;

  return `
    <div class="advanced-control volume-normalization__target-control" style="--advanced-progress:${progressPercent}%">
      <div class="advanced-control__meta">
        <label class="advanced-control__label-row" for="${inputId}">
          <span class="advanced-control__label-text">${escapeHtml(translate(catalog, "volumeNormalizationTargetLabel"))}</span>
          ${renderHelpTrigger("volumeNormalizationTargetHelpLabel", "volumeNormalizationTargetHelpText", tooltipId, catalog)}
        </label>
        <strong data-role="normalization-target-value">${escapeHtml(`${Math.round(value)}%`)}</strong>
      </div>
      <input
        id="${inputId}"
        class="advanced-control__slider"
        data-role="normalization-slider"
        type="range"
        min="80"
        max="120"
        step="1"
        value="${value}"
        ${disabled ? "disabled" : ""}
      />
    </div>
  `;
}
