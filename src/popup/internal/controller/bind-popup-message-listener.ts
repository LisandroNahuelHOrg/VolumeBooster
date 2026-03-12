import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";
import { handlePopupRuntimeMessage } from "./handle-popup-runtime-message";
import { popupMessageListenerContextRef } from "./popup-message-listener-context-ref";

export function bindPopupMessageListener(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState
): void {
  popupMessageListenerContextRef.current = { refs, state };
  chrome.runtime.onMessage.addListener(handlePopupRuntimeMessage);
}
