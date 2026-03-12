import type { PopupRootChangeContext } from "../events/popup-root-event-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootChangeContext(
  params: PopupRootContextFactoryParams
): PopupRootChangeContext {
  return {
    commitContext: params.commitContext
  };
}
