import type { NativeFallbackGraph } from "../audio-session-state";

export function disconnectNativeFallbackGraph(fallbackGraph: NativeFallbackGraph | null): void {
  if (!fallbackGraph) {
    return;
  }

  fallbackGraph.dryGain.disconnect();
  fallbackGraph.wetGain.disconnect();
  fallbackGraph.shaper.disconnect();
  fallbackGraph.compressor.disconnect();
  fallbackGraph.midPeak.disconnect();
  fallbackGraph.lowShelf.disconnect();
  fallbackGraph.preGain.disconnect();
}
