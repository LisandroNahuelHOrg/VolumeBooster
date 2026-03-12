import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export interface PopupStatePollContext {
  refs: PopupRuntimeRefs;
  state: PopupRuntimeState;
}
