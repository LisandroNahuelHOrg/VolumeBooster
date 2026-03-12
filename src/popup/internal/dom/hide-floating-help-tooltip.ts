import type { PopupDomRuntime } from "./popup-dom-runtime-types";

export function hideFloatingHelpTooltip(documentRef: Document, domRuntime: PopupDomRuntime): void {
  domRuntime.activeHelpTooltipAnchor = null;
  const tooltip = documentRef.querySelector<HTMLElement>(".floating-help-tooltip");

  if (!tooltip) {
    return;
  }

  tooltip.dataset.visible = "false";
}
