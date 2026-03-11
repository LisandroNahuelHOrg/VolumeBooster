import { FaustMonoAudioWorkletNode } from "@grame/faustwasm";
import type { FaustAssetDescriptor } from "../../../faust-assets";
import { cancelFaustRecovery } from "./cancel-faust-recovery";
import { activateNativeFallbackFromFaust } from "./activate-native-fallback-from-faust";
import { getFaustSampleSize } from "../math/get-faust-sample-size";
import type { AudioSessionState } from "../audio-session-state";
import { ensureWorkletModule } from "../worklet/ensure-worklet-module";

export async function connectFaustGraph(
  state: AudioSessionState,
  audioContext: AudioContext,
  inputAnalyserNode: AnalyserNode,
  outputAnalyserNode: AnalyserNode,
  currentAsset: FaustAssetDescriptor
): Promise<void> {
  await ensureWorkletModule(audioContext, currentAsset.workletModulePath);
  const factory = await currentAsset.loadFactory();
  const faustNode = new FaustMonoAudioWorkletNode(audioContext, {
    processorOptions: {
      name: currentAsset.processorName,
      factory,
      sampleSize: getFaustSampleSize(currentAsset.meta)
    }
  });

  faustNode.addEventListener("processorerror", () => {
    activateNativeFallbackFromFaust(state);
  });
  inputAnalyserNode.connect(faustNode);
  faustNode.connect(outputAnalyserNode);
  outputAnalyserNode.connect(audioContext.destination);
  state.faustNode = faustNode;
  state.fallbackGraph = null;
  cancelFaustRecovery(state);
}
