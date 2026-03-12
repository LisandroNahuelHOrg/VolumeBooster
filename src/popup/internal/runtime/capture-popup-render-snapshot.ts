import { getAppShellScrollTop } from "../dom/get-app-shell-scroll-top";
import { getFocusedAdvancedControlKey } from "../dom/get-focused-advanced-control-key";
import type { PopupRenderSnapshot, PopupRuntimeRefs } from "./popup-runtime-types";

export function capturePopupRenderSnapshot(
  refs: Pick<PopupRuntimeRefs, "document" | "rootElement">
): PopupRenderSnapshot {
  return {
    preservedFocusedAdvancedKey: getFocusedAdvancedControlKey(refs.document),
    preservedScrollTop: getAppShellScrollTop(refs.rootElement),
    shouldRestoreUiState: true
  };
}
