import type { MainWorldController } from "../main-world-runtime-state";

export function patchMainWorldAudioNodePrototype(controller: MainWorldController): void {
  if (AudioNode.prototype.connect === controller.handlePatchedConnect) {
    return;
  }

  AudioNode.prototype.connect = controller.handlePatchedConnect;
  AudioNode.prototype.disconnect = controller.handlePatchedDisconnect;
}
