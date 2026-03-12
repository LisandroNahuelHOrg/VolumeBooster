import {
  POPUP_LANE_TRANSITION_FROM,
  POPUP_LANE_TRANSITION_TO,
  POPUP_PREMIUM_EASING
} from "../../../shared/constants";
import { LANE_LAYOUT_TRANSITION_MS } from "../config/popup-runtime-config";
import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { shouldReduceMotion } from "./should-reduce-motion";

export function animateBoosterLaneTransition(
  laneGrid: HTMLElement,
  previousHeight: number,
  elements: HTMLElement[],
  domRuntime: PopupDomRuntime
): void {
  if (shouldReduceMotion()) {
    return;
  }

  const nextHeight = laneGrid.getBoundingClientRect().height;

  if (domRuntime.laneLayoutTransitionTimer !== null) {
    window.clearTimeout(domRuntime.laneLayoutTransitionTimer);
    domRuntime.laneLayoutTransitionTimer = null;
  }

  if (Math.abs(nextHeight - previousHeight) > 0.5) {
    laneGrid.style.transition = "none";
    laneGrid.style.height = `${previousHeight}px`;
    laneGrid.style.overflow = "clip";
    void laneGrid.offsetHeight;
    laneGrid.style.transition = `height ${LANE_LAYOUT_TRANSITION_MS}ms ${POPUP_PREMIUM_EASING}`;
    laneGrid.style.height = `${nextHeight}px`;
    domRuntime.laneLayoutTransitionTimer = window.setTimeout(() => {
      laneGrid.style.height = "";
      laneGrid.style.transition = "";
      laneGrid.style.overflow = "";
      domRuntime.laneLayoutTransitionTimer = null;
    }, LANE_LAYOUT_TRANSITION_MS + 40);
  }

  for (const element of elements) {
    element.animate(
      [
        { opacity: 0.82, transform: POPUP_LANE_TRANSITION_FROM, filter: "saturate(0.94)" },
        { opacity: 1, transform: POPUP_LANE_TRANSITION_TO, filter: "saturate(1)" }
      ],
      { duration: LANE_LAYOUT_TRANSITION_MS, easing: POPUP_PREMIUM_EASING }
    );
  }
}
