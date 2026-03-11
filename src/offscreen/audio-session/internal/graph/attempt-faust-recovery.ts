import { handleAudioSessionFatalError } from "../lifecycle/handle-audio-session-fatal-error";
import { emitCurrentAudioSessionTelemetry } from "../telemetry/emit-current-audio-session-telemetry";
import type { AudioSessionState } from "../audio-session-state";
import { activateNativeFallbackGraph } from "./activate-native-fallback-graph";
import { applyAudioSessionRuntimeParameters } from "./apply-audio-session-runtime-parameters";
import { connectFaustGraph } from "./connect-faust-graph";
import { disconnectNativeFallbackGraph } from "./disconnect-native-fallback-graph";

export interface AudioSessionRecoveryDependencies {
  activateNativeFallbackGraph?: typeof activateNativeFallbackGraph;
  connectFaustGraph?: typeof connectFaustGraph;
}

export async function attemptFaustRecovery(
  state: AudioSessionState,
  dependencies: AudioSessionRecoveryDependencies = {}
): Promise<void> {
  if (
    state.engineStrategy !== "native_fallback" ||
    state.faustRecoveryInFlight ||
    !state.audioContext ||
    !state.inputAnalyserNode ||
    !state.outputAnalyserNode
  ) {
    return;
  }

  const connectFaustGraphImpl = dependencies.connectFaustGraph ?? connectFaustGraph;
  const activateNativeFallbackGraphImpl =
    dependencies.activateNativeFallbackGraph ?? activateNativeFallbackGraph;
  state.faustRecoveryInFlight = true;

  try {
    state.outputAnalyserNode.disconnect();
    state.inputAnalyserNode.disconnect();
    disconnectNativeFallbackGraph(state.fallbackGraph);
    state.fallbackGraph = null;
    await connectFaustGraphImpl(
      state,
      state.audioContext,
      state.inputAnalyserNode,
      state.outputAnalyserNode,
      state.currentAsset
    );
    state.engineStrategy = "faust";
    applyAudioSessionRuntimeParameters(state);
    emitCurrentAudioSessionTelemetry(state);
  } catch {
    try {
      activateNativeFallbackGraphImpl(
        state,
        state.audioContext,
        state.inputAnalyserNode,
        state.outputAnalyserNode
      );
      state.engineStrategy = "native_fallback";
      applyAudioSessionRuntimeParameters(state);
    } catch {
      handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" });
    }
  } finally {
    state.faustRecoveryInFlight = false;
  }
}
