import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { hideFloatingHelpTooltip } from "./hide-floating-help-tooltip";
import { positionFloatingHelpTooltip } from "./position-floating-help-tooltip";

export function refreshFloatingHelpTooltip(documentRef: Document, domRuntime: PopupDomRuntime): void {
  if (domRuntime.tooltipRefreshFrame !== null) {
    window.cancelAnimationFrame(domRuntime.tooltipRefreshFrame);
  }

  domRuntime.tooltipRefreshFrame = window.requestAnimationFrame(() => {
    domRuntime.tooltipRefreshFrame = null;
    if (!domRuntime.activeHelpTooltipAnchor || !domRuntime.activeHelpTooltipAnchor.isConnected) {
      hideFloatingHelpTooltip(documentRef, domRuntime);
      return;
    }

    const anchorStillActive =
      domRuntime.activeHelpTooltipAnchor.matches(":hover") ||
      domRuntime.activeHelpTooltipAnchor.contains(documentRef.activeElement);

    if (!anchorStillActive) {
      hideFloatingHelpTooltip(documentRef, domRuntime);
      return;
    }

    positionFloatingHelpTooltip(domRuntime.activeHelpTooltipAnchor, documentRef);
  });
}
