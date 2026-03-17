import { getQualityPresetCopy } from "../../quality-preset-copy";
import { ADVANCED_PRESET_VALUES } from "../config/popup-preset-values";
import { renderAdvancedControl } from "./render-advanced-control";
import { escapeHtml } from "../util/escape-html";
import { translate } from "../../../shared/runtime-i18n";
import type { PopupMainViewRenderModel } from "./popup-render-types";
import { renderPremiumLockBanner } from "./render-premium-lock-banner";

export function renderAdvancedSettingsSection(
  model: Pick<
    PopupMainViewRenderModel,
    | "catalog"
    | "controlsLocked"
    | "advancedSettingsLocked"
    | "advancedAudioSettings"
    | "qualityPresetLabel"
    | "qualityPresetSubtitle"
  >
): string {
  return `
    <section class="advanced-settings advanced-settings--expanded ${model.advancedSettingsLocked ? "is-premium-locked" : ""}" data-premium-locked="${model.advancedSettingsLocked}" data-role="advanced-settings">
      <div class="advanced-settings__summary advanced-settings__summary--static">
        <div class="advanced-settings__headline"><span class="advanced-settings__eyebrow">${escapeHtml(translate(model.catalog, "advancedTitle"))}</span><strong data-role="advanced-preset-value">${escapeHtml(model.qualityPresetLabel)}</strong><p data-role="advanced-preset-subtitle">${escapeHtml(model.qualityPresetSubtitle)}</p></div>
      </div>
      <div class="advanced-settings__body">
        ${model.advancedSettingsLocked ? renderPremiumLockBanner(model.catalog) : ""}
        <div class="advanced-presets">
          <span class="ghost-button ghost-button--soft advanced-custom-badge ${model.advancedAudioSettings.qualityPreset === "custom" ? "is-active" : ""}" data-role="advanced-custom-badge">${escapeHtml(getQualityPresetCopy("custom", model.catalog))}</span>
          ${ADVANCED_PRESET_VALUES.map((preset) => `<button class="ghost-button ghost-button--soft ${model.advancedAudioSettings.qualityPreset === preset ? "is-active" : ""}" data-advanced-preset="${preset}" type="button" ${model.controlsLocked ? "disabled" : ""}><span class="ghost-button__label ghost-button__label--compact">${escapeHtml(getQualityPresetCopy(preset, model.catalog))}</span></button>`).join("")}
        </div>
        <div class="advanced-control-grid">
          ${renderAdvancedControl("ceilingDb", model.advancedAudioSettings.ceilingDb, model.catalog, model.controlsLocked)}
          ${renderAdvancedControl("lookaheadMs", model.advancedAudioSettings.lookaheadMs, model.catalog, model.controlsLocked)}
          ${renderAdvancedControl("releaseMs", model.advancedAudioSettings.releaseMs, model.catalog, model.controlsLocked)}
          ${renderAdvancedControl("multibandDepth", model.advancedAudioSettings.multibandDepth, model.catalog, model.controlsLocked)}
          ${renderAdvancedControl("softClipMix", model.advancedAudioSettings.softClipMix, model.catalog, model.controlsLocked)}
        </div>
      </div>
    </section>
  `;
}
