import { createDefaultMetrics } from "../../../../shared/audio-settings";
import { createLoudnessEstimatorState } from "../../../../shared/audio-settings/internal/create-loudness-estimator-state";
import type { BridgeContextState } from "../main-world-runtime-state";
import { createMainWorldSoftClipCurve } from "./create-main-world-soft-clip-curve";
import { createMainWorldAnalyser } from "../telemetry/create-main-world-analyser";

export function createMainWorldBridgeState(context: AudioContext, id: number): BridgeContextState {
  const inputNode = context.createGain();
  const inputAnalyser = createMainWorldAnalyser(context);
  const preGain = context.createGain();
  const lowShelf = context.createBiquadFilter();
  const midPeak = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const shaper = context.createWaveShaper();
  const outputAnalyser = createMainWorldAnalyser(context);
  const wetGain = context.createGain();
  const dryGain = context.createGain();
  const internalNodes = new WeakSet<AudioNode>();

  for (const node of [inputNode, inputAnalyser, preGain, lowShelf, midPeak, compressor, shaper, outputAnalyser, wetGain, dryGain]) {
    internalNodes.add(node);
  }

  shaper.curve = createMainWorldSoftClipCurve(0) as any;
  inputNode.connect(inputAnalyser);
  inputAnalyser.connect(preGain);
  preGain.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(compressor);
  compressor.connect(shaper);
  shaper.connect(outputAnalyser);
  outputAnalyser.connect(wetGain);
  wetGain.connect(context.destination);
  inputNode.connect(dryGain);
  dryGain.connect(context.destination);

  return {
    id,
    context,
    inputNode,
    inputAnalyser,
    preGain,
    lowShelf,
    midPeak,
    compressor,
    shaper,
    outputAnalyser,
    wetGain,
    dryGain,
    normalizationLoudnessState: createLoudnessEstimatorState(context.sampleRate),
    internalNodes,
    attachedNodes: new Set<AudioNode>(),
    lastMetrics: createDefaultMetrics(true)
  };
}
