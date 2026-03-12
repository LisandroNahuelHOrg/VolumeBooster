import type { PopupRootTooltipContext } from "../events/popup-root-event-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootTooltipContext(
  params: PopupRootContextFactoryParams
): PopupRootTooltipContext {
  return {
    document: params.refs.document,
    popupDomRuntime: params.state.popupDomRuntime
  };
}
