import type { DspRuntimeParameters } from "../../shared/audio-settings";
import type { MediaElementSessionState } from "./media-element-session-state";

export function syncMediaElementSessionNormalizationGain(
  state: MediaElementSessionState,
  runtime: DspRuntimeParameters
): void {
  state.faustNode.setParamValue(
    state.asset.controlPaths.normalizationGainDb,
    state.latestMetrics.normalizationAppliedGainDb
  );
  state.faustNode.setParamValue(
    state.asset.controlPaths.normalizationEnabled,
    runtime.normalization.enabled ? 1 : 0
  );
}
