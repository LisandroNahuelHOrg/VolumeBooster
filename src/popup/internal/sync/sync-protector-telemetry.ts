import { setText } from "../dom/set-text";
import type { PopupDynamicUiModel, PopupUiSyncRuntime } from "./popup-dynamic-ui-types";
import { shouldSyncProtectorTelemetryUi } from "./should-sync-protector-telemetry-ui";

export function syncProtectorTelemetry(
  rootElement: HTMLElement,
  model: PopupDynamicUiModel,
  syncRuntime: PopupUiSyncRuntime
): void {
  if (!shouldSyncProtectorTelemetryUi(model.protectionTelemetryDisplayKey, syncRuntime)) {
    return;
  }

  setText(rootElement, "[data-role='protection-action-value']", model.renderModel.protectionAction);
  setText(rootElement, "[data-role='clip-events-value']", model.renderModel.clipEvents);
  setText(rootElement, "[data-role='clip-peak-value']", model.renderModel.clipPeak);
  setText(rootElement, "[data-role='protection-load-value']", model.renderModel.protectionLoad);
  setText(rootElement, "[data-role='clipping-safety-value']", model.renderModel.clippingSafety);

  const protectionActionPill = rootElement.querySelector<HTMLElement>("[data-role='protection-action-pill']");
  const clipEventsPill = rootElement.querySelector<HTMLElement>("[data-role='clip-events-pill']");
  const clipPeakPill = rootElement.querySelector<HTMLElement>("[data-role='clip-peak-pill']");
  const clippingSafetyPill = rootElement.querySelector<HTMLElement>("[data-role='clipping-safety-pill']");

  if (protectionActionPill) {
    protectionActionPill.dataset.bypass = String(model.renderModel.protectionBypassed);
  }
  if (clipEventsPill) {
    clipEventsPill.dataset.alert = model.renderModel.clipEventsAlert;
  }
  if (clipPeakPill) {
    clipPeakPill.dataset.alert = model.renderModel.clipPeakAlert;
  }
  if (clippingSafetyPill) {
    clippingSafetyPill.dataset.alert = model.renderModel.clippingSafetyAlert;
  }
}
