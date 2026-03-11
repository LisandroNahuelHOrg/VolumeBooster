import type { BridgeContextState, MainWorldController } from "../main-world-runtime-state";

export function resolveMainWorldBridgeStateForNode(
  controller: MainWorldController,
  node: AudioNode
): BridgeContextState | null {
  const context = node.context;

  if (!(context instanceof AudioContext)) {
    return null;
  }

  return controller.bridgeStates.get(context) ?? null;
}
