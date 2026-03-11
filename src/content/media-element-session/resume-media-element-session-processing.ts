import type { MediaElementSessionState } from "./media-element-session-state";

export async function resumeMediaElementSessionProcessing(state: MediaElementSessionState): Promise<boolean> {
  await state.audioContext.resume().catch(() => undefined);
  return state.audioContext.state === "running";
}
