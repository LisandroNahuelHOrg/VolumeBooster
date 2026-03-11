import { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import { selectFaustAsset } from "../../offscreen/faust-assets";
import type { MediaElementSessionGraph } from "./media-element-session-state";
import { createMediaPeakAnalyser } from "./create-media-peak-analyser";
import { ensureMediaWorkletModule } from "./ensure-media-worklet-module";
import { getFaustSampleSize } from "./get-faust-sample-size";

export async function buildMediaElementSessionGraph(
  audioContext: AudioContext,
  sourceNode: MediaElementAudioSourceNode
): Promise<MediaElementSessionGraph> {
  const inputAnalyserNode = createMediaPeakAnalyser(audioContext);
  const outputAnalyserNode = createMediaPeakAnalyser(audioContext);
  const wetGainNode = audioContext.createGain();
  const bypassGainNode = audioContext.createGain();
  const asset = selectFaustAsset(undefined);

  await ensureMediaWorkletModule(audioContext, asset.workletModulePath);
  const factory = await asset.loadFactory();
  const faustNode = new FaustMonoAudioWorkletNode(audioContext, {
    processorOptions: {
      name: asset.processorName,
      factory,
      sampleSize: getFaustSampleSize(asset.meta)
    }
  });

  sourceNode.connect(inputAnalyserNode);
  inputAnalyserNode.connect(faustNode);
  faustNode.connect(outputAnalyserNode);
  outputAnalyserNode.connect(wetGainNode);
  wetGainNode.connect(audioContext.destination);
  sourceNode.connect(bypassGainNode);
  bypassGainNode.connect(audioContext.destination);

  return {
    audioContext,
    sourceNode,
    inputAnalyserNode,
    outputAnalyserNode,
    wetGainNode,
    bypassGainNode,
    faustNode,
    asset
  };
}
