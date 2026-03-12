import { animateBoosterLaneTransition } from "../dom/animate-booster-lane-transition";
import type { PopupDomRuntime } from "../dom/popup-dom-runtime-types";
import type { PopupDynamicUiModel, PopupUiSyncRuntime } from "./popup-dynamic-ui-types";
import { syncAdvancedSettings } from "./sync-advanced-settings";
import { syncGainControl } from "./sync-gain-control";
import { syncLaneActions } from "./sync-lane-actions";
import { syncLaneStatusCard } from "./sync-lane-status-card";
import { syncLiveMeter } from "./sync-live-meter";
import { syncProtectorTelemetry } from "./sync-protector-telemetry";
import { syncSessionCards } from "./sync-session-cards";
import { syncSessionBoostBar } from "./sync-session-boost-bar";
import { syncSummaryStrip } from "./sync-summary-strip";

export function syncPopupDynamicUi(
  rootElement: HTMLElement,
  model: PopupDynamicUiModel,
  syncRuntime: PopupUiSyncRuntime,
  domRuntime: PopupDomRuntime,
  animateGainVisuals: boolean
): void {
  const laneGrid = rootElement.querySelector<HTMLElement>(".booster-lane-grid");
  const previousLaneGridHeight = laneGrid?.getBoundingClientRect().height ?? 0;
  const laneContentAnimations = [
    ...syncLaneStatusCard(rootElement, model, syncRuntime),
    ...syncLaneActions(rootElement, model)
  ];

  syncSummaryStrip(rootElement, model);
  syncGainControl(rootElement, model, animateGainVisuals, domRuntime);
  syncLiveMeter(rootElement, model);
  syncProtectorTelemetry(rootElement, model, syncRuntime);
  syncAdvancedSettings(rootElement, model);
  syncSessionCards(rootElement, model);
  syncSessionBoostBar(
    rootElement,
    model.sessionBoostVisible,
    model.sessionBoostAcknowledgedAction,
    syncRuntime,
    domRuntime
  );

  if (laneGrid && laneContentAnimations.length > 0) {
    animateBoosterLaneTransition(laneGrid, previousLaneGridHeight, laneContentAnimations, domRuntime);
  }
}
