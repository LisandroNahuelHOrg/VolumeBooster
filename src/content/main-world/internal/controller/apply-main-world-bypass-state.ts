import { createDefaultMetrics } from "../../../../shared/audio-settings";
import type { BridgeContextState } from "../main-world-runtime-state";
import { PROTECTION_DEPTH_ATTACK_FLOOR_SEC } from "../main-world-runtime-state";
import { createMainWorldSoftClipCurve } from "../graph/create-main-world-soft-clip-curve";

export function applyMainWorldBypassState(bridgeState: BridgeContextState): void {
  bridgeState.preGain.gain.value = 1;
  bridgeState.lowShelf.gain.value = 0;
  bridgeState.midPeak.gain.value = 0;
  bridgeState.compressor.threshold.value = -3;
  bridgeState.compressor.knee.value = 0;
  bridgeState.compressor.ratio.value = 1;
  bridgeState.compressor.attack.value = PROTECTION_DEPTH_ATTACK_FLOOR_SEC;
  bridgeState.compressor.release.value = 0.06;
  bridgeState.shaper.curve = createMainWorldSoftClipCurve(0) as any;
  bridgeState.wetGain.gain.value = 0;
  bridgeState.dryGain.gain.value = 1;
  bridgeState.lastMetrics = createDefaultMetrics(true);
}
