import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export interface PopupMessageListenerContext {
  refs: PopupRuntimeRefs;
  state: PopupRuntimeState;
}
