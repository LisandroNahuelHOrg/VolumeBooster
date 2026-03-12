import { showFloatingHelpTooltip } from "../dom/show-floating-help-tooltip";
import { popupRootTooltipContextRegistry } from "./popup-root-tooltip-context-registry";

export function dispatchRootTooltipTrigger(event: Event): void {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof Element) || !currentTarget) {
    return;
  }

  const context = popupRootTooltipContextRegistry.get(currentTarget);

  if (!context) {
    return;
  }

  const helpWrap = target.closest<HTMLElement>(".telemetry-pill__help-wrap");

  if (helpWrap) {
    showFloatingHelpTooltip(helpWrap, context.document, context.popupDomRuntime);
  }
}
