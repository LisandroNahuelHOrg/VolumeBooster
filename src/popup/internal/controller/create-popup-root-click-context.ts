import type { PopupRootClickContext } from "../events/popup-root-event-context";
import type { PopupRootContextFactoryParams } from "./popup-root-context-factory-params";

export function createPopupRootClickContext(
  params: PopupRootContextFactoryParams
): PopupRootClickContext {
  return {
    commandContext: params.commandContext,
    commitContext: params.commitContext
  };
}
