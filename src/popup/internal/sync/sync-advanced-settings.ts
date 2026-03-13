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

  for (const normalizationButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-volume-normalization]")) {
    normalizationButton.classList.toggle(
      "is-active",
      normalizationButton.dataset.volumeNormalization === advancedAudioSettings.volumeNormalizationMode
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

  const normalizationSlider = rootElement.querySelector<HTMLInputElement>("[data-role='normalization-slider']");
  const normalizationTargetValue = rootElement.querySelector<HTMLElement>("[data-role='normalization-target-value']");

  if (
    normalizationSlider &&
    Number(normalizationSlider.value) !== advancedAudioSettings.volumeNormalizationTargetPercent
  ) {
    normalizationSlider.value = String(advancedAudioSettings.volumeNormalizationTargetPercent);
  }

  if (normalizationSlider) {
    normalizationSlider
      .closest<HTMLElement>(".advanced-control")
      ?.style.setProperty(
        "--advanced-progress",
        `${((advancedAudioSettings.volumeNormalizationTargetPercent - 80) / 40) * 100}%`
      );
  }

  if (normalizationTargetValue) {
    normalizationTargetValue.textContent = `${Math.round(
      advancedAudioSettings.volumeNormalizationTargetPercent
    )}%`;
  }

  const modeValue = rootElement.querySelector<HTMLElement>("[data-role='quality-protector-mode-value']");
  const modeSubtitle = rootElement.querySelector<HTMLElement>("[data-role='quality-protector-subtitle']");
  const normalizationModeValue = rootElement.querySelector<HTMLElement>(
    "[data-role='volume-normalization-mode-value']"
  );
  const normalizationSubtitle = rootElement.querySelector<HTMLElement>(
    "[data-role='volume-normalization-subtitle']"
  );

  if (modeValue) {
    modeValue.textContent = model.renderModel.qualityProtectorModeLabel;
  }
  if (modeSubtitle) {
    modeSubtitle.textContent = model.renderModel.qualityProtectorSubtitle;
  }
  if (normalizationModeValue) {
    normalizationModeValue.textContent = model.renderModel.volumeNormalizationModeLabel;
  }
  if (normalizationSubtitle) {
    normalizationSubtitle.textContent = model.renderModel.volumeNormalizationSubtitle;
  }
}
