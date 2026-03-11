import { getRuntimeUrlSafe } from "../runtime-api";
import { loadedWorkletModules } from "./loaded-worklet-modules";
import { MediaElementSessionError } from "./media-element-session-error";

export async function ensureMediaWorkletModule(
  audioContext: BaseAudioContext,
  modulePath: string
): Promise<void> {
  const loadedModules = loadedWorkletModules.get(audioContext) ?? new Set<string>();

  if (loadedModules.has(modulePath)) {
    return;
  }

  const moduleUrl = getRuntimeUrlSafe(modulePath);

  if (!moduleUrl) {
    throw new MediaElementSessionError("attach_failed", "Extension context invalidated.");
  }

  await audioContext.audioWorklet.addModule(moduleUrl);
  loadedModules.add(modulePath);
  loadedWorkletModules.set(audioContext, loadedModules);
}
