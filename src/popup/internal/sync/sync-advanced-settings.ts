import { formatAdvancedValue } from "../format/format-advanced-value";
import { getAdvancedSliderProgressPercent } from "../format/get-advanced-slider-progress-percent";
import type { AdvancedControlKey } from "../config/advanced-control-config";
import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncAdvancedSettings(rootElement: HTMLElement, model: PopupDynamicUiModel): void {
  const advancedAudioSettings = model.renderModel.advancedAudioSettings;
  const advancedPresetValue = rootElement.querySelector<HTMLElement>("[data-role='advanced-preset-value']");
  const advancedPresetSubtitle = rootElement.querySelector<HTMLElement>("[data-role='advanced-preset-subtitle']");
  const advancedCustomBadge = rootElement.querySelector<HTMLElement>("[data-role='advanced-custom-badge']");

  if (advancedPresetValue) {
    advancedPresetValue.textContent = model.renderModel.qualityPresetLabel;
  }
  if (advancedPresetSubtitle) {
    advancedPresetSubtitle.textContent = model.renderModel.qualityPresetSubtitle;
  }
  if (advancedCustomBadge) {
    advancedCustomBadge.classList.toggle("is-active", advancedAudioSettings.qualityPreset === "custom");
  }

  for (const presetButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-advanced-preset]")) {
    presetButton.classList.toggle(
      "is-active",
      presetButton.dataset.advancedPreset === advancedAudioSettings.qualityPreset
    );
  }

  for (const qualityProtectorButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-quality-protector]")) {
    qualityProtectorButton.classList.toggle(
      "is-active",
      qualityProtectorButton.dataset.qualityProtector === advancedAudioSettings.qualityProtectorMode
    );
  }

  for (const controlInput of rootElement.querySelectorAll<HTMLInputElement>("[data-role='advanced-slider']")) {
    const key = controlInput.dataset.advancedKey as AdvancedControlKey | undefined;
    const controlCard = controlInput.closest<HTMLElement>(".advanced-control");
    const valueLabel = controlCard?.querySelector<HTMLElement>("[data-role='advanced-value']");

    if (!key) {
      continue;
    }

    const nextValue = advancedAudioSettings[key];

    if (Number.isFinite(nextValue) && Number(controlInput.value) !== nextValue) {
      controlInput.value = String(nextValue);
    }

    controlCard?.style.setProperty("--advanced-progress", `${getAdvancedSliderProgressPercent(key, nextValue)}%`);

    if (valueLabel) {
      valueLabel.textContent = formatAdvancedValue(key, nextValue);
    }
  }

  const modeValue = rootElement.querySelector<HTMLElement>("[data-role='quality-protector-mode-value']");
  const modeSubtitle = rootElement.querySelector<HTMLElement>("[data-role='quality-protector-subtitle']");

  if (modeValue) {
    modeValue.textContent = model.renderModel.qualityProtectorModeLabel;
  }
  if (modeSubtitle) {
    modeSubtitle.textContent = model.renderModel.qualityProtectorSubtitle;
  }
}
