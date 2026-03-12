import { setText } from "../dom/set-text";
import type { PopupDynamicUiModel, PopupUiSyncRuntime } from "./popup-dynamic-ui-types";

export function syncLaneStatusCard(
  rootElement: HTMLElement,
  model: PopupDynamicUiModel,
  syncRuntime: PopupUiSyncRuntime
): HTMLElement[] {
  const laneStatusCard = rootElement.querySelector<HTMLElement>("[data-role='lane-status']");

  if (model.laneStatusDisplayKey === syncRuntime.lastLaneStatusDisplayKey) {
    return [];
  }

  if (laneStatusCard) {
    laneStatusCard.dataset.tone = model.renderModel.laneStatus.tone;
  }

  setText(rootElement, "[data-role='lane-status-badge']", model.renderModel.laneStatus.badge);
  setText(rootElement, "[data-role='lane-status-heading']", model.renderModel.laneStatus.title);
  setText(rootElement, "[data-role='lane-status-detail']", model.renderModel.laneStatus.detail);
  syncRuntime.lastLaneStatusDisplayKey = model.laneStatusDisplayKey;
  return laneStatusCard ? [laneStatusCard] : [];
}
