import stereoMeta from "../generated/faust/stereo/dsp-meta.json";
import { PROCESSOR_NAMES } from "./faust-runtime";

const stereoHoisted = vi.hoisted(() => ({
  getFaustAudioWorkletProcessor: vi.fn(),
  FaustBaseWebAudioDsp: { tag: "base" },
  FaustMonoWebAudioDsp: { tag: "mono" },
  FaustWasmInstantiator: { tag: "instantiator" }
}));

vi.mock("@grame/faustwasm", () => ({
  FaustBaseWebAudioDsp: stereoHoisted.FaustBaseWebAudioDsp,
  FaustMonoWebAudioDsp: stereoHoisted.FaustMonoWebAudioDsp,
  FaustWasmInstantiator: stereoHoisted.FaustWasmInstantiator,
  getFaustAudioWorkletProcessor: stereoHoisted.getFaustAudioWorkletProcessor
}));

describe("faust-stereo-worklet", () => {
  beforeEach(() => {
    stereoHoisted.getFaustAudioWorkletProcessor.mockClear();
    vi.resetModules();
  });

  it("registers the stereo faust processor with the exact runtime contract", async () => {
    await import("./faust-stereo-worklet");

    expect(stereoHoisted.getFaustAudioWorkletProcessor).toHaveBeenCalledTimes(1);
    const [deps, config] = stereoHoisted.getFaustAudioWorkletProcessor.mock.calls[0] as [
      {
        FaustBaseWebAudioDsp: unknown;
        FaustMonoWebAudioDsp: unknown;
        FaustPolyWebAudioDsp: undefined;
        FaustWebAudioDspVoice: undefined;
        FaustWasmInstantiator: unknown;
        FaustAudioWorkletProcessorCommunicator: new (port: MessagePort) => {
          getNewAccDataAvailable(): boolean;
          setNewAccDataAvailable(value: boolean): void;
          getAcc(): undefined;
          getNewGyrDataAvailable(): boolean;
          setNewGyrDataAvailable(value: boolean): void;
          getGyr(): undefined;
        };
      },
      {
        processorName: string;
        dspName: string;
        dspMeta: typeof stereoMeta;
        poly: boolean;
      }
    ];

    expect(deps).toMatchObject({
      FaustBaseWebAudioDsp: stereoHoisted.FaustBaseWebAudioDsp,
      FaustMonoWebAudioDsp: stereoHoisted.FaustMonoWebAudioDsp,
      FaustPolyWebAudioDsp: undefined,
      FaustWebAudioDspVoice: undefined,
      FaustWasmInstantiator: stereoHoisted.FaustWasmInstantiator
    });
    expect(config).toEqual({
      processorName: PROCESSOR_NAMES.stereo,
      dspName: stereoMeta.name,
      dspMeta: stereoMeta,
      poly: false
    });

    const communicator = new deps.FaustAudioWorkletProcessorCommunicator({} as MessagePort);
    expect(communicator.getNewAccDataAvailable()).toBe(false);
    expect(communicator.getAcc()).toBeUndefined();
    expect(communicator.getNewGyrDataAvailable()).toBe(false);
    expect(communicator.getGyr()).toBeUndefined();
    expect(() => communicator.setNewAccDataAvailable(true)).not.toThrow();
    expect(() => communicator.setNewGyrDataAvailable(true)).not.toThrow();
  });
});
