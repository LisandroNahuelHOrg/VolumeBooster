import type { PopupGainPointerRuntime } from "./popup-dom-runtime-types";

export function clearPendingGainTrackJump(pointerRuntime: PopupGainPointerRuntime): void {
  pointerRuntime.pendingGainTrackJumpAnimationAt = 0;
  pointerRuntime.pendingGainTrackJumpPointerId = null;
  pointerRuntime.pendingGainTrackJumpStartX = null;
  pointerRuntime.pendingGainTrackJumpMoved = false;
}
