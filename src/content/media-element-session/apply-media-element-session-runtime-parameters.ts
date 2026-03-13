import {
  applyQualityProtector,
  buildDspRuntimeParameters
} from "../../shared/audio-settings";
import type { MediaElementSessionState } from "./media-element-session-state";

export function applyMediaElementSessionRuntimeParameters(state: MediaElementSessionState): void {
  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(state.currentGainPercent, state.currentSettings)
  );

  state.faustNode.setParamValue(state.asset.controlPaths.inputDriveDb, runtime.inputDriveDb);
  state.faustNode.setParamValue(
    state.asset.controlPaths.normalizationEnabled,
    runtime.normalization.enabled ? 1 : 0
  );
  state.faustNode.setParamValue(
    state.asset.controlPaths.normalizationGainDb,
    state.latestMetrics.normalizationAppliedGainDb
  );
  state.faustNode.setParamValue(state.asset.controlPaths.lookaheadMs, runtime.lookaheadMs);
  state.faustNode.setParamValue(state.asset.controlPaths.releaseMs, runtime.releaseMs);
  state.faustNode.setParamValue(state.asset.controlPaths.multibandDepth, runtime.multibandDepth);
  state.faustNode.setParamValue(state.asset.controlPaths.protectorEnabled, runtime.protectorEnabled ? 1 : 0);
  state.faustNode.setParamValue(state.asset.controlPaths.outputLimiterEnabled, runtime.outputLimiterEnabled ? 1 : 0);
  state.faustNode.setParamValue(state.asset.controlPaths.lowBandTrimDb, runtime.lowBandTrimDb);
  state.faustNode.setParamValue(state.asset.controlPaths.lowBandMakeupDb, runtime.lowBandMakeupDb);
  state.faustNode.setParamValue(state.asset.controlPaths.lowBandThresholdOffsetDb, runtime.lowBandThresholdOffsetDb);
  state.faustNode.setParamValue(state.asset.controlPaths.lowBandRatioBias, runtime.lowBandRatioBias);
  state.faustNode.setParamValue(state.asset.controlPaths.midHighThresholdOffsetDb, runtime.midHighThresholdOffsetDb);
  state.faustNode.setParamValue(state.asset.controlPaths.outputCeilingDb, runtime.outputCeilingDb);
  state.faustNode.setParamValue(state.asset.controlPaths.outputSoftClipMix, runtime.outputSoftClipMix);
  state.faustNode.setParamValue(state.asset.controlPaths.clarityPresenceTiltDb, runtime.clarityPresenceTiltDb);
  state.faustNode.setParamValue(state.asset.controlPaths.toneLowBandGainDb, runtime.toneLowBandGainDb);
  state.faustNode.setParamValue(state.asset.controlPaths.toneMidBandGainDb, runtime.toneMidBandGainDb);
}
