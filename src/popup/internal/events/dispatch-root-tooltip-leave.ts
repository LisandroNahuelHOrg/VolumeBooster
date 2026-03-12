import { hideFloatingHelpTooltipFromLeave } from "../dom/hide-floating-help-tooltip-from-leave";
import { popupRootTooltipContextRegistry } from "./popup-root-tooltip-context-registry";

export function dispatchRootTooltipLeave(event: Event): void {
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
  const relatedTarget =
    event instanceof MouseEvent || event instanceof FocusEvent ? event.relatedTarget : null;

  if (helpWrap) {
    hideFloatingHelpTooltipFromLeave(
      helpWrap,
      relatedTarget,
      context.document,
      context.popupDomRuntime
    );
  }
}
