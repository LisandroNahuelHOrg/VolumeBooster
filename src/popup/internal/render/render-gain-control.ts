import { translate } from "../../../shared/runtime-i18n";
import { PRESET_VALUES } from "../config/popup-preset-values";
import { buildPresetToneStyle } from "../format/build-preset-tone-style";
import { formatPresetValue } from "../format/format-preset-value";
import { getSliderProgressPercent } from "../format/get-slider-progress-percent";
import { escapeHtml } from "../util/escape-html";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderGainControl(
  model: Pick<
    PopupMainViewRenderModel,
    | "catalog"
    | "loadedLocale"
    | "draftGainPercent"
    | "controlsLocked"
  >
): string {
  return `
    <div class="slider-card__body">
      <div class="gain-control" data-role="gain-slider-shell" style="--slider-progress:${getSliderProgressPercent(model.draftGainPercent)}%;">
        <div class="gain-control__value-badge" data-role="slider-value">${formatPresetValue(model.draftGainPercent, model.loadedLocale)}%</div>
        <div class="gain-control__surface"><div class="gain-control__beam" aria-hidden="true"></div><div class="gain-control__lane" aria-hidden="true"><div class="gain-control__lane-fill"></div><div class="gain-control__thumb"><span class="gain-control__thumb-core"></span></div></div><input class="gain-slider" data-role="gain-slider" type="range" min="100" max="10000" step="5" value="${model.draftGainPercent}" ${model.controlsLocked ? "disabled" : ""} /></div>
        <div class="gain-slider-scale" aria-hidden="true"><span>${formatPresetValue(100, model.loadedLocale)}%</span><span>${formatPresetValue(10000, model.loadedLocale)}%</span></div>
      </div>
      <div class="preset-section">
        <div class="slider-label">${escapeHtml(translate(model.catalog, "presetsLabel"))}</div>
        <div class="presets">
          ${PRESET_VALUES.map((value) => `<button class="ghost-button ${value === model.draftGainPercent ? "is-active" : ""}" data-preset="${value}" style="${buildPresetToneStyle(value)}" type="button" ${model.controlsLocked ? "disabled" : ""}>${formatPresetValue(value, model.loadedLocale)}</button>`).join("")}
        </div>
      </div>
    </div>
  `;
}
