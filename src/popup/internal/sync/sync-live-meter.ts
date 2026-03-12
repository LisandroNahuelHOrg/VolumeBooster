import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncLiveMeter(rootElement: HTMLElement, model: PopupDynamicUiModel): void {
  const meterFill = rootElement.querySelector<HTMLElement>("[data-role='meter-fill']");

  if (meterFill) {
    meterFill.style.width = `${model.renderModel.levelPercent}%`;
  }

  const warningPill = rootElement.querySelector<HTMLElement>("[data-role='warning-pill']");

  if (warningPill) {
    warningPill.dataset.warning = model.renderModel.currentWarning;
    warningPill.textContent = model.warningText;
  }
}
