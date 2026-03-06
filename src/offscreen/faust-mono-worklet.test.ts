import monoMeta from "../generated/faust/mono/dsp-meta.json";
import { PROCESSOR_NAMES } from "./faust-runtime";

const typedMonoMeta = monoMeta as { name: string };

const monoHoisted = vi.hoisted(() => ({
  getFaustAudioWorkletProcessor: vi.fn(),
  FaustBaseWebAudioDsp: { tag: "base" },
  FaustMonoWebAudioDsp: { tag: "mono" },
  FaustWasmInstantiator: { tag: "instantiator" }
}));

vi.mock("@grame/faustwasm", () => ({
  FaustBaseWebAudioDsp: monoHoisted.FaustBaseWebAudioDsp,
  FaustMonoWebAudioDsp: monoHoisted.FaustMonoWebAudioDsp,
  FaustWasmInstantiator: monoHoisted.FaustWasmInstantiator,
  getFaustAudioWorkletProcessor: monoHoisted.getFaustAudioWorkletProcessor
}));

describe("faust-mono-worklet", () => {
  beforeEach(() => {
    monoHoisted.getFaustAudioWorkletProcessor.mockClear();
    vi.resetModules();
  });

  it("registers the mono faust processor with the exact runtime contract", async () => {
    await import("./faust-mono-worklet");

    expect(monoHoisted.getFaustAudioWorkletProcessor).toHaveBeenCalledTimes(1);
    const [deps, config] = monoHoisted.getFaustAudioWorkletProcessor.mock.calls[0] as [
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
        dspMeta: typeof monoMeta;
        poly: boolean;
      }
    ];

    expect(deps).toMatchObject({
      FaustBaseWebAudioDsp: monoHoisted.FaustBaseWebAudioDsp,
      FaustMonoWebAudioDsp: monoHoisted.FaustMonoWebAudioDsp,
      FaustPolyWebAudioDsp: undefined,
      FaustWebAudioDspVoice: undefined,
      FaustWasmInstantiator: monoHoisted.FaustWasmInstantiator
    });
    expect(config).toEqual({
      processorName: PROCESSOR_NAMES.mono,
      dspName: typedMonoMeta.name,
      dspMeta: monoMeta,
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
