export type MockFaustNode = {
  paramValues: Map<string, number>;
  options: unknown;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  setParamValue: ReturnType<typeof vi.fn>;
};

export const faustNodeInstances: MockFaustNode[] = [];

export const mockFactoryLoader = vi.fn(async () => ({
  cfactory: 0,
  code: new Uint8Array([1, 2, 3]),
  module: {} as WebAssembly.Module,
  json: '{"compile_options":"-single"}',
  poly: false,
  shaKey: "",
  soundfiles: {}
}));

export const defaultFaustAssetDescriptor = {
  meta: { compile_options: "-single" },
  processorName: "mock-processor",
  workletModulePath: "mock-worklet.js",
  controlPaths: {
    inputDriveDb: "inputDriveDb",
    lookaheadMs: "lookaheadMs",
    releaseMs: "releaseMs",
    multibandDepth: "multibandDepth",
    protectorEnabled: "protectorEnabled",
    outputLimiterEnabled: "outputLimiterEnabled",
    lowBandTrimDb: "lowBandTrimDb",
    lowBandMakeupDb: "lowBandMakeupDb",
    lowBandThresholdOffsetDb: "lowBandThresholdOffsetDb",
    lowBandRatioBias: "lowBandRatioBias",
    midHighThresholdOffsetDb: "midHighThresholdOffsetDb",
    outputCeilingDb: "outputCeilingDb",
    outputSoftClipMix: "outputSoftClipMix",
    clarityPresenceTiltDb: "clarityPresenceTiltDb",
    toneLowBandGainDb: "toneLowBandGainDb",
    toneMidBandGainDb: "toneMidBandGainDb"
  },
  loadFactory: mockFactoryLoader
};

export class TestFaustMonoAudioWorkletNode {
  readonly paramValues = new Map<string, number>();
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
  readonly addEventListener = vi.fn();
  readonly setParamValue = vi.fn((path: string, value: number) => {
    this.paramValues.set(path, value);
  });

  constructor(
    readonly audioContext: unknown,
    readonly options: unknown
  ) {
    faustNodeInstances.push(this as unknown as MockFaustNode);
  }
}
