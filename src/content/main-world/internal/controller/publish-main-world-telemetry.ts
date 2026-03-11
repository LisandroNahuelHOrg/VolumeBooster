import {
  applyQualityProtector,
  buildDspRuntimeParameters,
  deriveMetricsFromPeaks,
  deriveWarningFromMetrics
} from "../../../../shared/audio-settings";
import { createBridgeTelemetryEvent, type BridgeRuntimeMetrics } from "../../../bridge-protocol";
import type { LevelWarning } from "../../../../shared/types";
import type { MainWorldController } from "../main-world-runtime-state";
import { pickHighestWarning } from "../math/pick-highest-warning";
import { roundTo } from "../math/round-to";
import { readMainWorldPeak } from "../telemetry/read-main-world-peak";

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

  for (const bridgeState of activeBridgeStates) {
    const runtime = applyQualityProtector(
      buildDspRuntimeParameters(controller.state.gainPercent, controller.state.advancedAudioSettings)
    );
    const inputPeak = readMainWorldPeak(bridgeState.inputAnalyser);
    const outputPeak = readMainWorldPeak(bridgeState.outputAnalyser);
    const metrics = deriveMetricsFromPeaks(runtime, inputPeak, outputPeak, bridgeState.lastMetrics);
    const warning = deriveWarningFromMetrics(metrics);
    const level = roundTo(Math.min(1, Math.max(outputPeak, inputPeak * 0.45)), 4);
    bridgeState.lastMetrics = metrics;
    highestLevel = Math.max(highestLevel, level);
    highestWarning = pickHighestWarning(highestWarning, warning);
    maxOutputPeak = Math.max(maxOutputPeak, outputPeak);
    maxClipPeak = Math.max(maxClipPeak, metrics.clipPeak);
    clipEvents += metrics.clipEvents;
    maxProtectorActionDb = Math.max(maxProtectorActionDb, metrics.protectorActionDb);
    protectionBypassed = protectionBypassed || metrics.protectionBypassed;
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
        outputPeak: roundTo(maxOutputPeak, 4)
      } satisfies BridgeRuntimeMetrics,
      audioContextCount: controller.bridgeStateList.length,
      attachedNodeCount: activeBridgeStates.reduce((sum, bridgeState) => sum + bridgeState.attachedNodes.size, 0),
      lastTelemetryAt: Date.now()
    })
  );
}
