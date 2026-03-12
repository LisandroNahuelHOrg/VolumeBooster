import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";
import { createPopupRootContexts } from "./create-popup-root-contexts";
import type { PopupCommandContext } from "../commands/popup-command-context";
import type { PopupCommitContext } from "../commits/popup-commit-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";
import { dispatchRootChange } from "../events/dispatch-root-change";
import { dispatchRootClick } from "../events/dispatch-root-click";
import { dispatchRootError } from "../events/dispatch-root-error";
import { dispatchRootInput } from "../events/dispatch-root-input";
import { dispatchRootPointerDown } from "../events/dispatch-root-pointer-down";
import { dispatchRootPointerMove } from "../events/dispatch-root-pointer-move";
import { dispatchRootTooltipLeave } from "../events/dispatch-root-tooltip-leave";
import { dispatchRootTooltipTrigger } from "../events/dispatch-root-tooltip-trigger";
import { dispatchRootTooltipViewportChange } from "../events/dispatch-root-tooltip-viewport-change";
import { popupRootChangeContextRegistry } from "../events/popup-root-change-context-registry";
import { popupRootClickContextRegistry } from "../events/popup-root-click-context-registry";
import { popupRootInputContextRegistry } from "../events/popup-root-input-context-registry";
import { popupRootPointerContextRegistry } from "../events/popup-root-pointer-context-registry";
import { popupRootTooltipContextRegistry } from "../events/popup-root-tooltip-context-registry";

export function bindPopupRootEvents(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  commandContext: PopupCommandContext,
  commitContext: PopupCommitContext
): void {
  if (state.rootEventsBound) {
    return;
  }

  const params: PopupRootContextFactoryParams = {
    commandContext,
    commitContext,
    refs,
    state
  };
  const contexts = createPopupRootContexts(params);
  popupRootClickContextRegistry.set(refs.rootElement, contexts.rootClickContext);
  popupRootChangeContextRegistry.set(refs.rootElement, contexts.rootChangeContext);
  popupRootInputContextRegistry.set(refs.rootElement, contexts.rootInputContext);
  popupRootPointerContextRegistry.set(refs.rootElement, contexts.rootPointerContext);
  popupRootTooltipContextRegistry.set(refs.rootElement, contexts.rootTooltipContext);
  popupRootTooltipContextRegistry.set(refs.window, contexts.rootTooltipContext);
  refs.rootElement.addEventListener("click", dispatchRootClick);
  refs.rootElement.addEventListener("pointerdown", dispatchRootPointerDown);
  refs.rootElement.addEventListener("pointermove", dispatchRootPointerMove);
  refs.rootElement.addEventListener("input", dispatchRootInput);
  refs.rootElement.addEventListener("change", dispatchRootChange);
  refs.rootElement.addEventListener("error", dispatchRootError, true);
  refs.rootElement.addEventListener("mouseover", dispatchRootTooltipTrigger);
  refs.rootElement.addEventListener("mouseout", dispatchRootTooltipLeave);
  refs.rootElement.addEventListener("focusin", dispatchRootTooltipTrigger);
  refs.rootElement.addEventListener("focusout", dispatchRootTooltipLeave);
  refs.rootElement.addEventListener("scroll", dispatchRootTooltipViewportChange, true);
  refs.window.addEventListener("resize", dispatchRootTooltipViewportChange);
  state.rootEventsBound = true;
}
