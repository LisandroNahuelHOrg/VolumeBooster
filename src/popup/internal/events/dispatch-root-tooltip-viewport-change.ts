import { refreshFloatingHelpTooltip } from "../dom/refresh-floating-help-tooltip";
import { popupRootTooltipContextRegistry } from "./popup-root-tooltip-context-registry";

export function dispatchRootTooltipViewportChange(event: Event): void {
  const currentTarget = event.currentTarget;

  if (!currentTarget) {
    return;
  }

  const context = popupRootTooltipContextRegistry.get(currentTarget);

  if (context) {
    refreshFloatingHelpTooltip(context.document, context.popupDomRuntime);
  }
}
