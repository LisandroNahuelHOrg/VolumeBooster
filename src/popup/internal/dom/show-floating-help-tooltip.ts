import type { PopupDomRuntime } from "./popup-dom-runtime-types";
import { positionFloatingHelpTooltip } from "./position-floating-help-tooltip";

export function showFloatingHelpTooltip(
  helpWrap: HTMLElement,
  documentRef: Document,
  domRuntime: PopupDomRuntime
): void {
  domRuntime.activeHelpTooltipAnchor = helpWrap;
  positionFloatingHelpTooltip(helpWrap, documentRef);
}
