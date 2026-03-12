import { GAIN_TRACK_DRAG_THRESHOLD_PX } from "../config/popup-runtime-config";
import type { PopupGainPointerRuntime } from "./popup-dom-runtime-types";

export function recordGainTrackPointerMove(
  pointerId: number,
  clientX: number,
  pointerRuntime: PopupGainPointerRuntime
): void {
  if (
    pointerRuntime.pendingGainTrackJumpPointerId !== pointerId ||
    pointerRuntime.pendingGainTrackJumpStartX === null ||
    pointerRuntime.pendingGainTrackJumpMoved
  ) {
    return;
  }

  if (Math.abs(clientX - pointerRuntime.pendingGainTrackJumpStartX) > GAIN_TRACK_DRAG_THRESHOLD_PX) {
    pointerRuntime.pendingGainTrackJumpMoved = true;
  }
}
