import { createAudioSessionState } from "./create-audio-session-state";
import { activateNativeFallbackFromFaust } from "./graph/activate-native-fallback-from-faust";
import { applyAudioSessionRuntimeParameters } from "./graph/apply-audio-session-runtime-parameters";
import { applyFaustRuntimeParameters } from "./graph/apply-faust-runtime-parameters";
import { applyNativeFallbackRuntimeParameters } from "./graph/apply-native-fallback-runtime-parameters";
import { attemptFaustRecovery } from "./graph/attempt-faust-recovery";
import { cancelFaustRecovery } from "./graph/cancel-faust-recovery";
import { createNativeFallbackGraph } from "./graph/create-native-fallback-graph";
import { disconnectNativeFallbackGraph } from "./graph/disconnect-native-fallback-graph";
import { scheduleFaustRecovery } from "./graph/schedule-faust-recovery";
import { clampNumber } from "./math/clamp-number";
import { createSoftClipCurve } from "./math/create-soft-clip-curve";
import { dbToGain } from "./math/db-to-gain";
import { getFaustSampleSize } from "./math/get-faust-sample-size";
import { roundTo } from "./math/round-to";
import { handleAudioSessionFatalError } from "./lifecycle/handle-audio-session-fatal-error";
import { startAudioSession } from "./lifecycle/start-audio-session";
import { stopAudioSession } from "./lifecycle/stop-audio-session";
import { emitCurrentAudioSessionTelemetry } from "./telemetry/emit-current-audio-session-telemetry";
import { createAnalyser } from "./telemetry/create-analyser";
import { readPeak } from "./telemetry/read-peak";
import { startAudioSessionMeter } from "./telemetry/start-audio-session-meter";
import { ensureWorkletModule } from "./worklet/ensure-worklet-module";

export const audioSessionTestables = {
  activateNativeFallbackFromFaust,
  applyAudioSessionRuntimeParameters,
  applyFaustRuntimeParameters,
  applyNativeFallbackRuntimeParameters,
  attemptFaustRecovery,
  cancelFaustRecovery,
  clampNumber,
  createAnalyser,
  createAudioSessionState,
  createNativeFallbackGraph,
  createSoftClipCurve,
  dbToGain,
  disconnectNativeFallbackGraph,
  emitCurrentAudioSessionTelemetry,
  ensureWorkletModule,
  getSampleSize: getFaustSampleSize,
  handleAudioSessionFatalError,
  readPeak,
  roundTo,
  scheduleFaustRecovery,
  startAudioSession,
  startAudioSessionMeter,
  stopAudioSession
};
