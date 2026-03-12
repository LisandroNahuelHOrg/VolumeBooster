import type { PopupRuntimeRefs } from "./popup-runtime-types";
import { handlePopupViewportResize } from "./handle-popup-viewport-resize";
import { popupViewportResizeRegistry } from "./popup-viewport-resize-registry";

export function bindPopupViewportResize(refs: PopupRuntimeRefs): void {
  popupViewportResizeRegistry.set(refs.window, refs);
  refs.window.addEventListener("resize", handlePopupViewportResize);
}
