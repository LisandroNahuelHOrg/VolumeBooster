import type { DspRuntimeParameters } from "../../../../shared/audio-settings";
import { clampNumber } from "../math/clamp-number";
import { createSoftClipCurve } from "../math/create-soft-clip-curve";
import { dbToGain } from "../math/db-to-gain";
import type { NativeFallbackGraph } from "../audio-session-state";
import {
  LOW_SHELF_FREQUENCY_HZ,
  MAX_OUTPUT_GAIN_DB,
  MID_PEAK_FREQUENCY_HZ,
  MID_PEAK_Q,
  PROTECTION_DEPTH_ATTACK_FLOOR_SEC
} from "./audio-session-graph-constants";

export function applyNativeFallbackRuntimeParameters(
  fallbackGraph: NativeFallbackGraph,
  runtime: DspRuntimeParameters,
  normalizationGainDb = 0
): void {
  fallbackGraph.preGain.gain.value = dbToGain(runtime.inputDriveDb + normalizationGainDb);
  fallbackGraph.lowShelf.type = "lowshelf";
  fallbackGraph.lowShelf.frequency.value = LOW_SHELF_FREQUENCY_HZ;
  fallbackGraph.lowShelf.gain.value =
    runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb;
  fallbackGraph.midPeak.type = "peaking";
  fallbackGraph.midPeak.frequency.value = MID_PEAK_FREQUENCY_HZ;
  fallbackGraph.midPeak.Q.value = MID_PEAK_Q;
  fallbackGraph.midPeak.gain.value =
    runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08;
  fallbackGraph.compressor.threshold.value = clampNumber(
    -32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb,
    -60,
    -6
  );
  fallbackGraph.compressor.knee.value = clampNumber(18 - runtime.lowBandRatioBias * 8, 0, 30);
  fallbackGraph.compressor.ratio.value = clampNumber(
    1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4,
    1,
    20
  );
  fallbackGraph.compressor.attack.value = clampNumber(
    Math.max(runtime.lookaheadMs / 1000, PROTECTION_DEPTH_ATTACK_FLOOR_SEC),
    PROTECTION_DEPTH_ATTACK_FLOOR_SEC,
    0.2
  );
  fallbackGraph.compressor.release.value = clampNumber(runtime.releaseMs / 1000, 0.06, 1.2);
  fallbackGraph.shaper.curve = createSoftClipCurve(runtime.outputSoftClipMix);
  fallbackGraph.wetGain.gain.value = dbToGain(Math.min(MAX_OUTPUT_GAIN_DB, runtime.outputCeilingDb));
  fallbackGraph.dryGain.gain.value = 0;
}
