import type { MainWorldController } from "../main-world-runtime-state";

export function createHandlePatchedDisconnect(controller: MainWorldController): AudioNode["disconnect"] {
  return function patchedDisconnect(
    this: AudioNode,
    destinationNode?: AudioNode | AudioParam,
    output?: number,
    input?: number
  ): void {
    const bridgeState = controller.resolveBridgeStateForNode(this);

    if (bridgeState && !bridgeState.internalNodes.has(this)) {
      if (destinationNode instanceof AudioNode && destinationNode === bridgeState.context.destination) {
        controller.detachExternalNode(bridgeState, this);
        (controller.originalDisconnect as unknown as (
          destination: AudioNode,
          output?: number,
          input?: number
        ) => void).call(this, bridgeState.inputNode, output, input);
        controller.reportStatus();
        return;
      }

      if (destinationNode === undefined) {
        controller.detachExternalNode(bridgeState, this);
      }
    }

    (controller.originalDisconnect as unknown as (
      destination?: AudioNode | AudioParam,
      output?: number,
      input?: number
    ) => void).call(this, destinationNode, output, input);
    controller.reportStatus();
  };
}
