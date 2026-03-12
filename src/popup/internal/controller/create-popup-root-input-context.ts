import type { PopupRootInputContext } from "../events/popup-root-event-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootInputContext(
  params: PopupRootContextFactoryParams
): PopupRootInputContext {
  return {
    commitContext: params.commitContext
  };
}
