import { publishAudioSessionTelemetry } from "./publish-audio-session-telemetry";
import { METER_SAMPLE_MS } from "../../../../shared/constants";
import type { AudioSessionState } from "../audio-session-state";

export function startAudioSessionMeter(state: AudioSessionState): void {
  if (!state.inputAnalyserNode || !state.outputAnalyserNode) {
    return;
  }

  const inputAnalyserNode = state.inputAnalyserNode;
  const outputAnalyserNode = state.outputAnalyserNode;
  state.meterIntervalId = window.setInterval(() => {
    publishAudioSessionTelemetry(state, inputAnalyserNode, outputAnalyserNode);
  }, METER_SAMPLE_MS);
}
