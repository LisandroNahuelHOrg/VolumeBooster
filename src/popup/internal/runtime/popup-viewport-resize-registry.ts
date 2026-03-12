import type { PopupRuntimeRefs } from "./popup-runtime-types";

export const popupViewportResizeRegistry = new WeakMap<
  EventTarget,
  Pick<PopupRuntimeRefs, "document" | "window">
>();
