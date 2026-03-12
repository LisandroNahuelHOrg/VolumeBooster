import type { RuntimeResponse, WorkerState } from "../../../shared/types";
import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export interface PopupCommandContext {
  refs: PopupRuntimeRefs;
  state: PopupRuntimeState;
}

export interface PopupWorkerResponseContext extends PopupCommandContext {
  response: RuntimeResponse<WorkerState>;
}
