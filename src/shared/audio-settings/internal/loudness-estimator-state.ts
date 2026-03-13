export interface LoudnessBiquadState {
  a1: number;
  a2: number;
  b0: number;
  b1: number;
  b2: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface LoudnessHistoryBlock {
  durationMs: number;
  energy: number;
  loudnessDb: number | null;
}

export interface LoudnessEstimatorState {
  historyBlocks: LoudnessHistoryBlock[];
  highPass: LoudnessBiquadState;
  highShelf: LoudnessBiquadState;
  momentaryLoudnessDb: number | null;
  sampleBuffer: Float32Array<ArrayBufferLike> | null;
  sampleRate: number;
  shortTermLoudnessDb: number | null;
  ungatedShortTermLoudnessDb: number | null;
}
