import type { DspRuntimeParameters } from "../../../../shared/audio-settings";
import { dbToGain } from "../math/db-to-gain";
import type { AudioSessionState } from "../audio-session-state";

export function syncAudioSessionNormalizationGain(
  state: AudioSessionState,
  runtime: DspRuntimeParameters
): void {
  if (state.engineStrategy === "faust" && state.faustNode) {
    state.faustNode.setParamValue(
      state.currentAsset.controlPaths.normalizationGainDb,
      state.latestMetrics.normalizationAppliedGainDb
    );
    return;
  }

  if (state.fallbackGraph) {
    state.fallbackGraph.preGain.gain.value = dbToGain(
      runtime.inputDriveDb + state.latestMetrics.normalizationAppliedGainDb
    );
  }
}
