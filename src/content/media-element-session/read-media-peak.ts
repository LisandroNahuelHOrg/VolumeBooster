import { roundMediaSessionValue } from "./round-media-session-value";

export function readMediaPeak(analyserNode: AnalyserNode): number {
  const buffer = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(buffer);

  let peak = 0;

  for (const value of buffer) {
    peak = Math.max(peak, Math.abs(value));
  }

  return roundMediaSessionValue(peak, 4);
}
