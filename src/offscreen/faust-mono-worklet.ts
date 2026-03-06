import {
  type FaustDspMeta,
  FaustBaseWebAudioDsp,
  FaustMonoWebAudioDsp,
  FaustWasmInstantiator,
  getFaustAudioWorkletProcessor
} from "@grame/faustwasm";
import monoMeta from "../generated/faust/mono/dsp-meta.json";
import { PROCESSOR_NAMES } from "./faust-runtime";

const monoDspMeta = monoMeta as unknown as FaustDspMeta;

class NoopFaustAudioWorkletProcessorCommunicator {
  constructor(_port: MessagePort) {}

  getNewAccDataAvailable(): boolean {
    return false;
  }

  setNewAccDataAvailable(_value: boolean): void {}

  // Stryker disable next-line BlockStatement: explicit undefined sentinel required by the Faust communicator contract
  getAcc(): undefined {
    return undefined;
  }

  getNewGyrDataAvailable(): boolean {
    return false;
  }

  setNewGyrDataAvailable(_value: boolean): void {}

  // Stryker disable next-line BlockStatement: explicit undefined sentinel required by the Faust communicator contract
  getGyr(): undefined {
    return undefined;
  }
}

getFaustAudioWorkletProcessor(
  {
    FaustBaseWebAudioDsp,
    FaustMonoWebAudioDsp,
    FaustPolyWebAudioDsp: undefined,
    FaustWebAudioDspVoice: undefined,
    FaustWasmInstantiator,
    FaustAudioWorkletProcessorCommunicator:
      NoopFaustAudioWorkletProcessorCommunicator as never
  },
  {
    processorName: PROCESSOR_NAMES.mono,
    dspName: monoDspMeta.name,
    dspMeta: monoDspMeta,
    poly: false
  }
);
