import type { PopupDomRuntime } from "../dom/popup-dom-runtime-types";
import { syncGainSliderVisuals } from "../dom/sync-gain-slider-visuals";
import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncGainControl(
  rootElement: HTMLElement,
  model: PopupDynamicUiModel,
  animateVisuals: boolean,
  domRuntime: PopupDomRuntime
): void {
  const slider = rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");

  if (slider) {
    if (slider.value !== String(model.renderModel.draftGainPercent)) {
      slider.value = String(model.renderModel.draftGainPercent);
    }

    syncGainSliderVisuals(
      rootElement,
      slider,
      model.renderModel.draftGainPercent,
      model.renderModel.loadedLocale,
      animateVisuals,
      domRuntime
    );
  }

  for (const presetButton of rootElement.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    presetButton.classList.toggle(
      "is-active",
      Number(presetButton.dataset.preset) === model.renderModel.draftGainPercent
    );
  }
}
