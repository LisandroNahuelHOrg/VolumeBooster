import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import {
  ADVANCED_CONTROL_CONFIG,
  type AdvancedControlKey
} from "../config/advanced-control-config";
import { formatAdvancedValue } from "../format/format-advanced-value";
import { getAdvancedSliderProgressPercent } from "../format/get-advanced-slider-progress-percent";
import { escapeHtml } from "../util/escape-html";
import { renderHelpTrigger } from "./render-help-trigger";

export function renderAdvancedControl(
  key: AdvancedControlKey,
  value: number,
  catalog: UiCatalog | null,
  disabled = false
): string {
  if (!catalog) {
    return "";
  }

  const config = ADVANCED_CONTROL_CONFIG[key];
  const inputId = `advanced-control-${key}`;
  const tooltipId = `advanced-control-tooltip-${key}`;

  return `
    <div class="advanced-control" style="--advanced-progress:${getAdvancedSliderProgressPercent(key, value)}%">
      <div class="advanced-control__meta">
        <label class="advanced-control__label-row" for="${inputId}">
          <span class="advanced-control__label-text">${escapeHtml(
            translate(catalog, config.labelKey as never)
          )}</span>
          ${renderHelpTrigger(config.helpLabelKey, config.helpTextKey, tooltipId, catalog)}
        </label>
        <strong data-role="advanced-value">${escapeHtml(formatAdvancedValue(key, value))}</strong>
      </div>
      <input
        id="${inputId}"
        class="advanced-control__slider"
        data-role="advanced-slider"
        data-advanced-key="${key}"
        type="range"
        min="${config.min}"
        max="${config.max}"
        step="${config.step}"
        value="${value}"
        ${disabled ? "disabled" : ""}
      />
    </div>
  `;
}
