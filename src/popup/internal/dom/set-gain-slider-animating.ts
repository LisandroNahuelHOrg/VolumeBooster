export function setGainSliderAnimating(rootElement: HTMLElement, isAnimating: boolean): void {
  const sliderShell = rootElement.querySelector<HTMLElement>("[data-role='gain-slider-shell']");

  if (sliderShell) {
    sliderShell.dataset.animating = String(isAnimating);
  }
}
