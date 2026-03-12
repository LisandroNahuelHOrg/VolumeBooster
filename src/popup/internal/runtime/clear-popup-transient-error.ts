import type { PopupRuntimeState } from "./popup-runtime-types";

export function clearPopupTransientError(
  state: Pick<PopupRuntimeState, "renderedSignature" | "transientError">
): void {
  if (!state.transientError) {
    return;
  }

  state.transientError = null;
  state.renderedSignature = "";
}
