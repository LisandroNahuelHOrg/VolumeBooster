import type { NativeFallbackGraph } from "../audio-session-state";

export function createNativeFallbackGraph(
  audioContext: AudioContext,
  inputAnalyserNode: AnalyserNode,
  outputAnalyserNode: AnalyserNode
): NativeFallbackGraph {
  const preGain = audioContext.createGain();
  const lowShelf = audioContext.createBiquadFilter();
  const midPeak = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const shaper = audioContext.createWaveShaper();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  inputAnalyserNode.connect(preGain);
  preGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(compressor);
  compressor.connect(shaper);
  shaper.connect(outputAnalyserNode);
  outputAnalyserNode.connect(wetGain);
  wetGain.connect(audioContext.destination);
  inputAnalyserNode.connect(dryGain);
  dryGain.connect(audioContext.destination);

  return { preGain, lowShelf, midPeak, compressor, shaper, wetGain, dryGain };
}
