import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  createDefaultMetrics,
  isProtectionBypassedSettings
} from "../../../../shared/audio-settings";
import type { BridgeContextState, MainWorldController } from "../main-world-runtime-state";
import {
  LOW_SHELF_FREQUENCY_HZ,
  MAX_OUTPUT_GAIN_DB,
  MID_PEAK_FREQUENCY_HZ,
  MID_PEAK_Q,
  PROTECTION_DEPTH_ATTACK_FLOOR_SEC
} from "../main-world-runtime-state";
import { clampNumber } from "../math/clamp-number";
import { dbToGain } from "../math/db-to-gain";
import { createMainWorldSoftClipCurve } from "../graph/create-main-world-soft-clip-curve";

export function applyMainWorldRuntimeParameters(
  controller: MainWorldController,
  bridgeState: BridgeContextState
): void {
  if (!controller.state.enabled || !controller.state.advancedAudioSettings) {
    controller.applyBypassState(bridgeState);
    return;
  }

  const runtime = applyQualityProtector(
    buildDspRuntimeParameters(controller.state.gainPercent, controller.state.advancedAudioSettings)
  );

  bridgeState.preGain.gain.value = dbToGain(
    runtime.inputDriveDb + bridgeState.lastMetrics.normalizationAppliedGainDb
  );
  bridgeState.lowShelf.type = "lowshelf";
  bridgeState.lowShelf.frequency.value = LOW_SHELF_FREQUENCY_HZ;
  bridgeState.lowShelf.gain.value = runtime.toneLowBandGainDb + runtime.lowBandTrimDb + runtime.lowBandMakeupDb;
  bridgeState.midPeak.type = "peaking";
  bridgeState.midPeak.frequency.value = MID_PEAK_FREQUENCY_HZ;
  bridgeState.midPeak.Q.value = MID_PEAK_Q;
  bridgeState.midPeak.gain.value =
    runtime.toneMidBandGainDb + runtime.clarityPresenceTiltDb - runtime.midHighThresholdOffsetDb * 0.08;
  bridgeState.compressor.threshold.value = clampNumber(
    -32 - runtime.multibandDepth * 0.14 + runtime.lowBandThresholdOffsetDb,
    -60,
    -6
  );
  bridgeState.compressor.knee.value = clampNumber(18 - runtime.lowBandRatioBias * 8, 0, 30);
  bridgeState.compressor.ratio.value = clampNumber(
    1.8 + runtime.multibandDepth * 0.11 + runtime.lowBandRatioBias * 2.4,
    1,
    20
  );
  bridgeState.compressor.attack.value = clampNumber(
    Math.max(runtime.lookaheadMs / 1000, PROTECTION_DEPTH_ATTACK_FLOOR_SEC),
    PROTECTION_DEPTH_ATTACK_FLOOR_SEC,
    0.2
  );
  bridgeState.compressor.release.value = clampNumber(runtime.releaseMs / 1000, 0.06, 1.2);
  bridgeState.shaper.curve = createMainWorldSoftClipCurve(runtime.outputSoftClipMix) as any;
  bridgeState.wetGain.gain.value = controller.state.suspended ? 0 : dbToGain(Math.min(MAX_OUTPUT_GAIN_DB, runtime.outputCeilingDb));
  bridgeState.dryGain.gain.value = controller.state.suspended ? 1 : 0;
  bridgeState.lastMetrics = createDefaultMetrics(
    isProtectionBypassedSettings(controller.state.advancedAudioSettings)
  );
}
