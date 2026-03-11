import { loadedWorkletModules } from "./loaded-worklet-modules";

export async function ensureWorkletModule(
  audioContext: BaseAudioContext,
  modulePath: string
): Promise<void> {
  const loadedModules = loadedWorkletModules.get(audioContext) ?? new Set<string>();

  if (loadedModules.has(modulePath)) {
    return;
  }

  await audioContext.audioWorklet.addModule(chrome.runtime.getURL(modulePath));
  loadedModules.add(modulePath);
  loadedWorkletModules.set(audioContext, loadedModules);
}
