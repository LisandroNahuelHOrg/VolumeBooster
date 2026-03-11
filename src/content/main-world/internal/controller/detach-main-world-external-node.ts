import type { BridgeContextState, MainWorldController } from "../main-world-runtime-state";

export function detachMainWorldExternalNode(
  controller: MainWorldController,
  bridgeState: BridgeContextState,
  node: AudioNode
): void {
  bridgeState.attachedNodes.delete(node);
  const memberships = controller.nodeBridgeMembership.get(node);

  if (!memberships) {
    return;
  }

  memberships.delete(bridgeState.id);

  if (memberships.size === 0) {
    controller.nodeBridgeMembership.delete(node);
  }

  controller.syncTelemetryLoop();
  controller.reportStatus();
}
