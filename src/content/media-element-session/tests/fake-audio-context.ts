class FakeNode {
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
}

class FakeAnalyserNode extends FakeNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  peak = 0;
  readonly getFloatTimeDomainData = vi.fn((buffer: Float32Array) => {
    buffer.fill(0);
    buffer[0] = this.peak;
  });
}

class FakeGainNode extends FakeNode {
  gain = { value: 0 };
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static nextState: AudioContextState = "running";
  static keepStateOnResume = false;
  static sourceError: unknown = null;
  static resumeError: unknown = null;

  state: AudioContextState;
  readonly destination = {};
  readonly audioWorklet = {
    addModule: vi.fn(async () => undefined)
  };
  readonly sourceNode = new FakeNode();
  readonly inputAnalyser = new FakeAnalyserNode();
  readonly outputAnalyser = new FakeAnalyserNode();
  readonly wetGainNode = new FakeGainNode();
  readonly bypassGainNode = new FakeGainNode();
  readonly createMediaElementSource = vi.fn((_element: HTMLMediaElement) => {
    if (FakeAudioContext.sourceError) {
      throw FakeAudioContext.sourceError;
    }

    return this.sourceNode as unknown as MediaElementAudioSourceNode;
  });
  readonly createAnalyser = vi
    .fn()
    .mockReturnValueOnce(this.inputAnalyser as unknown as AnalyserNode)
    .mockReturnValueOnce(this.outputAnalyser as unknown as AnalyserNode);
  readonly createGain = vi
    .fn()
    .mockReturnValueOnce(this.wetGainNode as unknown as GainNode)
    .mockReturnValueOnce(this.bypassGainNode as unknown as GainNode);
  readonly resume = vi.fn(async () => {
    if (FakeAudioContext.resumeError) {
      throw FakeAudioContext.resumeError;
    }

    if (!FakeAudioContext.keepStateOnResume) {
      this.state = "running";
    }
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });

  constructor() {
    this.state = FakeAudioContext.nextState;
    FakeAudioContext.instances.push(this);
  }

  static reset() {
    FakeAudioContext.instances.length = 0;
    FakeAudioContext.nextState = "running";
    FakeAudioContext.keepStateOnResume = false;
    FakeAudioContext.sourceError = null;
    FakeAudioContext.resumeError = null;
  }
}
