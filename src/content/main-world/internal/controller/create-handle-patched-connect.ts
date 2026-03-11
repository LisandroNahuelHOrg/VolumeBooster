import type { MainWorldController } from "../main-world-runtime-state";

export function createHandlePatchedConnect(controller: MainWorldController): AudioNode["connect"] {
  return function patchedConnect(
    this: AudioNode,
    destinationNode: AudioNode | AudioParam,
    output?: number,
    input?: number
  ): AudioNode {
    const bridgeState = controller.resolveBridgeStateForNode(this);

    if (
      bridgeState &&
      destinationNode instanceof AudioNode &&
      destinationNode === bridgeState.context.destination &&
      !bridgeState.internalNodes.has(this)
    ) {
      controller.attachExternalNode(bridgeState, this);
      return (controller.originalConnect as unknown as (
        destination: AudioNode,
        output?: number,
        input?: number
      ) => AudioNode).call(this, bridgeState.inputNode, output, input);
    }

    return (controller.originalConnect as unknown as (
      destination: AudioNode | AudioParam,
      output?: number,
      input?: number
    ) => AudioNode).call(this, destinationNode, output, input);
  };
}
