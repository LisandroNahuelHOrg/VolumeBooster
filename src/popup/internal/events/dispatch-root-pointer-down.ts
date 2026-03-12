import { clearPendingGainTrackJump } from "../dom/clear-pending-gain-track-jump";
import { recordGainTrackPointerDown } from "../dom/record-gain-track-pointer-down";
import { popupRootPointerContextRegistry } from "./popup-root-pointer-context-registry";

export function dispatchRootPointerDown(
  event: PointerEvent
): void {
  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!currentTarget) {
    return;
  }

  const context = popupRootPointerContextRegistry.get(currentTarget);

  if (!context) {
    return;
  }

  if (!(target instanceof HTMLInputElement) || target.dataset.role !== "gain-slider") {
    clearPendingGainTrackJump(context.popupGainPointerRuntime);
    return;
  }

  recordGainTrackPointerDown(event.pointerId, event.clientX, context.popupGainPointerRuntime);
}
