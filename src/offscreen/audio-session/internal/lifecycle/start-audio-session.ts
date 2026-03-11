import { selectFaustAsset } from "../../../faust-assets";
import { handleAudioSessionFatalError } from "./handle-audio-session-fatal-error";
import { stopAudioSession } from "./stop-audio-session";
import { connectFaustGraph } from "../graph/connect-faust-graph";
import { activateNativeFallbackGraph } from "../graph/activate-native-fallback-graph";
import { applyAudioSessionRuntimeParameters } from "../graph/apply-audio-session-runtime-parameters";
import { createAnalyser } from "../telemetry/create-analyser";
import { startAudioSessionMeter } from "../telemetry/start-audio-session-meter";
import type { AudioSessionState } from "../audio-session-state";

type TabAudioTrackConstraints = MediaTrackConstraints & {
  mandatory: {
    chromeMediaSource: "tab";
    chromeMediaSourceId: string;
  };
};

export async function startAudioSession(
  state: AudioSessionState,
  streamId: string
): Promise<void> {
  state.fatalErrorNotified = false;
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    } as TabAudioTrackConstraints,
    video: false
  });
  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaStreamSource(mediaStream);
  const inputAnalyserNode = createAnalyser(audioContext);
  const outputAnalyserNode = createAnalyser(audioContext);

  state.stream = mediaStream;
  state.audioContext = audioContext;
  state.sourceNode = sourceNode;
  state.inputAnalyserNode = inputAnalyserNode;
  state.outputAnalyserNode = outputAnalyserNode;
  state.currentAsset = selectFaustAsset(mediaStream.getAudioTracks()[0]?.getSettings?.().channelCount);
  sourceNode.connect(inputAnalyserNode);

  try {
    await connectFaustGraph(state, audioContext, inputAnalyserNode, outputAnalyserNode, state.currentAsset);
    state.engineStrategy = "faust";
  } catch {
    try {
      activateNativeFallbackGraph(state, audioContext, inputAnalyserNode, outputAnalyserNode);
      state.engineStrategy = "native_fallback";
    } catch {
      handleAudioSessionFatalError(state, { key: "errorAudioPipelineStart" });
      await stopAudioSession(state).catch(() => undefined);
      throw new Error("The manual audio session could not initialize either Faust or the native fallback.");
    }
  }

  applyAudioSessionRuntimeParameters(state);
  await audioContext.resume();
  startAudioSessionMeter(state);
}
