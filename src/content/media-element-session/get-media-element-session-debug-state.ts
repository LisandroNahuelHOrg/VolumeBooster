import type { MediaElementSessionDebugState } from "./media-element-session-types";
import type { MediaElementSessionState } from "./media-element-session-state";
import { createMediaElementSessionDebugState } from "./create-media-element-session-debug-state";

export function getMediaElementSessionDebugState(
  state: MediaElementSessionState
): MediaElementSessionDebugState {
  return createMediaElementSessionDebugState(state.audioContext);
}
