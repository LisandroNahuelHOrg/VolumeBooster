import type { MediaElementSessionState } from "./media-element-session-state";

export function isMediaElementSessionConnected(
  state: MediaElementSessionState,
  element: HTMLMediaElement
): boolean {
  return state.mediaElement === element;
}
