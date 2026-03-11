import { handleAudioSessionFatalError } from "../lifecycle/handle-audio-session-fatal-error";
import { emitCurrentAudioSessionTelemetry } from "../telemetry/emit-current-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";
import { activateNativeFallbackGraph } from "./activate-native-fallback-graph";
import { applyAudioSessionRuntimeParameters } from "./apply-audio-session-runtime-parameters";

export function activateNativeFallbackFromFaust(state: AudioSessionState): void {
  if (
    state.engineStrategy === "native_fallback" ||
    !state.audioContext ||
    !state.inputAnalyserNode ||
    !state.outputAnalyserNode
  ) {
    return;
  }

  try {
    state.outputAnalyserNode.disconnect();
    state.faustNode?.disconnect();
    state.inputAnalyserNode.disconnect();
    state.sourceNode?.disconnect();
    state.sourceNode?.connect(state.inputAnalyserNode);
    activateNativeFallbackGraph(state, state.audioContext, state.inputAnalyserNode, state.outputAnalyserNode);
    state.engineStrategy = "native_fallback";
    applyAudioSessionRuntimeParameters(state);
    emitCurrentAudioSessionTelemetry(state);
  } catch {
    handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" });
  }
}
