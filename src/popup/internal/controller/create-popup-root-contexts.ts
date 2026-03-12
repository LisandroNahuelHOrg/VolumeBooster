import type {
  PopupRootChangeContext,
  PopupRootClickContext,
  PopupRootInputContext,
  PopupRootPointerContext,
  PopupRootTooltipContext
} from "../events/popup-root-event-context";
import { createPopupRootChangeContext } from "./create-popup-root-change-context";
import { createPopupRootClickContext } from "./create-popup-root-click-context";
import { createPopupRootInputContext } from "./create-popup-root-input-context";
import { createPopupRootPointerContext } from "./create-popup-root-pointer-context";
import { createPopupRootTooltipContext } from "./create-popup-root-tooltip-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootContexts(
  params: PopupRootContextFactoryParams
): {
  rootChangeContext: PopupRootChangeContext;
  rootClickContext: PopupRootClickContext;
  rootInputContext: PopupRootInputContext;
  rootPointerContext: PopupRootPointerContext;
  rootTooltipContext: PopupRootTooltipContext;
} {
  return {
    rootChangeContext: createPopupRootChangeContext(params),
    rootClickContext: createPopupRootClickContext(params),
    rootInputContext: createPopupRootInputContext(params),
    rootPointerContext: createPopupRootPointerContext(params),
    rootTooltipContext: createPopupRootTooltipContext(params)
  };
}
