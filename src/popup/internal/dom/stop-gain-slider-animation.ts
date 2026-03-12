import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { setGainSliderAnimating } from "./set-gain-slider-animating";

export function stopGainSliderAnimation(rootElement: HTMLElement, domRuntime: PopupDomRuntime): void {
  if (domRuntime.gainSliderAnimationFrame !== null) {
    window.cancelAnimationFrame(domRuntime.gainSliderAnimationFrame);
    domRuntime.gainSliderAnimationFrame = null;
  }

  domRuntime.gainSliderAnimationTarget = null;
  setGainSliderAnimating(rootElement, false);
}
