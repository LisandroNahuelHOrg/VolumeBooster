import { setText } from "../dom/set-text";
import type { PopupDynamicUiModel, PopupUiSyncRuntime } from "./popup-dynamic-ui-types";
import { shouldSyncVolumeNormalizationUi } from "./should-sync-volume-normalization-ui";

export function syncVolumeNormalizationTelemetry(
  rootElement: HTMLElement,
  model: PopupDynamicUiModel,
  syncRuntime: PopupUiSyncRuntime
): void {
  if (!shouldSyncVolumeNormalizationUi(model.normalizationTelemetryDisplayKey, syncRuntime)) {
    return;
  }

  setText(rootElement, "[data-role='normalization-offset-value']", model.renderModel.normalizationOffsetScore);
  setText(
    rootElement,
    "[data-role='normalization-correction-value']",
    model.renderModel.normalizationCorrection
  );
  setText(rootElement, "[data-role='normalization-action-value']", model.renderModel.normalizationAction);
  setText(rootElement, "[data-role='normalization-load-value']", model.renderModel.normalizationLoad);

  const thumb = rootElement.querySelector<HTMLElement>("[data-role='normalization-offset-thumb']");

  if (thumb) {
    thumb.style.left = `${model.renderModel.normalizationOffsetPositionPercent}%`;
  }
}
