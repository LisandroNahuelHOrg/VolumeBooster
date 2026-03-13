import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  deriveNormalizationMetrics,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics
} from "../../../../shared/audio-settings";
import { readAnalyserLoudnessDb } from "../../../../shared/audio-settings/internal/read-analyser-loudness-db";
import { createBridgeTelemetryEvent, type BridgeRuntimeMetrics } from "../../../bridge-protocol";
import type { LevelWarning } from "../../../../shared/types";
import type { MainWorldController } from "../main-world-runtime-state";
import { dbToGain } from "../math/db-to-gain";
import { pickHighestWarning } from "../math/pick-highest-warning";
import { roundTo } from "../math/round-to";
import { readMainWorldPeak } from "../telemetry/read-main-world-peak";

type NormalizationTelemetry = {
  normalizationInputLoudnessDb: number | null;
  normalizationAppliedGainDb: number;
  normalizationOffsetScore: number;
  normalizationAction: NonNullable<BridgeRuntimeMetrics["normalizationAction"]>;
  normalizationLoadPercent: number;
};

export function publishMainWorldTelemetry(controller: MainWorldController): void {
  if (!controller.state.enabled || controller.state.suspended || !controller.state.advancedAudioSettings) {
    return;
  }

  const activeBridgeStates = controller.bridgeStateList.filter((bridgeState) => bridgeState.attachedNodes.size > 0);

  if (activeBridgeStates.length === 0) {
    return;
  }

  let highestLevel = 0;
  let highestWarning: LevelWarning = "none";
  let maxOutputPeak = 0;
  let maxClipPeak = 0;
  let clipEvents = 0;
  let maxProtectorActionDb = 0;
  let protectionBypassed = false;
  let latestNormalizationMetrics: NormalizationTelemetry | null = null;

  for (const bridgeState of activeBridgeStates) {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(controller.state.gainPercent, controller.state.advancedAudioSettings)
    );
    const inputPeak = readMainWorldPeak(bridgeState.inputAnalyser);
    const outputPeak = readMainWorldPeak(bridgeState.outputAnalyser);
    const inputLoudnessDb = readAnalyserLoudnessDb(
      bridgeState.inputAnalyser,
      bridgeState.normalizationLoudnessState
    );
    const metrics = {
      ...deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, bridgeState.lastMetrics),
      ...deriveNormalizationMetrics(runtime, inputLoudnessDb, bridgeState.lastMetrics)
    };
    const warning = deriveWarningFromMetrics(metrics);
    const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);
    bridgeState.lastMetrics = metrics;
    bridgeState.preGain.gain.value = dbToGain(runtime.inputDriveDb + metrics.normalizationAppliedGainDb);
    highestLevel = Math.max(highestLevel, level);
    highestWarning = pickHighestWarning(highestWarning, warning);
    maxOutputPeak = Math.max(maxOutputPeak, outputPeak);
    maxClipPeak = Math.max(maxClipPeak, metrics.clipPeak);
    clipEvents += metrics.clipEvents;
    maxProtectorActionDb = Math.max(maxProtectorActionDb, metrics.protectorActionDb);
    protectionBypassed = protectionBypassed || metrics.protectionBypassed;
    if (
      latestNormalizationMetrics === null ||
      Math.abs(metrics.normalizationOffsetScore) >= Math.abs(latestNormalizationMetrics.normalizationOffsetScore)
    ) {
      latestNormalizationMetrics = {
        normalizationInputLoudnessDb: metrics.normalizationInputLoudnessDb,
        normalizationAppliedGainDb: metrics.normalizationAppliedGainDb,
        normalizationOffsetScore: metrics.normalizationOffsetScore,
        normalizationAction: metrics.normalizationAction,
        normalizationLoadPercent: metrics.normalizationLoadPercent
      };
    }
  }

  window.dispatchEvent(
    createBridgeTelemetryEvent({
      activeStrategy: "web_audio_bridge",
      level: roundTo(highestLevel, 4),
      warning: highestWarning,
      metrics: {
        protectorActionDb: roundTo(maxProtectorActionDb, 2),
        clipEvents,
        clipPeak: roundTo(maxClipPeak, 4),
        protectionBypassed,
        outputPeak: roundTo(maxOutputPeak, 4),
        normalizationInputLoudnessDb: latestNormalizationMetrics?.normalizationInputLoudnessDb ?? null,
        normalizationAppliedGainDb: latestNormalizationMetrics?.normalizationAppliedGainDb ?? 0,
        normalizationOffsetScore: latestNormalizationMetrics?.normalizationOffsetScore ?? 0,
        normalizationAction: latestNormalizationMetrics?.normalizationAction ?? "holding",
        normalizationLoadPercent: latestNormalizationMetrics?.normalizationLoadPercent ?? 0
      } satisfies BridgeRuntimeMetrics,
      audioContextCount: controller.bridgeStateList.length,
      attachedNodeCount: activeBridgeStates.reduce((sum, bridgeState) => sum + bridgeState.attachedNodes.size, 0),
      lastTelemetryAt: Date.now()
    })
  );
}
