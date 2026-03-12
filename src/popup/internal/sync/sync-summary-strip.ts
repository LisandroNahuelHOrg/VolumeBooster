import { setText } from "../dom/set-text";
import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncSummaryStrip(rootElement: HTMLElement, model: PopupDynamicUiModel): void {
  setText(rootElement, "[data-role='meter-value']", model.meterValueText);
  setText(rootElement, "[data-role='other-session-count']", String(model.renderModel.activeSessionsCount));
  setText(rootElement, "[data-role='session-summary']", model.sessionSummaryText);
}
