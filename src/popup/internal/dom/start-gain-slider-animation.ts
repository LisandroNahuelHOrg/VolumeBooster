import { clampGainPercent } from "../../../shared/gain";
import { GAIN_PRESET_ANIMATION_MS } from "../config/popup-runtime-config";
import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { applyGainSliderVisuals } from "./apply-gain-slider-visuals";
import { easeInOutCubic } from "./ease-in-out-cubic";
import { setGainSliderAnimating } from "./set-gain-slider-animating";
import { stopGainSliderAnimation } from "./stop-gain-slider-animation";

export function startGainSliderAnimation(
  rootElement: HTMLElement,
  targetGainPercent: number,
  loadedLocale: string | null,
  domRuntime: PopupDomRuntime
): void {
  const slider = rootElement.querySelector<HTMLInputElement>("[data-role='gain-slider']");

  if (!slider) {
    return;
  }

  const nextTarget = clampGainPercent(targetGainPercent);
  const origin =
    domRuntime.gainSliderAnimationFrame !== null
      ? domRuntime.visualGainPercent
      : clampGainPercent(domRuntime.visualGainPercent);

  if (Math.abs(origin - nextTarget) < 0.5) {
    stopGainSliderAnimation(rootElement, domRuntime);
    domRuntime.visualGainPercent = nextTarget;
    applyGainSliderVisuals(rootElement, slider, domRuntime.visualGainPercent, loadedLocale);
    return;
  }

  stopGainSliderAnimation(rootElement, domRuntime);
  domRuntime.gainSliderAnimationTarget = nextTarget;
  setGainSliderAnimating(rootElement, true);
  const startedAt = performance.now();

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / GAIN_PRESET_ANIMATION_MS);
    const easedProgress = easeInOutCubic(progress);
    domRuntime.visualGainPercent = origin + (nextTarget - origin) * easedProgress;
    applyGainSliderVisuals(rootElement, slider, domRuntime.visualGainPercent, loadedLocale);

    if (progress < 1) {
      domRuntime.gainSliderAnimationFrame = window.requestAnimationFrame(tick);
      return;
    }

    domRuntime.gainSliderAnimationFrame = null;
    domRuntime.gainSliderAnimationTarget = null;
    domRuntime.visualGainPercent = nextTarget;
    applyGainSliderVisuals(rootElement, slider, domRuntime.visualGainPercent, loadedLocale);
    setGainSliderAnimating(rootElement, false);
  };

  domRuntime.gainSliderAnimationFrame = window.requestAnimationFrame(tick);
}
