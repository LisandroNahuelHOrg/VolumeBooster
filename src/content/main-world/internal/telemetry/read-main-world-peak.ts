import { roundTo } from "../math/round-to";

export function readMainWorldPeak(analyser: AnalyserNode): number {
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);
  let peak = 0;

  for (const sample of buffer) {
    peak = Math.max(peak, Math.abs(sample));
  }

  return roundTo(peak, 4);
}
