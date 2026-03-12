import { formatPresetValue } from "../format/format-preset-value";
import { getSliderProgressPercent } from "../format/get-slider-progress-percent";

export function applyGainSliderVisuals(
  rootElement: HTMLElement,
  slider: HTMLInputElement,
  gainPercent: number,
  loadedLocale: string | null
): void {
  const currentSlider = slider.isConnected
    ? slider
    : rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");
  const progress = `${getSliderProgressPercent(gainPercent)}%`;
  const sliderShell = rootElement.querySelector<HTMLElement>("[data-role='gain-slider-shell']");
  const sliderValue = rootElement.querySelector<HTMLElement>("[data-role='slider-value']");

  if (!currentSlider) {
    return;
  }

  currentSlider.style.setProperty("--slider-progress", progress);
  sliderShell?.style.setProperty("--slider-progress", progress);

  if (sliderValue) {
    sliderValue.textContent = `${formatPresetValue(Math.round(gainPercent), loadedLocale)}%`;
  }
}
