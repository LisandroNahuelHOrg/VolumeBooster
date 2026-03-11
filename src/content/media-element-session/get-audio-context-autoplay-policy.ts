import { getNavigatorAutoplayPolicy } from "./get-navigator-autoplay-policy";

export function getAudioContextAutoplayPolicy(audioContext: BaseAudioContext): string | undefined {
  return getNavigatorAutoplayPolicy(audioContext, "audiocontext");
}
