import type { PopupRuntimeRefs } from "./popup-runtime-types";

export function syncPopupViewportHeight(refs: Pick<PopupRuntimeRefs, "document" | "window">): void {
  const viewportHeight = Math.max(1, Math.min(800, refs.window.innerHeight || 800));
  refs.document.documentElement.style.setProperty("--popup-viewport-height", `${viewportHeight}px`);
}
