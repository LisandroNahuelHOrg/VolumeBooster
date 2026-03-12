import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { applyGainSliderVisuals } from "./apply-gain-slider-visuals";
import { shouldReduceMotion } from "./should-reduce-motion";
import { startGainSliderAnimation } from "./start-gain-slider-animation";
import { stopGainSliderAnimation } from "./stop-gain-slider-animation";

export function syncGainSliderVisuals(
  rootElement: HTMLElement,
  slider: HTMLInputElement,
  gainPercent: number,
  loadedLocale: string | null,
  animateVisuals: boolean,
  domRuntime: PopupDomRuntime
): void {
  if (animateVisuals && !shouldReduceMotion()) {
    startGainSliderAnimation(rootElement, gainPercent, loadedLocale, domRuntime);
    return;
  }

  if (domRuntime.gainSliderAnimationFrame !== null && domRuntime.gainSliderAnimationTarget === gainPercent) {
    applyGainSliderVisuals(rootElement, slider, domRuntime.visualGainPercent, loadedLocale);
    return;
  }

  stopGainSliderAnimation(rootElement, domRuntime);
  domRuntime.visualGainPercent = gainPercent;
  applyGainSliderVisuals(rootElement, slider, domRuntime.visualGainPercent, loadedLocale);
}
