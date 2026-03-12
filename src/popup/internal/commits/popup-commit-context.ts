import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export interface PopupCommitContext {
  refs: PopupRuntimeRefs;
  state: PopupRuntimeState;
}
