import type { PopupRootPointerContext } from "../events/popup-root-event-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootPointerContext(
  params: PopupRootContextFactoryParams
): PopupRootPointerContext {
  return {
    popupGainPointerRuntime: params.state.popupGainPointerRuntime
  };
}
