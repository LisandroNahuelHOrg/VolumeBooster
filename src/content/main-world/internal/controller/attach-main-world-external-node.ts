import type { BridgeContextState, MainWorldController } from "../main-world-runtime-state";

export function attachMainWorldExternalNode(
  controller: MainWorldController,
  bridgeState: BridgeContextState,
  node: AudioNode
): void {
  bridgeState.attachedNodes.add(node);
  const memberships = controller.nodeBridgeMembership.get(node) ?? new Set<number>();
  memberships.add(bridgeState.id);
  controller.nodeBridgeMembership.set(node, memberships);
  controller.syncTelemetryLoop();
  controller.reportStatus();
}
