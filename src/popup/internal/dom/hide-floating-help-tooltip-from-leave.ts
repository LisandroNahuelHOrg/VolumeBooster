import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { hideFloatingHelpTooltip } from "./hide-floating-help-tooltip";

export function hideFloatingHelpTooltipFromLeave(
  helpWrap: HTMLElement,
  relatedTarget: EventTarget | null,
  documentRef: Document,
  domRuntime: PopupDomRuntime
): void {
  if (relatedTarget instanceof Node && helpWrap.contains(relatedTarget)) {
    return;
  }

  if (domRuntime.activeHelpTooltipAnchor === helpWrap) {
    hideFloatingHelpTooltip(documentRef, domRuntime);
  }
}
