import { GAIN_TRACK_JUMP_WINDOW_MS } from "../config/popup-runtime-config";
import type { PopupGainPointerRuntime } from "./popup-dom-runtime-types";

export function shouldAnimateGainTrackJump(pointerRuntime: PopupGainPointerRuntime): boolean {
  return (
    pointerRuntime.pendingGainTrackJumpAnimationAt > 0 &&
    !pointerRuntime.pendingGainTrackJumpMoved &&
    performance.now() - pointerRuntime.pendingGainTrackJumpAnimationAt <= GAIN_TRACK_JUMP_WINDOW_MS
  );
}
