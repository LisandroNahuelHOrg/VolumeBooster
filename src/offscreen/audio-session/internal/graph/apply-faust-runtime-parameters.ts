import type { DspRuntimeParameters } from "../../../../shared/audio-settings";
import type { AudioSessionState } from "../audio-session-state";

export function applyFaustRuntimeParameters(
  state: AudioSessionState,
  runtime: DspRuntimeParameters
): void {
  if (!state.faustNode) {
    return;
  }

  state.faustNode.setParamValue(state.currentAsset.controlPaths.inputDriveDb, runtime.inputDriveDb);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.lookaheadMs, runtime.lookaheadMs);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.releaseMs, runtime.releaseMs);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.multibandDepth, runtime.multibandDepth);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.protectorEnabled, runtime.protectorEnabled ? 1 : 0);
  state.faustNode.setParamValue(
    state.currentAsset.controlPaths.outputLimiterEnabled,
    runtime.outputLimiterEnabled ? 1 : 0
  );
  state.faustNode.setParamValue(state.currentAsset.controlPaths.lowBandTrimDb, runtime.lowBandTrimDb);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.lowBandMakeupDb, runtime.lowBandMakeupDb);
  state.faustNode.setParamValue(
    state.currentAsset.controlPaths.lowBandThresholdOffsetDb,
    runtime.lowBandThresholdOffsetDb
  );
  state.faustNode.setParamValue(state.currentAsset.controlPaths.lowBandRatioBias, runtime.lowBandRatioBias);
  state.faustNode.setParamValue(
    state.currentAsset.controlPaths.midHighThresholdOffsetDb,
    runtime.midHighThresholdOffsetDb
  );
  state.faustNode.setParamValue(state.currentAsset.controlPaths.outputCeilingDb, runtime.outputCeilingDb);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.outputSoftClipMix, runtime.outputSoftClipMix);
  state.faustNode.setParamValue(
    state.currentAsset.controlPaths.clarityPresenceTiltDb,
    runtime.clarityPresenceTiltDb
  );
  state.faustNode.setParamValue(state.currentAsset.controlPaths.toneLowBandGainDb, runtime.toneLowBandGainDb);
  state.faustNode.setParamValue(state.currentAsset.controlPaths.toneMidBandGainDb, runtime.toneMidBandGainDb);
}
