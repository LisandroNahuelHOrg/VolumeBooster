import type { AudioContextConstructor, MainWorldController } from "../main-world-runtime-state";

export function createPatchedAudioContext(
  controller: MainWorldController,
  Constructor: AudioContextConstructor
): AudioContextConstructor {
  class PatchedConstructor extends Constructor {
    constructor(...args: ConstructorParameters<AudioContextConstructor>) {
      super(...args);
      controller.registerContext(this as unknown as AudioContext);
    }
  }

  Object.defineProperty(PatchedConstructor, "name", {
    value: Constructor.name,
    configurable: true
  });
  Object.setPrototypeOf(PatchedConstructor, Constructor);

  return PatchedConstructor as AudioContextConstructor;
}
