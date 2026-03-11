import type { MainWorldController } from "../main-world-runtime-state";

export function patchMainWorldConstructors(controller: MainWorldController): void {
  if (window.AudioContext !== controller.PatchedAudioContext) {
    window.AudioContext = controller.PatchedAudioContext;
  }

  if (controller.PatchedWebkitAudioContext && window.webkitAudioContext !== controller.PatchedWebkitAudioContext) {
    window.webkitAudioContext = controller.PatchedWebkitAudioContext;
  }
}
