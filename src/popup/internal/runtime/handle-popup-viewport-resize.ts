import { popupViewportResizeRegistry } from "./popup-viewport-resize-registry";
import { syncPopupViewportHeight } from "./sync-popup-viewport-height";

export function handlePopupViewportResize(event: Event): void {
  const target = event.currentTarget;

  if (!target) {
    return;
  }

  const refs = popupViewportResizeRegistry.get(target);

  if (refs) {
    syncPopupViewportHeight(refs);
  }
}
