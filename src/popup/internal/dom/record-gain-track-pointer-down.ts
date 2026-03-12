import type { PopupGainPointerRuntime } from "./popup-dom-runtime-types";

export function recordGainTrackPointerDown(
  pointerId: number,
  clientX: number,
  pointerRuntime: PopupGainPointerRuntime
): void {
  pointerRuntime.pendingGainTrackJumpAnimationAt = performance.now();
  pointerRuntime.pendingGainTrackJumpPointerId = pointerId;
  pointerRuntime.pendingGainTrackJumpStartX = clientX;
  pointerRuntime.pendingGainTrackJumpMoved = false;
}
